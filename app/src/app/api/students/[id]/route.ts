import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

async function getAdminClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return { client: null }
  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user) return { client: null }
  const { data: profile } = await insforge.database
    .from('user_profiles').select('role').eq('user_id', userData.user.id).maybeSingle()
  if (profile?.role !== 'admin') return { client: null }
  return { client: insforge }
}

// Admin edits student career/semester only
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client } = await getAdminClient()
    if (!client) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    // Only allow updating career and semester
    const update: Record<string, unknown> = {}
    if (body.career !== undefined) update.career = body.career
    if (body.semester !== undefined) update.semester = body.semester

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }

    const { data, error } = await client.database
      .from('user_profiles')
      .update(update)
      .eq('id', id)
      .eq('role', 'viewer')
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data || data.length === 0) return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 })
    return NextResponse.json({ data: data[0] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// Admin deletes student profile
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client } = await getAdminClient()
    if (!client) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { error } = await client.database
      .from('user_profiles')
      .delete()
      .eq('id', id)
      .eq('role', 'viewer')

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
