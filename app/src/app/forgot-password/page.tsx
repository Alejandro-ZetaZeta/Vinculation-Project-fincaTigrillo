'use client'

import { useState, useTransition, useId } from 'react'
import { requestPasswordReset, verifyResetCode, resetUserPassword } from '@/lib/auth/actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, KeyRound, Lock, Eye, EyeOff, ShieldCheck, Sun, Moon, Check, X, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { useTheme } from '@/components/ThemeProvider'

type Step = 'email' | 'code' | 'password'

export default function ForgotPasswordPage() {
  const [step, setStep]             = useState<Step>('email')
  const [error, setError]           = useState('')
  const [isPending, startTransition] = useTransition()
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword]     = useState('')

  const [pendingEmail, setPendingEmail] = useState('')
  const [resetToken,   setResetToken]   = useState('')

  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const errorId = useId()

  const pwChecks = {
    length:    password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    number:    /[0-9]/.test(password),
  }
  const pwValid = Object.values(pwChecks).every(Boolean)

  // ── Step 1: request reset ───────────────────────────────────────────────
  async function handleRequestReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const email = String(new FormData(e.currentTarget).get('email') ?? '').trim()

    startTransition(async () => {
      const result = await requestPasswordReset(email)
      if (!result.success) {
        setError(result.error || 'Error al enviar el correo.')
        return
      }
      setPendingEmail(email)
      setStep('code')
    })
  }

  // ── Step 2: verify OTP ──────────────────────────────────────────────────
  async function handleVerifyCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const code = String(new FormData(e.currentTarget).get('code') ?? '').trim()

    if (code.length !== 6) {
      setError('El código debe tener 6 dígitos')
      return
    }

    startTransition(async () => {
      const result = await verifyResetCode(pendingEmail, code)
      if (!result.success) {
        setError(result.error || 'Error al verificar el código.')
        return
      }
      setResetToken(result.token!)
      setStep('password')
    })
  }

  // ── Step 3: set new password ────────────────────────────────────────────
  async function handleResetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!pwValid) {
      setError('La contraseña no cumple los requisitos.')
      return
    }

    startTransition(async () => {
      const result = await resetUserPassword(password, resetToken)
      if (!result.success) {
        setError(result.error || 'Error al cambiar la contraseña.')
        return
      }
      router.push('/login?reset=success')
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative bg-background">

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2.5 rounded-xl bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-hover shadow-sm transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
      >
        {theme === 'light'
          ? <Moon className="w-5 h-5" aria-hidden="true" />
          : <Sun  className="w-5 h-5" aria-hidden="true" />}
      </button>

      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center rounded-2xl bg-primary/10 mb-4 overflow-hidden border border-primary/20">
            <Image
              src="/eloyAocelote1.png"
              alt="Logo de Finca Tigrillo"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Finca Tigrillo</h1>
          <p className="text-muted mt-1.5 text-sm">
            {step === 'email'    && 'Recuperar contraseña'}
            {step === 'code'     && 'Verificación de correo'}
            {step === 'password' && 'Nueva contraseña'}
          </p>
        </div>

        <div className="glass rounded-2xl p-8 shadow-xl">

          {/* ── Step 1: email ── */}
          {step === 'email' && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
                  <KeyRound className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground tracking-tight">
                  ¿Olvidaste tu contraseña?
                </h2>
                <p className="text-sm text-muted mt-1.5">
                  Ingresa tu correo y te enviaremos un código de verificación.
                </p>
              </div>

              <form onSubmit={handleRequestReset} className="space-y-4" aria-describedby={error ? errorId : undefined} noValidate>
                {error && (
                  <div id={errorId} role="alert" aria-live="assertive"
                    className="bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
                    <input
                      id="email" name="email" type="email" required autoComplete="email"
                      placeholder="correo@ejemplo.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>

                <button type="submit" disabled={isPending}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                  aria-busy={isPending}>
                  {isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                      <span>Enviando…</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" aria-hidden="true" />
                      Enviar código
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors underline underline-offset-2">
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}

          {/* ── Step 2: OTP code ── */}
          {step === 'code' && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
                  <ShieldCheck className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground tracking-tight">
                  Revisa tu correo
                </h2>
                <p className="text-sm text-muted mt-1.5">
                  Enviamos un código de 6 dígitos a<br />
                  <span className="font-medium text-foreground">{pendingEmail}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-4" aria-describedby={error ? errorId : undefined} noValidate>
                {error && (
                  <div id={errorId} role="alert" aria-live="assertive"
                    className="bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3 text-sm">
                    {error}
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
                  <label htmlFor="code" className="block text-sm font-medium text-foreground">
                    Código de verificación
                  </label>
                  <input
                    id="code" name="code" type="text" inputMode="numeric"
                    pattern="\d{6}" maxLength={6} required autoComplete="one-time-code"
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
                      Verificar código
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center space-y-2">
                <p className="text-sm text-muted">
                  <button type="button" onClick={() => { setStep('email'); setError('') }}
                    className="text-muted hover:text-foreground transition-colors underline underline-offset-2">
                    ← Cambiar correo electrónico
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ── Step 3: new password ── */}
          {step === 'password' && (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-3">
                  <Lock className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <h2 className="font-display text-xl font-semibold text-foreground tracking-tight">
                  Nueva contraseña
                </h2>
                <p className="text-sm text-muted mt-1.5">
                  Elige una contraseña segura para tu cuenta.
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4" aria-describedby={error ? errorId : undefined} noValidate>
                {error && (
                  <div id={errorId} role="alert" aria-live="assertive"
                    className="bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3 text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="new-password" className="block text-sm font-medium text-foreground">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
                    <input
                      id="new-password" name="password"
                      type={showPassword ? 'text' : 'password'}
                      required minLength={6} autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors p-1 rounded"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                      {showPassword
                        ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                        : <Eye    className="w-4 h-4" aria-hidden="true" />}
                    </button>
                  </div>
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

                <button type="submit" disabled={isPending || !pwValid}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                  aria-busy={isPending}>
                  {isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                      <span>Guardando…</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" aria-hidden="true" />
                      Cambiar contraseña
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
