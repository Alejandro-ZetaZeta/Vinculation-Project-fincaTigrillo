import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'

/* ─────────────────────────────────────────────────────────────────
   GET /api/cron/vaccine-reminders
   Invoked daily at 08:00 UTC by Vercel Cron.
   Protected by Authorization: Bearer <CRON_SECRET>.
   Queries animal_vaccinations where next_dose_at = today,
   skips already-notified pairs, inserts one notification per due dose.
───────────────────────────────────────────────────────────────── */
async function handle(req: NextRequest) {
  /* 1. Auth guard */
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/vaccine-reminders] CRON_SECRET not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceKey = process.env.INSFORGE_API_KEY
  if (!serviceKey) {
    console.error('[cron/vaccine-reminders] INSFORGE_API_KEY not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const db = createInsForgeServerClient(serviceKey).database

  try {
    const todayISO = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    /* 2. Doses due today on active animals */
    const { data: dueDoses, error: doseErr } = await db
      .from('animal_vaccinations')
      .select(`
        id,
        animal_id,
        next_dose_at,
        vaccine_catalog ( id, name ),
        animals ( id, name, identification_code, status )
      `)
      .eq('next_dose_at', todayISO)

    if (doseErr) throw new Error(doseErr.message)

    type DoseRow = {
      id: string
      animal_id: string
      next_dose_at: string
      vaccine_catalog: { id: string; name: string } | null
      animals: { id: string; name: string | null; identification_code: string | null; status: string } | null
    }

    const active = ((dueDoses ?? []) as DoseRow[]).filter(
      d => d.animals?.status === 'activo' && d.vaccine_catalog
    )

    if (active.length === 0) {
      console.log('[cron/vaccine-reminders] No doses due today')
      return NextResponse.json({ ok: true, inserted: 0 })
    }

    /* 3. Fetch existing vaccine-reminder notifications created today to avoid duplicates */
    const todayStart = `${todayISO}T00:00:00`
    const { data: existing, error: existErr } = await db
      .from('notifications')
      .select('title')
      .eq('type', 'warning')
      .gte('created_at', todayStart)
      .ilike('title', '%vacuna%')

    if (existErr) throw new Error(existErr.message)

    const alreadyNotified = new Set((existing ?? []).map((n: { title: string }) => n.title))

    /* 4. Insert one notification per new due dose */
    let inserted = 0
    for (const dose of active) {
      const vaccineName = dose.vaccine_catalog!.name
      const animalLabel = dose.animals!.name || dose.animals!.identification_code || dose.animal_id
      const title = `💉 Vacuna: ${vaccineName} — ${animalLabel}`

      if (alreadyNotified.has(title)) continue

      const message = `El animal/lote "${animalLabel}" requiere una dosis de ${vaccineName} hoy (${todayISO}).`

      const { error: insertErr } = await db.from('notifications').insert({
        title,
        message,
        type: 'warning',
        is_read: false,
      })

      if (insertErr) {
        console.error(`[cron/vaccine-reminders] Insert failed for ${title}:`, insertErr.message)
        continue
      }

      inserted++
    }

    console.log(`[cron/vaccine-reminders] Inserted ${inserted} notifications for ${todayISO}`)
    return NextResponse.json({ ok: true, inserted, total_due: active.length })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/vaccine-reminders]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
