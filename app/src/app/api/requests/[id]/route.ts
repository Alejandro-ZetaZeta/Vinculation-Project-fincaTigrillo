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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, role, userId } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (role === 'viewer') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { data, error } = await client.database
      .from('requests')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })

    // Teacher can only view own request
    if (role === 'teacher' && (data as { teacher_id: string }).teacher_id !== userId) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    console.error('GET /api/requests/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, role, userId } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (role !== 'admin') return NextResponse.json({ error: 'Solo administradores pueden revisar solicitudes' }, { status: 403 })

    // Fetch current row
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

    const body = await request.json()
    const { status, admin_notes, payload: newPayload } = body

    // Payload-only edit (no status change)
    if (!status && newPayload !== undefined) {
      if (row.status !== 'pending') {
        return NextResponse.json({ error: 'Solo se puede editar el payload de solicitudes pendientes' }, { status: 409 })
      }
      const { valid, error: validErr, sanitized } = validateRequestPayload(row.request_type, newPayload)
      if (!valid || !sanitized) return NextResponse.json({ error: validErr }, { status: 400 })

      const { data: updated, error: updateErr } = await client.database
        .from('requests').update({ payload: sanitized }).eq('id', id).select()
      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })
      return NextResponse.json({ data: updated?.[0] })
    }

    if (!status) return NextResponse.json({ error: 'status o payload requerido' }, { status: 400 })
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status debe ser approved o rejected' }, { status: 400 })
    }
    if (row.status !== 'pending') {
      return NextResponse.json({ error: 'Esta solicitud ya fue procesada' }, { status: 409 })
    }

    if (status === 'approved') {
      const execResult = await executeApprovedRequest(client, userId!, {
        id: row.id,
        request_type: row.request_type,
        payload: row.payload,
      })
      if (!execResult.ok) return NextResponse.json({ error: execResult.error }, { status: 422 })
    }

    const { data: updated, error: updateErr } = await client.database
      .from('requests')
      .update({ status, admin_notes: admin_notes ?? null, reviewed_by: userId, reviewed_at: new Date().toISOString() })
      .eq('id', id)
      .select()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

    const notifType = status === 'approved' ? 'success' : 'warning'
    const notifTitle = status === 'approved' ? 'Solicitud Aprobada' : 'Solicitud Rechazada'
    const notifMessage = status === 'approved'
      ? `Tu solicitud de "${REQUEST_TYPE_LABELS[row.request_type]}" fue aprobada.`
      : admin_notes
        ? `Tu solicitud fue rechazada. Nota: ${admin_notes}`
        : 'Tu solicitud fue rechazada.'

    await client.database.from('notifications').insert([{
      user_id: row.teacher_id,
      title: notifTitle,
      message: notifMessage,
      type: notifType,
      is_read: false,
    }])

    return NextResponse.json({ data: updated?.[0] })
  } catch (err) {
    console.error('PATCH /api/requests/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
