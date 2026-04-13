import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Finca Tigrillo — Sistema de Gestión Ganadera',
  description: 'Plataforma de gestión ganadera para el registro y monitoreo de animales de la Finca Tigrillo.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
