import { NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { getRefreshToken, setAuthCookies } from '@/lib/auth/cookies'

export async function POST() {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return NextResponse.json({ error: 'No refresh token' }, { status: 401 })

  const insforge = createInsForgeServerClient()
  const { data, error } = await insforge.auth.refreshSession({ refreshToken })

  if (error || !data?.accessToken || !data?.refreshToken) {
    return NextResponse.json({ error: 'Session expired' }, { status: 401 })
  }

  await setAuthCookies(data.accessToken, data.refreshToken)
  return NextResponse.json({ ok: true })
}
