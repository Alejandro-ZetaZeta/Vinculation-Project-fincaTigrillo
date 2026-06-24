'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, PawPrint, ClipboardList,
  Users, ListTodo, Calculator, FileText,
  PanelLeftClose, Syringe, CalendarDays,
  Wrench, ChevronDown, Package, Sprout,
  ShieldCheck, GraduationCap, PlusCircle,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

// adminOnly = admin only; staffOnly = admin + teacher (not viewer); viewerOnly = viewer only
// ── Flat nav items ───────────────────────────────────────────────────────────
const allNavItems = [
  { href: '/dashboard',            label: 'Inicio',              icon: LayoutDashboard, adminOnly: false, staffOnly: false, viewerOnly: false },
  { href: '/dashboard/animals',    label: 'Registrar Animal',    icon: PawPrint,        adminOnly: true,  staffOnly: false, viewerOnly: false },
  { href: '/dashboard/vaccines',   label: 'Vacunas',             icon: Syringe,         adminOnly: false, staffOnly: true,  viewerOnly: false },
  { href: '/dashboard/sembrios',   label: 'Sembríos',            icon: Sprout,          adminOnly: false, staffOnly: true,  viewerOnly: false },
  { href: '/dashboard/reports',    label: 'Informes Operativos', icon: FileText,        adminOnly: false, staffOnly: false, viewerOnly: false },
  { href: '/dashboard/events',     label: 'Eventos',             icon: CalendarDays,    adminOnly: false, staffOnly: false, viewerOnly: false },
  { href: '/dashboard/calculators',label: 'Calculadoras',        icon: Calculator,      adminOnly: false, staffOnly: false, viewerOnly: false },
]

// ── Inventory sub-items ──────────────────────────────────────────────────────
const inventoryItems = [
  { href: '/dashboard/animals/list',    label: 'Animales',     icon: ClipboardList, adminOnly: false },
  { href: '/dashboard/inventory/tools', label: 'Herramientas', icon: Wrench,        adminOnly: true  },
]

// ── People sub-items ─────────────────────────────────────────────────────────
const peopleItems = [
  { href: '/dashboard/students',        label: 'Estudiantes',     icon: Users,          adminOnly: false, staffOnly: true,  viewerOnly: false },
  { href: '/dashboard/people/teachers', label: 'Docentes',        icon: GraduationCap,  adminOnly: true,  staffOnly: false, viewerOnly: false },
  { href: '/dashboard/activities',      label: 'Actividades',     icon: ListTodo,       adminOnly: false, staffOnly: true,  viewerOnly: false },
  { href: '/dashboard/activities',      label: 'Mis Actividades', icon: ListTodo,       adminOnly: false, staffOnly: false, viewerOnly: true  },
]

// ── Requests sub-items ───────────────────────────────────────────────────────
const requestsItems = [
  { href: '/dashboard/requests',     label: 'Gestionar', icon: ClipboardList, adminOnly: true,  teacherOnly: false, viewerOnly: false },
  { href: '/dashboard/requests/new', label: 'Nueva Solicitud',        icon: PlusCircle,    adminOnly: false, teacherOnly: true,  viewerOnly: false },
  { href: '/dashboard/requests/my',  label: 'Mis Solicitudes',        icon: ListTodo,      adminOnly: false, teacherOnly: true,  viewerOnly: false },
]

