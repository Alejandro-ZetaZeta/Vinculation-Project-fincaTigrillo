import type { Metadata, Viewport } from 'next'
import { DM_Sans, Syne } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { RegisterSW } from '@/components/pwa/RegisterSW'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--ft-font-sans',
})

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--ft-font-display',
})

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fincatigrillo.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  alternates: {
    canonical: '/',
  },
  title: 'Finca Tigrillo',
  description: 'Plataforma de gestión ganadera para el registro y monitoreo de animales de la Finca Tigrillo.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Finca Tigrillo',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tigrillo',
  },
  icons: {
    icon: '/TigrilloMobile.png',
    apple: '/TigrilloMobile.png',
  },
  verification: {
    google: 'o3DzClk0eI-CVW7kn3tbyHSPy-Gx-eOL8ce0zwBm6Ps',
  },
  openGraph: {
    type: 'website',
    siteName: 'Finca Tigrillo',
    title: 'Finca Tigrillo',
    description: 'Plataforma de gestión ganadera para el registro y monitoreo de animales de la Finca Tigrillo.',
    locale: 'es_EC',
  },
  twitter: {
    card: 'summary',
    title: 'Finca Tigrillo',
    description: 'Plataforma de gestión ganadera para el registro y monitoreo de animales de la Finca Tigrillo.',
  },
}

export const viewport: Viewport = {
  themeColor: '#0f3d2e',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Anti-flash theme script — runs before paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var t = localStorage.getItem('ft-theme');
                document.documentElement.setAttribute('data-theme', (t === 'dark' || t === 'light') ? t : 'light');
              })();
            `,
          }}
        />
      </head>
      <body className={`${dmSans.variable} ${syne.variable} min-h-screen bg-background text-foreground antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'Finca Tigrillo',
                url: appUrl,
                logo: `${appUrl}/faviconOficial.svg`,
                description: 'Plataforma de gestión ganadera para el registro y monitoreo de animales de la Finca Tigrillo.',
                foundingDate: '2025',
                areaServed: 'Ecuador',
              },
              {
                '@context': 'https://schema.org',
                '@type': 'WebApplication',
                name: 'Finca Tigrillo',
                url: appUrl,
                description: 'Plataforma de gestión ganadera para el registro y monitoreo de animales de la Finca Tigrillo.',
                applicationCategory: 'BusinessApplication',
                applicationSubCategory: 'Livestock Management',
                operatingSystem: 'Web',
                offers: {
                  '@type': 'Offer',
                  price: '0',
                  priceCurrency: 'USD',
                },
                inLanguage: 'es',
              },
            ]),
          }}
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <RegisterSW />
      </body>
    </html>
  )
}
