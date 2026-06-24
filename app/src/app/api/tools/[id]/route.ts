import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

type InsForgeClient = ReturnType<typeof createInsForgeServerClient>

async function getAdminClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken)
    return { client: null as InsForgeClient | null, userId: null as string | null, error: 'No autenticado', status: 401 }

  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user)
    return { client: null as InsForgeClient | null, userId: null, error: 'Sesión inválida', status: 401 }

  const { data: profile } = await insforge.database
    .from('user_profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin')
    return { client: null as InsForgeClient | null, userId: null, error: 'Sin permisos', status: 403 }

  return { client: insforge, userId: userData.user.id, error: null as string | null, status: 200 }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/tools/[id]
// Returns the tool detail + last 30 movements.
// Admin-only.
// ────────────────────────────────────────────────────────────────────────────
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const [{ data: tool, error: toolErr }, { data: movements, error: movErr }] =
      await Promise.all([
        client.database.from('farm_tools').select('*').eq('id', id).maybeSingle(),
        client.database
          .from('farm_tool_movements')
          .select('id, delta, reason, notes, expected_return_date, created_at, created_by')
          .eq('tool_id', id)
          .order('created_at', { ascending: false })
          .limit(30),
      ])

    if (toolErr) return NextResponse.json({ error: toolErr.message }, { status: 400 })
    if (movErr)  return NextResponse.json({ error: movErr.message  }, { status: 400 })
    if (!tool)   return NextResponse.json({ error: 'Herramienta no encontrada' }, { status: 404 })

    return NextResponse.json({ data: tool, movements: movements || [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ────────────────────────────────────────────────────────────────────────────
// PUT /api/tools/[id]
// Updates metadata (name, description, category, unit, min_stock, is_active).
// Does NOT modify stock — use the /stock route for that.
// Admin-only.
// ────────────────────────────────────────────────────────────────────────────
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const body = await request.json()
    // Strip immutable / computed fields
    delete body.id
    delete body.stock
    delete body.created_by
    delete body.created_at

    if (typeof body.name === 'string') body.name = body.name.trim()
    if (typeof body.description === 'string') body.description = body.description.trim() || null
    if (typeof body.unit === 'string') body.unit = body.unit.trim() || 'unidad'
    if (body.min_stock === '' || body.min_stock == null) body.min_stock = null
    else body.min_stock = Number(body.min_stock)

    const { data, error: dbError } = await client.database
      .from('farm_tools')
      .update(body)
      .eq('id', id)
      .select()

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })
    if (!data || data.length === 0) return NextResponse.json({ error: 'Herramienta no encontrada' }, { status: 404 })
    return NextResponse.json({ data: data[0] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ────────────────────────────────────────────────────────────────────────────
// DELETE /api/tools/[id]
// Soft-delete (sets is_active = false) when movement history exists.
// Hard-delete only when the tool has never had any stock movement.
// Admin-only.
// ────────────────────────────────────────────────────────────────────────────
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    // Check if any movements exist
    const { count, error: countErr } = await client.database
      .from('farm_tool_movements')
      .select('id', { count: 'exact', head: true })
      .eq('tool_id', id)

    if (countErr) return NextResponse.json({ error: countErr.message }, { status: 400 })

    if ((count ?? 0) > 0) {
      // Has history → soft-delete only
      const { error: updateErr } = await client.database
        .from('farm_tools')
        .update({ is_active: false })
        .eq('id', id)

      if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })
      return NextResponse.json({ success: true, soft: true })
    }

    // No history → hard-delete
    const { error: deleteErr } = await client.database
      .from('farm_tools')
      .delete()
      .eq('id', id)

    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 400 })
    return NextResponse.json({ success: true, soft: false })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
