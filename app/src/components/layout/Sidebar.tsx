'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PawPrint, ClipboardList,
  Menu, X, Users, ListTodo, Calculator, FileText,
  PanelLeftClose, Syringe, CalendarDays,
  Wrench, ChevronDown, Package, Sprout,
} from 'lucide-react'
import { useState, useEffect } from 'react'

// ── Flat nav items (non-grouped) ────────────────────────────────────────────
const allNavItems = [
  { href: '/dashboard',            label: 'Inicio',              icon: LayoutDashboard, adminOnly: false, viewerOnly: false },
  { href: '/dashboard/animals',    label: 'Registrar Animal',    icon: PawPrint,        adminOnly: true,  viewerOnly: false },
  { href: '/dashboard/vaccines',   label: 'Vacunas',             icon: Syringe,         adminOnly: true,  viewerOnly: false },
  { href: '/dashboard/students',   label: 'Estudiantes',         icon: Users,           adminOnly: true,  viewerOnly: false },
  { href: '/dashboard/activities', label: 'Actividades',         icon: ListTodo,        adminOnly: true,  viewerOnly: false },
  { href: '/dashboard/activities', label: 'Mis Actividades',     icon: ListTodo,        adminOnly: false, viewerOnly: true  },
  { href: '/dashboard/sembrios',   label: 'Sembríos',            icon: Sprout,          adminOnly: true,  viewerOnly: false },
  { href: '/dashboard/reports',    label: 'Informes Operativos', icon: FileText,        adminOnly: false, viewerOnly: false },
  { href: '/dashboard/events',     label: 'Eventos',             icon: CalendarDays,    adminOnly: false, viewerOnly: false },
  { href: '/dashboard/calculators',label: 'Calculadoras',        icon: Calculator,      adminOnly: false, viewerOnly: false },
]

// ── Inventory sub-items (always in the collapsible group) ───────────────────
const inventoryItems = [
  { href: '/dashboard/animals/list',      label: 'Animales',      icon: ClipboardList, adminOnly: false },
  { href: '/dashboard/inventory/tools',   label: 'Herramientas',  icon: Wrench,        adminOnly: true  },
]

