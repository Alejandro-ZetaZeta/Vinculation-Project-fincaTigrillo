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
    .from('user_profiles').select('role').eq('user_id', userData.user.id).maybeSingle()
  if (profile?.role !== 'admin') return { client: null, error: 'Sin permisos de administrador', status: 403 }
  return { client: insforge, error: null, status: 200 }
}

// PATCH /api/sembrios/[id] — actualizar estado, rendimiento, fechas
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const body = await request.json()
    const {
      tipo_cultivo, variedad, area_sembrada_m2, fecha_siembra,
      fecha_cosecha_estimada, fecha_cosecha_real, estado,
      rendimiento_kg, observaciones,
    } = body

    const { data, error: dbError } = await client.database
      .from('sembrios')
      .update({
        tipo_cultivo, variedad, area_sembrada_m2, fecha_siembra,
        fecha_cosecha_estimada, fecha_cosecha_real, estado,
        rendimiento_kg, observaciones,
      })
      .eq('id', id)
      .select()

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0] })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// DELETE /api/sembrios/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const { error: dbError } = await client.database
      .from('sembrios')
      .delete()
      .eq('id', id)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
