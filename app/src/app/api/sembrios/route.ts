import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

async function getAuthClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return { client: null, role: null, userId: null }
  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user) return { client: null, role: null, userId: null }
  const { data: profile } = await insforge.database
    .from('user_profiles').select('role').eq('user_id', userData.user.id).maybeSingle()
  return { client: insforge, role: profile?.role || 'viewer', userId: userData.user.id }
}

// GET /api/sembrios?potrero_id=... — lista sembrios (opcionalmente filtrado por potrero)
export async function GET(request: NextRequest) {
  try {
    const { client } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const potreroId = searchParams.get('potrero_id')

    let query = client.database
      .from('sembrios')
      .select('*')
      .order('fecha_siembra', { ascending: false })

    if (potreroId) {
      query = query.eq('potrero_id', potreroId)
    }

    const { data, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// POST /api/sembrios — registrar un nuevo sembrío
export async function POST(request: NextRequest) {
  try {
    const { client, role, userId } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const {
      potrero_id,
      tipo_cultivo,
      variedad,
      area_sembrada_m2,
      fecha_siembra,
      fecha_cosecha_estimada,
      estado,
      observaciones,
    } = body

    if (!potrero_id || !tipo_cultivo || !area_sembrada_m2 || !fecha_siembra) {
      return NextResponse.json(
        { error: 'Potrero, cultivo, área y fecha de siembra son obligatorios' },
        { status: 400 }
      )
    }

    // Validar que el área sembrada no supere el área disponible del potrero
    const { data: potrero } = await client.database
      .from('potreros')
      .select('area_total_m2')
      .eq('id', potrero_id)
      .single()

    if (!potrero) {
      return NextResponse.json({ error: 'Potrero no encontrado' }, { status: 404 })
    }

    const { data: sembrosActivos } = await client.database
      .from('sembrios')
      .select('area_sembrada_m2')
      .eq('potrero_id', potrero_id)
      .in('estado', ['en_crecimiento', 'en_preparacion'])

    const ocupado = (sembrosActivos || []).reduce(
      (sum: number, s: { area_sembrada_m2: number }) => sum + Number(s.area_sembrada_m2),
      0
    )
    const disponible = Number(potrero.area_total_m2) - ocupado

    if (Number(area_sembrada_m2) > disponible) {
      return NextResponse.json(
        { error: `Área insuficiente. Disponible: ${disponible.toFixed(2)} m²` },
        { status: 400 }
      )
    }

    const { data, error } = await client.database
      .from('sembrios')
      .insert([{
        potrero_id,
        tipo_cultivo,
        variedad,
        area_sembrada_m2: Number(area_sembrada_m2),
        fecha_siembra,
        fecha_cosecha_estimada: fecha_cosecha_estimada || null,
        estado: estado || 'en_crecimiento',
        observaciones,
        created_by: userId,
      }])
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0] }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
