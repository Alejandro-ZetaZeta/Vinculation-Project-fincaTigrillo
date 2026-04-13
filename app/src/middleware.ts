import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that don't require authentication
const publicRoutes = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get('insforge_access_token')?.value

  // Allow static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next()
  }

  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  // If user is authenticated and tries to access public routes, redirect to dashboard
  if (isPublicRoute && accessToken) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If user is NOT authenticated and tries to access protected routes, redirect to login
  if (!isPublicRoute && !accessToken && pathname !== '/') {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Root page: redirect based on auth status
  if (pathname === '/') {
    if (accessToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}
