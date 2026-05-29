import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

async function getAdminClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return { client: null, error: 'No autenticado', status: 401 }

  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user) return { client: null, error: 'Sesión inválida', status: 401 }

  const { data: profile } = await insforge.database
    .from('user_profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') return { client: null, error: 'Sin permisos de administrador', status: 403 }

  return { client: insforge, userId: userData.user.id, error: null, status: 200 }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const insforge = createInsForgeServerClient(accessToken)
    const { data, error } = await insforge.database
      .from('animal_weights')
      .select('*')
      .eq('animal_id', id)
      .order('recorded_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, userId, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const body = await request.json()
    const { weight_kg, recorded_at, notes } = body

    if (!weight_kg || !recorded_at) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    // Insert weight record
    const { data, error: dbError } = await client.database
      .from('animal_weights')
      .insert({
        animal_id: id,
        weight_kg,
        recorded_at,
        notes,
        created_by: userId
      })
      .select()

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

    // Update current weight in animals table
    // We only update if this new record is the most recent one
    const { data: latestWeight } = await client.database
      .from('animal_weights')
      .select('weight_kg')
      .eq('animal_id', id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestWeight) {
      await client.database
        .from('animals')
        .update({ weight_kg: latestWeight.weight_kg })
        .eq('id', id)
    }

    return NextResponse.json({ data: data?.[0] })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
