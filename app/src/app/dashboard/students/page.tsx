import { createInsForgeServerClient } from '@/lib/insforge/server'
import { getAccessToken } from '@/lib/auth/cookies'
import { getCurrentUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { Users, GraduationCap, BookOpen } from 'lucide-react'
import Link from 'next/link'

interface StudentProfile {
  id: string
  user_id: string
  full_name: string
  role: string
  semester: string | null
  career: string | null
  created_at: string
}

export default async function StudentsPage() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') redirect('/dashboard')

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  const { data: students } = await insforge.database
    .from('user_profiles')
    .select('id, user_id, full_name, role, semester, career, created_at')
    .eq('role', 'viewer')
    .order('created_at', { ascending: false }) as { data: StudentProfile[] | null }

  const studentList = students || []

  // Group counts
  const bySemester: Record<string, number> = {}
  const byCareer: Record<string, number> = {}
  studentList.forEach(s => {
    if (s.semester) bySemester[s.semester] = (bySemester[s.semester] || 0) + 1
    if (s.career) byCareer[s.career] = (byCareer[s.career] || 0) + 1
  })

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  return (
    <div className="space-y-8" id="students-page">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Users className="w-7 h-7 text-primary" />
          Estudiantes Registrados
        </h1>
        <p className="text-muted mt-1">{studentList.length} estudiante{studentList.length !== 1 ? 's' : ''} registrado{studentList.length !== 1 ? 's' : ''}</p>
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
          <div key={career} className="bg-surface border border-border rounded-2xl p-5" id={`card-career-${career.toLowerCase()}`}>
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

      {/* Students table */}
      {studentList.length > 0 ? (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden" id="students-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-hover">
                  <th className="text-left px-5 py-3 font-semibold text-muted">Nombre</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted">Carrera</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted">Semestre</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted">Registrado</th>
                </tr>
              </thead>
              <tbody>
                {studentList.map((student) => (
                  <tr key={student.id} className="border-b border-border last:border-0 hover:bg-surface-hover">
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{student.full_name || 'Sin nombre'}</p>
                    </td>
                    <td className="px-5 py-3">
                      {student.career ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">{student.career}</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {student.semester ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{student.semester}° Sem</span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted">{formatDate(student.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center" id="students-empty">
          <GraduationCap className="w-12 h-12 text-muted/30 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Sin estudiantes</h3>
          <p className="text-sm text-muted">Aún no se han registrado estudiantes en la plataforma</p>
        </div>
      )}
    </div>
  )
}
