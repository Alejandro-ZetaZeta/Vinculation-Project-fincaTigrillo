import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'
import { calcFechaParto } from '@/lib/formulas'

async function getAuthClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return null
  return { client: createInsForgeServerClient(accessToken), token: accessToken }
}

// GET: Listar eventos reproductivos (opcionalmente filtrado por animal_id)
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthClient()
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const animalId = searchParams.get('animal_id')

    // Use flat select to avoid nested join issues with the ORM
    let query = auth.client.database
      .from('reproductive_events')
      .select('*')
      .order('event_date', { ascending: false })

    if (animalId) {
      query = query.eq('animal_id', animalId)
    }

    const { data: events, error } = await query

    if (error) {
      console.error('GET reproductive_events DB error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enrich with animal data + sire data
    const animalIds = [...new Set((events || []).map((e: { animal_id: string }) => e.animal_id))]
    const sireIds   = [...new Set((events || []).filter((e: { sire_id?: string }) => e.sire_id).map((e: { sire_id: string }) => e.sire_id))]

    let animalsMap: Record<string, { name: string | null; identification_code: string | null; animal_types: { name: string; slug: string } | null }> = {}
    let siresMap: Record<string, string> = {}

    if (animalIds.length > 0) {
      const { data: animalsData } = await auth.client.database
        .from('animals')
        .select('id, name, identification_code, animal_types(name, slug)')
        .in('id', animalIds)

      if (animalsData) {
        for (const raw of animalsData as { id: string; name: string | null; identification_code: string | null; animal_types: { name: string; slug: string } | { name: string; slug: string }[] | null }[]) {
          const at = Array.isArray(raw.animal_types) ? raw.animal_types[0] ?? null : raw.animal_types
          animalsMap[raw.id] = { name: raw.name, identification_code: raw.identification_code, animal_types: at }
        }
      }
    }

    if (sireIds.length > 0) {
      const { data: siresData } = await auth.client.database
        .from('animals')
        .select('id, name, identification_code')
        .in('id', sireIds)
      if (siresData) {
        for (const s of siresData as { id: string; name: string | null; identification_code: string | null }[]) {
          siresMap[s.id] = s.name || s.identification_code || s.id
        }
      }
    }

    // Merge animal + sire info into events
    const enriched = (events || []).map((ev: { animal_id: string; sire_id?: string } & Record<string, unknown>) => ({
      ...ev,
      animals: animalsMap[ev.animal_id] || null,
      sire_name: ev.sire_id ? (siresMap[ev.sire_id] || null) : null,
    }))

    return NextResponse.json(enriched)
  } catch (err) {
    console.error('GET /api/reproductive-events error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST: Registrar nuevo evento reproductivo
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthClient()
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Verificar admin
    const { data: userData } = await auth.client.auth.getCurrentUser()
    if (!userData?.user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

    const { data: profile } = await auth.client.database
      .from('user_profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 })
    }

    const body = await request.json()
    const { animal_id, event_type, event_date, notes, species_slug, sire_id } = body

    if (!animal_id || !event_type || !event_date) {
      return NextResponse.json({ error: 'Campos requeridos: animal_id, event_type, event_date' }, { status: 400 })
    }

    // Calcular fecha estimada de parto si es monta o inseminación
    let expected_due_date: string | null = null
    if ((event_type === 'monta_natural' || event_type === 'inseminacion') && species_slug) {
      const dueDate = calcFechaParto(new Date(event_date + 'T12:00:00'), species_slug)
      if (dueDate) {
        expected_due_date = dueDate.toISOString().split('T')[0]
      }
    }

    const insertPayload = {
      animal_id,
      event_type,
      event_date,
      expected_due_date,
      notes: notes || null,
      sire_id: (event_type === 'monta_natural' && sire_id) ? sire_id : null,
      created_by: userData.user.id,
    }

    console.log('POST reproductive_events payload:', JSON.stringify(insertPayload))

    const { data, error } = await auth.client.database
      .from('reproductive_events')
      .insert([insertPayload])
      .select()

    if (error) {
      console.error('POST reproductive_events DB error:', JSON.stringify(error))
      return NextResponse.json({ error: error.message || 'Error al guardar evento' }, { status: 400 })
    }

    return NextResponse.json({ data: data?.[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/reproductive-events error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
