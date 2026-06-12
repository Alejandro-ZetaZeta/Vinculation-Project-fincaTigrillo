import { NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const insforge = createInsForgeServerClient(accessToken)
    const { data: userData } = await insforge.auth.getCurrentUser()
    if (!userData?.user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

    const { data: profile } = await insforge.database
      .from('user_profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    // Fetch teacher profiles
    const { data: teachers, error: teachersErr } = await insforge.database
      .from('user_profiles')
      .select('id, user_id, full_name, role, avatar_url, created_at')
      .eq('role', 'teacher')
      .order('created_at', { ascending: false })

    if (teachersErr) return NextResponse.json({ error: teachersErr.message }, { status: 400 })

    const teacherList = teachers || []
    const teacherUserIds = teacherList.map((t: { user_id: string }) => t.user_id)

    // Fetch pending request counts per teacher
    const pendingMap: Record<string, number> = {}
    if (teacherUserIds.length > 0) {
      const { data: pendingRows } = await insforge.database
        .from('requests')
        .select('teacher_id')
        .eq('status', 'pending')
        .in('teacher_id', teacherUserIds)

      for (const row of (pendingRows || []) as { teacher_id: string }[]) {
        pendingMap[row.teacher_id] = (pendingMap[row.teacher_id] || 0) + 1
      }
    }

    const enriched = teacherList.map((t: { user_id: string } & Record<string, unknown>) => ({
      ...t,
      pending_requests: pendingMap[t.user_id] ?? 0,
    }))

    return NextResponse.json({ data: enriched })
  } catch (err) {
    console.error('GET /api/people/teachers:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
