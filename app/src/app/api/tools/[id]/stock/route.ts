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

// Valid reasons for stock adjustments (enforced server-side as well as UI)
const VALID_REASONS = [
  'Compra',
  'Devolución',
  'Pérdida',
  'Daño',
  'Mantenimiento',
  'Ajuste de inventario',
  'Otro',
] as const

type AdjustReason = typeof VALID_REASONS[number]

function isValidReason(v: unknown): v is AdjustReason {
  return typeof v === 'string' && (VALID_REASONS as readonly string[]).includes(v)
}

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/tools/[id]/stock
// Body: {
//   delta:   number  — positive = add stock, negative = remove stock (required, non-zero integer)
//   reason:  string  — must match VALID_REASONS (required)
//   notes:   string  — optional free text
// }
// Validates that resulting stock will not go below 0.
// Atomically updates farm_tools.stock and inserts a farm_tool_movements row.
// Admin-only.
// ────────────────────────────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { client, userId, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const body = await request.json()
    const { delta, reason, notes } = body

    // ── Validate delta ───────────────────────────────────────────────────
    if (
      typeof delta !== 'number' ||
      !Number.isInteger(delta) ||
      delta === 0
    ) {
      return NextResponse.json(
        { error: 'delta debe ser un entero distinto de cero' },
        { status: 400 },
      )
    }

    // ── Validate reason ──────────────────────────────────────────────────
    if (!isValidReason(reason)) {
      return NextResponse.json(
        { error: `Razón inválida. Valores permitidos: ${VALID_REASONS.join(', ')}` },
        { status: 400 },
      )
    }

    // ── Fetch current stock ──────────────────────────────────────────────
    const { data: current, error: fetchErr } = await client.database
      .from('farm_tools')
      .select('stock, name')
      .eq('id', id)
      .maybeSingle()

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 400 })
    if (!current) return NextResponse.json({ error: 'Herramienta no encontrada' }, { status: 404 })

    const newStock = (current.stock as number) + delta
    if (newStock < 0) {
      return NextResponse.json(
        { error: `Stock insuficiente. Stock actual: ${current.stock}. No se pueden restar ${Math.abs(delta)} unidades.` },
        { status: 400 },
      )
    }

    // ── Atomically update stock + insert movement ────────────────────────
    // 1. Update stock
    const { error: updateErr } = await client.database
      .from('farm_tools')
      .update({ stock: newStock })
      .eq('id', id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

    // 2. Insert movement record
    const { data: movement, error: movErr } = await client.database
      .from('farm_tool_movements')
      .insert([{
        tool_id:    id,
        delta,
        reason,
        notes:      notes ? String(notes).trim() : null,
        created_by: userId,
      }])
      .select()

    if (movErr) return NextResponse.json({ error: movErr.message }, { status: 400 })

    return NextResponse.json({
      stock:    newStock,
      movement: movement?.[0] ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
