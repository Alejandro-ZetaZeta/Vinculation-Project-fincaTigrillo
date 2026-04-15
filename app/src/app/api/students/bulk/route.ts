import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

async function getAdminClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return { client: null }
  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user) return { client: null }
  const { data: profile } = await insforge.database
    .from('user_profiles').select('role').eq('user_id', userData.user.id).maybeSingle()
  if (profile?.role !== 'admin') return { client: null }
  return { client: insforge }
}

// Bulk update career/semester
export async function PUT(request: NextRequest) {
  try {
    const { client } = await getAdminClient()
    if (!client) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { ids, career, semester } = await request.json()
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs requeridos' }, { status: 400 })
    }

    const update: Record<string, unknown> = {}
    if (career !== undefined) update.career = career
    if (semester !== undefined) update.semester = semester

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
    }

    const { error } = await client.database
      .from('user_profiles')
      .update(update)
      .in('id', ids)
      .eq('role', 'viewer')

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, updated: ids.length })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// Bulk delete
export async function DELETE(request: NextRequest) {
  try {
    const { client } = await getAdminClient()
    if (!client) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const { ids } = await request.json()
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'IDs requeridos' }, { status: 400 })
    }

    const { error } = await client.database
      .from('user_profiles')
      .delete()
      .in('id', ids)
      .eq('role', 'viewer')

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true, deleted: ids.length })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
