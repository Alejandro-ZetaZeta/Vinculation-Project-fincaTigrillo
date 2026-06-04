'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PawPrint, ClipboardList,
  Users, ListTodo, Calculator, FileText,
  PanelLeftClose, Syringe, CalendarDays,
  Wrench, ChevronDown, Package, Sprout,
  ShieldCheck, GraduationCap,
} from 'lucide-react'
import { useState, useEffect } from 'react'

// ── Flat nav items ───────────────────────────────────────────────────────────
const allNavItems = [
  { href: '/dashboard',            label: 'Inicio',              icon: LayoutDashboard, adminOnly: false, viewerOnly: false },
  { href: '/dashboard/animals',    label: 'Registrar Animal',    icon: PawPrint,        adminOnly: true,  viewerOnly: false },
  { href: '/dashboard/vaccines',   label: 'Vacunas',             icon: Syringe,         adminOnly: true,  viewerOnly: false },
  { href: '/dashboard/sembrios',   label: 'Sembríos',            icon: Sprout,          adminOnly: true,  viewerOnly: false },
  { href: '/dashboard/reports',    label: 'Informes Operativos', icon: FileText,        adminOnly: false, viewerOnly: false },
  { href: '/dashboard/events',     label: 'Eventos',             icon: CalendarDays,    adminOnly: false, viewerOnly: false },
  { href: '/dashboard/calculators',label: 'Calculadoras',        icon: Calculator,      adminOnly: false, viewerOnly: false },
]

// ── Inventory sub-items ──────────────────────────────────────────────────────
const inventoryItems = [
  { href: '/dashboard/animals/list',    label: 'Animales',     icon: ClipboardList, adminOnly: false },
  { href: '/dashboard/inventory/tools', label: 'Herramientas', icon: Wrench,        adminOnly: true  },
]

// ── People sub-items ─────────────────────────────────────────────────────────
const peopleItems = [
  { href: '/dashboard/students',   label: 'Estudiantes',     icon: Users,    adminOnly: true,  viewerOnly: false },
  { href: '/dashboard/activities', label: 'Actividades',     icon: ListTodo, adminOnly: true,  viewerOnly: false },
  { href: '/dashboard/activities', label: 'Mis Actividades', icon: ListTodo, adminOnly: false, viewerOnly: true  },
]

