import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

type InsForgeClient = ReturnType<typeof createInsForgeServerClient>

type VaccineIntervalRow = {
  default_next_dose_days: number | null
}

async function getAdminClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return { client: null as InsForgeClient | null, error: 'No autenticado', status: 401, userId: null as string | null }

  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user) return { client: null as InsForgeClient | null, error: 'Sesión inválida', status: 401, userId: null }

  const { data: profile } = await insforge.database
    .from('user_profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') return { client: null as InsForgeClient | null, error: 'Sin permisos', status: 403, userId: null }

  return { client: insforge, error: null as string | null, status: 200, userId: userData.user.id }
}

function addDaysISODate(dateISO: string, days: number): string {
  const base = new Date(`${dateISO}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

export async function POST(request: NextRequest) {
  try {
    const { client, error, status, userId } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const body = await request.json()
    const { animal_ids, vaccine_id, applied_at, next_dose_at, notes } = body as {
      animal_ids: string[]
      vaccine_id: string
      applied_at: string
      next_dose_at?: string | null
      notes?: string | null
    }

    if (!Array.isArray(animal_ids) || animal_ids.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos un animal' }, { status: 400 })
    }
    if (!vaccine_id || !applied_at) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    // Always read catalog interval to enforce single-dose rules.
    const { data: vax, error: vaxError } = await client.database
      .from('vaccine_catalog')
      .select('default_next_dose_days')
      .eq('id', vaccine_id)
      .maybeSingle()

    if (vaxError) return NextResponse.json({ error: vaxError.message }, { status: 400 })
    const interval = (vax as VaccineIntervalRow | null)?.default_next_dose_days
    const isSingleDose = interval == null || interval === 0

    // Prevent duplicates for single-dose vaccines.
    if (isSingleDose) {
      const { data: existing, error: existingError } = await client.database
        .from('animal_vaccinations')
        .select('animal_id')
        .eq('vaccine_id', vaccine_id)
        .in('animal_id', animal_ids)

      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 })
      const dupIds = Array.isArray(existing) ? (existing.map((r: { animal_id: string }) => r.animal_id)) : []
      if (dupIds.length > 0) {
        return NextResponse.json(
          { error: 'El animal ya tiene esta vacuna de dosis unica', duplicate_animal_ids: dupIds },
          { status: 400 }
        )
      }
    }

    // Enforce next dose insertion logic.
    // Single-dose (0 or null): always NULL. Multi-dose (>0): use provided or compute.
    let computedNext: string | null = null
    if (!isSingleDose) {
      computedNext = next_dose_at ?? null
      if (!computedNext && typeof interval === 'number' && interval > 0) {
        computedNext = addDaysISODate(applied_at, interval)
      }
    }

    const rows = animal_ids.map((animalId) => ({
      animal_id: animalId,
      vaccine_id,
      applied_at,
      next_dose_at: computedNext,
      notes: notes ?? null,
      created_by: userId,
    }))

    const { data, error: dbError } = await client.database
      .from('animal_vaccinations')
      .insert(rows)
      .select()

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })
    return NextResponse.json({ data: data || [], inserted: (data || []).length }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
