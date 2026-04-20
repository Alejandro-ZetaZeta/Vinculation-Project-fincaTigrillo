'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, PawPrint, ClipboardList, Leaf, Menu, X, Users, ListTodo, Calculator } from 'lucide-react'
import { useState } from 'react'
import { FileText } from 'lucide-react'

const allNavItems = [
  { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard, adminOnly: false, viewerOnly: false },
  { href: '/dashboard/animals', label: 'Registrar Animal', icon: PawPrint, adminOnly: true, viewerOnly: false },
  { href: '/dashboard/animals/list', label: 'Inventario', icon: ClipboardList, adminOnly: false, viewerOnly: false },
  { href: '/dashboard/students', label: 'Estudiantes', icon: Users, adminOnly: true, viewerOnly: false },
  { href: '/dashboard/activities', label: 'Actividades', icon: ListTodo, adminOnly: true, viewerOnly: false },
  { href: '/dashboard/activities', label: 'Mis Actividades', icon: ListTodo, adminOnly: false, viewerOnly: true },
  { href: '/dashboard/reports', label: 'Informes Operativos', icon: FileText, adminOnly: false },
  { href: '/dashboard/calculators', label: 'Calculadoras', icon: Calculator, adminOnly: false },
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
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-xl bg-surface border border-border shadow-lg"
        id="sidebar-toggle"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="app-sidebar"
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-surface border-r border-border flex flex-col ${mobileOpen ? 'translate-x-0' : '-translate-x-full'
          } md:translate-x-0`}
      >
        {/* Brand */}
        <div className="p-6 border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-foreground leading-tight">Finca Tigrillo</h2>
              <p className="text-xs text-muted">Gestión Ganadera</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 px-3">Menú Principal</p>
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon

            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted hover:text-foreground hover:bg-surface-hover'
                  }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-primary' : ''}`} />
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <div className="px-3 py-2 rounded-xl bg-primary/5">
            <p className="text-xs text-muted">Rol actual</p>
            <p className="text-sm font-semibold text-primary capitalize">{userRole === 'admin' ? 'Administrador' : 'Estudiante'}</p>
          </div>
        </div>
      </aside>
    </>
  )
}