// ═══════════════════════════════════════════════════════════════════════════
export function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const isAdmin = userRole === 'admin'

  const inventoryActive = inventoryItems.some(i => pathname.startsWith(i.href))
  const [invOpen, setInvOpen] = useState(inventoryActive)

  const visiblePeopleItems = peopleItems.filter(i => {
    if (i.adminOnly && !isAdmin) return false
    if (i.viewerOnly && isAdmin) return false
    return true
  })
  const peopleActive = visiblePeopleItems.some(i => pathname.startsWith(i.href))
  const [peopleOpen, setPeopleOpen] = useState(peopleActive)

  useEffect(() => { if (inventoryActive) setInvOpen(true)  }, [inventoryActive])
  useEffect(() => { if (peopleActive)    setPeopleOpen(true) }, [peopleActive])

  // Listen for open event dispatched by the Header's mobile logo button
  useEffect(() => {
    const handler = () => setMobileOpen(true)
    window.addEventListener('sidebar:open', handler)
    return () => window.removeEventListener('sidebar:open', handler)
  }, [])

  // Sync main-content margin on desktop sidebar collapse
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

  const navItems = allNavItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false
    if (item.viewerOnly && isAdmin) return false
    return true
  })
  const visibleInventoryItems = inventoryItems.filter(i => !i.adminOnly || isAdmin)

  function linkCls(isActive: boolean, collapsed: boolean) {
    return [
      'flex items-center gap-3 py-2.5 rounded-xl text-sm transition-all duration-200 relative group cursor-pointer',
      isActive ? 'nav-item-active' : 'nav-item-idle',
      collapsed ? 'px-0 justify-center' : 'px-3',
    ].join(' ')
  }

  function groupHeaderCls(isGroupActive: boolean) {
    return [
      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer',
      isGroupActive
        ? 'text-sidebar-text font-semibold bg-white/10'
        : 'nav-item-idle',
    ].join(' ')
  }

  return (
    <>
      {/* ── Mobile overlay ──────────────────────────────────────────── */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        className={[
          'fixed inset-0 z-30 md:hidden backdrop-blur-sm',
          'bg-black/60 transition-opacity duration-300',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* ── Sidebar panel ───────────────────────────────────────────── */}
      <aside
        id="app-sidebar"
        role="navigation"
        aria-label="Menú principal de la aplicación"
        className={[
          'sidebar-panel',
          'fixed inset-y-0 left-0 z-40 flex flex-col',
          'transition-transform duration-300 ease-in-out',
          mobileOpen ? 'w-64' : isCollapsed ? 'w-[72px]' : 'w-64',
          mobileOpen ? 'translate-x-0 is-open' : '-translate-x-full',
          'md:translate-x-0',
        ].join(' ')}
      >
        {/* ── Brand header ────────────────────────────────────────── */}
        <div className="px-4 h-16 border-b border-sidebar-border/60 flex shrink-0 items-center justify-between">

          {/* Mobile: full brand, tapping logo link closes sidebar */}
          <div className="md:hidden flex w-full items-center">
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group rounded-xl p-1 -m-1 transition-all duration-200"
              onClick={() => setMobileOpen(false)}
              aria-label="Finca Tigrillo — Ir al inicio"
            >
              <div className="relative w-10 h-10 rounded-2xl bg-white/12 border border-white/20 flex items-center justify-center shrink-0
                             group-hover:bg-white/22 group-hover:border-white/35 transition-all duration-200 overflow-hidden
                             shadow-[0_0_12px_rgba(74,222,128,0.2)]">
                <Image src="/faviconOficial.svg" alt="Logo Finca Tigrillo" width={28} height={28} className="object-contain invert" />
              </div>
              <div className="whitespace-nowrap">
                <p className="font-display font-bold text-sm leading-tight tracking-tight" style={{ color: '#ffffff' }}>
                  Finca Tigrillo
                </p>
                <p className="text-[10px] leading-tight mt-0.5 font-medium tracking-wide uppercase text-sidebar-muted">
                  Gestión Ganadera
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop: controlled by isCollapsed */}
          <div className="hidden md:flex w-full items-center justify-between">
            {isCollapsed ? (
              <button
                onClick={() => setIsCollapsed(false)}
                className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mx-auto
                           bg-white/10 border border-white/20 hover:bg-white/20 transition-all duration-200 overflow-hidden"
                aria-label="Expandir menú"
                title="Expandir menú"
              >
                <Image src="/faviconOficial.svg" alt="Logo" width={28} height={28} className="object-contain invert" />
              </button>
            ) : (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 group rounded-xl p-1 -m-1 transition-all duration-200"
                  aria-label="Finca Tigrillo — Ir al inicio"
                >
                  <div className="relative w-10 h-10 rounded-2xl bg-white/12 border border-white/20 flex items-center justify-center shrink-0
                                 group-hover:bg-white/22 group-hover:border-white/35 transition-all duration-200 overflow-hidden
                                 shadow-[0_0_12px_rgba(74,222,128,0.2)]">
                    <Image src="/faviconOficial.svg" alt="Logo Finca Tigrillo" width={28} height={28} className="object-contain invert" />
                  </div>
                  <div className="whitespace-nowrap">
                    <p className="font-display font-bold text-sm leading-tight tracking-tight" style={{ color: '#ffffff' }}>
                      Finca Tigrillo
                    </p>
                    <p className="text-[10px] leading-tight mt-0.5 font-medium tracking-wide uppercase text-sidebar-muted">
                      Gestión Ganadera
                    </p>
                  </div>
                </Link>
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="p-1.5 rounded-lg text-sidebar-muted hover:text-sidebar-text
                             bg-white/5 hover:bg-white/12 border border-transparent hover:border-white/15
                             transition-all duration-200 flex items-center justify-center shrink-0"
                  aria-label="Colapsar menú"
                  title="Colapsar menú"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── Navigation ──────────────────────────────────────────── */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden" aria-label="Secciones principales">

          {/* Top: Inicio + Registrar Animal */}
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
                {!isCollapsed && <span className="whitespace-nowrap flex-1">{item.label}</span>}
                {isActive && !isCollapsed && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0 pulse-dot" aria-hidden="true" />
                )}
                {isActive && isCollapsed && (
                  <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0" aria-hidden="true" />
                )}
              </Link>
            )
          })}

          {/* ── Collapsible Inventario ───────────────────────────── */}
          {visibleInventoryItems.length > 0 && (
            <div className="pt-0.5">
              {isCollapsed ? (
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
                    className={groupHeaderCls(inventoryActive)}
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

                  <div
                    id="inventory-submenu"
                    className={[
                      'overflow-hidden transition-all duration-200',
                      invOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
                    ].join(' ')}
                  >
                    <div className="ml-3 pl-3 border-l border-white/15 space-y-0.5 py-1">
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
                              'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200',
                              isActive ? 'nav-item-active' : 'nav-item-idle',
                            ].join(' ')}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span className="whitespace-nowrap flex-1">{sub.label}</span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0 pulse-dot" aria-hidden="true" />
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

          {/* ── Collapsible Personas (Students + Activities) ─────── */}
          {visiblePeopleItems.length > 0 && (
            <div className="pt-0.5">
              {isCollapsed ? (
                <Link
                  href={isAdmin ? '/dashboard/students' : '/dashboard/activities'}
                  onClick={() => setMobileOpen(false)}
                  className={linkCls(peopleActive, true)}
                  title="Personas"
                  aria-label="Personas"
                >
                  <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {peopleActive && (
                    <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0" aria-hidden="true" />
                  )}
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setPeopleOpen(o => !o)}
                    className={groupHeaderCls(peopleActive)}
                    aria-expanded={peopleOpen}
                    aria-controls="people-submenu"
                  >
                    <Users className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1 text-left whitespace-nowrap">Personas</span>
                    <ChevronDown
                      className={['w-3.5 h-3.5 transition-transform duration-200', peopleOpen ? 'rotate-180' : ''].join(' ')}
                      aria-hidden="true"
                    />
                  </button>

                  <div
                    id="people-submenu"
                    className={[
                      'overflow-hidden transition-all duration-200',
                      peopleOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
                    ].join(' ')}
                  >
                    <div className="ml-3 pl-3 border-l border-white/15 space-y-0.5 py-1">
                      {visiblePeopleItems.map(sub => {
                        const isActive = pathname === sub.href || pathname.startsWith(sub.href)
                        const Icon = sub.icon
                        return (
                          <Link
                            key={sub.href + sub.label}
                            href={sub.href}
                            onClick={() => setMobileOpen(false)}
                            aria-current={isActive ? 'page' : undefined}
                            className={[
                              'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200',
                              isActive ? 'nav-item-active' : 'nav-item-idle',
                            ].join(' ')}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                            <span className="whitespace-nowrap flex-1">{sub.label}</span>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0 pulse-dot" aria-hidden="true" />
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

          {/* ── Remaining flat items ─────────────────────────────── */}
          {navItems
            .filter(i =>
              i.href !== '/dashboard' &&
              i.href !== '/dashboard/animals' &&
              i.href !== '/dashboard/students' &&
              i.href !== '/dashboard/activities'
            )
            .map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href)
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
                  {!isCollapsed && <span className="whitespace-nowrap flex-1">{item.label}</span>}
                  {isActive && !isCollapsed && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0 pulse-dot" aria-hidden="true" />
                  )}
                  {isActive && isCollapsed && (
                    <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0" aria-hidden="true" />
                  )}
                </Link>
              )
            })
          }
        </nav>

        {/* ── Pasture image — above role footer ─────────────── */}
        {!isCollapsed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/pastoSidepanel.png"
            alt=""
            aria-hidden="true"
            className="w-full h-32 object-cover object-bottom opacity-75 pointer-events-none select-none"
          />
        )}

        {/* ── Role footer ──────────────────────────────────────────── */}
        <div className={`px-3 py-3 border-t border-sidebar-border/50 ${isCollapsed ? 'flex justify-center' : ''}`}>
          <div
            className={`rounded-2xl bg-white/8 border border-white/10 flex items-center
              ${isCollapsed ? 'p-2 justify-center' : 'px-3 py-2.5 gap-2.5'}`}
            title={isCollapsed ? `Rol: ${isAdmin ? 'Administrador' : 'Estudiante'}` : undefined}
          >
            <div className="w-8 h-8 rounded-xl bg-white/12 border border-white/15 flex items-center justify-center shrink-0">
              {isAdmin
                ? <ShieldCheck   className="w-4 h-4 text-sidebar-stripe" aria-hidden="true" />
                : <GraduationCap className="w-4 h-4 text-sidebar-stripe" aria-hidden="true" />
              }
            </div>
            {!isCollapsed && (
              <div className="whitespace-nowrap min-w-0">
                <p className="text-[10px] text-sidebar-muted/70 leading-none mb-1 font-medium uppercase tracking-wide">Rol actual</p>
                <p className="text-xs font-semibold text-sidebar-text capitalize flex items-center gap-1.5">
                  {isAdmin ? 'Administrador' : 'Estudiante'}
                  <span className="w-1.5 h-1.5 rounded-full bg-sidebar-stripe inline-block pulse-dot" aria-hidden="true" />
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
