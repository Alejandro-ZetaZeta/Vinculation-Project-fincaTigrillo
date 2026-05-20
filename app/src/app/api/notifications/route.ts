import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createInsForgeServerClient } from '@/lib/insforge/server'

/* ── GET /api/notifications  (latest 30, newest-first) ────────── */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('insforge_access_token')?.value
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const db = createInsForgeServerClient(token).database

    const { data, error } = await db
      .from('notifications')
      .select('id, title, message, type, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('GET /api/notifications:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/* ── POST /api/notifications  (create one) ─────────────────────── */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('insforge_access_token')?.value
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const db = createInsForgeServerClient(token).database
    const body = await req.json()
    const { title, message, type = 'info' } = body

    if (!title || !message) return NextResponse.json({ error: 'title y message requeridos' }, { status: 400 })

    const { data, error } = await db
      .from('notifications')
      .insert({ title, message, type, is_read: false })
      .select('id, title, message, type, is_read, created_at')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    console.error('POST /api/notifications:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/* ── DELETE /api/notifications?id=<uuid>  (single)
       DELETE /api/notifications             (all)   ────────────── */
export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('insforge_access_token')?.value
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const db = createInsForgeServerClient(token).database
    const id = new URL(req.url).searchParams.get('id')

    const query = id
      ? db.from('notifications').delete().eq('id', id)
      : db.from('notifications').delete().not('id', 'is', null)

    const { error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/notifications:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/* ── PATCH /api/notifications  (mark all read) ─────────────────── */
export async function PATCH() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('insforge_access_token')?.value
    if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const db = createInsForgeServerClient(token).database

    const { error } = await db
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/notifications:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
