import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeAdminClient } from '@/lib/insforge/server'
import { createGmailTransporter } from '@/lib/email/transporter'
import { buildInvoiceExpiryWarningEmail } from '@/lib/email/invoice-expiry-warning'

/* ─────────────────────────────────────────────────────────────────
   GET /api/cron/warn-invoices
   Invoked every Saturday 12:00 UTC-5 (17:00 UTC) by Vercel Cron.
   Emails admin the list of invoices that will be deleted the
   following day (Sunday) by cleanup-invoices.
   Protected by Authorization: Bearer <CRON_SECRET>.
───────────────────────────────────────────────────────────────── */
async function handle(req: NextRequest) {
  /* 1. Auth guard */
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/warn-invoices] CRON_SECRET not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  /* 2. Env checks */
  if (!process.env.INSFORGE_API_KEY) {
    console.error('[cron/warn-invoices] INSFORGE_API_KEY not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  // ?to= overrides ADMIN_EMAIL — useful for manual testing before ADMIN_EMAIL is configured
  const toOverride = new URL(req.url).searchParams.get('to')
  const adminEmail = toOverride ?? process.env.ADMIN_EMAIL
  if (!adminEmail) {
    console.error('[cron/warn-invoices] ADMIN_EMAIL not set and no ?to= provided')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  /* 3. Service-role client */
  const client = createInsForgeAdminClient()

  try {
    /* 4. Invoices Sunday's cleanup will delete tomorrow */
    // Compute the same cutoff cleanup-invoices will use tomorrow (Sunday).
    const sunday = new Date()
    sunday.setDate(sunday.getDate() + 1)   // tomorrow
    sunday.setMonth(sunday.getMonth() - 2) // 2 calendar months back
    const sundayCutoff = sunday.toISOString()

    const { data: expiring, error: fetchErr } = await client.database
      .from('event_invoices')
      .select('id, title, created_at')
      .lt('created_at', sundayCutoff)

    if (fetchErr) throw new Error(fetchErr.message)

    if (!expiring || expiring.length === 0) {
      console.log('[cron/warn-invoices] No invoices expiring tomorrow')
      return NextResponse.json({ ok: true, warned: 0 })
    }

    /* 5. Send warning email */
    type InvoiceRow = { id: string; title: string; created_at: string }
    const rows = expiring as InvoiceRow[]

    const transporter = createGmailTransporter()
    const { subject, html } = buildInvoiceExpiryWarningEmail(rows)

    await transporter.sendMail({
      from: `"Finca Tigrillo" <${process.env.GMAIL_SMTP_USER}>`,
      to: adminEmail,
      subject,
      html,
    })

    console.log(`[cron/warn-invoices] Warned admin about ${rows.length} invoice(s) being deleted tomorrow (Sunday)`)
    return NextResponse.json({ ok: true, warned: rows.length })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/warn-invoices]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
