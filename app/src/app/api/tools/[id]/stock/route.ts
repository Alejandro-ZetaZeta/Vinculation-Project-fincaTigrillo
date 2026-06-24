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

// ── Per-reason rules ──────────────────────────────────────────────────────
// Every reason enforces a delta sign and (optionally) required fields.
// Sign values: 'positive' | 'negative' | 'either'
type ReasonRule = {
  sign: 'positive' | 'negative' | 'either'
  notesRequired?: boolean
  requiresExpectedReturnDate?: boolean
}

const REASON_RULES: Record<string, ReasonRule> = {
  'Compra':               { sign: 'positive' },
  'Devolución':           { sign: 'negative' },
  'Pérdida':              { sign: 'negative' },
  'Daño':                 { sign: 'negative' },
  'Mantenimiento':        { sign: 'negative', requiresExpectedReturnDate: true },
  'Ajuste de inventario': { sign: 'either',   notesRequired: true },
}

const VALID_REASONS = Object.keys(REASON_RULES) as Array<keyof typeof REASON_RULES>

type AdjustReason = keyof typeof REASON_RULES

function isValidReason(v: unknown): v is AdjustReason {
  return typeof v === 'string' && v in REASON_RULES
}

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/tools/[id]/stock
// Body: {
//   delta:                 number — non-zero integer; sign must match reason rule
//   reason:                string — one of REASON_RULES keys
//   notes:                 string — required when reason = 'Ajuste de inventario'
//   expected_return_date:  string — YYYY-MM-DD; required when reason = 'Mantenimiento'
// }
//
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
    const { delta, reason, notes, expected_return_date } = body

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

    const rule = REASON_RULES[reason]

    // ── Enforce sign of delta per reason ─────────────────────────────────
    if (rule.sign === 'positive' && delta <= 0) {
      return NextResponse.json(
        { error: `La razón "${reason}" requiere una cantidad positiva (delta > 0).` },
        { status: 400 },
      )
    }
    if (rule.sign === 'negative' && delta >= 0) {
      return NextResponse.json(
        { error: `La razón "${reason}" requiere una cantidad negativa (delta < 0).` },
        { status: 400 },
      )
    }

    // ── Normalize and validate notes (when required) ─────────────────────
    const trimmedNotes = typeof notes === 'string' ? notes.trim() : ''
    if (rule.notesRequired && trimmedNotes.length === 0) {
      return NextResponse.json(
        { error: `La razón "${reason}" requiere notas que expliquen el ajuste.` },
        { status: 400 },
      )
    }

    // ── Validate expected_return_date (when required) ────────────────────
    let parsedReturnDate: string | null = null
    if (rule.requiresExpectedReturnDate) {
      if (typeof expected_return_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(expected_return_date)) {
        return NextResponse.json(
          { error: 'Mantenimiento requiere una fecha de regreso esperada (YYYY-MM-DD).' },
          { status: 400 },
        )
      }
      const d = new Date(expected_return_date + 'T00:00:00Z')
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json(
          { error: 'Fecha de regreso inválida.' },
          { status: 400 },
        )
      }
      const today = new Date()
      today.setUTCHours(0, 0, 0, 0)
      if (d.getTime() < today.getTime()) {
        return NextResponse.json(
          { error: 'La fecha de regreso no puede ser en el pasado.' },
          { status: 400 },
        )
      }
      parsedReturnDate = expected_return_date
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
    const movementRow: Record<string, unknown> = {
      tool_id:    id,
      delta,
      reason,
      notes:      trimmedNotes.length > 0 ? trimmedNotes : null,
      created_by: userId,
    }
    if (parsedReturnDate) movementRow.expected_return_date = parsedReturnDate

    const { data: movement, error: movErr } = await client.database
      .from('farm_tool_movements')
      .insert([movementRow])
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
