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

async function getAdminClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return { client: null, error: 'No autenticado', status: 401, userId: null }
  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user) return { client: null, error: 'Sesión inválida', status: 401, userId: null }
  const { data: profile } = await insforge.database
    .from('user_profiles').select('role').eq('user_id', userData.user.id).maybeSingle()
  if (profile?.role !== 'admin') return { client: null, error: 'Sin permisos de administrador', status: 403, userId: null }
  return { client: insforge, error: null, status: 200, userId: userData.user.id }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data, error } = await client.database
      .from('sembrio_stage_config')
      .select('*')
      .eq('sembrio_id', id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, error, status, userId } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const body = await request.json()
    const { stages } = body

    if (!stages || !Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json({ error: 'Las etapas son obligatorias' }, { status: 400 })
    }

    const { data: existing } = await client.database
      .from('sembrio_stage_config')
      .select('id')
      .eq('sembrio_id', id)
      .maybeSingle()

    if (existing) {
      const { data, error: updateError } = await client.database
        .from('sembrio_stage_config')
        .update({ stages })
        .eq('sembrio_id', id)
        .select()

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })
      return NextResponse.json({ data: data?.[0] })
    }

    const { data, error: insertError } = await client.database
      .from('sembrio_stage_config')
      .insert([{ sembrio_id: id, stages, created_by: userId }])
      .select()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0] }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const { error: deleteError } = await client.database
      .from('sembrio_stage_config')
      .delete()
      .eq('sembrio_id', id)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
