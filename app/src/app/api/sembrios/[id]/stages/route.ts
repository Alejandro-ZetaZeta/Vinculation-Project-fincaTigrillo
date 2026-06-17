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
      .from('sembrio_stage_log')
      .select('*')
      .eq('sembrio_id', id)
      .order('created_at', { ascending: true })

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
    const { to_stage, notes } = body

    if (!to_stage) {
      return NextResponse.json({ error: 'La etapa destino es obligatoria' }, { status: 400 })
    }

    const { data: sembrio, error: fetchError } = await client.database
      .from('sembrios')
      .select('current_stage')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 })
    if (!sembrio) return NextResponse.json({ error: 'Sembrío no encontrado' }, { status: 404 })

    const fromStage = sembrio.current_stage

    const { error: logError } = await client.database
      .from('sembrio_stage_log')
      .insert([{
        sembrio_id: id,
        from_stage: fromStage,
        to_stage,
        changed_by: userId,
        change_type: 'manual',
        notes: notes || null,
      }])

    if (logError) return NextResponse.json({ error: logError.message }, { status: 400 })

    const { error: updateError } = await client.database
      .from('sembrios')
      .update({
        current_stage: to_stage,
        stage_updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

    return NextResponse.json({ success: true, from_stage: fromStage, to_stage })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
