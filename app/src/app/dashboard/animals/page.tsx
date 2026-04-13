import { createInsForgeServerClient } from '@/lib/insforge/server'
import { getAccessToken } from '@/lib/auth/cookies'
import Link from 'next/link'
import { Beef, Bird, ArrowRight, PawPrint } from 'lucide-react'

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Beef': Beef,
  'Bird': Bird,
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

export default async function AnimalsPage() {
  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  const { data: categories } = await insforge.database
    .from('animal_categories')
    .select('*')
    .order('display_order', { ascending: true })

  return (
    <div className="space-y-8 animate-fade-in">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories?.map((category: { id: string; name: string; slug: string; description: string; icon: string }, i: number) => {
          const IconComponent = categoryIcons[category.icon] || PawPrint
          const colors = categoryColors[category.slug] || categoryColors['ganado-mayor']

          return (
            <Link
              key={category.id}
              href={`/dashboard/animals/${category.slug}`}
              className={`group relative bg-surface border ${colors.border} rounded-2xl p-6 transition-all duration-300 ${colors.bg} hover:shadow-xl hover:-translate-y-1 animate-fade-in stagger-${i + 1}`}
            >
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl ${colors.iconBg} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <IconComponent className={`w-8 h-8 ${colors.text}`} />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                {category.name}
              </h3>
              <p className="text-sm text-muted leading-relaxed">
                {category.description}
              </p>

              {/* Arrow */}
              <div className="absolute top-6 right-6 w-8 h-8 rounded-full bg-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                <ArrowRight className="w-4 h-4 text-primary" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
