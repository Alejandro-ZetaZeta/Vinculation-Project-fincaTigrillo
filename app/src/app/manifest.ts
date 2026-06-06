import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Finca Tigrillo — Sistema de Gestión Ganadera',
    short_name: 'Tigrillo',
    description:
      'Plataforma de gestión ganadera para el registro y monitoreo de animales de la Finca Tigrillo.',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f3d2e',
    theme_color: '#0f3d2e',
    lang: 'es',
    icons: [
      {
        src: '/faviconOficial.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/faviconOficial.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  }
}
