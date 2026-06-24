'use client'

import { useEffect } from 'react'
import Image from 'next/image'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

function isNetworkError(error: Error): boolean {
  const msg = (error.message || '').toLowerCase()
  return (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('timeout') ||
    msg.includes('load failed') ||
    msg.includes('net::') ||
    msg.includes('connection')
  )
}

function isTimeoutError(error: Error): boolean {
  const msg = (error.message || '').toLowerCase()
  return msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborted')
}

function getErrorContent(error: Error): { title: string; description: string; icon: string } {
  if (isTimeoutError(error)) {
    return {
      icon: '⏱️',
      title: 'Tiempo de espera agotado',
      description:
        'La solicitud tardó demasiado en responder. Verifica tu conexión a internet e inténtalo de nuevo.',
    }
  }
  if (isNetworkError(error)) {
    return {
      icon: '📡',
      title: 'Sin conexión',
      description:
        'No se pudo conectar al servidor. Asegúrate de estar conectado a internet e intenta de nuevo.',
    }
  }
  return {
    icon: '⚠️',
    title: 'Algo salió mal',
    description:
      'Ocurrió un error inesperado. Puedes intentarlo de nuevo o regresar al inicio.',
  }
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to console in dev — replace with error-reporting service if needed
    console.error('[GlobalError]', error)
  }, [error])

  const { icon, title, description } = getErrorContent(error)

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 bg-background text-foreground"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Glow blob */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div
          className="w-[500px] h-[500px] rounded-full opacity-[0.05]"
          style={{
            background: 'radial-gradient(circle, var(--danger) 0%, transparent 70%)',
          }}
        />
      </div>

      <div className="relative w-full max-w-sm text-center animate-fade-up">
        {/* Logo */}
        <div className="inline-flex items-center justify-center rounded-2xl bg-primary/10 mb-6 overflow-hidden border border-primary/20">
          <Image
            src="/faviconOficial.svg"
            alt="Logo de Finca Tigrillo"
            width={72}
            height={72}
            className="object-contain dark:invert"
          />
        </div>

        {/* Icon */}
        <div className="text-5xl mb-4 select-none" role="img" aria-label={title}>
          {icon}
        </div>

        <h1 className="font-display text-2xl font-bold text-foreground mb-3">
          {title}
        </h1>
        <p className="text-muted text-sm leading-relaxed mb-8 px-2">
          {description}
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background transition-all min-h-[44px]"
          >
            {/* Refresh icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            Intentar de nuevo
          </button>
          <a
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-surface border border-border text-foreground font-semibold text-sm hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background transition-all min-h-[44px]"
          >
            Iniciar sesión
          </a>
        </div>

        {/* Error detail (dev / digest) */}
        {error.digest && (
          <p className="text-xs text-muted/50 mt-6 font-mono">
            Referencia: {error.digest}
          </p>
        )}

        {/* Footer */}
        <p className="text-xs text-muted mt-8">
          © 2026 Finca Tigrillo · Sistema de Gestión Ganadera
        </p>
      </div>
    </div>
  )
}
