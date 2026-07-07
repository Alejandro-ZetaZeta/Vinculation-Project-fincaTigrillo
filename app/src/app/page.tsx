import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { getAccessToken } from '@/lib/auth/cookies'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fincatigrillo.vercel.app'

export const metadata: Metadata = {
  title: 'Finca Tigrillo — Sistema de Gestión Ganadera',
  description:
    'Plataforma integral para el registro, monitoreo y gestión del ganado de Finca Tigrillo. Control de animales, calendario de vacunas, actividades y reportes.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'Finca Tigrillo',
    title: 'Finca Tigrillo — Sistema de Gestión Ganadera',
    description:
      'Registra, monitorea y gestiona el ganado de Finca Tigrillo desde un solo lugar: animales, vacunas, actividades y reportes.',
    images: [
      {
        url: '/TigrilloMobile.png',
        width: 1024,
        height: 1024,
        alt: 'Finca Tigrillo',
      },
    ],
    locale: 'es_EC',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Finca Tigrillo — Sistema de Gestión Ganadera',
    description:
      'Registra, monitorea y gestiona el ganado de Finca Tigrillo desde un solo lugar.',
    images: ['/TigrilloMobile.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

const features = [
  {
    title: 'Registro de Animales',
    description:
      'Ficha individual por animal con especie, categoría, genealogía, estado sanitario y eventos reproductivos.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 4h16v6H4z" /><path d="M4 10v10h6V10" /><path d="M14 14h6v6h-6z" /><path d="M2 20h20" />
      </svg>
    ),
  },
  {
    title: 'Calendario de Vacunas',
    description:
      'Plan sanitario con recordatorios automáticos por animal y especie. Nunca pierdas una dosis.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 5a3 3 0 0 0-4 0L4 16v4h4l11-11a3 3 0 0 0 0-4z" /><path d="m13 7 4 4" />
      </svg>
    ),
  },
  {
    title: 'Actividades y Tareas',
    description:
      'Asignación de tareas a estudiantes con estados (pendiente, en curso, completada) y trazabilidad.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 2v4" /><path d="M16 2v4" /><path d="m9 14 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Reportes y Cálculos',
    description:
      'Indicadores de producción, alertas reproductivas y herramientas de cálculo ganadero listas para imprimir.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 3v18h18" /><path d="M7 14l3-3 4 4 5-6" />
      </svg>
    ),
  },
]

const ldjson = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Finca Tigrillo',
    url: appUrl,
    inLanguage: 'es',
    publisher: {
      '@type': 'Organization',
      name: 'Finca Tigrillo',
      logo: `${appUrl}/faviconOficial.svg`,
    },
  },
]

async function AuthGate() {
  const token = await getAccessToken()
  if (token) redirect('/dashboard')
  return null
}

export default async function HomePage() {
  await AuthGate()

  return (
    <main className="min-h-screen bg-background text-foreground" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <a href="#features" className="skip-link">Saltar al contenido</a>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldjson) }}
      />

      <header className="w-full border-b border-border" role="banner">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-2 px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-3 min-w-0">
            <Image
              src="/faviconOficial.svg"
              alt="Logo de Finca Tigrillo"
              width={36}
              height={36}
              className="object-contain dark:invert shrink-0"
            />
            <span className="font-display text-base sm:text-lg font-bold tracking-tight whitespace-nowrap truncate">Finca Tigrillo</span>
          </div>
          <nav aria-label="Acceso" className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link
              href="/login"
              className="px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-foreground hover:bg-surface-hover transition-colors min-h-[40px] flex items-center whitespace-nowrap"
            >
              <span className="sm:hidden">Entrar</span>
              <span className="hidden sm:inline">Iniciar sesión</span>
            </Link>
            <Link
              href="/register"
              className="px-2.5 sm:px-4 py-2 rounded-xl bg-primary text-white text-xs sm:text-sm font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background transition-colors min-h-[40px] flex items-center whitespace-nowrap"
            >
              Registrarse
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div
            className="w-[700px] h-[700px] rounded-full opacity-[0.07]"
            style={{ background: 'radial-gradient(circle, var(--primary-light) 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center justify-center rounded-2xl bg-primary/10 mb-6 overflow-hidden border border-primary/20">
            <Image
              src="/faviconOficial.svg"
              alt="Logo de Finca Tigrillo"
              width={88}
              height={88}
              className="object-contain dark:invert"
              priority
            />
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] mb-4">
            Gestión ganadera,
            <br />
            <span className="text-primary">simple y precisa</span>
          </h1>

          <p className="text-base sm:text-lg text-muted max-w-2xl mx-auto mb-8 leading-relaxed">
            Finca Tigrillo centraliza el registro de animales, el calendario sanitario,
            las actividades del personal y los reportes de producción en una sola plataforma.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background transition-all min-h-[48px]"
            >
              Crear cuenta gratis
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-surface border border-border text-foreground font-semibold hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background transition-all min-h-[48px]"
            >
              Ya tengo cuenta
            </Link>
          </div>

          <p className="mt-6 text-xs text-muted">
            Plataforma en español · Funciona en móvil, tablet y escritorio
          </p>
        </div>
      </section>

      <section id="features" aria-labelledby="features-title" className="py-16 sm:py-20 border-t border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <h2 id="features-title" className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Todo lo que tu finca necesita
            </h2>
            <p className="text-muted max-w-xl mx-auto">
              Diseñado para el trabajo diario en campo y la toma de decisiones basada en datos.
            </p>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 list-none">
            {features.map((f) => (
              <li
                key={f.title}
                className="card-elevated rounded-2xl p-6 flex flex-col items-start"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <span className="w-6 h-6 block">{f.icon}</span>
                </div>
                <h3 className="font-display text-lg font-semibold mb-2 text-foreground">
                  {f.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {f.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-border py-8" role="contentinfo">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted">
          <p>© 2026 Finca Tigrillo. Todos los derechos reservados.</p>
          <nav aria-label="Legal">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Acceder
            </Link>
          </nav>
        </div>
      </footer>
    </main>
  )
}