// ═══════════════════════════════════════════════════════════════════════════
export function Sidebar({ userRole }: { userRole: string }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen]   = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [isLargeScreen, setIsLargeScreen] = useState(false)
  const isLargeScreenRef = useRef(false)
  const effectivelyCollapsed = isCollapsed && !mobileOpen
  const isAdmin   = userRole === 'admin'
  const isTeacher = userRole === 'teacher'
  const isViewer  = userRole === 'viewer'

  const inventoryActive = inventoryItems.some(i => pathname.startsWith(i.href))
  const [invOpen, setInvOpen] = useState(inventoryActive)

  const visiblePeopleItems = peopleItems.filter(i => {
    if (i.adminOnly && !isAdmin) return false
    if (i.staffOnly && isViewer) return false
    if (i.viewerOnly && !isViewer) return false
    return true
  })
  const peopleActive = visiblePeopleItems.some(i => pathname.startsWith(i.href))
  const [peopleOpen, setPeopleOpen] = useState(peopleActive)

  const visibleRequestsItems = requestsItems.filter(i => {
    if (i.adminOnly && !isAdmin) return false
    if (i.teacherOnly && !isTeacher) return false
    if (i.viewerOnly && !isViewer) return false
    return true
  })
  const requestsActive = visibleRequestsItems.some(i => pathname.startsWith(i.href))
  const [requestsOpen, setRequestsOpen] = useState(requestsActive)

  useEffect(() => { if (inventoryActive) setInvOpen(true)  }, [inventoryActive])
  useEffect(() => { if (peopleActive)    setPeopleOpen(true) }, [peopleActive])
  useEffect(() => { if (requestsActive)  setRequestsOpen(true) }, [requestsActive])

  // Listen for open event dispatched by the Header's mobile logo button
  useEffect(() => {
    const handler = () => setMobileOpen(true)
    window.addEventListener('sidebar:open', handler)
    return () => window.removeEventListener('sidebar:open', handler)
  }, [])

  // Track lg breakpoint (1024px) to separate tablet vs laptop behavior
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 1024px)')
    isLargeScreenRef.current = mql.matches
    setIsLargeScreen(mql.matches)
    const handler = (e: MediaQueryListEvent) => {
      isLargeScreenRef.current = e.matches
      setIsLargeScreen(e.matches)
    }
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  // Tablet (md→lg): auto-collapse on nav. Laptop (lg+): stays expanded.
  // Uses ref so isLargeScreen changes never spuriously fire this effect.
  useEffect(() => {
    if (!isLargeScreenRef.current) setIsCollapsed(true)
    setMobileOpen(false)
  }, [pathname])

  // Laptop only: push content via inline style (beats CSS class specificity).
  // Tablet/mobile: sidebar overlays — inline style stays clear, CSS handles margin.
  useEffect(() => {
    const wrapper = document.getElementById('main-content-wrapper')
    if (!wrapper) return
    wrapper.style.marginLeft = (isLargeScreen && !isCollapsed) ? '16rem' : ''
  }, [isCollapsed, isLargeScreen])

  const navItems = allNavItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false
    if (item.staffOnly && isViewer) return false
    if (item.viewerOnly && !isViewer) return false
    return true
  })
  const visibleInventoryItems = inventoryItems.filter(i => !i.adminOnly || isAdmin)

  function linkCls(isActive: boolean, collapsed: boolean) {
    return [
      'flex items-center gap-3 py-2.5 rounded-xl text-sm transition-all duration-200 relative group cursor-pointer sidebar-link-animate',
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
      {/* ── Mobile + tablet overlay ─────────────────────────────────── */}
      <div
        onClick={() => { setMobileOpen(false); setIsCollapsed(true) }}
        aria-hidden="true"
        className={[
          'fixed inset-0 z-30 lg:hidden backdrop-blur-sm',
          'bg-black/60 transition-opacity duration-300',
          (mobileOpen || (!isCollapsed && !isLargeScreen))
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* ── Sidebar panel ───────────────────────────────────────────── */}
      <aside
        id="app-sidebar"
        role="navigation"
        aria-label="Menú principal de la aplicación"
        className={[
          'sidebar-panel',
          'fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden',
          'transition-transform duration-300 ease-in-out',
          mobileOpen ? 'w-64' : isCollapsed ? 'w-[72px] is-collapsed' : 'w-64',
          mobileOpen ? 'translate-x-0 is-open' : '-translate-x-full',
          'md:translate-x-0',
        ].join(' ')}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
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
                className={linkCls(isActive, effectivelyCollapsed)}
                title={effectivelyCollapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 shrink-0 sidebar-icon" aria-hidden="true" />
                {!effectivelyCollapsed && <span className="whitespace-nowrap flex-1">{item.label}</span>}
                {isActive && !effectivelyCollapsed && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0 pulse-dot" aria-hidden="true" />
                )}
                {isActive && effectivelyCollapsed && (
                  <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0" aria-hidden="true" />
                )}
              </Link>
            )
          })}

          {/* ── Collapsible Inventario ───────────────────────────── */}
          {visibleInventoryItems.length > 0 && (
            <div className="pt-0.5">
              {effectivelyCollapsed ? (
                <Link
                  href="/dashboard/animals/list"
                  onClick={() => setMobileOpen(false)}
                  className={linkCls(inventoryActive, true)}
                  title="Inventario"
                  aria-label="Inventario"
                >
                  <Package className="w-4 h-4 shrink-0 sidebar-icon" aria-hidden="true" />
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
                    <Package className="w-4 h-4 shrink-0 sidebar-icon" aria-hidden="true" />
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
                            <Icon className="w-3.5 h-3.5 shrink-0 sidebar-icon" aria-hidden="true" />
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
              {effectivelyCollapsed ? (
                <Link
                  href={isViewer ? '/dashboard/activities' : '/dashboard/students'}
                  onClick={() => setMobileOpen(false)}
                  className={linkCls(peopleActive, true)}
                  title="Personas"
                  aria-label="Personas"
                >
                  <Users className="w-4 h-4 shrink-0 sidebar-icon" aria-hidden="true" />
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
                    <Users className="w-4 h-4 shrink-0 sidebar-icon" aria-hidden="true" />
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
                            <Icon className="w-3.5 h-3.5 shrink-0 sidebar-icon" aria-hidden="true" />
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

          {/* ── Collapsible Solicitudes ─────────────────────────── */}
          {visibleRequestsItems.length > 0 && (
            <div className="pt-0.5">
              {effectivelyCollapsed ? (
                <Link
                  href={isAdmin ? '/dashboard/requests' : '/dashboard/requests/my'}
                  onClick={() => setMobileOpen(false)}
                  className={linkCls(requestsActive, true)}
                  title="Solicitudes"
                  aria-label="Solicitudes"
                >
                  <PlusCircle className="w-4 h-4 shrink-0 sidebar-icon" aria-hidden="true" />
                  {requestsActive && (
                    <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0" aria-hidden="true" />
                  )}
                </Link>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setRequestsOpen(o => !o)}
                    className={groupHeaderCls(requestsActive)}
                    aria-expanded={requestsOpen}
                    aria-controls="requests-submenu"
                  >
                    <PlusCircle className="w-4 h-4 shrink-0 sidebar-icon" aria-hidden="true" />
                    <span className="flex-1 text-left whitespace-nowrap">Solicitudes</span>
                    <ChevronDown
                      className={['w-3.5 h-3.5 transition-transform duration-200', requestsOpen ? 'rotate-180' : ''].join(' ')}
                      aria-hidden="true"
                    />
                  </button>

                  <div
                    id="requests-submenu"
                    className={[
                      'overflow-hidden transition-all duration-200',
                      requestsOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
                    ].join(' ')}
                  >
                    <div className="ml-3 pl-3 border-l border-white/15 space-y-0.5 py-1">
                      {visibleRequestsItems.map(sub => {
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
                            <Icon className="w-3.5 h-3.5 shrink-0 sidebar-icon" aria-hidden="true" />
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
                  className={linkCls(isActive, effectivelyCollapsed)}
                  title={effectivelyCollapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 shrink-0 sidebar-icon" aria-hidden="true" />
                  {!effectivelyCollapsed && <span className="whitespace-nowrap flex-1">{item.label}</span>}
                  {isActive && !effectivelyCollapsed && (
                    <span className="w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0 pulse-dot" aria-hidden="true" />
                  )}
                  {isActive && effectivelyCollapsed && (
                    <span className="absolute right-1 w-1.5 h-1.5 rounded-full bg-sidebar-stripe shrink-0" aria-hidden="true" />
                  )}
                </Link>
              )
            })
          }
        </nav>

        {/* ── Pasture image — above role footer ─────────────── */}
        {!effectivelyCollapsed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/pastoSidepanel.png"
            alt=""
            aria-hidden="true"
            className="w-full h-32 object-cover object-bottom opacity-75 pointer-events-none select-none"
          />
        )}

        {/* ── Role footer ──────────────────────────────────────────── */}
        <div className={`px-3 py-3 border-t border-sidebar-border/50 ${effectivelyCollapsed ? 'flex justify-center' : ''}`}>
          <div
            className={`rounded-2xl bg-white/8 border border-white/10 flex items-center
              ${effectivelyCollapsed ? 'p-2 justify-center' : 'px-3 py-2.5 gap-2.5'}`}
            title={effectivelyCollapsed ? `Rol: ${isAdmin ? 'Administrador' : isTeacher ? 'Docente' : 'Estudiante'}` : undefined}
          >
            <div className="w-8 h-8 rounded-xl bg-white/12 border border-white/15 flex items-center justify-center shrink-0">
              {isAdmin
                ? <ShieldCheck   className="w-4 h-4 text-sidebar-stripe" aria-hidden="true" />
                : <GraduationCap className="w-4 h-4 text-sidebar-stripe" aria-hidden="true" />
              }
            </div>
            {!effectivelyCollapsed && (
              <div className="whitespace-nowrap min-w-0">
                <p className="text-[10px] text-sidebar-muted/70 leading-none mb-1 font-medium uppercase tracking-wide">Rol actual</p>
                <p className="text-xs font-semibold text-sidebar-text capitalize flex items-center gap-1.5">
                  {isAdmin ? 'Administrador' : isTeacher ? 'Docente' : 'Estudiante'}
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
