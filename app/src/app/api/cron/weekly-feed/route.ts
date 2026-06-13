import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'

const SACK_KG = 40

/* ─────────────────────────────────────────────────────────────────
   GET /api/cron/weekly-feed
   Invoked every Thursday 12:00 Ecuador time (17:00 UTC) by Vercel Cron.
   Protected by Authorization: Bearer <CRON_SECRET>.
───────────────────────────────────────────────────────────────── */
async function handle(req: NextRequest) {
  /* 1. Auth guard */
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/weekly-feed] CRON_SECRET not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  /* 2. Service-role client — no user token needed */
  const serviceKey = process.env.INSFORGE_API_KEY
  if (!serviceKey) {
    console.error('[cron/weekly-feed] INSFORGE_API_KEY not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const db = createInsForgeServerClient(serviceKey).database

  try {
    /* 3. Active mixed poultry batches */
    const { data: batches, error: batchErr } = await db
      .from('animals')
      .select('id, name, identification_code, birth_date, acquisition_date, metadata, animal_types(slug)')
      .eq('status', 'activo')
      .eq('sex', 'mixto')

    if (batchErr) throw new Error(batchErr.message)

    type BatchRow = {
      id: string; name: string | null; identification_code: string | null
      birth_date: string | null; acquisition_date: string | null
      metadata: Record<string, unknown> | null
      animal_types: { slug: string }[] | { slug: string } | null
    }
    function getSlug(at: BatchRow['animal_types']): string | undefined {
      if (!at) return undefined
      if (Array.isArray(at)) return at[0]?.slug
      return (at as { slug: string }).slug
    }
    const poultryBatches = ((batches || []) as BatchRow[]).filter(
      b => getSlug(b.animal_types) === 'aves-de-corral' && (b.metadata?.proposito as string) === 'engorde'
    )

    if (poultryBatches.length === 0) {
      return NextResponse.json({ ok: true, total_bags: 0, message: 'No active poultry batches' })
    }

    /* 4. Accumulated deaths per batch */
    const batchIds = poultryBatches.map(b => b.id)
    const { data: deaths, error: deathErr } = await db
      .from('reproductive_events')
      .select('animal_id, quantity')
      .in('animal_id', batchIds)
      .eq('event_type', 'muerte')

    if (deathErr) throw new Error(deathErr.message)

    const deathMap: Record<string, number> = {}
    for (const d of deaths || []) {
      const row = d as { animal_id: string; quantity: number }
      deathMap[row.animal_id] = (deathMap[row.animal_id] ?? 0) + (row.quantity ?? 0)
    }

    /* 5. Ross 308 daily feed table */
    const { data: feedTable, error: feedErr } = await db
      .from('ross308_daily_feed')
      .select('day, daily_feed_g')
      .order('day', { ascending: true })

    if (feedErr) throw new Error(feedErr.message)

    const feedByDay: Record<number, number> = {}
    for (const row of feedTable || []) {
      const r = row as { day: number; daily_feed_g: number | string }
      feedByDay[r.day] = Number(r.daily_feed_g)
    }
    const MAX_DAY = 46

    /* 6. Per-batch next-7-days calculation */
    let totalFarmG = 0
    for (const b of poultryBatches) {
      const baseline = b.acquisition_date || b.birth_date
      if (!baseline) continue

      const base = new Date(baseline + 'T00:00:00')
      const today = new Date(); today.setHours(0, 0, 0, 0)
      const days = Math.floor((today.getTime() - base.getTime()) / 86_400_000)

      const initialCount = Number(b.metadata?.cantidad ?? 0)
      const liveCount = Math.max(0, Math.round(initialCount - (deathMap[b.id] ?? 0)))
      if (liveCount === 0) continue

      for (let i = 1; i <= 7; i++) {
        const futureDay = Math.min(days + i, MAX_DAY)
        totalFarmG += (feedByDay[futureDay] ?? feedByDay[MAX_DAY] ?? 0) * liveCount
      }
    }

    const totalBags = Math.ceil(totalFarmG / 1000 / SACK_KG)

    /* 7. Insert notification using service-role key */
    const { error: insertErr } = await db.from('notifications').insert({
      title: '🛒 Compra de alimento semanal',
      message: `Para la próxima semana se requieren ${totalBags} bultos de 40 kg para los lotes activos de aves (Ross 308).`,
      type: 'info',
    })

    if (insertErr) throw new Error(insertErr.message)

    console.log(`[cron/weekly-feed] Inserted notification — ${totalBags} bags`)
    return NextResponse.json({ ok: true, total_bags: totalBags })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/weekly-feed]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// Vercel Cron invokes the configured path using an HTTP GET request.
export async function GET(req: NextRequest) {
  return handle(req)
}

// Allow manual triggering (e.g. from dashboards/tools) if needed.
export async function POST(req: NextRequest) {
  return handle(req)
}
