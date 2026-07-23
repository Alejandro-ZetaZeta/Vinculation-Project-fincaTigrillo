import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'
import { validateRequestPayload, VALID_REQUEST_TYPES, REQUEST_TYPE_LABELS } from '@/lib/requests/validatePayload'

type InsForgeClient = ReturnType<typeof createInsForgeServerClient>

async function getAuthClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return { client: null as InsForgeClient | null, role: null as string | null, userId: null as string | null, fullName: null as string | null }

  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user) return { client: null as InsForgeClient | null, role: null, userId: null, fullName: null }

  const { data: profile } = await insforge.database
    .from('user_profiles')
    .select('role, full_name')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  return {
    client: insforge,
    role: profile?.role || 'viewer',
    userId: userData.user.id,
    fullName: (profile as { full_name?: string } | null)?.full_name ?? null,
  }
}

export async function GET(request: NextRequest) {
  try {
    const { client, role, userId } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (role === 'viewer') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')
    const typeFilter   = searchParams.get('type')

    let query = client.database
      .from('requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (role === 'teacher') {
      query = query.eq('teacher_id', userId!)
    }
    if (statusFilter) query = query.eq('status', statusFilter)
    if (typeFilter)   query = query.eq('request_type', typeFilter)

    const { data: requestRows, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const rows = requestRows || []

    if (role === 'admin' && rows.length > 0) {
      const teacherIds = [...new Set(rows.map((r: { teacher_id: string }) => r.teacher_id))]
      const { data: profiles } = await client.database
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', teacherIds)

      const profileMap: Record<string, string> = {}
      for (const p of (profiles || []) as { user_id: string; full_name: string }[]) {
        profileMap[p.user_id] = p.full_name
      }

      const enriched = rows.map((r: { teacher_id: string } & Record<string, unknown>) => ({
        ...r,
        teacher_name: profileMap[r.teacher_id] ?? null,
      }))
      return NextResponse.json({ data: enriched })
    }

    return NextResponse.json({ data: rows })
  } catch (err) {
    console.error('GET /api/requests:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, role, userId, fullName } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (role !== 'teacher') return NextResponse.json({ error: 'Solo los docentes pueden enviar solicitudes' }, { status: 403 })

    const body = await request.json()
    const { request_type, payload } = body

    if (!request_type || !VALID_REQUEST_TYPES.includes(request_type)) {
      return NextResponse.json({ error: 'Tipo de solicitud inválido' }, { status: 400 })
    }

    const { valid, error: validErr, sanitized } = validateRequestPayload(request_type, payload)
    if (!valid || !sanitized) {
      return NextResponse.json({ error: validErr ?? 'Payload inválido' }, { status: 400 })
    }

    const { data, error } = await client.database
      .from('requests')
      .insert([{ teacher_id: userId, request_type, payload: sanitized, status: 'pending' }])
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await client.database.from('notifications').insert([{
      user_id: null,
      title: 'Nueva Solicitud',
      message: `${fullName ?? 'Un docente'} solicitó: ${REQUEST_TYPE_LABELS[request_type]}`,
      type: 'info',
      is_read: false,
    }])

    return NextResponse.json({ data: data?.[0] }, { status: 201 })
  } catch (err) {
    console.error('POST /api/requests:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { client, role } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (role !== 'admin') return NextResponse.json({ error: 'Solo administradores pueden eliminar solicitudes' }, { status: 403 })

    const body = await request.json()
    const { ids } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Se requiere un arreglo de IDs' }, { status: 400 })
    }

    // Validate all are non-pending before deleting any
    const { data: rows, error: fetchErr } = await client.database
      .from('requests')
      .select('id, status')
      .in('id', ids)

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 })

    const foundRows = (rows || []) as { id: string; status: string }[]
    const pendingIds = foundRows.filter(r => r.status === 'pending').map(r => r.id)
    if (pendingIds.length > 0) {
      return NextResponse.json({ error: 'No se pueden eliminar solicitudes pendientes' }, { status: 409 })
    }

    const { error: deleteErr } = await client.database
      .from('requests')
      .delete()
      .in('id', ids)

    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 400 })

    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (err) {
    console.error('DELETE /api/requests:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
