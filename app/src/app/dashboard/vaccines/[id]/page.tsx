import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Syringe, ChevronLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/actions'
import { getAccessToken } from '@/lib/auth/cookies'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { VaccineDetailClient, type Movement, type VaccinationWithAnimal } from '@/components/vaccines/VaccineDetailClient'
import type { Vaccine, AnimalTypeOption } from '@/components/vaccines/types'

const MOVEMENT_PAGE_SIZE = 50
const VACCINATION_PAGE_SIZE = 10

type AnimalTypeRow = { id: string; name: string; slug: string; category_id: string }
type UserProfileRow = { user_id: string; full_name: string | null }
type VaccineRow = Vaccine & { id: string; name: string }

export default async function VaccineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [user, accessToken] = await Promise.all([getCurrentUser(), getAccessToken()])
  if (!user) redirect('/login')
  if (user.role === 'viewer') redirect('/dashboard')

  const isAdmin = user.role === 'admin'
  const insforge = createInsForgeServerClient(accessToken)

  // ── Vaccine ─────────────────────────────────────────────────────────────
  const { data: vaccineRow, error: vError } = await insforge.database
    .from('vaccine_catalog')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (vError || !vaccineRow) notFound()
  const vaccine = vaccineRow as VaccineRow

  // ── Animal type (single, for display) ──────────────────────────────────
  const { data: typesData } = await insforge.database
    .from('animal_types')
    .select('id, name, slug, category_id')

  const types: AnimalTypeOption[] = (typesData || []) as AnimalTypeRow[]

  // ── Movements (admin only) + vaccinations (admin only) + author profiles
  let initialMovements: Movement[] = []
  let initialMovementsHasMore = false
  let recentVaccinations: VaccinationWithAnimal[] = []

  if (isAdmin) {
    const { data: mvData } = await insforge.database
      .from('vaccine_stock_movements')
      .select('*')
      .eq('vaccine_id', id)
      .order('created_at', { ascending: false })
      .limit(MOVEMENT_PAGE_SIZE + 1)

    const allMv = (mvData || []) as Movement[]
    initialMovementsHasMore = allMv.length > MOVEMENT_PAGE_SIZE
    initialMovements = allMv.slice(0, MOVEMENT_PAGE_SIZE)

    // Resolve author display names
    const authorIds = Array.from(
      new Set(initialMovements.map(m => m.created_by).filter((v): v is string => !!v))
    )
    let profiles: UserProfileRow[] = []
    if (authorIds.length > 0) {
      const { data: p } = await insforge.database
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', authorIds)
      profiles = (p || []) as UserProfileRow[]
    }
    const profileById = new Map(profiles.map(pr => [pr.user_id, pr.full_name]))
    initialMovements = initialMovements.map(m => ({
      ...m,
      created_by_name: m.created_by ? (profileById.get(m.created_by) || null) : null,
    }))

    // Recent vaccinations
    const { data: vaccData } = await insforge.database
      .from('animal_vaccinations')
      .select('id, vaccine_id, animal_id, applied_at, next_dose_at, notes, created_at, animals(id, name, identification_code)')
      .eq('vaccine_id', id)
      .order('applied_at', { ascending: false })
      .limit(VACCINATION_PAGE_SIZE)

    recentVaccinations = ((vaccData || []) as unknown as VaccinationWithAnimal[]).map(v => ({
      ...v,
      animals: Array.isArray(v.animals) ? v.animals[0] : v.animals,
    }))
  }

  return (
    <div className="space-y-8" id="vaccine-detail-page">
      <div>
        <Link
          href="/dashboard/vaccines"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary mb-2"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          Volver al catálogo
        </Link>
        <h1 className="font-display tracking-tight text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Syringe className="w-7 h-7 text-primary" aria-hidden="true" />
          {vaccine.name}
        </h1>
        <p className="text-muted mt-1">Detalle, stock y trazabilidad de movimientos</p>
      </div>

      <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard" className="hover:text-primary">Inicio</Link>
        <span>/</span>
        <Link href="/dashboard/vaccines" className="hover:text-primary">Vacunas</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{vaccine.name}</span>
      </nav>

      <VaccineDetailClient
        vaccine={vaccine}
        types={types}
        isAdmin={isAdmin}
        initialMovements={initialMovements}
        initialMovementsHasMore={initialMovementsHasMore}
        recentVaccinations={recentVaccinations}
      />
    </div>
  )
}
