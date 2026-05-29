import { NextRequest, NextResponse } from 'next/server'

// Ensure any implicit /favicon.ico request uses our app icon.
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/eloyAocelote1.png', req.url), 308)
}

export function HEAD(req: NextRequest) {
  return NextResponse.redirect(new URL('/eloyAocelote1.png', req.url), 308)
}
