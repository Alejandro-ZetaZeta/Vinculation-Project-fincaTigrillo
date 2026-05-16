import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

async function getAuthClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return null
  return { client: createInsForgeServerClient(accessToken) }
}

async function requireAdmin(client: ReturnType<typeof createInsForgeServerClient>) {
  const { data: userData } = await client.auth.getCurrentUser()
  if (!userData?.user) return null
  const { data: profile } = await client.database
    .from('user_profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') return null
  return userData.user
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthClient()
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const animalId = searchParams.get('animal_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500)

    let query = auth.client.database
      .from('milk_production_events')
      .select('*')
      .order('recorded_date', { ascending: false })
      .limit(limit)

    if (animalId) query = query.eq('animal_id', animalId)

    const { data: events, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Enrich with animal name / code
    const animalIds = [...new Set((events || []).map((e: { animal_id: string }) => e.animal_id))]
    const animalsMap: Record<string, { name: string | null; identification_code: string | null; animal_types: { name: string; slug: string } | null }> = {}

    if (animalIds.length > 0) {
      const { data: animalsData } = await auth.client.database
        .from('animals')
        .select('id, name, identification_code, animal_types(name, slug)')
        .in('id', animalIds)

      for (const raw of (animalsData ?? []) as { id: string; name: string | null; identification_code: string | null; animal_types: { name: string; slug: string } | { name: string; slug: string }[] | null }[]) {
        const at = Array.isArray(raw.animal_types) ? raw.animal_types[0] ?? null : raw.animal_types
        animalsMap[raw.id] = { name: raw.name, identification_code: raw.identification_code, animal_types: at }
      }
    }

    const enriched = (events || []).map((ev: { animal_id: string } & Record<string, unknown>) => ({
      ...ev,
      animals: animalsMap[ev.animal_id] ?? null,
    }))

    return NextResponse.json(enriched)
  } catch (err) {
    console.error('GET /api/events/milk-production error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthClient()
    if (!auth) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const user = await requireAdmin(auth.client)
    if (!user) return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 })

    const body = await request.json()
    const { animal_id, recorded_date, liters_am, liters_pm, notes } = body

    if (!animal_id || !recorded_date) {
      return NextResponse.json({ error: 'Campos requeridos: animal_id, recorded_date' }, { status: 400 })
    }

    const am = liters_am != null && liters_am !== '' ? parseFloat(liters_am) : 0
    const pm = liters_pm != null && liters_pm !== '' ? parseFloat(liters_pm) : 0

    if (am === 0 && pm === 0) {
      return NextResponse.json({ error: 'Debe ingresar al menos una medición (mañana o tarde) mayor a 0' }, { status: 400 })
    }
    if (isNaN(am) || isNaN(pm) || am < 0 || pm < 0) {
      return NextResponse.json({ error: 'Valores de litros inválidos' }, { status: 400 })
    }

    // Validate: only bovino or caprino females
    const { data: animal } = await auth.client.database
      .from('animals')
      .select('id, sex, animal_types(slug)')
      .eq('id', animal_id)
      .maybeSingle()

    if (!animal) return NextResponse.json({ error: 'Animal no encontrado' }, { status: 404 })

    const rawTypes = (animal as unknown as { animal_types?: { slug?: string } | { slug?: string }[] | null }).animal_types
    const typeSlug = Array.isArray(rawTypes) ? rawTypes[0]?.slug : rawTypes?.slug
    const sexRaw = (animal as unknown as { sex?: string }).sex?.toLowerCase()

    if (typeSlug !== 'bovino' && typeSlug !== 'caprino') {
      return NextResponse.json({ error: 'La producción de leche solo aplica a bovinos y caprinos' }, { status: 400 })
    }
    if (sexRaw !== 'hembra') {
      return NextResponse.json({ error: 'Solo se registra producción de leche para hembras' }, { status: 400 })
    }

    const { data, error } = await auth.client.database
      .from('milk_production_events')
      .insert([{ animal_id, recorded_date, liters_am: am, liters_pm: pm, notes: notes || null, created_by: user.id }])
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/events/milk-production error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
