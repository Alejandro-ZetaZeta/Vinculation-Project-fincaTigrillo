'use client'

import { useState, useTransition } from 'react'
import { signUp, verifyEmail } from '@/lib/auth/actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserPlus, Mail, Lock, User, Eye, EyeOff, Leaf, ShieldCheck } from 'lucide-react'

export default function RegisterPage() {
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [verificationStep, setVerificationStep] = useState(false)
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const router = useRouter()

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await signUp(formData)
      if (result.success) {
        if (result.requireVerification) {
          setEmail(result.email || '')
          setVerificationStep(true)
        } else {
          router.push('/dashboard')
        }
      } else {
        setError(result.error || 'Error al registrarse')
      }
    })
  }

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      const result = await verifyEmail(email, otp)
      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error || 'Código inválido')
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Leaf className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Finca Tigrillo</h1>
          <p className="text-muted mt-1 text-sm">Crear cuenta nueva</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-xl">
          {!verificationStep ? (
            <>
              <h2 className="text-xl font-semibold mb-6 text-center">Registro</h2>
              <form onSubmit={handleSignUp} className="space-y-5">
                {error && (
                  <div className="bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3 text-sm animate-scale-in">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-sm font-medium">Nombre completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Tu nombre"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-sm font-medium">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="correo@ejemplo.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="password" className="block text-sm font-medium">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete="new-password"
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      Crear Cuenta
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Verificar correo</h2>
                <p className="text-sm text-muted mt-1">
                  Enviamos un código de 6 dígitos a <strong className="text-foreground">{email}</strong>
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-5">
                {error && (
                  <div className="bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3 text-sm animate-scale-in">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="otp" className="block text-sm font-medium text-center">Código de verificación</label>
                  <input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    required
                    placeholder="000000"
                    className="w-full text-center text-2xl font-mono tracking-[0.5em] py-3 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending || otp.length !== 6}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      Verificar
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-primary hover:text-primary-light font-medium transition-colors">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
