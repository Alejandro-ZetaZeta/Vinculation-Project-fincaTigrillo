import { NextRequest, NextResponse } from 'next/server'

// Ensure any implicit /favicon.ico request uses our app icon.
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/faviconOficial.svg', req.url), 308)
}

export function HEAD(req: NextRequest) {
  return NextResponse.redirect(new URL('/faviconOficial.svg', req.url), 308)
}
