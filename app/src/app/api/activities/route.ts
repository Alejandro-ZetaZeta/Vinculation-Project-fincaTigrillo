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
  return { client: insforge, role: profile?.role || 'viewer', userId: userData.user.id }
}

export async function GET() {
  try {
    const { client, role } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { data: activities } = await client.database
      .from('activities')
      .select('*, activity_assignments(id, status, student_id)')
      .order('created_at', { ascending: false })

    // Add counts
    const withCounts = (activities || []).map((a: Record<string, unknown>) => {
      const assignments = (a.activity_assignments || []) as { status: string }[]
      return {
        ...a,
        total: assignments.length,
        todo: assignments.filter(x => x.status === 'todo').length,
        in_progress: assignments.filter(x => x.status === 'in_progress').length,
        done: assignments.filter(x => x.status === 'done').length,
        activity_assignments: a.activity_assignments
      }
    })

    return NextResponse.json({ data: withCounts })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client, role, userId } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const { title, description, target_career, target_semester, due_date } = body

    if (!title || !target_career || !target_semester) {
      return NextResponse.json({ error: 'Título, carrera y semestre son obligatorios' }, { status: 400 })
    }

    // Create activity
    const { data: activity, error: actError } = await client.database
      .from('activities')
      .insert([{ title, description, target_career, target_semester, due_date, created_by: userId }])
      .select()

    if (actError || !activity?.[0]) {
      return NextResponse.json({ error: actError?.message || 'Error al crear' }, { status: 400 })
    }

    // Find matching students
    const { data: students } = await client.database
      .from('user_profiles')
      .select('user_id')
      .eq('role', 'viewer')
      .eq('career', target_career)
      .eq('semester', target_semester)

    // Create assignments for all matching students
    if (students && students.length > 0) {
      const assignments = students.map((s: { user_id: string }) => ({
        activity_id: activity[0].id,
        student_id: s.user_id,
        status: 'todo'
      }))

      await client.database.from('activity_assignments').insert(assignments)
    }

    return NextResponse.json({
      data: activity[0],
      assignedCount: students?.length || 0
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
