import { createInsForgeServerClient } from '@/lib/insforge/server'
import { getAccessToken } from '@/lib/auth/cookies'
import Link from 'next/link'
import { ArrowRight, PawPrint } from 'lucide-react'

const categoryIconSrcs: Record<string, string> = {
  'ganado-mayor': '/ReGanMayor.svg',
  'ganado-menor': '/ReGanMenor.svg',
}

const categoryColors: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  'ganado-mayor': {
    bg: 'hover:bg-amber-50 dark:hover:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800/40 hover:border-amber-300 dark:hover:border-amber-700',
    text: 'text-amber-700 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  'ganado-menor': {
    bg: 'hover:bg-emerald-50 dark:hover:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-700',
    text: 'text-emerald-700 dark:text-emerald-400',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
}

async function getCachedCategories(accessToken: string | undefined) {
  const insforge = createInsForgeServerClient(accessToken)
  const { data } = await insforge.database
    .from('animal_categories')
    .select('*')
    .order('display_order', { ascending: true })
  return data || []
}

export default async function AnimalsPage() {
  const accessToken = await getAccessToken()
  const categories = await getCachedCategories(accessToken)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Registrar Animal</h1>
        <p className="text-muted mt-1">Selecciona la categoría del animal que deseas registrar</p>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Inicio</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Categorías</span>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:max-w-5xl lg:mx-auto">
        {categories?.map((category: { id: string; name: string; slug: string; description: string; icon: string }) => {
          const iconSrc = categoryIconSrcs[category.slug]
          const colors = categoryColors[category.slug] || categoryColors['ganado-mayor']

          return (
            <Link
              key={category.id}
              href={`/dashboard/animals/${category.slug}`}
              aria-label={`Registrar ${category.name}`}
              className={`group relative bg-surface border ${colors.border} rounded-2xl p-6 lg:p-10 ${colors.bg} transition-all duration-200`}
            >
              {/* Icon */}
              <div className={`w-16 h-16 lg:w-24 lg:h-24 rounded-2xl ${colors.iconBg} flex items-center justify-center mb-5 lg:mb-7`}>
                {iconSrc ? (
                  <img src={iconSrc} alt="" role="presentation" className="w-full h-full p-2 object-contain dark:invert" />
                ) : (
                  <PawPrint className={`w-12 h-12 lg:w-16 lg:h-16 ${colors.text}`} aria-hidden="true" />
                )}
              </div>

              {/* Content */}
              <h3 className="text-xl lg:text-2xl font-bold text-foreground mb-2 lg:mb-3">
                {category.name}
              </h3>
              <p className="text-sm lg:text-base text-muted leading-relaxed">
                {category.description}
              </p>

              {/* Arrow — decorative */}
              <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-background flex items-center justify-center" aria-hidden="true">
                <ArrowRight className="w-4 h-4 text-primary" aria-hidden="true" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
