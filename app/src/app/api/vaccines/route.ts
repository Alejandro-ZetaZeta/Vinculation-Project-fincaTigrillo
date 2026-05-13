import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

type InsForgeClient = ReturnType<typeof createInsForgeServerClient>

const REPRO_STATE_CANONICAL: Record<string, string> = {
  prenada: 'preñada',
  'preñada': 'preñada',
  vacia: 'vacía',
  'vacía': 'vacía',
  lactando: 'lactando',
  seca: 'seca',
}

function normalizeAllowedReproStates(input: unknown): string[] | null {
  if (input == null) return null
  if (!Array.isArray(input)) return null
  const out: string[] = []
  for (const raw of input) {
    if (raw == null) continue
    const key = String(raw).trim().toLowerCase()
    const canon = REPRO_STATE_CANONICAL[key]
    if (!canon) continue
    if (!out.includes(canon)) out.push(canon)
  }
  return out.length > 0 ? out : null
}

async function getAuthClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return { client: null as InsForgeClient | null, role: null as string | null, userId: null as string | null }

  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user) return { client: null as InsForgeClient | null, role: null, userId: null }

  const { data: profile } = await insforge.database
    .from('user_profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  return { client: insforge, role: profile?.role || 'viewer', userId: userData.user.id }
}

export async function GET(request: NextRequest) {
  try {
    const { client } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const typeId = searchParams.get('type_id')
    const activeOnly = searchParams.get('active_only') !== '0'

    let query = client.database
      .from('vaccine_catalog')
      .select('*')
      .order('name', { ascending: true })

    if (activeOnly) query = query.eq('is_active', true)
    if (typeId) query = query.eq('target_type_id', typeId)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, role, userId } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const {
      name,
      description,
      target_type_id,
      target_sex,
      age_min_days,
      age_max_days,
      allowed_reproductive_states,
      default_next_dose_days,
      is_active,
    } = body

    if (!name || String(name).trim() === '') {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    const payload = {
      name: String(name).trim(),
      description: description ?? null,
      target_type_id: target_type_id ?? null,
      target_sex: target_sex ?? 'any',
      age_min_days: age_min_days === '' ? null : (age_min_days ?? null),
      age_max_days: age_max_days === '' ? null : (age_max_days ?? null),
      allowed_reproductive_states: normalizeAllowedReproStates(allowed_reproductive_states),
      default_next_dose_days: default_next_dose_days === '' ? null : (default_next_dose_days ?? null),
      is_active: typeof is_active === 'boolean' ? is_active : true,
      created_by: userId,
    }

    const { data, error } = await client.database
      .from('vaccine_catalog')
      .insert([payload])
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0] }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
