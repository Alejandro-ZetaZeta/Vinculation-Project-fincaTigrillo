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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'

    const { data, error } = await client.database
      .from('stage_suggestions')
      .select('*')
      .eq('sembrio_id', id)
      .eq('status', status)
      .order('created_at', { ascending: false })

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
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const body = await request.json()
    const { current_stage, suggested_stage, days_in_current, theoretical_days, message } = body

    if (!current_stage || !suggested_stage) {
      return NextResponse.json({ error: 'Etapa actual y sugerida son obligatorias' }, { status: 400 })
    }

    const { data: existing } = await client.database
      .from('stage_suggestions')
      .select('id')
      .eq('sembrio_id', id)
      .eq('current_stage', current_stage)
      .eq('suggested_stage', suggested_stage)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ data: existing, duplicate: true })
    }

    const { data, error: insertError } = await client.database
      .from('stage_suggestions')
      .insert([{
        sembrio_id: id,
        current_stage,
        suggested_stage,
        days_in_current: days_in_current || 0,
        theoretical_days: theoretical_days || 0,
        message: message || null,
        status: 'pending',
      }])
      .select()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0] }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
