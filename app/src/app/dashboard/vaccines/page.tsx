import { getCurrentUser } from '@/lib/auth/actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Syringe } from 'lucide-react'
import { VaccineManager } from '@/components/vaccines/VaccineManager'

export default async function VaccinesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'viewer') redirect('/dashboard')

  return (
    <div className="space-y-8" id="vaccines-page">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Syringe className="w-7 h-7 text-primary" aria-hidden="true" />
          Gestión de Vacunas
        </h1>
        <p className="text-muted mt-1">Administra el catálogo y asigna vacunas por animal o por grupo</p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard" className="hover:text-primary">Inicio</Link>
        <span>/</span>
        <span className="text-foreground font-medium">Vacunas</span>
      </div>

      <VaccineManager userRole={user.role} />
    </div>
  )
}
