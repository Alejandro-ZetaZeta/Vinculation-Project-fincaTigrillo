import { createInsForgeServerClient } from '@/lib/insforge/server'
import { getAccessToken } from '@/lib/auth/cookies'
import { getCurrentUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import Link from 'next/link'
import { RequestsAdminClient } from '@/components/requests/RequestsAdminClient'

export default async function RequestsAdminPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/dashboard')

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  const { data: requestRows } = await insforge.database
    .from('requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  const rows = requestRows || []

  const teacherUserIds = [...new Set(rows.map((r: { teacher_id: string }) => r.teacher_id))]
  const profileMap: Record<string, string> = {}

  if (teacherUserIds.length > 0) {
    const { data: profiles } = await insforge.database
      .from('user_profiles')
      .select('user_id, full_name')
      .in('user_id', teacherUserIds)

    for (const p of (profiles || []) as { user_id: string; full_name: string }[]) {
      profileMap[p.user_id] = p.full_name
    }
  }

  type RequestRow = { id: string; teacher_id: string; teacher_name: string | null; request_type: string; status: 'pending' | 'approved' | 'rejected'; payload: Record<string, unknown>; admin_notes: string | null; created_at: string; reviewed_at: string | null }

  const requests: RequestRow[] = rows.map((r: Record<string, unknown>) => ({
    id:           r.id as string,
    teacher_id:   r.teacher_id as string,
    teacher_name: profileMap[r.teacher_id as string] ?? null,
    request_type: r.request_type as string,
    status:       (r.status as RequestRow['status']),
    payload:      (r.payload as Record<string, unknown>) ?? {},
    admin_notes:  (r.admin_notes as string | null) ?? null,
    created_at:   r.created_at as string,
    reviewed_at:  (r.reviewed_at as string | null) ?? null,
  }))

  const pending  = requests.filter(r => r.status === 'pending').length
  const approved = requests.filter(r => r.status === 'approved').length
  const rejected = requests.filter(r => r.status === 'rejected').length

  return (
    <div className="space-y-8 overflow-hidden min-w-0">
      <div>
        <h1 className="font-display tracking-tight text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-primary" />
          Gestionar Solicitudes
        </h1>
        <p className="text-muted mt-1">{requests.length} solicitud{requests.length !== 1 ? 'es' : ''}</p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard" className="hover:text-primary">Inicio</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Solicitudes</span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-2xl font-bold text-amber-500">{pending}</p>
          <p className="text-sm text-muted mt-1">Pendientes</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-2xl font-bold text-emerald-500">{approved}</p>
          <p className="text-sm text-muted mt-1">Aprobadas</p>
        </div>
        <div className="bg-surface border border-border rounded-2xl p-5">
          <p className="text-2xl font-bold text-red-500">{rejected}</p>
          <p className="text-sm text-muted mt-1">Rechazadas</p>
        </div>
      </div>

      <RequestsAdminClient requests={requests} userRole={user.role} />
    </div>
  )
}
