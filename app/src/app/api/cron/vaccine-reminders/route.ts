import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeAdminClient } from '@/lib/insforge/server'

/* ─────────────────────────────────────────────────────────────────
   GET /api/cron/vaccine-reminders
   Invoked daily at 08:00 Ecuador (13:00 UTC) by Vercel Cron.
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

  // Use admin client (service key) so RLS does not hide rows.
  if (!process.env.INSFORGE_API_KEY) {
    console.error('[cron/vaccine-reminders] INSFORGE_API_KEY not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const db = createInsForgeAdminClient().database

  try {
    // Ecuador time (UTC-5). Vercel Cron schedule is UTC; reminders should follow Ecuador calendar day.
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
    const todayISO = `${y}-${m}-${d}` // YYYY-MM-DD (Ecuador)

    /* 2. Doses due today on active animals */
    const { data: dueDoses, error: doseErr } = await db
      .from('animal_vaccinations')
      // Keep PostgREST select syntax tight (no spaces before parentheses)
      .select('id, animal_id, next_dose_at, vaccine_catalog(id, name), animals(id, name, identification_code, status)')
      .eq('next_dose_at', todayISO)

    if (doseErr) throw new Error(doseErr.message)

    type DoseRow = {
      id: string
      animal_id: string
      next_dose_at: string
      vaccine_catalog: { id: string; name: string } | { id: string; name: string }[] | null
      animals: { id: string; name: string | null; identification_code: string | null; status: string } | { id: string; name: string | null; identification_code: string | null; status: string }[] | null
    }

    function getVaccineCatalog(d: DoseRow) {
      if (!d.vaccine_catalog) return null
      return Array.isArray(d.vaccine_catalog) ? d.vaccine_catalog[0] ?? null : d.vaccine_catalog
    }
    function getAnimal(d: DoseRow) {
      if (!d.animals) return null
      return Array.isArray(d.animals) ? d.animals[0] ?? null : d.animals
    }

    const rows = (dueDoses ?? []) as unknown as DoseRow[]
    const active = rows.filter(d => getAnimal(d)?.status === 'activo' && getVaccineCatalog(d))

    if (rows.length > 0 && active.length === 0) {
      const missingAnimal = rows.filter(d => !getAnimal(d)).length
      const missingVax = rows.filter(d => !getVaccineCatalog(d)).length
      const nonActivo = rows.filter(d => {
        const a = getAnimal(d)
        return !!a && a.status !== 'activo'
      }).length
      console.log(
        `[cron/vaccine-reminders] Due rows=${rows.length} but none eligible. missingAnimal=${missingAnimal} missingVax=${missingVax} nonActivo=${nonActivo}`
      )
    }

    if (active.length === 0) {
      console.log('[cron/vaccine-reminders] No doses due today')
      return NextResponse.json({ ok: true, inserted: 0 })
    }

    /* 3. Fetch existing vaccine-reminder notifications created today to avoid duplicates */
    // Start of Ecuador day in UTC (UTC-5 => +05:00Z)
    const todayStart = `${todayISO}T05:00:00.000Z`
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
      const vaccine = getVaccineCatalog(dose)!
      const animal = getAnimal(dose)!
      const vaccineName = vaccine.name
      const animalLabel = animal.name || animal.identification_code || dose.animal_id
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
