import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

async function getAuthClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return { client: null, role: null, userId: null }
  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user) return { client: null, role: null, userId: null }
  const { data: profile } = await insforge.database
    .from('user_profiles').select('role').eq('user_id', userData.user.id).maybeSingle()
  return { client: insforge, role: profile?.role ?? 'viewer', userId: userData.user.id }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, role, userId } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    if (role === 'admin') {
      // Admin can delete any activity
    } else if (role === 'teacher') {
      // Teacher can only delete their own
      const { data: activity } = await client.database
        .from('activities').select('created_by').eq('id', id).maybeSingle()
      if (!activity || activity.created_by !== userId) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    // Cascade delete handles assignments
    const { error } = await client.database
      .from('activities')
      .delete()
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
