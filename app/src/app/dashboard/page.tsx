import { getCurrentUser } from '@/lib/auth/actions'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { getAccessToken } from '@/lib/auth/cookies'
import { PawPrint, TrendingUp, CheckCircle, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  // Fetch stats
  const { data: animals } = await insforge.database.from('animals').select('id, status, created_at, type_id') as { data: { id: string; status: string; created_at: string; type_id: string }[] | null }
  const { data: categories } = await insforge.database.from('animal_categories').select('id, name, slug')
  const { data: types } = await insforge.database.from('animal_types').select('id, category_id, name')

  type AnimalRow = { id: string; status: string; created_at: string; type_id: string }
  type CategoryRow = { id: string; name: string; slug: string }
  type TypeRow = { id: string; category_id: string; name: string }

  const animalList = (animals || []) as AnimalRow[]
  const categoryList = (categories || []) as CategoryRow[]
  const typeList = (types || []) as TypeRow[]

  const totalAnimals = animalList.length
  const activeAnimals = animalList.filter(a => a.status === 'activo').length

  // Count by category
  const countByCategory = categoryList.map(cat => {
    const catTypeIds = typeList.filter(t => t.category_id === cat.id).map(t => t.id)
    const count = animalList.filter(a => catTypeIds.includes(a.type_id)).length
    return { ...cat, count }
  })

  // Recent animals
  const recentAnimals = [...animalList]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)

  const stats = [
    { label: 'Total Animales', value: totalAnimals, icon: PawPrint, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Activos', value: activeAnimals, icon: CheckCircle, color: 'text-success', bg: 'bg-success/10' },
    { label: 'Categorías', value: categories?.length || 0, icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Especies', value: types?.length || 0, icon: Clock, color: 'text-primary-light', bg: 'bg-primary-light/10' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Bienvenido, {user?.fullName?.split(' ')[0] || 'Usuario'} 👋
        </h1>
        <p className="text-muted mt-1">
          {user?.role === 'admin'
            ? 'Panel de administración — Gestiona el inventario ganadero'
            : 'Panel de visualización — Consulta el inventario ganadero'}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.label}
              className={`bg-surface border border-border rounded-2xl p-5 hover:shadow-lg transition-all duration-300 animate-fade-in stagger-${i + 1}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted">{stat.label}</p>
            </div>
          )
        })}
      </div>

      {/* Content Grid */}
      <div className={`grid grid-cols-1 ${user?.role === 'admin' ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* By Category */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Animales por Categoría</h2>
          {countByCategory.length > 0 ? (
            <div className="space-y-3">
              {countByCategory.map((cat: { slug: string; name: string; count: number }) => (
                <div key={cat.slug} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-surface-hover transition-colors">
                  <span className="text-sm font-medium">{cat.name}</span>
                  <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted text-center py-8">No hay categorías configuradas</p>
          )}
        </div>

        {/* Recent Activity - Admin only */}
        {user?.role === 'admin' && (
          <div className="bg-surface border border-border rounded-2xl p-6">
            <h2 className="text-lg font-semibold mb-4">Actividad Reciente</h2>
            {recentAnimals.length > 0 ? (
              <div className="space-y-3">
                {recentAnimals.map((animal) => {
                  const animalType = typeList.find(t => t.id === animal.type_id)
                  return (
                    <div key={animal.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-surface-hover transition-colors">
                      <div>
                        <p className="text-sm font-medium">{animalType?.name || 'Sin tipo'}</p>
                        <p className="text-xs text-muted">{new Date(animal.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        animal.status === 'activo' ? 'bg-success/10 text-success' :
                        animal.status === 'vendido' ? 'bg-accent/10 text-accent' :
                        'bg-muted/10 text-muted'
                      }`}>
                        {animal.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <PawPrint className="w-10 h-10 text-muted/30 mx-auto mb-2" />
                <p className="text-sm text-muted">No hay registros aún</p>
                <p className="text-xs text-muted mt-1">Comienza registrando tu primer animal</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
