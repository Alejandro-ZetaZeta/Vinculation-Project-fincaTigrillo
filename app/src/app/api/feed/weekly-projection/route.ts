import { NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'
import { derivePoultryStage } from '@/lib/formulas'

const SACK_KG = 40

function daysOfLife(baselineDate: string): number {
  const base = new Date(baselineDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - base.getTime()) / 86_400_000)
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const db = createInsForgeServerClient(accessToken).database

    // 1. Active mixed poultry batches
    const { data: batches, error: batchErr } = await db
      .from('animals')
      .select('id, name, identification_code, sex, status, birth_date, acquisition_date, metadata, animal_types(slug)')
      .eq('status', 'activo')
      .eq('sex', 'mixto')

    if (batchErr) return NextResponse.json({ error: batchErr.message }, { status: 500 })

    type BatchRow = {
      id: string; name: string | null; identification_code: string | null
      sex: string; status: string; birth_date: string | null
      acquisition_date: string | null; metadata: Record<string, unknown> | null
      animal_types: { slug: string }[] | { slug: string } | null
    }
    function getSlug(at: BatchRow['animal_types']): string | undefined {
      if (!at) return undefined
      if (Array.isArray(at)) return at[0]?.slug
      return (at as { slug: string }).slug
    }
    const poultryBatches = ((batches || []) as BatchRow[]).filter(
      a => getSlug(a.animal_types) === 'aves-de-corral' && (a.metadata?.proposito as string) === 'engorde'
    )

    if (poultryBatches.length === 0) {
      return NextResponse.json({ total_bags: 0, batches: [] })
    }

    const batchIds = poultryBatches.map((b: { id: string }) => b.id)

    // 2. Accumulated deaths for each batch
    const { data: deaths, error: deathErr } = await db
      .from('reproductive_events')
      .select('animal_id, quantity')
      .in('animal_id', batchIds)
      .eq('event_type', 'muerte')

    if (deathErr) return NextResponse.json({ error: deathErr.message }, { status: 500 })

    const deathMap: Record<string, number> = {}
    for (const d of deaths || []) {
      const row = d as { animal_id: string; quantity: number }
      deathMap[row.animal_id] = (deathMap[row.animal_id] ?? 0) + (row.quantity ?? 0)
    }

    // 3. Full Ross 308 feed table (46 rows — tiny, fetch once)
    const { data: feedTable, error: feedErr } = await db
      .from('ross308_daily_feed')
      .select('day, daily_feed_g')
      .order('day', { ascending: true })

    if (feedErr) return NextResponse.json({ error: feedErr.message }, { status: 500 })

    const feedByDay: Record<number, number> = {}
    for (const row of feedTable || []) {
      const r = row as { day: number; daily_feed_g: number | string }
      // DECIMAL columns come back as strings from PostgREST — cast explicitly
      feedByDay[r.day] = Number(r.daily_feed_g)
    }
    const MAX_DAY = 46

    // 4. Per-batch calculation
    let totalFarmG = 0
    const batchResults = []

    for (const b of poultryBatches) {
      const baseline = b.acquisition_date || b.birth_date
      if (!baseline) continue

      const days = daysOfLife(baseline)
      const initialCount = Number(b.metadata?.cantidad ?? 0)
      const liveCount = Math.max(0, Math.round(initialCount - (deathMap[b.id] ?? 0)))

      if (liveCount === 0) continue

      // Next 7 days feed sum (cap each future day at MAX_DAY)
      let batchWeekG = 0
      for (let i = 1; i <= 7; i++) {
        const futureDay = Math.min(days + i, MAX_DAY)
        batchWeekG += feedByDay[futureDay] ?? feedByDay[MAX_DAY] ?? 0
      }

      const batchTotalG = batchWeekG * liveCount
      totalFarmG += batchTotalG

      batchResults.push({
        id: b.id,
        name: b.name || b.identification_code || 'Sin nombre',
        days_of_life: days,
        stage: derivePoultryStage(days),
        live_count: liveCount,
        next_7_days_feed_g: batchTotalG,
        bags_share: 0, // filled below after total is known
      })
    }

    const totalBags = Math.ceil(totalFarmG / 1000 / SACK_KG)

    // Compute each batch's share of total bags (informational)
    for (const b of batchResults) {
      b.bags_share = totalFarmG > 0
        ? parseFloat(((b.next_7_days_feed_g / totalFarmG) * totalBags).toFixed(2))
        : 0
    }

    return NextResponse.json({ total_bags: totalBags, total_feed_g: totalFarmG, batches: batchResults })

  } catch (err) {
    console.error('Error en GET /api/feed/weekly-projection:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
