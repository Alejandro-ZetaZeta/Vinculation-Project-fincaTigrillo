import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const insforge = createInsForgeServerClient(accessToken)
    const { data: userData } = await insforge.auth.getCurrentUser()
    if (!userData?.user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })

    const body = await request.json()
    const { status } = body

    if (!status || !['todo', 'in_progress', 'done'].includes(status)) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = { status }
    if (status === 'in_progress') updateData.started_at = new Date().toISOString()
    if (status === 'done') updateData.completed_at = new Date().toISOString()
    if (status === 'todo') {
      updateData.started_at = null
      updateData.completed_at = null
    }

    const { data, error } = await insforge.database
      .from('activity_assignments')
      .update(updateData)
      .eq('id', id)
      .eq('student_id', userData.user.id)
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Asignación no encontrada o sin permisos' }, { status: 404 })
    }

    return NextResponse.json({ data: data[0] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
