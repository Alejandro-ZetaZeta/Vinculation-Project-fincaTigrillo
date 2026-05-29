import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'

const BUCKET = 'bucket_prove'

/* ─────────────────────────────────────────────────────────────────
   GET /api/cron/cleanup-invoices
   Invoked every Sunday 13:00 UTC-5 (18:00 UTC) by Vercel Cron.
   Deletes invoice images (storage + DB) that are older than 7 days.
   Protected by Authorization: Bearer <CRON_SECRET>.
───────────────────────────────────────────────────────────────── */
async function handle(req: NextRequest) {
  /* 1. Auth guard */
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[cron/cleanup-invoices] CRON_SECRET not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  /* 2. Service-role client */
  const serviceKey = process.env.INSFORGE_API_KEY
  if (!serviceKey) {
    console.error('[cron/cleanup-invoices] INSFORGE_API_KEY not set')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const client = createInsForgeServerClient(serviceKey)

  try {
    /* 3. Fetch invoices older than 7 days */
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: staleInvoices, error: fetchErr } = await client.database
      .from('event_invoices')
      .select('id, file_url')
      .lt('created_at', cutoff)

    if (fetchErr) throw new Error(fetchErr.message)
    if (!staleInvoices || staleInvoices.length === 0) {
      console.log('[cron/cleanup-invoices] No stale invoices found')
      return NextResponse.json({ ok: true, deleted: 0 })
    }

    type InvoiceRow = { id: string; file_url: string }
    const rows = staleInvoices as InvoiceRow[]

    /* 4. Delete files from storage bucket */
    // URL format: .../buckets/bucket_prove/objects/invoices%2Ffilename.png
    const bucketMarker = `/${BUCKET}/objects/`
    const storagePaths = rows
      .map(r => {
        const idx = r.file_url.indexOf(bucketMarker)
        if (idx === -1) return null
        const raw = r.file_url.slice(idx + bucketMarker.length)
        return decodeURIComponent(raw)
      })
      .filter((p): p is string => p !== null && p.length > 0)

    if (storagePaths.length > 0) {
      const results = await Promise.all(
        storagePaths.map(p => client.storage.from(BUCKET).remove(p))
      )

      const errors = results
        .map(r => r.error)
        .filter((e): e is Exclude<typeof e, null> => e !== null)

      if (errors.length > 0) {
        // Log but continue — orphaned storage is recoverable; orphaned DB rows are not
        console.warn(
          '[cron/cleanup-invoices] Storage removal partial error:',
          errors.map(e => e.message).join(', ')
        )
      }
    }

    /* 5. Delete DB records */
    const ids = rows.map(r => r.id)
    const { error: dbErr } = await client.database
      .from('event_invoices')
      .delete()
      .in('id', ids)

    if (dbErr) throw new Error(dbErr.message)

    console.log(`[cron/cleanup-invoices] Deleted ${ids.length} invoice(s) older than 7 days`)
    return NextResponse.json({ ok: true, deleted: ids.length })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[cron/cleanup-invoices]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
