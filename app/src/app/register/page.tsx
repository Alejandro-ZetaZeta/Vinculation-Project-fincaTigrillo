'use client'

import { useState, useTransition, useId } from 'react'
import { signUp, verifyEmailAndFinish, resendVerificationEmail } from '@/lib/auth/actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Mail, Lock, User, Eye, EyeOff, GraduationCap, BookOpen, Sun, Moon, ShieldCheck, Check, X } from 'lucide-react'
import Image from 'next/image'
import { useTheme } from '@/components/ThemeProvider'

const CAREERS   = ['Agropecuaria']
const SEMESTERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

function detectRole(email: string): 'viewer' | 'teacher' | null {
  const lower = email.toLowerCase()
  if (lower.endsWith('@live.uleam.edu.ec')) return 'viewer'
  if (lower.endsWith('@uleam.edu.ec')) return 'teacher'
  return null
}

type Step = 'register' | 'verify'

export default function RegisterPage() {
  const [step, setStep]               = useState<Step>('register')
  const [error, setError]             = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword]       = useState('')
  const [emailValue, setEmailValue]   = useState('')
  const [isPending, startTransition]  = useTransition()
  const detectedRole = detectRole(emailValue)

  const pwChecks = {
    length:    password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
  }
  const pwValid = Object.values(pwChecks).every(Boolean)
  const [resendMsg, setResendMsg]     = useState('')

  // Persisted across steps
  const [pendingEmail,    setPendingEmail]    = useState('')
  const [pendingName,     setPendingName]     = useState('')
  const [pendingCareer,   setPendingCareer]   = useState<string | null>(null)
  const [pendingSemester, setPendingSemester] = useState<string | null>(null)

  const router   = useRouter()
  const { theme, toggleTheme } = useTheme()
  const errorId  = useId()

  // ── Step 1: register ────────────────────────────────────────────────────
  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    const emailVal = String(formData.get('email') ?? '').trim().toLowerCase()
    const role = detectRole(emailVal)
    if (!role) {
      setError('Solo se permite el registro con correos institucionales @live.uleam.edu.ec (estudiantes) o @uleam.edu.ec (docentes).')
      return
    }
    if (role === 'viewer') {
      if (!formData.get('career'))   { setError('Selecciona tu carrera');   return }
      if (!formData.get('semester')) { setError('Selecciona tu semestre');  return }
    }
    if (!pwValid) { setError('La contraseña no cumple los requisitos'); return }

    startTransition(async () => {
      const result = await signUp(formData)

      if (!result.success) {
        setError(result.error || 'Error al registrarse')
        return
      }

      if (result.requireVerification) {
        // Save data for verification step
        setPendingEmail(result.email as string)
        setPendingName(String(formData.get('name') ?? '').trim())
        setPendingCareer(String(formData.get('career') ?? '').trim() || null)
        setPendingSemester(String(formData.get('semester') ?? '').trim() || null)
        setStep('verify')
      } else {
        router.push('/dashboard')
      }
    })
  }

  // ── Step 2: verify OTP ──────────────────────────────────────────────────
  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const otp = String(new FormData(e.currentTarget).get('otp') ?? '').trim()

    if (otp.length !== 6) {
      setError('El código debe tener 6 dígitos')
      return
    }

    startTransition(async () => {
      const result = await verifyEmailAndFinish({
        email:    pendingEmail,
        otp,
        name:     pendingName,
        career:   pendingCareer,
        semester: pendingSemester,
      })

      if (!result.success) {
        setError(result.error || 'Error al verificar')
        return
      }

      router.push('/dashboard')
    })
  }

  async function handleResend() {
    setResendMsg('')
    setError('')
    const result = await resendVerificationEmail(pendingEmail)
    setResendMsg(result.success ? 'Código reenviado. Revisa tu correo.' : 'Error al reenviar. Intenta de nuevo.')
  }

  // ── UI ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative bg-background" style={{ paddingTop: 'env(safe-area-inset-top)' }}>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute right-4 p-2.5 rounded-xl bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-hover shadow-sm transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        style={{ top: 'calc(1rem + env(safe-area-inset-top))' }}
        aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      >
        {theme === 'light'
          ? <Moon className="w-5 h-5" aria-hidden="true" />
          : <Sun  className="w-5 h-5" aria-hidden="true" />
        }
      </button>

      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center rounded-2xl bg-primary/10 mb-4 overflow-hidden border border-primary/20">
            <Image
              src="/faviconOficial.svg"
              alt="Logo de Finca Tigrillo"
              width={80}
              height={80}
              className="object-contain dark:invert"
            />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Finca Tigrillo</h1>
          <p className="text-muted mt-1.5 text-sm">
            {step === 'register'
              ? detectedRole === 'teacher' ? 'Crear cuenta de docente' : 'Crear cuenta de estudiante'
              : 'Verificación de correo'}
          </p>
        </div>

        <div className="glass rounded-2xl p-8 shadow-xl">

          {/* ── Register form ── */}
          {step === 'register' && (
            <>
              <h2 className="font-display text-xl font-semibold mb-6 text-center text-foreground tracking-tight">
                Registro
              </h2>

              <form
                onSubmit={handleSignUp}
                className="space-y-4"
                aria-describedby={error ? errorId : undefined}
                noValidate
              >
                {error && (
                  <div id={errorId} role="alert" aria-live="assertive"
                    className="bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                {/* Name */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-sm font-medium text-foreground">
                    Nombre completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
                    <input id="name" name="name" type="text" required autoComplete="name"
                      placeholder="Tu nombre"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    Correo institucional
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
                    <input id="email" name="email" type="email" required autoComplete="email"
                      placeholder="usuario@live.uleam.edu.ec"
                      value={emailValue}
                      onChange={e => setEmailValue(e.target.value.trim())}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  </div>
                  <p className="text-xs text-muted">
                    {detectedRole === 'teacher'
                      ? <>Correo docente detectado — se registrará como <span className="font-semibold text-foreground">Docente</span>.</>
                      : <>Estudiantes: <span className="font-mono text-foreground">@live.uleam.edu.ec</span> · Docentes: <span className="font-mono text-foreground">@uleam.edu.ec</span></>
                    }
                  </p>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
                    <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                      required minLength={6} autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors p-1 rounded"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                      {showPassword
                        ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                        : <Eye    className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
                  {/* Password requirements — shown only once user starts typing */}
                  {password.length > 0 && (
                    <ul className="mt-2 space-y-1" aria-label="Requisitos de contraseña">
                      {([
                        [pwChecks.length,    'Mínimo 6 caracteres'],
                        [pwChecks.uppercase, 'Al menos una mayúscula'],
                        [pwChecks.number,    'Al menos un número'],
                      ] as [boolean, string][]).map(([ok, label]) => (
                        <li key={label} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-success' : 'text-muted'}`}>
                          {ok
                            ? <Check className="w-3 h-3 shrink-0" aria-hidden="true" />
                            : <X     className="w-3 h-3 shrink-0" aria-hidden="true" />}
                          {label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Career + Semester — students only */}
                {detectedRole !== 'teacher' && (
                  <>
                    <div className="space-y-1.5">
                      <label htmlFor="career" className="block text-sm font-medium text-foreground">
                        Carrera
                      </label>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
                        <select id="career" name="career" defaultValue=""
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none">
                          <option value="" disabled>Selecciona tu carrera</option>
                          {CAREERS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="semester" className="block text-sm font-medium text-foreground">
                        Semestre
                      </label>
                      <div className="relative">
                        <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
                        <select id="semester" name="semester" defaultValue=""
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none">
                          <option value="" disabled>Selecciona tu semestre</option>
                          {SEMESTERS.map(s => <option key={s} value={s}>{s}° Semestre</option>)}
                        </select>
                      </div>
                    </div>
                  </>
                )}

                <button type="submit" disabled={isPending}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                  aria-busy={isPending}>
                  {isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                      <span>Creando cuenta…</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" aria-hidden="true" />
                      Crear Cuenta
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted">
                  ¿Ya tienes cuenta?{' '}
                  <Link href="/login"
                    className="text-primary hover:text-primary-dark font-semibold transition-colors underline underline-offset-2">
                    Inicia sesión
                  </Link>
                </p>
              </div>
            </>
          )}

          {/* ── Verify OTP form ── */}
          {step === 'verify' && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
                  <ShieldCheck className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground tracking-tight">
                  Verifica tu correo
                </h2>
                <p className="text-sm text-muted mt-1.5">
                  Enviamos un código de 6 dígitos a<br />
                  <span className="font-medium text-foreground">{pendingEmail}</span>
                </p>
              </div>

              <form
                onSubmit={handleVerify}
                className="space-y-4"
                aria-describedby={error ? errorId : undefined}
                noValidate
              >
                {error && (
                  <div id={errorId} role="alert" aria-live="assertive"
                    className="bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                {resendMsg && (
                  <div role="status" aria-live="polite"
                    className="bg-primary/10 border border-primary/20 text-primary rounded-xl px-4 py-3 text-sm">
                    {resendMsg}
                  </div>
                )}

                {/* Spam warning */}
                <div className="bg-warning/10 border border-warning/30 text-warning rounded-xl px-4 py-3 text-xs flex gap-2 items-start" role="note">
                  <span className="text-base leading-none mt-0.5" aria-hidden="true">⚠️</span>
                  <span>
                    <strong>¿No ves el correo?</strong> Revisa tu carpeta de <strong>spam</strong> o <strong>correo no deseado</strong> — los correos institucionales suelen filtrarlos automáticamente.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="otp" className="block text-sm font-medium text-foreground">
                    Código de verificación
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-center text-2xl font-mono tracking-[0.5em] placeholder:text-muted/30 placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                <button type="submit" disabled={isPending}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                  aria-busy={isPending}>
                  {isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                      <span>Verificando…</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                      Verificar cuenta
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <p className="text-sm text-muted">
                  ¿No recibiste el código?{' '}
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-primary hover:text-primary-dark font-semibold transition-colors underline underline-offset-2"
                  >
                    Reenviar
                  </button>
                </p>
                <p className="text-sm text-muted">
                  <button
                    type="button"
                    onClick={() => { setStep('register'); setError('') }}
                    className="text-muted hover:text-foreground transition-colors underline underline-offset-2"
                  >
                    ← Volver al registro
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
