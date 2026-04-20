import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

async function getAdminClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return null

  const client = createInsForgeServerClient(accessToken)
  const { data: userData } = await client.auth.getCurrentUser()
  if (!userData?.user) return null

  const { data: profile } = await client.database
    .from('user_profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') return null
  return client
}

// DELETE: Eliminar un evento reproductivo
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await getAdminClient()
    if (!client) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { id } = await params
    const { error } = await client.database
      .from('reproductive_events')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DELETE /api/reproductive-events/[id] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// PUT: Actualizar un evento reproductivo
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await getAdminClient()
    if (!client) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { id } = await params
    const body = await request.json()

    const { data, error } = await client.database
      .from('reproductive_events')
      .update(body)
      .eq('id', id)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0] })
  } catch (err) {
    console.error('PUT /api/reproductive-events/[id] error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
