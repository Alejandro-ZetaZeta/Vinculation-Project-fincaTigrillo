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

    let query = auth.client.database
      .from('reproductive_events')
      .select('*, animals(name, identification_code, animal_types(name, slug, animal_categories(name, slug)))')
      .order('event_date', { ascending: false })

    if (animalId) {
      query = query.eq('animal_id', animalId)
    }

    const { data, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
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
    const { animal_id, event_type, event_date, notes, species_slug } = body

    if (!animal_id || !event_type || !event_date) {
      return NextResponse.json({ error: 'Campos requeridos: animal_id, event_type, event_date' }, { status: 400 })
    }

    // Calcular fecha estimada de parto si es monta o inseminación
    let expected_due_date: string | null = null
    if ((event_type === 'monta_natural' || event_type === 'inseminacion') && species_slug) {
      const dueDate = calcFechaParto(new Date(event_date), species_slug)
      if (dueDate) {
        expected_due_date = dueDate.toISOString().split('T')[0]
      }
    }

    const { data, error } = await auth.client.database
      .from('reproductive_events')
      .insert([{
        animal_id,
        event_type,
        event_date,
        expected_due_date,
        notes: notes || null,
        created_by: userData.user.id,
      }])
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/reproductive-events error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
