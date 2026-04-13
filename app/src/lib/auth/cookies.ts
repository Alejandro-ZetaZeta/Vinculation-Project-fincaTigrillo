import { cookies } from 'next/headers'

const ACCESS_COOKIE = 'insforge_access_token'
const REFRESH_COOKIE = 'insforge_refresh_token'

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/'
}

export async function setAuthCookies(accessToken: string, refreshToken: string) {
  const cookieStore = await cookies()
  cookieStore.set(ACCESS_COOKIE, accessToken, { ...cookieOptions, maxAge: 60 * 15 })
  cookieStore.set(REFRESH_COOKIE, refreshToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 })
}

export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(ACCESS_COOKIE)?.value
}

export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get(REFRESH_COOKIE)?.value
}

export async function clearAuthCookies() {
  const cookieStore = await cookies()
  cookieStore.delete(ACCESS_COOKIE)
  cookieStore.delete(REFRESH_COOKIE)
}
