import { getCurrentUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { ListTodo } from 'lucide-react'
import Link from 'next/link'
import { AdminActivitiesList } from '@/components/activities/AdminActivitiesList'
import { StudentKanban } from '@/components/activities/StudentKanban'

export default async function ActivitiesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const isAdmin   = user.role === 'admin'
  const isTeacher = user.role === 'teacher'
  const isStaff   = isAdmin || isTeacher

  return (
    <div className="space-y-8" id="activities-page">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <ListTodo className="w-7 h-7 text-primary" />
          {isStaff ? 'Gestión de Actividades' : 'Mis Actividades'}
        </h1>
        <p className="text-muted mt-1">
          {isStaff
            ? 'Crea y administra actividades para los estudiantes'
            : 'Arrastra tus actividades entre columnas para actualizar tu progreso'}
        </p>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard" className="hover:text-primary">Inicio</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{isStaff ? 'Actividades' : 'Mis Actividades'}</span>
      </div>

      {isStaff ? (
        <AdminActivitiesList userRole={user.role} userId={user.id} />
      ) : (
        <StudentKanban userId={user.id} />
      )}
    </div>
  )
}
