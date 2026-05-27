import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PRODUCTION_ORIGIN = 'https://fincatigrillo.vercel.app'

// Additional allowed origins from the environment (comma-separated).
// Example: ALLOWED_ORIGINS=https://testfincat.vercel.app,https://preview.example.com
const EXTRA_ORIGINS =
  process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ?? []

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (origin === PRODUCTION_ORIGIN) return true
  // Environment-variable allowlist (replaces hardcoded preview URLs)
  if (EXTRA_ORIGINS.includes(origin)) return true
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

export function proxy(request: NextRequest) {
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
  const accessToken = request.cookies.get('insforge_access_token')?.value

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
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!isPublicRoute && !accessToken && pathname !== '/') {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL(accessToken ? '/dashboard' : '/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

