import { createInsForgeServerClient } from '@/lib/insforge/server'
import { getAccessToken } from '@/lib/auth/cookies'
import { getCurrentUser } from '@/lib/auth/actions'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, ArrowLeft, PawPrint } from 'lucide-react'

const typeIconSrcs: Record<string, string> = {
  'bovino': '/ReBovino.svg',
  'equino': '/ReEquino-_3_.svg',
  'porcino': '/RePorcino.svg',
  'patos': '/RePatos.svg',
  'aves-de-corral': '/ReAves.svg',
  'caprino': '/ReCaprino.svg',
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
  'patos': {
    bg: 'hover:bg-cyan-50 dark:hover:bg-cyan-950/20',
    border: 'border-cyan-200 dark:border-cyan-800/40 hover:border-cyan-300',
    text: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  'caprino': {
    bg: 'hover:bg-lime-50 dark:hover:bg-lime-950/20',
    border: 'border-lime-200 dark:border-lime-800/40 hover:border-lime-300',
    text: 'text-lime-700 dark:text-lime-400',
    iconBg: 'bg-lime-100 dark:bg-lime-900/30',
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
    <div className="space-y-8">
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
        className="group inline-flex items-center gap-2 text-sm text-muted hover:text-primary border border-border hover:border-primary/40 hover:bg-primary/10 transition-all duration-200 px-3 py-1.5 rounded-lg"
      >
        <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
        Volver a categorías
      </Link>

      {/* Type Cards */}
      {(() => {
        const isSmallGrid = types && types.length <= 2
        return (
          <div className={`grid grid-cols-1 md:grid-cols-2 gap-6${isSmallGrid ? ' lg:max-w-2xl lg:mx-auto' : ' lg:grid-cols-3'}`}>
            {types?.map((type: { id: string; name: string; slug: string; description: string; icon: string }) => {
              const iconSrc = typeIconSrcs[type.slug]
              const colors = typeColors[type.slug] || typeColors['bovino']

              return (
                <Link
                  key={type.id}
                  href={isAdmin ? `/dashboard/animals/register/${type.slug}` : '#'}
                  className={`group relative bg-surface border ${colors.border} rounded-2xl p-6 ${colors.bg} ${
                    isAdmin ? 'cursor-pointer' : 'opacity-80 cursor-default'
                  }`}
                  onClick={isAdmin ? undefined : (e) => e.preventDefault()}
                >
                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl ${colors.iconBg} flex items-center justify-center mb-5`}>
                    {iconSrc ? (
                      <img src={iconSrc} alt={type.name} className="w-full h-full p-1.5 object-contain dark:invert" />
                    ) : (
                      <PawPrint className={`w-12 h-12 ${colors.text}`} />
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {type.name}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed mb-4">
                    {type.description}
                  </p>

                  {/* Action text */}
                  {isAdmin ? (
                    <p className="text-sm font-medium text-primary flex items-center gap-1">
                      Registrar {type.name}
                      <ArrowRight className="w-4 h-4" />
                    </p>
                  ) : (
                    <p className="text-xs text-muted italic">Solo administradores pueden registrar</p>
                  )}
                </Link>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}
