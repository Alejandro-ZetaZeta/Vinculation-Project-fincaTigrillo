import { getCurrentUser } from '@/lib/auth/actions'
import { redirect }        from 'next/navigation'
import Link                from 'next/link'
import { Wrench }          from 'lucide-react'
import { ToolsManager }    from '@/components/tools/ToolsManager'


export default async function ToolsInventoryPage() {
  const user = await getCurrentUser()
  if (!user)               redirect('/login')
  if (user.role !== 'admin') redirect('/dashboard')

  return (
    <div className="space-y-8" id="tools-inventory-page">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="font-display tracking-tight text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Wrench className="w-7 h-7 text-primary" aria-hidden="true" />
          Inventario de Herramientas
        </h1>
        <p className="text-muted mt-1">
          Registra y controla el stock de equipos y herramientas de la finca
        </p>
      </div>

      {/* ── Breadcrumbs ───────────────────────────────────────────────────── */}
      <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-sm text-muted">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Inicio</Link>
        <span aria-hidden="true">/</span>
        <span className="text-foreground font-medium" aria-current="page">Herramientas</span>
      </nav>

      {/* ── Manager ───────────────────────────────────────────────────────── */}
      <ToolsManager />
    </div>
  )
}
