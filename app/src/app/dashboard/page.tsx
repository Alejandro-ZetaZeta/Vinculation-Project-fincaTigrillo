import { Suspense } from 'react'
import { cacheLife, cacheTag } from 'next/cache'
import { getCurrentUser } from '@/lib/auth/actions'
import { getAccessToken } from '@/lib/auth/cookies'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { PawPrint, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import { StudentKanban } from '@/components/activities/StudentKanban'

/* ─────────────────────────────────────────────
   Cached reference data — changes infrequently
───────────────────────────────────────────── */
async function getCachedCatalog(accessToken: string | undefined) {
  'use cache'
  cacheLife('hours')
  cacheTag('animal-catalog')

  const insforge = createInsForgeServerClient(accessToken)
  const [{ data: categories }, { data: types }] = await Promise.all([
    insforge.database.from('animal_categories').select('id, name, slug'),
    insforge.database.from('animal_types').select('id, category_id, name'),
  ])

  return {
    categories: (categories || []) as { id: string; name: string; slug: string }[],
    types: (types || []) as { id: string; category_id: string; name: string }[],
  }
}

/* ─────────────────────────────────────────────
   Cached animal stats — refresh every 5 min
───────────────────────────────────────────── */
async function getCachedAnimalStats(accessToken: string | undefined) {
  'use cache'
  cacheLife('minutes')
  cacheTag('animals')

  const insforge = createInsForgeServerClient(accessToken)
  const { data } = await insforge.database
    .from('animals')
    .select('id, status, created_at, type_id') as {
      data: { id: string; status: string; created_at: string; type_id: string }[] | null
    }
  return data || []
}

/* ─────────────────────────────────────────────
   Cached stats display component
───────────────────────────────────────────── */
async function DashboardStats({ accessToken, isAdmin }: { accessToken: string | undefined, isAdmin: boolean }) {
  'use cache'
  cacheLife('minutes')
  cacheTag('animals', 'animal-catalog')

  const [animals, { categories, types }] = await Promise.all([
    getCachedAnimalStats(accessToken),
    getCachedCatalog(accessToken),
  ])

  const totalAnimals  = animals.length
  const activeAnimals = animals.filter(a => a.status === 'activo').length

  const countByCategory = categories.map(cat => {
    const catTypeIds = types.filter(t => t.category_id === cat.id).map(t => t.id)
    const count = animals.filter(a => catTypeIds.includes(a.type_id)).length
    return { ...cat, count }
  })

  const recentAnimals = [...animals]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const stats = [
    { label: 'Total Animales', value: totalAnimals,    icon: PawPrint,    color: 'text-primary',       bg: 'bg-primary/10'       },
    { label: 'Activos',        value: activeAnimals,   icon: CheckCircle, color: 'text-success',       bg: 'bg-success/10'       },
    { label: 'Categorías',     value: categories.length, icon: TrendingUp, color: 'text-accent',       bg: 'bg-accent/10'        },
    { label: 'Especies',       value: types.length,    icon: Clock,       color: 'text-primary-light', bg: 'bg-primary-light/10' },
  ]

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="list" aria-label="Estadísticas principales">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} role="listitem" className="stat-card bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} aria-hidden="true" />
                </div>
              </div>
              <p className="font-display text-2xl font-bold text-foreground" aria-label={`${stat.value} ${stat.label}`}>{stat.value}</p>
              <p className="text-sm text-muted mt-0.5">{stat.label}</p>
            </div>
          )
        })}
      </div>

      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Category breakdown */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-display text-base font-semibold mb-4 text-foreground tracking-tight">Animales por Categoría</h2>
          {countByCategory.length > 0 ? (
            <div className="space-y-3">
              {countByCategory.map(cat => (
                <div key={cat.slug} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-surface-hover transition-colors">
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">{cat.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted text-center py-8">No hay categorías configuradas</p>
          )}
        </div>

        {/* Recent activity */}
        {isAdmin && recentAnimals.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h2 className="font-display text-base font-semibold mb-4 text-foreground tracking-tight">Actividad Reciente</h2>
            <div className="space-y-3">
              {recentAnimals.map(animal => {
                const animalType = types.find(t => t.id === animal.type_id)
                return (
                  <div key={animal.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-surface-hover transition-colors">
                    <div>
                      <p className="text-sm font-medium">{animalType?.name || 'Sin tipo'}</p>
                      <p className="text-xs text-muted">{new Date(animal.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      animal.status === 'activo'      ? 'bg-success/10 text-success' :
                      animal.status === 'vendido'     ? 'bg-accent/10 text-accent' :
                                                        'bg-muted/10 text-muted'
                    }`}>
                      {animal.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Page — runtime data (user) stays dynamic;
   stats stream in via Suspense (PPR)
───────────────────────────────────────────── */
export default async function DashboardPage() {
  // getCurrentUser reads cookies → must stay dynamic (no use cache)
  const user = await getCurrentUser()
  const accessToken = await getAccessToken()

  return (
    <div className="space-y-8">
      {/* Static welcome — personalised with runtime user data */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          Bienvenido, {user?.fullName?.split(' ')[0] || 'Usuario'} 👋
        </h1>
        <p className="text-muted mt-1.5">
          {user?.role === 'admin'
            ? 'Panel de administración — Gestiona el inventario ganadero'
            : 'Panel de visualización — Consulta el inventario ganadero'}
        </p>
      </div>

      {/* Cached stats — stream in via PPR */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats accessToken={accessToken} isAdmin={user?.role === 'admin'} />
      </Suspense>

      {/* Student kanban — dynamic, fresh per request */}
      {user?.role === 'viewer' && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-foreground">📋 Mis Actividades</h2>
          <StudentKanban userId={user.id} />
        </div>
      )}
    </div>
  )
}



/* Skeleton shown while cached data loads */
function StatsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-2xl p-5 h-28" />
        ))}
      </div>
      <div className="bg-surface border border-border rounded-2xl p-6 h-40" />
    </div>
  )
}
