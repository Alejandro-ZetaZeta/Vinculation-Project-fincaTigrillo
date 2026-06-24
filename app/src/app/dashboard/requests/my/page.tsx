import { createInsForgeServerClient } from '@/lib/insforge/server'
import { getAccessToken } from '@/lib/auth/cookies'
import { getCurrentUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { ListTodo } from 'lucide-react'
import Link from 'next/link'
import { MyRequestsClient } from '@/components/requests/MyRequestsClient'

export default async function MyRequestsPage() {
  const user = await getCurrentUser()
  if (!user || user.role === 'viewer') redirect('/dashboard')
  if (user.role === 'admin') redirect('/dashboard/requests')

  const accessToken = await getAccessToken()
  const insforge = createInsForgeServerClient(accessToken)

  const { data: requestRows } = await insforge.database
    .from('requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const requests = requestRows || []

  return (
    <div className="space-y-8 overflow-hidden min-w-0">
      <div>
        <h1 className="font-display tracking-tight text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <ListTodo className="w-7 h-7 text-primary" />
          Mis Solicitudes
        </h1>
        <p className="text-muted mt-1">{requests.length} solicitud{requests.length !== 1 ? 'es' : ''} enviadas</p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard" className="hover:text-primary">Inicio</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Mis Solicitudes</span>
      </div>

      <MyRequestsClient requests={requests} />
    </div>
  )
}
