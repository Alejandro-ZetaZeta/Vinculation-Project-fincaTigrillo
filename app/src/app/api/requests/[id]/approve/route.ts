import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'
import { executeApprovedRequest } from '@/lib/requests/executeApprovedRequest'
import { validateRequestPayload, REQUEST_TYPE_LABELS } from '@/lib/requests/validatePayload'

type InsForgeClient = ReturnType<typeof createInsForgeServerClient>

async function getAuthClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return { client: null as InsForgeClient | null, role: null as string | null, userId: null as string | null }

  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user) return { client: null as InsForgeClient | null, role: null, userId: null }

  const { data: profile } = await insforge.database
    .from('user_profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  return { client: insforge, role: profile?.role || 'viewer', userId: userData.user.id }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, role, userId } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (role !== 'admin') return NextResponse.json({ error: 'Solo administradores pueden aprobar solicitudes' }, { status: 403 })

    // Re-fetch row for double-approval guard
    const { data: existing, error: fetchErr } = await client.database
      .from('requests')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 })
    if (!existing) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })

    const row = existing as {
      id: string; teacher_id: string; request_type: string;
      status: string; payload: Record<string, unknown>
    }

    // Double-approval guard
    if (row.status !== 'pending') {
      return NextResponse.json({ error: 'Esta solicitud ya fue procesada' }, { status: 409 })
    }

    // Admin may optionally patch the payload before approving
    let payloadToExecute = row.payload
    const body = await request.json().catch(() => ({})) as Record<string, unknown>

    if (body.payload !== undefined) {
      const { valid, error: validErr, sanitized } = validateRequestPayload(row.request_type, body.payload)
      if (!valid || !sanitized) return NextResponse.json({ error: validErr }, { status: 400 })
      payloadToExecute = sanitized
    }

    const execResult = await executeApprovedRequest(client, userId!, {
      id: row.id,
      request_type: row.request_type,
      payload: payloadToExecute,
    })

    if (!execResult.ok) return NextResponse.json({ error: execResult.error }, { status: 422 })

    // Mark approved and persist the final payload (if edited)
    const { data: updated, error: updateErr } = await client.database
      .from('requests')
      .update({
        status: 'approved',
        payload: payloadToExecute,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

    await client.database.from('notifications').insert([{
      user_id: row.teacher_id,
      title: 'Solicitud Aprobada',
      message: `Tu solicitud de "${REQUEST_TYPE_LABELS[row.request_type]}" fue aprobada y registrada en el sistema.`,
      type: 'success',
      is_read: false,
    }])

    return NextResponse.json({ ok: true, data: updated?.[0] })
  } catch (err) {
    console.error('POST /api/requests/[id]/approve:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
