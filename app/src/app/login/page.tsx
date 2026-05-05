'use client'

import { useState, useTransition, useId } from 'react'
import { signIn } from '@/lib/auth/actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogIn, Mail, Lock, Eye, EyeOff, Sun, Moon } from 'lucide-react'
import Image from 'next/image'
import { useTheme } from '@/components/ThemeProvider'

export default function LoginPage() {
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const { theme, toggleTheme } = useTheme()
  const errorId = useId()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await signIn(formData)
      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error || 'Error al iniciar sesión')
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative bg-background">

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2.5 rounded-xl bg-surface border border-border text-muted hover:text-foreground hover:bg-surface-hover shadow-sm transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        id="login-theme-toggle"
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
              src="/eloyAocelote1.png"
              alt="Logo de Finca Tigrillo"
              width={80}
              height={80}
              className="object-contain"
            />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground tracking-tight">Finca Tigrillo</h1>
          <p className="text-muted mt-1.5 text-sm">Sistema de Gestión Ganadera</p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-xl">
          <h2 className="font-display text-xl font-semibold mb-6 text-center text-foreground tracking-tight">
            Iniciar Sesión
          </h2>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            aria-describedby={error ? errorId : undefined}
            noValidate
          >
            {/* Error alert */}
            {error && (
              <div
                id={errorId}
                role="alert"
                aria-live="assertive"
                className="bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3 text-sm"
              >
                {error}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
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

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" aria-hidden="true" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors p-1 rounded"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" aria-hidden="true" />
                    : <Eye    className="w-4 h-4" aria-hidden="true" />
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2.5 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 min-h-[44px]"
              aria-busy={isPending}
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
                  <span>Iniciando sesión…</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" aria-hidden="true" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted">
              ¿No tienes cuenta?{' '}
              <Link
                href="/register"
                className="text-primary hover:text-primary-dark font-semibold transition-colors underline underline-offset-2"
              >
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted/60 mt-6">
          © 2026 Finca Tigrillo. Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
