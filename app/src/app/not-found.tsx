import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Página no encontrada | Finca Tigrillo',
  description: 'La página que buscas no existe o ha sido movida.',
}

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 bg-background text-foreground"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Glow blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 flex items-center justify-center"
      >
        <div
          className="w-[500px] h-[500px] rounded-full opacity-[0.06]"
          style={{
            background: 'radial-gradient(circle, var(--primary-light) 0%, transparent 70%)',
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

        {/* 404 code */}
        <p className="font-display text-7xl font-extrabold text-primary/30 tracking-tight leading-none mb-2 select-none">
          404
        </p>

        <h1 className="font-display text-2xl font-bold text-foreground mb-2">
          Página no encontrada
        </h1>
        <p className="text-muted text-sm leading-relaxed mb-8 px-2">
          La ruta que buscas no existe o fue movida. Verifica la dirección
          o regresa al panel principal.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background transition-all min-h-[44px]"
          >
            {/* Home icon */}
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
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Ir al panel
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-surface border border-border text-foreground font-semibold text-sm hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background transition-all min-h-[44px]"
          >
            Iniciar sesión
          </Link>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted mt-10">
          © 2026 Finca Tigrillo · Sistema de Gestión Ganadera
        </p>
      </div>
    </div>
  )
}
