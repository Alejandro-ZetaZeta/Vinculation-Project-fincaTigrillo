import { Suspense } from 'react'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth/actions'
import { getAccessToken } from '@/lib/auth/cookies'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { PawPrint, ShoppingCart, CheckCircle, BarChart2, ArrowRight, TrendingUp, Receipt, Sprout } from 'lucide-react'
import { StudentKanban } from '@/components/activities/StudentKanban'
import { LocalDate } from '@/components/layout/LocalDate'

/* ─────────────────────────────────────────────
   Reference data
───────────────────────────────────────────── */
async function getCachedCatalog(accessToken: string | undefined) {
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
   Animal stats
───────────────────────────────────────────── */
async function getCachedAnimalStats(accessToken: string | undefined) {
  const insforge = createInsForgeServerClient(accessToken)
  const { data } = await insforge.database
    .from('animals')
    .select('id, status, created_at, type_id') as {
      data: { id: string; status: string; created_at: string; type_id: string }[] | null
    }
  return data || []
}

/* ─────────────────────────────────────────────
   Stats component
───────────────────────────────────────────── */
async function DashboardStats({ accessToken, isAdmin }: { accessToken: string | undefined, isAdmin: boolean }) {
  const [animals, { categories, types }] = await Promise.all([
    getCachedAnimalStats(accessToken),
    getCachedCatalog(accessToken),
  ])

  const totalAnimals  = animals.length
  const activeAnimals = animals.filter(a => a.status === 'activo').length
  const soldAnimals   = animals.filter(a => a.status === 'vendido').length

  const countByCategory = categories.map(cat => {
    const catTypeIds = types.filter(t => t.category_id === cat.id).map(t => t.id)
    const count = animals.filter(a => catTypeIds.includes(a.type_id)).length
    return { ...cat, count }
  })

  const recentAnimals = [...animals]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 4)

  const maxCount = Math.max(...countByCategory.map(c => c.count), 1)

  const stats = [
    {
      label: 'Total Animales',
      value: totalAnimals,
      icon: PawPrint,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      iconColor: 'text-emerald-600',
      gradient: 'from-emerald-500/10 to-emerald-500/5',
      border: 'border-emerald-200/60',
      stagger: 'stagger-1',
    },
    {
      label: 'Activos',
      value: activeAnimals,
      icon: CheckCircle,
      color: 'text-sky-600',
      bg: 'bg-sky-50 dark:bg-sky-900/20',
      iconColor: 'text-sky-600',
      gradient: 'from-sky-500/10 to-sky-500/5',
      border: 'border-sky-200/60',
      stagger: 'stagger-2',
    },
    {
      label: 'Vendidos',
      value: soldAnimals,
      icon: ShoppingCart,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      iconColor: 'text-amber-600',
      gradient: 'from-amber-500/10 to-amber-500/5',
      border: 'border-amber-200/60',
      stagger: 'stagger-3',
    },
  ]

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="list" aria-label="Estadísticas principales">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              role="listitem"
              className={`stat-card card-elevated animate-fade-up ${stat.stagger}
                bg-gradient-to-br ${stat.gradient}
                border ${stat.border}`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 rounded-2xl ${stat.bg} flex items-center justify-center shadow-sm`}>
                    <Icon className={`w-5 h-5 ${stat.iconColor}`} aria-hidden="true" />
                  </div>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500 opacity-60 mt-1" aria-hidden="true" />
                </div>
                <p
                  className="font-display text-3xl font-bold text-[--foreground] tabular-nums leading-none mb-1"
                  aria-label={`${stat.value} ${stat.label}`}
                >
                  {stat.value}
                </p>
                <p className="text-sm text-[--muted] font-medium">{stat.label}</p>
              </div>
            </div>
          )
        })}

        {/* Reports shortcut */}
        <Link
          href="/dashboard/reports"
          role="listitem"
          aria-label="Ver reportes operacionales"
          className="group card-elevated animate-fade-up stagger-4
            relative overflow-hidden
            bg-gradient-to-br from-[--primary]/12 via-[--primary]/6 to-transparent
            border border-[--primary]/25 hover:border-[--primary]/50
            flex flex-col justify-between"
        >
          {/* Decorative blob */}
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-[--primary]/8 blur-xl pointer-events-none" aria-hidden="true" />
          <div className="p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-2xl bg-[--primary]/12 group-hover:bg-[--primary]/22 flex items-center justify-center transition-colors shadow-sm">
                <BarChart2 className="w-5 h-5 text-[--primary]" aria-hidden="true" />
              </div>
              <ArrowRight
                className="w-4 h-4 text-[--primary]/50 group-hover:text-[--primary] group-hover:translate-x-0.5 transition-all duration-200 mt-1"
                aria-hidden="true"
              />
            </div>
            <p className="font-display text-base font-bold text-[--foreground]">Reportes</p>
            <p className="text-sm text-[--muted] mt-0.5">Operacionales</p>
          </div>
        </Link>
      </div>

      {/* ── Bottom panels ──────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'lg:grid-cols-2' : ''} gap-6 items-start`}>

        <div className="space-y-4">
          {/* Category breakdown with progress bars */}
          <div className="card-elevated p-6 animate-fade-up stagger-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-base font-semibold text-[--foreground] tracking-tight">
                Animales por Categoría
              </h2>
              <span className="text-xs font-semibold text-[--primary] bg-[--primary]/8 px-2.5 py-1 rounded-full border border-[--primary]/15">
                {totalAnimals} total
              </span>
            </div>

            {countByCategory.length > 0 ? (
              <div className="space-y-4">
                {countByCategory.map((cat, i) => {
                  const pct = totalAnimals > 0 ? Math.round((cat.count / totalAnimals) * 100) : 0
                  const barPct = maxCount > 0 ? (cat.count / maxCount) * 100 : 0
                  return (
                    <div key={cat.slug} className={`animate-fade-up`} style={{ animationDelay: `${0.05 + i * 0.06}s` }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-[--foreground]">{cat.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[--muted]">{pct}%</span>
                          <span className="text-sm font-bold text-[--primary] tabular-nums w-8 text-right">{cat.count}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-[--surface-hover] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[--primary-dark] to-[--primary-light] transition-all duration-700"
                          style={{ width: `${barPct}%` }}
                          role="progressbar"
                          aria-valuenow={cat.count}
                          aria-valuemin={0}
                          aria-valuemax={maxCount}
                          aria-label={`${cat.name}: ${cat.count} animales`}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[--surface-hover] flex items-center justify-center mb-3">
                  <PawPrint className="w-6 h-6 text-[--muted]" aria-hidden="true" />
                </div>
                <p className="text-sm text-[--muted]">No hay categorías configuradas</p>
              </div>
            )}
          </div>

          {/* Quick action buttons */}
          {isAdmin && (
            <div className="grid grid-cols-2 gap-3 animate-fade-up stagger-3">
              <Link
                href="/dashboard/events?tab=facturas"
                className="group flex items-center gap-2.5 px-4 py-3 rounded-xl
                           bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40
                           hover:border-amber-400 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                  <Receipt className="w-4.5 h-4.5 text-amber-600" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[--foreground] truncate">Agregar Factura</p>
                  <p className="text-xs text-[--muted] truncate">Registrar nueva factura</p>
                </div>
                <ArrowRight className="w-4 h-4 text-amber-400 ml-auto shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" aria-hidden="true" />
              </Link>

              <Link
                href="/dashboard/sembrios"
                className="group flex items-center gap-2.5 px-4 py-3 rounded-xl
                           bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40
                           hover:border-emerald-400 hover:shadow-sm transition-all duration-200"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                  <Sprout className="w-4.5 h-4.5 text-emerald-600" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[--foreground] truncate">Registrar Sembrío</p>
                  <p className="text-xs text-[--muted] truncate">Nuevo cultivo o plantación</p>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-400 ml-auto shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>

        {/* Recent activity — timeline style */}
        {isAdmin && recentAnimals.length > 0 && (
          <div className="card-elevated p-6 animate-fade-up stagger-3">
            <h2 className="font-display text-base font-semibold text-[--foreground] tracking-tight mb-5">
              Actividad Reciente
            </h2>
            <div className="space-y-1">
              {recentAnimals.map((animal, i) => {
                const animalType = types.find(t => t.id === animal.type_id)
                const statusStyles =
                  animal.status === 'activo'  ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                  animal.status === 'vendido' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                               'bg-gray-100 text-gray-600 border-gray-200'
                const dotColor =
                  animal.status === 'activo'  ? 'bg-emerald-500' :
                  animal.status === 'vendido' ? 'bg-amber-500' :
                                               'bg-gray-400'
                return (
                  <div
                    key={animal.id}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-[--surface-hover] transition-colors group animate-fade-up"
                    style={{ animationDelay: `${0.05 + i * 0.05}s` }}
                  >
                    {/* Timeline dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[--foreground] truncate">
                        {animalType?.name || 'Sin tipo'}
                      </p>
                      <p className="text-xs text-[--muted]">
                        {new Date(animal.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold border capitalize ${statusStyles}`}>
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
   Page
───────────────────────────────────────────── */
export default async function DashboardPage() {
  const user = await getCurrentUser()
  const accessToken = await getAccessToken()
  const firstName = user?.fullName?.split(' ')[0] || 'Usuario'
  const isAdmin = user?.role === 'admin'

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <span className="w-3 h-px bg-primary inline-block" aria-hidden="true" />
              <LocalDate />
            </p>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight">
              Hola, <span className="text-primary">{firstName}</span>
            </h1>
            <p className="text-muted mt-1.5 text-sm">
              {isAdmin
                ? 'Panel de administración — Gestiona el inventario ganadero de Finca Tigrillo.'
                : 'Panel de visualización — Consulta el inventario ganadero de Finca Tigrillo.'}
            </p>
          </div>

          {/* Quick actions pill */}
          <Link
            href={isAdmin ? '/dashboard/animals' : '/dashboard/activities'}
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl
                       bg-primary hover:bg-primary-dark text-white text-sm font-semibold
                       transition-all duration-200 shadow-sm hover:shadow-md
                       self-start sm:self-auto"
          >
            {isAdmin ? 'Registrar Animal' : 'Ver Actividades'}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Stats — stream in via PPR */}
      <Suspense fallback={<StatsSkeleton />}>
        <DashboardStats accessToken={accessToken} isAdmin={isAdmin} />
      </Suspense>

      {/* Student kanban */}
      {user?.role === 'viewer' && (
        <div className="animate-fade-up">
          <h2 className="font-display text-lg font-semibold mb-4 text-[--foreground] flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-[--primary] inline-block" aria-hidden="true" />
            Mis Actividades
          </h2>
          <StudentKanban userId={user.id} />
        </div>
      )}
    </div>
  )
}

/* Skeleton */
function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-shimmer border border-[--border-color] rounded-2xl h-32" />
        ))}
      </div>
      <div className="skeleton-shimmer border border-[--border-color] rounded-2xl h-48" />
    </div>
  )
}
