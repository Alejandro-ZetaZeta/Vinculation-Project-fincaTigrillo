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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await getAdminClient()
    if (!client) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value as string
    const { id } = await params

    const { data: record, error: fetchErr } = await client.database
      .from('event_invoices')
      .select('file_url')
      .eq('id', id)
      .single()

    if (fetchErr || !record) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const fileUrl = record.file_url as string
    const fileRes = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!fileRes.ok) return NextResponse.json({ error: 'Error al obtener archivo del storage' }, { status: 502 })

    const blob = await fileRes.blob()
    const contentType = fileUrl.endsWith('.png') ? 'image/png' : 'image/jpeg'

    return new Response(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (err) {
    console.error('GET /api/invoices/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await getAdminClient()
    if (!client) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { id } = await params

    const { data: record, error: fetchErr } = await client.database
      .from('event_invoices')
      .select('file_url')
      .eq('id', id)
      .single()

    if (fetchErr || !record) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    // Extract storage path from public URL: ".../bucket_prove/invoices/uuid.jpg" → "invoices/uuid.jpg"
    const fileUrl = record.file_url as string
    const bucketMarker = `/${BUCKET}/`
    const storagePath = fileUrl.includes(bucketMarker)
      ? fileUrl.split(bucketMarker)[1]
      : null

    if (storagePath) {
      await client.storage.from(BUCKET).remove(storagePath)
    }

    const { error: dbErr } = await client.database
      .from('event_invoices')
      .delete()
      .eq('id', id)

    if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('DELETE /api/invoices/[id]:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
