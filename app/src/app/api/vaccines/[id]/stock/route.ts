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

// ── Per-reason rules (mirror tools_inventory_movement_rules) ─────────────
// 'Aplicación' is intentionally excluded: it is written only by the
// assign_vaccines_and_deduct_stock RPC, never via this endpoint.
type ReasonRule = {
  sign: 'positive' | 'negative' | 'either'
  notesRequired?: boolean
}

const REASON_RULES: Record<string, ReasonRule> = {
  'Compra':               { sign: 'positive' },
  'Pérdida':              { sign: 'negative' },
  'Daño':                 { sign: 'negative' },
  'Vencimiento':          { sign: 'negative' },
  'Ajuste de inventario': { sign: 'either', notesRequired: true },
}

const VALID_REASONS = Object.keys(REASON_RULES)

type ManualReason = keyof typeof REASON_RULES

function isValidReason(v: unknown): v is ManualReason {
  return typeof v === 'string' && v in REASON_RULES
}

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/vaccines/[id]/stock
// Body: {
//   delta:  number — non-zero integer; sign must match reason rule
//   reason: string — one of REASON_RULES keys
//   notes:  string — required when reason = 'Ajuste de inventario'
// }
//
// Validates resulting stock >= 0.
// Atomically updates vaccine_catalog.stock_doses and inserts a
// vaccine_stock_movements row (reason-enforced CHECK at DB level).
// Admin-only.
// ────────────────────────────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
        { status: 400 }
      )
    }

    // ── Validate reason ──────────────────────────────────────────────────
    if (!isValidReason(reason)) {
      return NextResponse.json(
        { error: `Razón inválida. Valores permitidos: ${VALID_REASONS.join(', ')}` },
        { status: 400 }
      )
    }

    const rule = REASON_RULES[reason]

    // ── Enforce sign of delta per reason ─────────────────────────────────
    if (rule.sign === 'positive' && delta <= 0) {
      return NextResponse.json(
        { error: `La razón "${reason}" requiere una cantidad positiva (delta > 0).` },
        { status: 400 }
      )
    }
    if (rule.sign === 'negative' && delta >= 0) {
      return NextResponse.json(
        { error: `La razón "${reason}" requiere una cantidad negativa (delta < 0).` },
        { status: 400 }
      )
    }

    // ── Normalize and validate notes (when required) ─────────────────────
    const trimmedNotes = typeof notes === 'string' ? notes.trim() : ''
    if (rule.notesRequired && trimmedNotes.length === 0) {
      return NextResponse.json(
        { error: `La razón "${reason}" requiere notas que expliquen el ajuste.` },
        { status: 400 }
      )
    }

    // ── Fetch current stock (lock-free read; the DB CHECK + non-negative
    //    column constraint backstops the result below) ───────────────────
    const { data: current, error: fetchError } = await client.database
      .from('vaccine_catalog')
      .select('stock_doses, name')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 })
    if (!current) return NextResponse.json({ error: 'Vacuna no encontrada' }, { status: 404 })

    const newStock = (current.stock_doses as number) + delta
    if (newStock < 0) {
      return NextResponse.json(
        { error: `Stock insuficiente. Stock actual: ${current.stock_doses}. No se pueden restar ${Math.abs(delta)} dosis.` },
        { status: 400 }
      )
    }

    // ── Update stock ─────────────────────────────────────────────────────
    const { data: updated, error: updateError } = await client.database
      .from('vaccine_catalog')
      .update({ stock_doses: newStock })
      .eq('id', id)
      .select('stock_doses')
      .maybeSingle()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })

    // ── Insert movement row ──────────────────────────────────────────────
    const movementRow: Record<string, unknown> = {
      vaccine_id: id,
      delta,
      reason,
      notes: trimmedNotes.length > 0 ? trimmedNotes : null,
      created_by: userId,
    }

    const { data: movement, error: movError } = await client.database
      .from('vaccine_stock_movements')
      .insert([movementRow])
      .select()
      .maybeSingle()

    if (movError) {
      // The stock update already committed; surface the error so the
      // admin can investigate. A compensating reversal is out of scope
      // for this endpoint — the audit trail itself will reveal the gap.
      return NextResponse.json(
        { error: `Stock actualizado pero falló el registro del movimiento: ${movError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      stock_doses: updated?.stock_doses ?? newStock,
      movement,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
