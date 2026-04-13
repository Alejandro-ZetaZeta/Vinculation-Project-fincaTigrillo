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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const body = await request.json()
    // Don't allow changing id or created_by
    delete body.id
    delete body.created_by
    delete body.created_at

    const { data, error: dbError } = await client.database
      .from('animals')
      .update(body)
      .eq('id', id)
      .select()

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0] })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const { error: dbError } = await client.database
      .from('animals')
      .delete()
      .eq('id', id)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
