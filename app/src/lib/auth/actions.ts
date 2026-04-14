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
  const career = String(formData.get('career') ?? '').trim() || null
  const semester = String(formData.get('semester') ?? '').trim() || null

  const { data, error } = await insforge.auth.signUp({
    email,
    password,
    name,
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`
  })

  if (error) {
    return { success: false, error: error.message || 'Error al registrarse.' }
  }

  // If verification is required (fallback), handle it
  if (data?.requireEmailVerification) {
    return { success: false, error: 'Verificación de correo requerida. Contacta al administrador.' }
  }

  // User is signed in directly (verification disabled)
  if (data?.accessToken && data?.refreshToken) {
    await setAuthCookies(data.accessToken, data.refreshToken)

    // Create user profile with semester and career
    const authedClient = createInsForgeServerClient(data.accessToken)
    await authedClient.database.from('user_profiles').insert([{
      user_id: data.user?.id,
      role: 'viewer',
      full_name: name,
      semester: semester,
      career: career
    }])
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

  // Get user profile with role, semester, career
  const { data: profile } = await insforge.database
    .from('user_profiles')
    .select('role, full_name, semester, career')
    .eq('user_id', data.user.id)
    .maybeSingle()

  return {
    ...data.user,
    role: profile?.role || 'viewer',
    fullName: profile?.full_name || data.user.profile?.name || '',
    semester: profile?.semester || null,
    career: profile?.career || null
  }
}
