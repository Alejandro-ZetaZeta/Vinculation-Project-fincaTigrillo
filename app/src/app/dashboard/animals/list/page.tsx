import { createInsForgeServerClient } from '@/lib/insforge/server'
import { getAccessToken } from '@/lib/auth/cookies'
import { getCurrentUser } from '@/lib/auth/actions'
import Link from 'next/link'
import { ClipboardList, PawPrint } from 'lucide-react'
import { AnimalListClient } from '@/components/animals/AnimalListClient'

export default async function AnimalsListPage() {
  const user = await getCurrentUser()
  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)
  const isAdmin = user?.role === 'admin'

  const { data: animals } = await insforge.database
    .from('animals')
    .select('*, animal_types(name, slug, animal_categories(name, slug))')
    .order('created_at', { ascending: false })

  const { data: categories } = await insforge.database
    .from('animal_categories')
    .select('id, name, slug')
    .order('display_order', { ascending: true })

  const { data: types } = await insforge.database
    .from('animal_types')
    .select('id, name, slug, category_id')
    .order('display_order', { ascending: true })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
            <ClipboardList className="w-7 h-7 text-primary" />
            Inventario de Animales
          </h1>
          <p className="text-muted mt-1">
            {animals?.length || 0} animal{(animals?.length || 0) !== 1 ? 'es' : ''} registrado{(animals?.length || 0) !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Inicio</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Inventario</span>
      </div>

      {animals && animals.length > 0 ? (
        <AnimalListClient
          animals={animals}
          categories={categories || []}
          types={types || []}
          isAdmin={isAdmin}
        />
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <PawPrint className="w-12 h-12 text-muted/30 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Sin registros</h3>
          <p className="text-sm text-muted mb-4">Aún no se han registrado animales en la finca</p>
          {isAdmin && (
            <Link
              href="/dashboard/animals"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark"
            >
              <PawPrint className="w-4 h-4" />
              Registrar primer animal
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
