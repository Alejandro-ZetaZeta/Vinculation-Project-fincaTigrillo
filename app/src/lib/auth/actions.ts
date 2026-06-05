'use server'

import { createInsForgeServerClient } from '@/lib/insforge/server'
import { setAuthCookies, clearAuthCookies, getAccessToken } from '@/lib/auth/cookies'
import { buildWelcomeEmail } from '@/lib/email/welcome'
import { createGmailTransporter } from '@/lib/email/transporter'
import { redirect } from 'next/navigation'

// @live.uleam.edu.ec → student (viewer), @uleam.edu.ec → teacher
// The live-subdomain check must come first to avoid matching the parent domain.
function getRoleForEmail(email: string): 'viewer' | 'teacher' | null {
  const lower = email.toLowerCase()
  if (lower.endsWith('@live.uleam.edu.ec')) return 'viewer'
  if (lower.endsWith('@uleam.edu.ec')) return 'teacher'
  return null
}

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

  if (!getRoleForEmail(email)) {
    return {
      success: false,
      requireVerification: false,
      error: 'Solo se permite el registro con correos institucionales @live.uleam.edu.ec (estudiantes) o @uleam.edu.ec (docentes).',
    }
  }

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
    // Insert profile FIRST, using the in-memory access token (no cookies yet).
    // Only persist the session cookies once the profile row is confirmed.
    try {
      const { error: profileError } = await createInsForgeServerClient(data.accessToken)
        .database.from('user_profiles').insert([{
          user_id: data.user?.id,
          role: getRoleForEmail(email) ?? 'viewer',
          full_name: name,
          semester,
          career,
        }])

      if (profileError) {
        await clearAuthCookies()
        return { success: false, requireVerification: false, error: 'Cuenta creada pero error al guardar perfil. Contacta al administrador.' }
      }
    } catch {
      await clearAuthCookies()
      return { success: false, requireVerification: false, error: 'Cuenta creada pero error al guardar perfil. Contacta al administrador.' }
    }

    await setAuthCookies(data.accessToken, data.refreshToken)
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

  // Insert profile FIRST, using the in-memory access token (no cookies yet).
  // Only persist the session cookies once the profile row is confirmed,
  // to avoid leaving a "zombie" authenticated user without a profile row.
  try {
    const { error: profileError } = await createInsForgeServerClient(data.accessToken)
      .database.from('user_profiles').insert([{
        user_id: data.user?.id,
        role: getRoleForEmail(params.email) ?? 'viewer',
        full_name: params.name,
        semester: params.semester,
        career: params.career,
      }])

    if (profileError) {
      await clearAuthCookies()
      return { success: false, error: 'Verificado pero error al guardar perfil. Contacta al administrador.' }
    }
  } catch {
    await clearAuthCookies()
    return { success: false, error: 'Verificado pero error al guardar perfil. Contacta al administrador.' }
  }

  await setAuthCookies(data.accessToken, data.refreshToken)
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

  if (error || !data?.user) {
    // Only clear cookies when the backend definitively rejects the token
    // (401 Unauthorized / 403 Forbidden). Any other failure (network error,
    // 5xx, race condition right after login) is treated as transient — we
    // return null without wiping the cookies so the next request can retry.
    const statusCode = (error as { statusCode?: number } | null)?.statusCode
    const isDefinitiveAuthFailure = statusCode === 401 || statusCode === 403
    if (isDefinitiveAuthFailure) {
      await clearAuthCookies()
    }
    return null
  }

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
