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

export const metadata: Metadata = {
  title: 'Finca Tigrillo — Sistema de Gestión Ganadera',
  description: 'Plataforma de gestión ganadera para el registro y monitoreo de animales de la Finca Tigrillo.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Finca Tigrillo',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Tigrillo',
  },
  icons: {
    icon: '/faviconOficial.svg',
    apple: '/faviconOficial.svg',
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
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <RegisterSW />
      </body>
    </html>
  )
}
