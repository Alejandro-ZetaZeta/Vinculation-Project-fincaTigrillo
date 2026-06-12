import { createInsForgeServerClient } from '@/lib/insforge/server'
import { getAccessToken } from '@/lib/auth/cookies'
import { getCurrentUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { TeachersClient } from '@/components/people/TeachersClient'

export default async function TeachersPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/dashboard')

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  const { data: teacherProfiles } = await insforge.database
    .from('user_profiles')
    .select('id, user_id, full_name, role, avatar_url, created_at')
    .eq('role', 'teacher')
    .order('created_at', { ascending: false })

  const teacherList = teacherProfiles || []
  const teacherUserIds = teacherList.map((t: { user_id: string }) => t.user_id)

  // Pending request counts per teacher
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

  const teachers = teacherList.map((t: Record<string, unknown>) => ({
    id:               t.id as string,
    user_id:          t.user_id as string,
    full_name:        (t.full_name as string | null) ?? null,
    avatar_url:       (t.avatar_url as string | null) ?? null,
    created_at:       t.created_at as string,
    pending_requests: pendingMap[t.user_id as string] ?? 0,
  }))

  return (
    <div className="space-y-8 overflow-hidden min-w-0">
      <div>
        <h1 className="font-display tracking-tight text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <GraduationCap className="w-7 h-7 text-primary" />
          Docentes Registrados
        </h1>
        <p className="text-muted mt-1">{teachers.length} docente{teachers.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard" className="hover:text-primary">Inicio</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Docentes</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{teachers.length}</p>
          <p className="text-sm text-muted">Total Docentes</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3">
            <GraduationCap className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">
            {Object.values(pendingMap).reduce((a, b) => a + b, 0)}
          </p>
          <p className="text-sm text-muted">Solicitudes Pendientes</p>
        </div>
      </div>

      <TeachersClient teachers={teachers} />
    </div>
  )
}
