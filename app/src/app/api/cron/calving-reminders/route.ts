import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeAdminClient } from '@/lib/insforge/server'

/* ─────────────────────────────────────────────────────────────────
   GET /api/cron/calving-reminders
   Invoked daily at 08:00 Ecuador (13:00 UTC) by Vercel Cron.
   Protected by Authorization: Bearer <CRON_SECRET>.

   Looks for reproductive_events of type 'monta_natural' or
   'inseminacion' on active female animals whose
   expected_due_date falls within the next 3 calendar days
   (inclusive of today). A birth that has already been
   registered (parto/aborto) cancels the reminder.

   Inserts one personal notification per user with role
   'admin' or 'teacher'. Stops inserting once the due date
   has passed, and dedups by title + user within the
   Ecuador-day window so the same reminder is never shown
   twice in a single day.
───────────────────────────────────────────────────────────────── */

const REMINDER_WINDOW_DAYS = 3

type ReproEventRow = {
  id: string
  animal_id: string
  event_type: 'monta_natural' | 'inseminacion'
  event_date: string
  expected_due_date: string
  animals: {
    id: string
    name: string | null
    identification_code: string | null
    status: string
    sex: string
  } | { id: string; name: string | null; identification_code: string | null; status: string; sex: string }[] | null
}

function getAnimal(row: ReproEventRow) {
  if (!row.animals) return null
  return Array.isArray(row.animals) ? row.animals[0] ?? null : row.animals
}

function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(fromISO + 'T12:00:00').getTime()
  const b = new Date(toISO + 'T12:00:00').getTime()
  return Math.round((b - a) / 86_400_000)
}

function relativeLabel(dueISO: string, todayISO: string): string {
  const diff = daysBetween(todayISO, dueISO)
  if (diff <= 0) return 'hoy'
  if (diff === 1) return 'mañana'
  if (diff === 2) return 'en 2 días'
  if (diff === 3) return 'en 3 días'
  return `en ${diff} días`
}

