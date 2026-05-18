import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

const BUCKET = 'bucket_prove'

async function getAdminClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return null

  const client = createInsForgeServerClient(accessToken)
  const { data: userData } = await client.auth.getCurrentUser()
  if (!userData?.user) return null

  const { data: profile } = await client.database
    .from('user_profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') return null
  return client
}

async function getAuthClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return null
  return createInsForgeServerClient(accessToken)
}

export async function GET() {
  try {
    const client = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data, error } = await client.database
      .from('event_invoices')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  } catch (err) {
    console.error('GET /api/invoices:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await getAdminClient()
    if (!client) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const isPng = file.type === 'image/png'
    const ext = isPng ? 'png' : 'jpg'
    const filename = `${crypto.randomUUID()}.${ext}`
    const storagePath = `invoices/${filename}`

    const arrayBuffer = await file.arrayBuffer()
    const blob = new Blob([arrayBuffer], { type: file.type })

    const { error: uploadErr } = await client.storage
      .from(BUCKET)
      .upload(storagePath, blob)

    if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 })

    const publicUrl = client.storage.from(BUCKET).getPublicUrl(storagePath) as unknown as string

    const eventId = formData.get('event_id') as string | null

    const { data: record, error: dbErr } = await client.database
      .from('event_invoices')
      .insert({ file_url: publicUrl, event_id: eventId || null })
      .select()
      .single()

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
    return NextResponse.json(record, { status: 201 })
  } catch (err) {
    console.error('POST /api/invoices:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
