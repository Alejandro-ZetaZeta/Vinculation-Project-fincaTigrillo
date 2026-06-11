import type { MetadataRoute } from 'next'

// Force static generation — sitemap must be pre-rendered XML, not a serverless function.
// Without this, Next.js may serve it dynamically which can cause "Could not be retrieved" in GSC.
export const dynamic = 'force-static'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://fincatigrillo.vercel.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${appUrl}/login`,
      lastModified: new Date('2026-01-01'),
      changeFrequency: 'yearly',
      priority: 1,
    },
    {
      url: `${appUrl}/register`,
      lastModified: new Date('2026-01-01'),
      changeFrequency: 'yearly',
      priority: 0.8,
    },
  ]
}