async function handle(req: NextRequest) {
  /* 1. Auth guard */
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/calving-reminders] CRON_SECRET not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.INSFORGE_API_KEY) {
    console.error('[cron/calving-reminders] INSFORGE_API_KEY not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const db = createInsForgeAdminClient().database

  try {
    /* 2. Ecuador "today" + 3-day window */
    const now = new Date()
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Guayaquil',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now)
    const y = parts.find(p => p.type === 'year')?.value
    const m = parts.find(p => p.type === 'month')?.value
    const d = parts.find(p => p.type === 'day')?.value
    if (!y || !m || !d) throw new Error('Failed to compute Ecuador date')

    const todayISO = `${y}-${m}-${d}`
    const todayStart = `${todayISO}T05:00:00.000Z` // Ecuador = UTC-5

    // Build windowEnd = today + 3 days (inclusive) as YYYY-MM-DD
    const todayDate = new Date(`${todayISO}T12:00:00Z`)
    const windowEndDate = new Date(todayDate)
    windowEndDate.setUTCDate(windowEndDate.getUTCDate() + REMINDER_WINDOW_DAYS)
    const windowEndISO = windowEndDate.toISOString().split('T')[0]

    /* 3. Pull eligible breeding events in the 3-day window */
    const { data: events, error: eventsErr } = await db
      .from('reproductive_events')
      .select('id, animal_id, event_type, event_date, expected_due_date, animals(id, name, identification_code, status, sex)')
      .in('event_type', ['monta_natural', 'inseminacion'])
      .not('expected_due_date', 'is', null)
      .gte('expected_due_date', todayISO)
      .lte('expected_due_date', windowEndISO)

    if (eventsErr) throw new Error(eventsErr.message)

    const candidates = (events ?? []) as unknown as ReproEventRow[]
    if (candidates.length === 0) {
      console.log(`[cron/calving-reminders] No calving in window ${todayISO}..${windowEndISO}`)
      return NextResponse.json({ ok: true, inserted: 0, eligible: 0 })
    }

    /* 4. Filter to active females and exclude resolved pregnancies */
    const animalIds = [...new Set(candidates.map(c => c.animal_id))]
    const { data: resolvedRows, error: resolvedErr } = await db
      .from('reproductive_events')
      .select('animal_id, event_date')
      .in('animal_id', animalIds)
      .in('event_type', ['parto', 'aborto'])

    if (resolvedErr) throw new Error(resolvedErr.message)

    // resolvedSet: pairs of (animal_id, breeding_event_date) that have a birth/abortion
    // registered on or after the breeding event. Both events are stored as YYYY-MM-DD
    // so a plain lexicographic compare matches the calendar ordering.
    const resolvedPairs = new Set(
      (resolvedRows ?? []).map((r: { animal_id: string; event_date: string }) =>
        `${r.animal_id}:${r.event_date}`
      )
    )

    const eligible = candidates.filter(row => {
      const animal = getAnimal(row)
      if (!animal) return false
      if (animal.status !== 'activo') return false
      if (animal.sex !== 'hembra') return false
      // Skip if a parto/aborto exists for this animal on or after the breeding date.
      // (Covers the case where multiple breeding events exist for the same animal
      // and an earlier one was resolved.)
      if (resolvedPairs.has(`${row.animal_id}:${row.event_date}`)) return false
      return true
    })

    if (eligible.length === 0) {
      console.log(`[cron/calving-reminders] ${candidates.length} candidates, none eligible after filtering`)
      return NextResponse.json({ ok: true, inserted: 0, eligible: 0 })
    }

    /* 5. Resolve admin + teacher recipient list */
    const { data: recipients, error: recipErr } = await db
      .from('user_profiles')
      .select('user_id, role')
      .in('role', ['admin', 'teacher'])

    if (recipErr) throw new Error(recipErr.message)

    const recipientIds = (recipients ?? [])
      .map((r: { user_id: string | null }) => r.user_id)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)

    if (recipientIds.length === 0) {
      console.log('[cron/calving-reminders] No admin/teacher recipients — skipping')
      return NextResponse.json({ ok: true, inserted: 0, eligible: eligible.length })
    }

    /* 6. Dedup: pull today's calving notifications we already inserted */
    const titles = eligible.map(row => {
      const animal = getAnimal(row)!
      const label = animal.name || animal.identification_code || row.animal_id
      return `🐄 Parto inminente: ${label} — ${row.expected_due_date}`
    })

    const { data: existing, error: existErr } = await db
      .from('notifications')
      .select('title, user_id')
      .in('title', titles)
      .gte('created_at', todayStart)

    if (existErr) throw new Error(existErr.message)

    const dedupKey = (title: string, userId: string) => `${userId}::${title}`
    const alreadyNotified = new Set(
      (existing ?? []).map((n: { title: string; user_id: string | null }) =>
        dedupKey(n.title, n.user_id ?? '')
      )
    )

    /* 7. Insert one personal notification per (event, recipient) pair */
    let inserted = 0
    for (const row of eligible) {
      const animal = getAnimal(row)!
      const animalLabel = animal.name || animal.identification_code || row.animal_id
      const title = `🐄 Parto inminente: ${animalLabel} — ${row.expected_due_date}`
      const when = relativeLabel(row.expected_due_date, todayISO)
      const breedingType = row.event_type === 'inseminacion' ? 'Inseminación artificial' : 'Monta natural'
      const message = `El parto de "${animalLabel}" está programado para ${when} (${row.expected_due_date}). ` +
        `Registrado por ${breedingType.toLowerCase()} el ${row.event_date}. ` +
        `Confirme el evento de parto en el módulo de Eventos Reproductivos.`

      for (const userId of recipientIds) {
        if (alreadyNotified.has(dedupKey(title, userId))) continue

        const { error: insertErr } = await db.from('notifications').insert({
          title,
          message,
          type: 'warning',
          is_read: false,
          user_id: userId,
        })

        if (insertErr) {
          console.error(`[cron/calving-reminders] Insert failed for ${title} → ${userId}:`, insertErr.message)
          continue
        }

        // Mark as known so a duplicate (user appears twice in the recipient list) is skipped.
        alreadyNotified.add(dedupKey(title, userId))
        inserted++
      }
    }

    console.log(
      `[cron/calving-reminders] window=${todayISO}..${windowEndISO} ` +
      `candidates=${candidates.length} eligible=${eligible.length} recipients=${recipientIds.length} inserted=${inserted}`
    )
    return NextResponse.json({
      ok: true,
      inserted,
      eligible: eligible.length,
      recipients: recipientIds.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/calving-reminders]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
