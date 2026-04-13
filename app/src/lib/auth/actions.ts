'use server'

import { createInsForgeServerClient } from '@/lib/insforge/server'
import { setAuthCookies, clearAuthCookies, getAccessToken } from '@/lib/auth/cookies'
import { redirect } from 'next/navigation'

export async function signIn(formData: FormData) {
  const insforge = createInsForgeServerClient()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  const { data, error } = await insforge.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.statusCode === 403) {
      return { success: false, error: 'Email no verificado. Verifica tu correo antes de iniciar sesión.' }
    }
    return { success: false, error: error.message || 'Credenciales inválidas.' }
  }

  if (!data?.accessToken || !data?.refreshToken) {
    return { success: false, error: 'Error al obtener sesión.' }
  }

  await setAuthCookies(data.accessToken, data.refreshToken)
  return { success: true }
}

export async function signUp(formData: FormData) {
  const insforge = createInsForgeServerClient()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const name = String(formData.get('name') ?? '').trim()

  const { data, error } = await insforge.auth.signUp({
    email,
    password,
    name,
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`
  })

  if (error) {
    return { success: false, error: error.message || 'Error al registrarse.', requireVerification: false }
  }

  if (data?.requireEmailVerification) {
    return { success: true, requireVerification: true, email }
  }

  // No verification required, user is signed in
  if (data?.accessToken && data?.refreshToken) {
    await setAuthCookies(data.accessToken, data.refreshToken)

    // Create user profile
    const authedClient = createInsForgeServerClient(data.accessToken)
    await authedClient.database.from('user_profiles').insert([{
      user_id: data.user?.id,
      role: 'viewer',
      full_name: name
    }])
  }

  return { success: true, requireVerification: false }
}

export async function verifyEmail(email: string, otp: string) {
  const insforge = createInsForgeServerClient()
  const { data, error } = await insforge.auth.verifyEmail({ email, otp })

  if (error) {
    return { success: false, error: error.message || 'Código inválido o expirado.' }
  }

  if (data?.accessToken && data?.refreshToken) {
    await setAuthCookies(data.accessToken, data.refreshToken)

    // Create user profile for newly verified user
    const authedClient = createInsForgeServerClient(data.accessToken)
    const { data: existingProfile } = await authedClient.database
      .from('user_profiles')
      .select('id')
      .eq('user_id', data.user?.id)
      .maybeSingle()

    if (!existingProfile) {
      await authedClient.database.from('user_profiles').insert([{
        user_id: data.user?.id,
        role: 'viewer',
        full_name: data.user?.profile?.name || ''
      }])
    }
  }

  return { success: true }
}

export async function signOut() {
  const accessToken = await getAccessToken()
  if (accessToken) {
    const insforge = createInsForgeServerClient(accessToken)
    await insforge.auth.signOut()
  }
  await clearAuthCookies()
  redirect('/login')
}

export async function getCurrentUser() {
  const accessToken = await getAccessToken()
  if (!accessToken) return null

  const insforge = createInsForgeServerClient(accessToken)
  const { data, error } = await insforge.auth.getCurrentUser()
  if (error || !data?.user) return null

  // Get user profile with role
  const { data: profile } = await insforge.database
    .from('user_profiles')
    .select('role, full_name')
    .eq('user_id', data.user.id)
    .maybeSingle()

  return {
    ...data.user,
    role: profile?.role || 'viewer',
    fullName: profile?.full_name || data.user.profile?.name || ''
  }
}
