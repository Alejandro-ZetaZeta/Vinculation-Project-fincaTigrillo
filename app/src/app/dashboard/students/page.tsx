import { createInsForgeServerClient } from '@/lib/insforge/server'
import { getAccessToken } from '@/lib/auth/cookies'
import { getCurrentUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { Users, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { StudentsClient } from '@/components/students/StudentsClient'

export default async function StudentsPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/dashboard')

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  const { data: students } = await insforge.database
    .from('user_profiles')
    .select('id, user_id, full_name, role, semester, career, created_at')
    .eq('role', 'viewer')
    .order('created_at', { ascending: false })

  const studentList = students || []

  // Group counts
  const byCareer: Record<string, number> = {}
  studentList.forEach((s: { career: string | null }) => {
    if (s.career) byCareer[s.career] = (byCareer[s.career] || 0) + 1
  })

  return (
    <div className="space-y-8" id="students-page">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Users className="w-7 h-7 text-primary" />
          Estudiantes Registrados
        </h1>
        <p className="text-muted mt-1">{studentList.length} estudiante{studentList.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard" className="hover:text-primary">Inicio</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Estudiantes</span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-5" id="card-total-students">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{studentList.length}</p>
          <p className="text-sm text-muted">Total</p>
        </div>
        {Object.entries(byCareer).map(([career, count]) => (
          <div key={career} className="bg-surface border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-accent" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{count}</p>
            <p className="text-sm text-muted">{career}</p>
          </div>
        ))}
      </div>

      {/* Client component */}
      <StudentsClient students={studentList} />
    </div>
  )
}
