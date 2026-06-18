import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Iniciar Sesión — Finca Tigrillo',
  description: 'Accede a la plataforma de gestión ganadera de Finca Tigrillo. Inicia sesión para registrar y monitorear animales.',
  alternates: {
    canonical: '/login',
  },
  openGraph: {
    title: 'Iniciar Sesión — Finca Tigrillo',
    description: 'Accede a la plataforma de gestión ganadera de Finca Tigrillo.',
  },
  twitter: {
    title: 'Iniciar Sesión — Finca Tigrillo',
    description: 'Accede a la plataforma de gestión ganadera de Finca Tigrillo.',
  },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
