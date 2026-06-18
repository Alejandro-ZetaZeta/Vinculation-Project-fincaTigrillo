'use server'

import { createInsForgeServerClient, createInsForgeAdminClient } from '@/lib/insforge/server'
import { setAuthCookies, clearAuthCookies, getAccessToken } from '@/lib/auth/cookies'
import { buildWelcomeEmail } from '@/lib/email/welcome'
import { createGmailTransporter } from '@/lib/email/transporter'
import { redirect } from 'next/navigation'

// ── Error translation ─────────────────────────────────────────────────────────
// Maps raw SDK / fetch / HTTP error messages → user-friendly Spanish strings.
// Called before every `return { success: false, error: ... }` in auth flows.

function translateAuthError(raw: string | undefined | null): string {
  const msg = (raw ?? '').toLowerCase()

  // Network / connectivity
  if (
    msg.includes('failed to fetch') ||
    msg.includes('fetch failed') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('net::') ||
    msg.includes('load failed') ||
    msg.includes('connection refused') ||
    msg.includes('connection reset') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('socket hang up')
  ) {
    return 'No se pudo conectar al servidor. Verifica tu conexión a internet e inténtalo de nuevo.'
  }

  // Timeout / abort
  if (
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('aborted') ||
    msg.includes('abort')
  ) {
    return 'La solicitud tardó demasiado. Verifica tu conexión e inténtalo de nuevo.'
  }

  // Server-side (5xx)
  if (
    msg.includes('internal server error') ||
    msg.includes('500') ||
    msg.includes('service unavailable') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('504')
  ) {
    return 'El servidor no está disponible en este momento. Inténtalo más tarde.'
  }

  // Invalid credentials
  if (
    msg.includes('invalid credentials') ||
    msg.includes('invalid login') ||
    msg.includes('wrong password') ||
    msg.includes('incorrect password') ||
    msg.includes('user not found') ||
    msg.includes('no user') ||
    msg.includes('unauthorized')
  ) {
    return 'Correo o contraseña incorrectos.'
  }

  // Rate-limiting
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('429')) {
    return 'Demasiados intentos. Espera unos minutos antes de volver a intentarlo.'
  }

  // Already in Spanish or unknown → return as-is (non-empty) or generic fallback
  if (raw && raw.trim().length > 0) return raw.trim()
  return 'Error al iniciar sesión. Inténtalo de nuevo.'
}

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

  let data: Awaited<ReturnType<typeof insforge.auth.signInWithPassword>>['data']
  let error: Awaited<ReturnType<typeof insforge.auth.signInWithPassword>>['error']

  try {
    ;({ data, error } = await insforge.auth.signInWithPassword({ email, password }))
  } catch (err) {
    // Raw fetch/network throw (e.g. Capacitor offline, CORS, DNS failure)
    return { success: false, error: translateAuthError((err as Error)?.message) }
  }

  if (error) {
    return { success: false, error: translateAuthError(error.message) }
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
    // Self-heal: account verified but profile row missing (insert failed or
    // the user abandoned the OTP step after verifying). Without this the
    // account is permanently locked out with a misleading "verify" message.
    if (data.user?.emailVerified) {
      const { error: healError } = await createInsForgeServerClient(data.accessToken)
        .database.from('user_profiles').insert([{
          user_id: data.user.id,
          role: getRoleForEmail(email) ?? 'viewer',
          full_name: data.user.profile?.name || '',
          semester: null,
          career: null,
        }])

      if (healError) {
        return { success: false, error: 'Error al recuperar tu perfil. Contacta al administrador.' }
      }
    } else {
      return {
        success: false,
        error: 'Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada (y la carpeta de spam o correo no deseado).',
      }
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
  const admin = createInsForgeAdminClient()

  // InsForge's sendResetPasswordEmail is enumeration-safe (always returns 200).
  // Check existence explicitly so unregistered emails get a clear error.
  const { data: exists, error: rpcError } = await admin.database
    .rpc('check_email_registered', { p_email: email })

  if (rpcError || !exists) {
    return { success: false, error: 'No existe una cuenta registrada con ese correo electrónico.' }
  }

  try {
    await admin.auth.sendResetPasswordEmail({
      email,
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/forgot-password`,
    })
    return { success: true }
  } catch {
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
