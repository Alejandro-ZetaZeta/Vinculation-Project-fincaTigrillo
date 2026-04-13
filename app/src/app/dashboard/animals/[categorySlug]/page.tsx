import { createInsForgeServerClient } from '@/lib/insforge/server'
import { getAccessToken } from '@/lib/auth/cookies'
import { getCurrentUser } from '@/lib/auth/actions'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Milk, Ribbon, Drumstick, Egg, ArrowRight, ArrowLeft, PawPrint } from 'lucide-react'

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  'Milk': Milk,
  'Ribbon': Ribbon,
  'Drumstick': Drumstick,
  'Egg': Egg,
}

const typeColors: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  'bovino': {
    bg: 'hover:bg-orange-50 dark:hover:bg-orange-950/20',
    border: 'border-orange-200 dark:border-orange-800/40 hover:border-orange-300',
    text: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
  },
  'equino': {
    bg: 'hover:bg-blue-50 dark:hover:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800/40 hover:border-blue-300',
    text: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  'porcino': {
    bg: 'hover:bg-pink-50 dark:hover:bg-pink-950/20',
    border: 'border-pink-200 dark:border-pink-800/40 hover:border-pink-300',
    text: 'text-pink-600 dark:text-pink-400',
    iconBg: 'bg-pink-100 dark:bg-pink-900/30',
  },
  'aves-de-corral': {
    bg: 'hover:bg-yellow-50 dark:hover:bg-yellow-950/20',
    border: 'border-yellow-200 dark:border-yellow-800/40 hover:border-yellow-300',
    text: 'text-yellow-600 dark:text-yellow-400',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
}

export default async function CategoryPage({ params }: { params: Promise<{ categorySlug: string }> }) {
  const { categorySlug } = await params
  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)
  const user = await getCurrentUser()

  const { data: category } = await insforge.database
    .from('animal_categories')
    .select('*')
    .eq('slug', categorySlug)
    .maybeSingle()

  if (!category) notFound()

  const { data: types } = await insforge.database
    .from('animal_types')
    .select('*')
    .eq('category_id', category.id)
    .order('display_order', { ascending: true })

  const isAdmin = user?.role === 'admin'

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{category.name}</h1>
        <p className="text-muted mt-1">{category.description}</p>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/dashboard/animals" className="hover:text-primary transition-colors">Categorías</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{category.name}</span>
      </div>

      {/* Back button */}
      <Link
        href="/dashboard/animals"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a categorías
      </Link>

      {/* Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {types?.map((type: { id: string; name: string; slug: string; description: string; icon: string }, i: number) => {
          const IconComponent = typeIcons[type.icon] || PawPrint
          const colors = typeColors[type.slug] || typeColors['bovino']

          return (
            <Link
              key={type.id}
              href={isAdmin ? `/dashboard/animals/register/${type.slug}` : '#'}
              className={`group relative bg-surface border ${colors.border} rounded-2xl p-6 transition-all duration-300 ${colors.bg} ${
                isAdmin ? 'hover:shadow-xl hover:-translate-y-1 cursor-pointer' : 'opacity-80 cursor-default'
              } animate-fade-in stagger-${i + 1}`}
              onClick={isAdmin ? undefined : (e) => e.preventDefault()}
            >
              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl ${colors.iconBg} flex items-center justify-center mb-5 ${isAdmin ? 'group-hover:scale-110' : ''} transition-transform duration-300`}>
                <IconComponent className={`w-8 h-8 ${colors.text}`} />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                {type.name}
              </h3>
              <p className="text-sm text-muted leading-relaxed mb-4">
                {type.description}
              </p>

              {/* Action text */}
              {isAdmin ? (
                <p className="text-sm font-medium text-primary flex items-center gap-1">
                  Registrar {type.name}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </p>
              ) : (
                <p className="text-xs text-muted italic">Solo administradores pueden registrar</p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
