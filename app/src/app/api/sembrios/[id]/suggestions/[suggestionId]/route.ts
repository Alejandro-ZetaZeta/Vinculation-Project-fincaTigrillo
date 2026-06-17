import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; suggestionId: string }> }
) {
  try {
    const { id: sembrioId, suggestionId } = await params
    const { client, error, status, userId } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const body = await request.json()
    const { action, rejection_reason } = body

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Acción inválida. Use "accept" o "reject"' }, { status: 400 })
    }

    const { data: suggestion, error: fetchError } = await client.database
      .from('stage_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .eq('sembrio_id', sembrioId)
      .eq('status', 'pending')
      .maybeSingle()

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 })
    if (!suggestion) return NextResponse.json({ error: 'Sugerencia no encontrada o ya resuelta' }, { status: 404 })

    if (action === 'accept') {
      const { error: updateSembrio } = await client.database
        .from('sembrios')
        .update({
          current_stage: suggestion.suggested_stage,
          stage_updated_at: new Date().toISOString(),
        })
        .eq('id', sembrioId)

      if (updateSembrio) return NextResponse.json({ error: updateSembrio.message }, { status: 400 })

      const { error: logError } = await client.database
        .from('sembrio_stage_log')
        .insert([{
          sembrio_id: sembrioId,
          from_stage: suggestion.current_stage,
          to_stage: suggestion.suggested_stage,
          changed_by: userId,
          change_type: 'suggestion_accepted',
        }])

      if (logError) return NextResponse.json({ error: logError.message }, { status: 400 })

      const { data, error: resolveError } = await client.database
        .from('stage_suggestions')
        .update({
          status: 'accepted',
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', suggestionId)
        .select()

      if (resolveError) return NextResponse.json({ error: resolveError.message }, { status: 400 })
      return NextResponse.json({ data: data?.[0] })
    }

    const { error: logError } = await client.database
      .from('sembrio_stage_log')
      .insert([{
        sembrio_id: sembrioId,
        from_stage: suggestion.current_stage,
        to_stage: suggestion.current_stage,
        changed_by: userId,
        change_type: 'suggestion_rejected',
        rejection_reason: rejection_reason || null,
      }])

    if (logError) return NextResponse.json({ error: logError.message }, { status: 400 })

    const { data, error: resolveError } = await client.database
      .from('stage_suggestions')
      .update({
        status: 'rejected',
        resolved_by: userId,
        resolved_at: new Date().toISOString(),
        rejection_reason: rejection_reason || null,
      })
      .eq('id', suggestionId)
      .select()

    if (resolveError) return NextResponse.json({ error: resolveError.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
