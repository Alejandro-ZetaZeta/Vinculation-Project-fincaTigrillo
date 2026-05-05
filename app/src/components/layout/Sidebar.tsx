'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PawPrint, ClipboardList, Leaf,
  Menu, X, Users, ListTodo, Calculator, FileText
} from 'lucide-react'
import { useState } from 'react'

const allNavItems = [
  { href: '/dashboard',            label: 'Inicio',              icon: LayoutDashboard, adminOnly: false, viewerOnly: false },
  { href: '/dashboard/animals',    label: 'Registrar Animal',    icon: PawPrint,        adminOnly: true,  viewerOnly: false },
  { href: '/dashboard/animals/list', label: 'Inventario',        icon: ClipboardList,   adminOnly: false, viewerOnly: false },
  { href: '/dashboard/students',   label: 'Estudiantes',         icon: Users,           adminOnly: true,  viewerOnly: false },
  { href: '/dashboard/activities', label: 'Actividades',         icon: ListTodo,        adminOnly: true,  viewerOnly: false },
  { href: '/dashboard/activities', label: 'Mis Actividades',     icon: ListTodo,        adminOnly: false, viewerOnly: true  },
  { href: '/dashboard/reports',    label: 'Informes Operativos', icon: FileText,        adminOnly: false, viewerOnly: false },
  { href: '/dashboard/calculators', label: 'Calculadoras',       icon: Calculator,      adminOnly: false, viewerOnly: false },
]

export function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const isAdmin = userRole === 'admin'

  const navItems = allNavItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false
    if (item.viewerOnly && isAdmin) return false
    return true
  })

  return (
    <>
      {/* Mobile hamburger toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2.5 rounded-xl bg-surface border border-border shadow-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
        id="sidebar-toggle"
        aria-label={mobileOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
        aria-expanded={mobileOpen}
        aria-controls="app-sidebar"
      >
        {mobileOpen
          ? <X className="w-5 h-5" aria-hidden="true" />
          : <Menu className="w-5 h-5" aria-hidden="true" />
        }
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        id="app-sidebar"
        role="navigation"
        aria-label="Menú principal de la aplicación"
        className={[
          'sidebar-panel',
          'fixed inset-y-0 left-0 z-40 w-64 flex flex-col',
          mobileOpen ? 'translate-x-0 is-open' : '-translate-x-full',
          'md:translate-x-0',
        ].join(' ')}
      >
        {/* Brand */}
        <div className="px-5 py-5 border-b border-(--sidebar-border)">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 group rounded-lg p-1 -m-1"
            onClick={() => setMobileOpen(false)}
            aria-label="Finca Tigrillo — Ir al inicio"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/25 transition-colors">
              <Leaf className="w-4.5 h-4.5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="font-display font-700 text-sm text-foreground leading-tight tracking-tight">Finca Tigrillo</p>
              <p className="text-[11px] text-muted leading-tight mt-0.5">Gestión Ganadera</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Secciones principales">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-widest mb-2 px-3">Menú</p>

          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                  isActive ? 'nav-item-active' : 'nav-item-idle',
                ].join(' ')}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User role footer */}
        <div className="px-3 py-4 border-t border-(--sidebar-border)">
          <div className="px-3 py-2.5 rounded-xl bg-primary/8 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <Leaf className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-[10px] text-muted leading-none mb-0.5">Rol actual</p>
              <p className="text-xs font-semibold text-primary capitalize">
                {isAdmin ? 'Administrador' : 'Estudiante'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
