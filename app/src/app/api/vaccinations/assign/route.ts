import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

type InsForgeClient = ReturnType<typeof createInsForgeServerClient>

async function getAdminClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken)
    return { client: null as InsForgeClient | null, error: 'No autenticado', status: 401, userId: null as string | null }

  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user)
    return { client: null as InsForgeClient | null, error: 'Sesión inválida', status: 401, userId: null }

  const { data: profile } = await insforge.database
    .from('user_profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin')
    return { client: null as InsForgeClient | null, error: 'Sin permisos', status: 403, userId: null }

  return { client: insforge, error: null as string | null, status: 200, userId: userData.user.id }
}

function addDaysISODate(dateISO: string, days: number): string {
  const base = new Date(`${dateISO}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

/** Extract a user-facing message from an RPC exception string. */
function parseRpcError(message: string): { userMessage: string; isStockError: boolean } {
  if (message.includes('stock_insuficiente:')) {
    return {
      userMessage: message.split('stock_insuficiente:')[1].trim(),
      isStockError: true,
    }
  }
  if (message.includes('vaccine_not_found:')) {
    return { userMessage: 'Vacuna no encontrada', isStockError: false }
  }
  if (message.includes('animal_ids_empty:')) {
    return { userMessage: 'Selecciona al menos un animal', isStockError: false }
  }
  return { userMessage: message, isStockError: false }
}

export async function POST(request: NextRequest) {
  try {
    const { client, error, status, userId } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const body = await request.json()
    const { animal_ids, vaccine_id, applied_at, next_dose_at, notes, doses_count } = body as {
      animal_ids: string[]
      vaccine_id: string
      applied_at: string
      next_dose_at?: string | null
      notes?: string | null
      // For batch animals (e.g. poultry), the caller can supply the actual
      // number of doses to deduct from stock (current live bird count).
      // If omitted, the RPC defaults to array_length(animal_ids).
      doses_count?: number | null
    }

    // --- Input validation (API layer) ---
    if (!Array.isArray(animal_ids) || animal_ids.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos un animal' }, { status: 400 })
    }
    if (!vaccine_id || !applied_at) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }
    if (doses_count !== undefined && doses_count !== null && (typeof doses_count !== 'number' || !Number.isInteger(doses_count) || doses_count <= 0)) {
      return NextResponse.json({ error: 'doses_count debe ser un entero positivo' }, { status: 400 })
    }

    // --- Fetch interval for next-dose logic and single-dose duplicate check ---
    // (These reads are pre-flight business logic; atomicity of stock is handled by RPC.)
    const { data: vax, error: vaxError } = await client.database
      .from('vaccine_catalog')
      .select('default_next_dose_days, total_doses')
      .eq('id', vaccine_id)
      .maybeSingle()

    if (vaxError) return NextResponse.json({ error: vaxError.message }, { status: 400 })
    if (!vax) return NextResponse.json({ error: 'Vacuna no encontrada' }, { status: 404 })

    const interval = (vax as { default_next_dose_days: number | null; total_doses: number | null }).default_next_dose_days
    const totalDoses = (vax as { default_next_dose_days: number | null; total_doses: number | null }).total_doses
    const isSingleDose = interval == null || interval === 0

    // --- Total dose limit guard ---
    if (totalDoses != null && totalDoses > 0) {
      const { data: existingDoses, error: existingDosesError } = await client.database
        .from('animal_vaccinations')
        .select('animal_id')
        .eq('vaccine_id', vaccine_id)
        .in('animal_id', animal_ids)

      if (existingDosesError) return NextResponse.json({ error: existingDosesError.message }, { status: 400 })

      const countMap = new Map<string, number>()
      for (const r of (existingDoses as { animal_id: string }[] ?? [])) {
        countMap.set(r.animal_id, (countMap.get(r.animal_id) ?? 0) + 1)
      }

      const overLimitIds = animal_ids.filter(id => (countMap.get(id) ?? 0) >= totalDoses)
      if (overLimitIds.length > 0) {
        return NextResponse.json(
          { error: `Límite de dosis alcanzado (máx. ${totalDoses}). Algunos animales ya completaron el esquema de vacunación.`, over_limit_animal_ids: overLimitIds },
          { status: 400 }
        )
      }
    }

    // --- Single-dose duplicate guard (business rule, not stock-related) ---
    if (isSingleDose) {
      const { data: existing, error: existingError } = await client.database
        .from('animal_vaccinations')
        .select('animal_id')
        .eq('vaccine_id', vaccine_id)
        .in('animal_id', animal_ids)

      if (existingError) return NextResponse.json({ error: existingError.message }, { status: 400 })
      const dupIds = Array.isArray(existing)
        ? (existing as { animal_id: string }[]).map(r => r.animal_id)
        : []
      if (dupIds.length > 0) {
        return NextResponse.json(
          { error: 'El animal ya tiene esta vacuna de dosis única', duplicate_animal_ids: dupIds },
          { status: 400 }
        )
      }
    }

    // --- Compute next dose date ---
    let computedNext: string | null = null
    if (!isSingleDose) {
      computedNext = next_dose_at ?? null
      if (!computedNext && typeof interval === 'number' && interval > 0) {
        computedNext = addDaysISODate(applied_at, interval)
      }
    }

    // --- Atomic RPC: stock check + bulk insert + stock decrement in one transaction ---
    // p_doses_count: when vaccinating a batch animal (e.g. a poultry batch of 280 birds),
    // pass the live bird count so the RPC deducts the correct number of doses.
    // If null/undefined, the RPC defaults to array_length(p_animal_ids).
    const { data: rpcData, error: rpcError } = await client.database.rpc(
      'assign_vaccines_and_deduct_stock',
      {
        p_vaccine_id:   vaccine_id,
        p_animal_ids:   animal_ids,
        p_applied_at:   applied_at,
        p_next_dose_at: computedNext,
        p_notes:        notes ?? null,
        p_created_by:   userId,
        p_doses_count:  typeof doses_count === 'number' ? doses_count : null,
      }
    )

    if (rpcError) {
      const { userMessage, isStockError } = parseRpcError(rpcError.message)
      return NextResponse.json(
        { error: userMessage, is_stock_error: isStockError },
        { status: 400 }
      )
    }

    const result = Array.isArray(rpcData) && rpcData.length > 0 ? rpcData[0] : rpcData
    return NextResponse.json(
      {
        inserted:        result?.inserted_count ?? animal_ids.length,
        stock_remaining: result?.stock_remaining ?? null,
      },
      { status: 201 }
    )
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
