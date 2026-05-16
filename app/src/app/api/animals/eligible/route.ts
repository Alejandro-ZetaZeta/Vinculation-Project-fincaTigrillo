import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

type VaccineTarget = {
  id: string
  target_type_id: string | null
  target_sex: 'any' | 'macho' | 'hembra' | 'mixto'
  age_min_days: number | null
  age_max_days: number | null
  allowed_reproductive_states: string[] | null
  is_active: boolean
}

const ALLOWED_REPRO_STATES = new Set(['preñada', 'vacía', 'lactando', 'seca'])

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const insforge = createInsForgeServerClient(accessToken)

    const { searchParams } = new URL(request.url)
    const vaccineId = searchParams.get('vaccine_id')
    if (!vaccineId) return NextResponse.json({ error: 'vaccine_id es obligatorio' }, { status: 400 })

    const { data: vaccine, error: vaxError } = await insforge.database
      .from('vaccine_catalog')
      .select('id, target_type_id, target_sex, age_min_days, age_max_days, allowed_reproductive_states, is_active')
      .eq('id', vaccineId)
      .maybeSingle()

    if (vaxError) return NextResponse.json({ error: vaxError.message }, { status: 400 })
    if (!vaccine) return NextResponse.json({ error: 'Vacuna no encontrada' }, { status: 404 })
    const v = vaccine as VaccineTarget
    if (v.is_active === false) return NextResponse.json({ error: 'Vacuna inactiva' }, { status: 400 })

    let query = insforge.database
      .from('animals')
      .select('id, name, identification_code, sex, birth_date, status, animal_types(id, name, slug)')
      .eq('status', 'activo')

    const targetTypeId = v.target_type_id
    if (targetTypeId) query = query.eq('type_id', targetTypeId)

    const targetSex = v.target_sex
    if (targetSex !== 'any') query = query.eq('sex', targetSex)

    // Reproductive-state restriction: when present, exclude female animals whose estado_reproductivo is not allowed.
    // estado_reproductivo is stored on animals.metadata.
    const allowedStates = Array.isArray(v.allowed_reproductive_states)
      ? v.allowed_reproductive_states
        .filter(s => typeof s === 'string')
        .map(s => s.trim().toLowerCase())
        .filter(s => ALLOWED_REPRO_STATES.has(s))
      : []

    if (allowedStates.length > 0) {
      if (targetSex === 'hembra') {
        // Only females: require matching estado_reproductivo.
        // PostgREST allows JSON-path column filtering with metadata->>estado_reproductivo.
        query = query.in('metadata->>estado_reproductivo', allowedStates)
      } else if (targetSex === 'any') {
        // Any sex: keep non-females, and only keep females that match allowed states.
        const inList = allowedStates.join(',')
        query = query.or(`sex.neq.hembra,metadata->>estado_reproductivo.in.(${inList})`)
      }
    }

    // Age range: translate to birth_date bounds relative to today.
    const minDays = v.age_min_days
    const maxDays = v.age_max_days
    const today = new Date()

    if (typeof minDays === 'number') {
      // must be at least minDays old => birth_date <= today - minDays
      const latestBirth = new Date(today)
      latestBirth.setDate(latestBirth.getDate() - minDays)
      query = query.lte('birth_date', isoDate(latestBirth))
    }
    if (typeof maxDays === 'number') {
      // must be at most maxDays old => birth_date >= today - maxDays
      const earliestBirth = new Date(today)
      earliestBirth.setDate(earliestBirth.getDate() - maxDays)
      query = query.gte('birth_date', isoDate(earliestBirth))
    }

    // If any age restriction exists, exclude animals without birth_date.
    if (typeof minDays === 'number' || typeof maxDays === 'number') {
      query = query.not('birth_date', 'is', null)
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
