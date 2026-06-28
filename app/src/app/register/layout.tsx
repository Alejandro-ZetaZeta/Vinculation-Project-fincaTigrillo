import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Registro — Finca Tigrillo',
  description: 'Crea tu cuenta en Finca Tigrillo. Plataforma de gestión ganadera para estudiantes y docentes de ULEAM.',
  alternates: {
    canonical: '/register',
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  openGraph: {
    title: 'Registro — Finca Tigrillo',
    description: 'Crea tu cuenta en la plataforma de gestión ganadera de Finca Tigrillo.',
  },
  twitter: {
    title: 'Registro — Finca Tigrillo',
    description: 'Crea tu cuenta en la plataforma de gestión ganadera de Finca Tigrillo.',
  },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