// ═══════════════════════════════════════════════════════════════════════════
export function Sidebar({ userRole }: { userRole: string }) {
  const pathname    = usePathname()
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const isAdmin = userRole === 'admin'

  // Auto-open the inventory group when any child route is active
  const inventoryActive = inventoryItems.some(i => pathname.startsWith(i.href))
  const [invOpen, setInvOpen] = useState(inventoryActive)

  // Keep open when navigating within inventory
  useEffect(() => {
    if (inventoryActive) setInvOpen(true)
  }, [inventoryActive])

  // Sync main-content margin on sidebar collapse
  useEffect(() => {
    const wrapper = document.getElementById('main-content-wrapper')
    if (wrapper) {
      if (isCollapsed) {
        wrapper.classList.remove('md:ml-64')
        wrapper.classList.add('md:ml-[72px]')
      } else {
        wrapper.classList.remove('md:ml-[72px]')
        wrapper.classList.add('md:ml-64')
      }
    }
  }, [isCollapsed])

  // Filter flat nav items by role
  const navItems = allNavItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false
    if (item.viewerOnly && isAdmin) return false
    return true
  })

  // Filter inventory sub-items by role
  const visibleInventoryItems = inventoryItems.filter(i => !i.adminOnly || isAdmin)

  // Shared link class builder
  function linkCls(isActive: boolean, collapsed: boolean) {
    return [
      'flex items-center gap-3 py-2.5 rounded-xl text-sm transition-all relative group',
      isActive ? 'nav-item-active' : 'nav-item-idle',
      collapsed ? 'px-0 justify-center' : 'px-3',
    ].join(' ')
  }

  return (
    <>
      {/* ── Mobile hamburger ───────────────────────────────────────────── */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2.5 rounded-xl bg-surface border border-border shadow-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
        id="sidebar-toggle"
        aria-label={mobileOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
        aria-expanded={mobileOpen}
        aria-controls="app-sidebar"
      >
        {mobileOpen
          ? <X    className="w-5 h-5" aria-hidden="true" />
          : <Menu className="w-5 h-5" aria-hidden="true" />
        }
      </button>

      {/* ── Mobile overlay ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar panel ──────────────────────────────────────────────── */}
      <aside
        id="app-sidebar"
        role="navigation"
        aria-label="Menú principal de la aplicación"
        className={[
          'sidebar-panel',
          'fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300',
          isCollapsed ? 'w-[72px]' : 'w-64',
          mobileOpen ? 'translate-x-0 is-open' : '-translate-x-full',
          'md:translate-x-0',
        ].join(' ')}
      >
        <div className="px-4 h-16 border-b border-(--sidebar-border) flex shrink-0 items-center justify-between">
          {isCollapsed ? (
            /* ── Collapsed (md+): icon acts as expand button ── */
            <button
              onClick={() => setIsCollapsed(false)}
              className="hidden md:flex w-9 h-9 rounded-xl bg-white/15 border border-white/25 items-center justify-center shrink-0 hover:bg-white/25 transition-colors overflow-hidden mx-auto"
              aria-label="Expandir menú"
              title="Expandir menú"
            >
              <Image src="/faviconOficial.svg" alt="Logo" width={28} height={28} className="object-contain dark:invert" />
            </button>
          ) : (
            /* ── Expanded: icon links to /dashboard + collapse button ── */
            <>
              <Link
                href="/dashboard"
                className="flex items-center gap-3 group rounded-lg p-1 -m-1"
                onClick={() => setMobileOpen(false)}
                aria-label="Finca Tigrillo — Ir al inicio"
              >
                <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 group-hover:bg-white/25 transition-colors overflow-hidden">
                  <Image src="/faviconOficial.svg" alt="Logo" width={28} height={28} className="object-contain dark:invert" />
                </div>
                <div className="whitespace-nowrap opacity-100 transition-opacity duration-300">
                  <p className="font-display font-700 text-sm text-sidebar-text leading-tight tracking-tight">Finca Tigrillo</p>
                  <p className="text-[11px] text-sidebar-muted leading-tight mt-0.5">Gestión Ganadera</p>
                </div>
              </Link>

              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden md:flex p-1.5 rounded-lg text-sidebar-muted hover:text-sidebar-text bg-white/8 hover:bg-white/12 border border-white/0 hover:border-white/15 transition-all items-center justify-center shrink-0"
                aria-label="Colapsar menú"
                title="Colapsar menú"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* ── Navigation ─────────────────────────────────────────────── */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden" aria-label="Secciones principales">
          {!isCollapsed && <p className="text-[10px] font-semibold text-sidebar-muted uppercase tracking-widest mb-2 px-3 whitespace-nowrap">Menú</p>}

          {/* ── Top nav items: Inicio + Registrar Animal ──────────────── */}
          {navItems.filter(i => i.href === '/dashboard' || i.href === '/dashboard/animals').map(item => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href) &&
               !pathname.startsWith('/dashboard/animals/list'))
            const Icon = item.icon
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={linkCls(isActive, isCollapsed)}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                {isActive && !isCollapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0" aria-hidden="true" />
                )}
                {isActive && isCollapsed && (
                  <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0" aria-hidden="true" />
                )}
              </Link>
            )
          })}

          {/* ── Collapsible Inventario group (below Registrar Animal) ── */}
          {visibleInventoryItems.length > 0 && (
            <div className="pt-0.5">
              {/* Group header / toggle */}
              {isCollapsed ? (
                /* Collapsed: show a Package icon linking to animals list as anchor */
                <Link
                  href="/dashboard/animals/list"
                  onClick={() => setMobileOpen(false)}
                  className={linkCls(inventoryActive, true)}
                  title="Inventario"
                  aria-label="Inventario"
                >
                  <Package className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {inventoryActive && (
                    <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0" aria-hidden="true" />
                  )}
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setInvOpen(o => !o)}
                    className={[
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                      inventoryActive ? 'text-sidebar-active font-semibold' : 'nav-item-idle',
                    ].join(' ')}
                    aria-expanded={invOpen}
                    aria-controls="inventory-submenu"
                  >
                    <Package className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 text-left whitespace-nowrap">Inventario</span>
                    <ChevronDown
                      className={['w-3.5 h-3.5 transition-transform duration-200', invOpen ? 'rotate-180' : ''].join(' ')}
                      aria-hidden="true"
                    />
                  </button>

                  {/* Sub-items with animated reveal */}
                  <div
                    id="inventory-submenu"
                    className={[
                      'overflow-hidden transition-all duration-200',
                      invOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
                    ].join(' ')}
                  >
                    <div className="ml-3 pl-3 border-l border-white/20 space-y-0.5 py-1">
                      {visibleInventoryItems.map(sub => {
                        const isActive = pathname === sub.href || pathname.startsWith(sub.href)
                        const Icon = sub.icon
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setMobileOpen(false)}
                            aria-current={isActive ? 'page' : undefined}
                            className={[
                              'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all',
                              isActive ? 'nav-item-active' : 'nav-item-idle',
                            ].join(' ')}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span className="whitespace-nowrap">{sub.label}</span>
                            {isActive && (
                              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0" aria-hidden="true" />
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
          {/* ── Bottom nav items: everything after the inventory group ── */}
          {navItems.filter(i => i.href !== '/dashboard' && i.href !== '/dashboard/animals').map(item => {
            const isActive = pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={linkCls(isActive, isCollapsed)}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                {!isCollapsed && <span className="whitespace-nowrap">{item.label}</span>}
                {isActive && !isCollapsed && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0" aria-hidden="true" />
                )}
                {isActive && isCollapsed && (
                  <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0" aria-hidden="true" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* ── Role footer ────────────────────────────────────────────── */}
        <div className={`px-3 py-4 border-t border-(--sidebar-border) ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div
            className={`rounded-xl bg-white/10 flex items-center ${isCollapsed ? 'p-2 justify-center' : 'px-3 py-2.5 gap-2.5'}`}
            title={isCollapsed ? `Rol: ${isAdmin ? 'Administrador' : 'Estudiante'}` : undefined}
          >
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Image src="/faviconOficial.svg" alt="Role" width={16} height={16} className="object-contain opacity-80 dark:invert" />
            </div>
            {!isCollapsed && (
              <div className="whitespace-nowrap">
                <p className="text-[10px] text-sidebar-muted leading-none mb-0.5">Rol actual</p>
                <p className="text-xs font-semibold text-sidebar-text capitalize">
                  {isAdmin ? 'Administrador' : 'Estudiante'}
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
