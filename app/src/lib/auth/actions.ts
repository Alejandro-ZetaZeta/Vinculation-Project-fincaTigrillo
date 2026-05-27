'use server'

import { createInsForgeServerClient } from '@/lib/insforge/server'
import { setAuthCookies, clearAuthCookies, getAccessToken } from '@/lib/auth/cookies'
import { buildWelcomeEmail } from '@/lib/email/welcome'
import { createGmailTransporter } from '@/lib/email/transporter'
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

  // Block login if user hasn't completed email verification
  // (profile row is only created after OTP is verified in verifyEmailAndFinish)
  const { data: profile } = await createInsForgeServerClient(data.accessToken)
    .database
    .from('user_profiles')
    .select('user_id')
    .eq('user_id', data.user?.id)
    .maybeSingle()

  if (!profile) {
    return {
      success: false,
      error: 'Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada (y la carpeta de spam o correo no deseado).',
    }
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
    const msg = (error.message || '').toLowerCase()
    if (
      error.statusCode === 409 ||
      msg.includes('already') ||
      msg.includes('exists') ||
      msg.includes('registered') ||
      msg.includes('duplicate')
    ) {
      return { success: false, requireVerification: false, error: 'Ya existe una cuenta registrada con ese correo electrónico.' }
    }
    return { success: false, requireVerification: false, error: error.message || 'Error al registrarse.' }
  }

  // Email verification enabled — code sent, profile created after OTP
  if (data?.requireEmailVerification) {
    return { success: true, requireVerification: true, email }
  }

  // Verification disabled — user signed in directly
  if (data?.accessToken && data?.refreshToken) {
    await setAuthCookies(data.accessToken, data.refreshToken)

    const { error: profileError } = await createInsForgeServerClient(data.accessToken)
      .database.from('user_profiles').insert([{
        user_id: data.user?.id,
        role: 'viewer',
        full_name: name,
        semester,
        career,
      }])

    if (profileError) {
      return { success: false, requireVerification: false, error: 'Cuenta creada pero error al guardar perfil. Contacta al administrador.' }
    }

    void sendWelcomeEmail(email, name)
  }

  return { success: true, requireVerification: false }
}

export async function verifyEmailAndFinish(params: {
  email: string
  otp: string
  name: string
  career: string | null
  semester: string | null
}) {
  const insforge = createInsForgeServerClient()

  const { data, error } = await insforge.auth.verifyEmail({
    email: params.email,
    otp: params.otp,
  })

  if (error) {
    const msg = error.statusCode === 400
      ? 'Código inválido o expirado.'
      : (error.message || 'Error al verificar el código.')
    return { success: false, error: msg }
  }

  if (!data?.accessToken || !data?.refreshToken) {
    return { success: false, error: 'Error al obtener sesión tras la verificación.' }
  }

  await setAuthCookies(data.accessToken, data.refreshToken)

  const { error: profileError } = await createInsForgeServerClient(data.accessToken)
    .database.from('user_profiles').insert([{
      user_id: data.user?.id,
      role: 'viewer',
      full_name: params.name,
      semester: params.semester,
      career: params.career,
    }])

  if (profileError) {
    return { success: false, error: 'Verificado pero error al guardar perfil. Contacta al administrador.' }
  }

  void sendWelcomeEmail(params.email, params.name)

  return { success: true }
}

export async function resendVerificationEmail(email: string) {
  const insforge = createInsForgeServerClient()
  try {
    await insforge.auth.resendVerificationEmail({
      email,
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/login`,
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}

// ── Internal helper ──────────────────────────────────────────────────────────

async function sendWelcomeEmail(email: string, name: string) {
  const gmailUser = process.env.GMAIL_SMTP_USER
  if (!gmailUser) {
    console.warn('[email] sendWelcomeEmail: GMAIL_SMTP_USER not set — skipping')
    return
  }

  const { subject, html } = buildWelcomeEmail(name || email)

  try {
    const transporter = createGmailTransporter()
    await transporter.sendMail({
      from: `"Finca Tigrillo" <${gmailUser}>`,
      to: email,
      subject,
      html,
    })
    console.log(`[email] Welcome email sent to ${email}`)
  } catch (err) {
    console.error('[email] Welcome email failed:', err)
  }
}

// ── Password Reset ───────────────────────────────────────────────────────────

export async function requestPasswordReset(email: string) {
  const insforge = createInsForgeServerClient()
  try {
    await insforge.auth.sendResetPasswordEmail({
      email,
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/forgot-password`,
    })
    return { success: true }
  } catch (err: unknown) {
    const msg = ((err as { message?: string })?.message || '').toLowerCase()
    if (msg.includes('not found') || msg.includes('no user') || msg.includes('does not exist')) {
      return { success: false, error: 'No existe una cuenta registrada con ese correo electrónico.' }
    }
    return { success: false, error: 'Error al enviar el correo. Intenta de nuevo.' }
  }
}

export async function verifyResetCode(email: string, code: string) {
  const insforge = createInsForgeServerClient()
  const { data, error } = await insforge.auth.exchangeResetPasswordToken({ email, code })
  if (error) {
    return {
      success: false,
      error: error.statusCode === 400
        ? 'Código inválido o expirado.'
        : (error.message || 'Error al verificar el código.'),
    }
  }
  return { success: true, token: (data as { token: string }).token }
}

export async function resetUserPassword(newPassword: string, token: string) {
  const insforge = createInsForgeServerClient()
  const { error } = await insforge.auth.resetPassword({ newPassword, otp: token })
  if (error) {
    return { success: false, error: error.message || 'Error al cambiar la contraseña.' }
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

  const { data: profile } = await insforge.database
    .from('user_profiles')
    .select('role, full_name, semester, career, avatar_url, avatar_updated_at')
    .eq('user_id', data.user.id)
    .maybeSingle()

  return {
    ...data.user,
    role: profile?.role || 'viewer',
    fullName: profile?.full_name || data.user.profile?.name || '',
    semester: profile?.semester || null,
    career: profile?.career || null,
    avatarUrl: profile?.avatar_url || null,
    avatarUpdatedAt: profile?.avatar_updated_at || null,
  }
}
