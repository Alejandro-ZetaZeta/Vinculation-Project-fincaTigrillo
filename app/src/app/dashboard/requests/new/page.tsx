import { getCurrentUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import { PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { NewRequestClient } from '@/components/requests/NewRequestClient'

export default async function NewRequestPage() {
  const user = await getCurrentUser()
  if (!user || user.role === 'viewer') redirect('/dashboard')
  if (user.role === 'admin') redirect('/dashboard/requests')

  return (
    <div className="space-y-8 overflow-hidden min-w-0">
      <div>
        <h1 className="font-display tracking-tight text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <PlusCircle className="w-7 h-7 text-primary" />
          Nueva Solicitud
        </h1>
        <p className="text-muted mt-1">Envía una solicitud al administrador para registrar datos en el sistema</p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard" className="hover:text-primary">Inicio</Link>
        <span>/</span>
        <Link href="/dashboard/requests/my" className="hover:text-primary">Mis Solicitudes</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Nueva</span>
      </div>

      <NewRequestClient />
    </div>
  )
}
