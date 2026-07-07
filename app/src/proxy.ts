import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PRODUCTION_ORIGIN = 'https://fincatigrillo.vercel.app'

// Additional allowed origins from the environment (comma-separated).
// Example: ALLOWED_ORIGINS=https://testfincat.vercel.app,https://preview.example.com
const EXTRA_ORIGINS =
  process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? []

function safeOriginFromUrl(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

// Auto-allow AI provider tunnel origin when present.
const OLLAMA_ORIGIN = safeOriginFromUrl(process.env.OLLAMA_URL)

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (origin === PRODUCTION_ORIGIN) return true
  // Environment-variable allowlist (replaces hardcoded preview URLs)
  if (EXTRA_ORIGINS.includes(origin)) return true
  if (OLLAMA_ORIGIN && origin === OLLAMA_ORIGIN) return true
  // localhost during development
  if (process.env.NODE_ENV === 'development' && /^http:\/\/localhost(:\d+)?$/.test(origin)) return true
  return false
}

const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
}

// Routes that don't require authentication
const publicRoutes = ['/login', '/register', '/forgot-password']

function isJwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

function parseCookieValue(setCookieHeaders: string[], name: string): string | null {
  for (const header of setCookieHeaders) {
    const match = header.match(new RegExp(`^${name}=([^;]+)`))
    if (match) return match[1]
  }
  return null
}

// Attempts a silent token refresh using the refresh token cookie.
// Returns the new tokens and the Set-Cookie strings to forward, or null on failure.
async function tryRefresh(
  request: NextRequest,
  refreshToken: string
): Promise<{ accessToken: string; setCookies: string[] } | null> {
  try {
    const refreshUrl = new URL('/api/auth/refresh', request.url)
    const res = await fetch(refreshUrl.toString(), {
      method: 'POST',
      headers: { cookie: `insforge_refresh_token=${refreshToken}` },
    })
    if (!res.ok) return null
    const setCookies = res.headers.getSetCookie()
    const newAccessToken = parseCookieValue(setCookies, 'insforge_access_token')
    if (!newAccessToken) return null
    return { accessToken: newAccessToken, setCookies }
  } catch {
    return null
  }
}

// Builds a NextResponse.next() that rewrites the request's cookie header so
// downstream Server Actions and RSC renders see the refreshed access token.
function continueWithNewTokens(request: NextRequest, newAccessToken: string, setCookies: string[]): NextResponse {
  const reqHeaders = new Headers(request.headers)
  const existing = (request.headers.get('cookie') ?? '')
    .split(';')
    .filter(c => !c.trim().startsWith('insforge_access_token='))
    .join(';')
  reqHeaders.set('cookie', `${existing}; insforge_access_token=${newAccessToken}`.trimStart().replace(/^;\s*/, ''))

  const response = NextResponse.next({ request: { headers: reqHeaders } })
  setCookies.forEach(c => response.headers.append('Set-Cookie', c))
  return response
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const origin = request.headers.get('origin')

  // --- CORS preflight ---
  if (request.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const allowed = isAllowedOrigin(origin)
    const res = new NextResponse(null, { status: allowed ? 204 : 403 })
    if (allowed && origin) {
      res.headers.set('Access-Control-Allow-Origin', origin)
      Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v))
    }
    return res
  }

  // --- CORS actual request (non-preflight) ---
  // Inject dynamic Access-Control-Allow-Origin on API responses so the
  // origin allowlist is the single source of truth (no static block in next.config.ts).
  if (pathname.startsWith('/api/') && isAllowedOrigin(origin)) {
    const res = NextResponse.next()
    res.headers.set('Access-Control-Allow-Origin', origin!)
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.headers.set(k, v))
    return res
  }

  // --- Auth proxy ---
  const rawToken = request.cookies.get('insforge_access_token')?.value
  const accessToken = rawToken && !isJwtExpired(rawToken) ? rawToken : null
  const isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(request.headers.get('user-agent') ?? '')
  const hasRootSeen = request.cookies.get('ft_root_seen')?.value === '1'

  // Allow static files and unmatched API routes through
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  if (isPublicRoute && accessToken) {
    const res = NextResponse.redirect(new URL('/dashboard', request.url))
    if (isMobile && !hasRootSeen) {
      res.cookies.set('ft_root_seen', '1', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
    }
    return res
  }

  // Access token missing or expired — try silent refresh before giving up
  if (!accessToken) {
    const refreshToken = request.cookies.get('insforge_refresh_token')?.value
    if (refreshToken) {
      const refreshed = await tryRefresh(request, refreshToken)
      if (refreshed) {
        // Public route with now-valid session → send to dashboard
        if (isPublicRoute) {
          const res = NextResponse.redirect(new URL('/dashboard', request.url))
          if (isMobile && !hasRootSeen) {
            res.cookies.set('ft_root_seen', '1', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
          }
          return res
        }
        return continueWithNewTokens(request, refreshed.accessToken, refreshed.setCookies)
      }
    }

    // No refresh token or refresh failed.
    // '/' is exempt — the public landing page handles its own auth gate.
    if (!isPublicRoute && pathname !== '/') {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      const res = NextResponse.redirect(loginUrl)
      if (isMobile && !hasRootSeen) {
        res.cookies.set('ft_root_seen', '1', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
      }
      return res
    }
  }

  // Mobile root-skip: on a mobile UA's first visit to '/', send to /login
  // and remember with a cookie so the "Volver al inicio" button works first try.
  if (pathname === '/' && !accessToken && isMobile && !hasRootSeen) {
    const res = NextResponse.redirect(new URL('/login', request.url))
    res.cookies.set('ft_root_seen', '1', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
    return res
  }

  const res = NextResponse.next()
  if (isMobile && !hasRootSeen) {
    res.cookies.set('ft_root_seen', '1', { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  }
  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

