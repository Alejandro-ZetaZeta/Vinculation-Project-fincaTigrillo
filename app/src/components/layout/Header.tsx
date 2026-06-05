'use client'

import { signOut } from '@/lib/auth/actions'
import { LogOut, Sun, Moon, Palette, Camera, Loader2, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useTheme } from '@/components/ThemeProvider'
import { NotificationBell } from '@/components/layout/NotificationBell'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarUploadModal } from '@/components/ui/AvatarUploadModal'

interface HeaderProps {
  userName: string
  userRole: string
  userEmail: string
  userAvatarUrl?: string | null
}

export function Header({ userName, userRole, userEmail, userAvatarUrl }: HeaderProps) {
  const [menuOpen, setMenuOpen]       = useState(false)
  const [avatarUrl, setAvatarUrl]     = useState(userAvatarUrl ?? null)
  const [showModal, setShowModal]     = useState(false)
  const [cooldown, setCooldown]       = useState<{ can_change: boolean; days_until_change: number } | null>(null)
  const [cooldownLoading, setCooldownLoading] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { theme, setTheme } = useTheme()

  const isViewer  = userRole === 'viewer'
  const roleLabel = userRole === 'admin' ? 'Administrador'
                  : userRole === 'teacher' ? 'Docente'
                  : 'Estudiante'

  const fetchCooldown = useCallback(async () => {
    setCooldownLoading(true)
    try {
      const res  = await fetch('/api/profile/avatar')
      const data = await res.json()
      setCooldown({ can_change: data.can_change, days_until_change: data.days_until_change })
    } catch { /* ignore */ } finally {
      setCooldownLoading(false)
    }
  }, [])

  useEffect(() => {
    if (menuOpen && isViewer && cooldown === null && !cooldownLoading) fetchCooldown()
  }, [menuOpen, isViewer, cooldown, cooldownLoading, fetchCooldown])

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  function handleUploadSuccess(newUrl: string) {
    setAvatarUrl(newUrl)
    setCooldown(null)
  }

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          Header — uses @theme inline tokens only (no [--var] syntax)
      ───────────────────────────────────────────────────────────── */}
      <header
        id="app-header"
        className="sticky top-0 z-20 h-16 flex items-center justify-between pl-0 pr-4 md:pr-6 lg:pr-8
                   bg-header-bg border-b border-border
                   shadow-[0_1px_0_rgba(0,0,0,0.06),0_2px_12px_rgba(22,163,74,0.04)]"
      >
        {/* Left — mobile sidebar open button */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('sidebar:open'))}
          className="md:hidden w-10 h-10 rounded-2xl flex items-center justify-center overflow-hidden shrink-0
                     bg-sidebar-bg border border-sidebar-border shadow-sm
                     hover:opacity-80 transition-opacity duration-200"
          aria-label="Abrir menú de navegación"
        >
          <Image src="/faviconOficial.svg" alt="Logo" width={28} height={28} className="object-contain invert" />
        </button>
        {/* Desktop-only decorative header illustration */}
        <div className="hidden md:flex flex-1 self-stretch relative overflow-hidden" aria-hidden="true">
          <div
            className="absolute inset-0 pointer-events-none select-none"
            style={{
              backgroundImage: 'url(/headerbg.svg)',
              backgroundSize: 'auto 100%',
              backgroundRepeat: 'repeat-x',
              backgroundPosition: '0 center',
              filter: theme === 'uleam'
                ? 'brightness(0) saturate(100%) invert(21%) sepia(86%) saturate(1200%) hue-rotate(199deg) brightness(96%) contrast(107%)'
                : theme === 'dark'
                ? 'brightness(0) saturate(100%) invert(67%) sepia(42%) saturate(700%) hue-rotate(110deg) brightness(103%) contrast(104%)'
                : 'brightness(0) saturate(100%) invert(42%) sepia(89%) saturate(600%) hue-rotate(110deg) brightness(100%) contrast(97%)',
              opacity: theme === 'dark' ? 0.15 : 0.28,
            }}
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1">

          <NotificationBell userRole={userRole} />

          {/* Theme toggles — compact pill group */}
          <div className="flex items-center gap-0.5 ml-1 mr-1 p-1 rounded-xl bg-surface-hover border border-border">
            {/* Uleam theme */}
            <button
              onClick={() => setTheme(theme === 'uleam' ? 'light' : 'uleam')}
              className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center min-w-[36px] min-h-[36px]
                ${theme === 'uleam'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface'}`}
              title="Tema Uleam"
              aria-label="Cambiar a tema Uleam"
            >
              <Palette className="w-4 h-4" aria-hidden="true" />
            </button>

            {/* Dark / light toggle */}
            <button
              onClick={() => theme === 'dark' ? setTheme('light') : setTheme('dark')}
              className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center min-w-[36px] min-h-[36px]
                ${theme === 'dark'
                  ? 'bg-surface text-foreground shadow-sm'
                  : 'text-muted hover:text-foreground hover:bg-surface'}`}
              id="theme-toggle"
              aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {theme === 'dark'
                ? <Sun  className="w-4 h-4" aria-hidden="true" />
                : <Moon className="w-4 h-4" aria-hidden="true" />
              }
            </button>
          </div>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl
                         hover:bg-surface-hover border border-transparent hover:border-border
                         transition-all duration-200 min-h-[44px]"
              id="user-menu-toggle"
              aria-label={`Menú de usuario: ${userName}`}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-controls="user-dropdown"
            >
              {/* Role-colored avatar ring */}
              <div className={`rounded-full p-0.5 ${
                userRole === 'admin'   ? 'bg-gradient-to-br from-emerald-400 to-green-600'
                : userRole === 'teacher' ? 'bg-gradient-to-br from-violet-400 to-purple-600'
                : 'bg-gradient-to-br from-amber-400 to-orange-500'
              }`}>
                <div className="bg-header-bg rounded-full p-0.5">
                  <Avatar src={avatarUrl} name={userName} size="sm" />
                </div>
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-foreground leading-tight">{userName}</p>
                <p className="text-[11px] text-muted leading-tight">{roleLabel}</p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted hidden sm:block transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>

            {/* ── Dropdown — opaque surface + strong blur for frosted glass ── */}
            {menuOpen && (
              <div
                id="user-dropdown"
                role="menu"
                aria-label="Opciones de usuario"
                className="absolute right-0 top-full mt-2 w-72 z-50 animate-fade-up
                           rounded-2xl overflow-hidden
                           border border-border
                           shadow-[0_8px_32px_rgba(0,0,0,0.14),0_2px_8px_rgba(22,163,74,0.06)]"
                style={{ backgroundColor: 'var(--surface)' }}
              >
                {/* User info header */}
                <div className="p-4 border-b border-border bg-surface-hover/60">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`rounded-full p-0.5 shrink-0 ${
                      userRole === 'admin'    ? 'bg-gradient-to-br from-emerald-400 to-green-600'
                      : userRole === 'teacher' ? 'bg-gradient-to-br from-violet-400 to-purple-600'
                      : 'bg-gradient-to-br from-amber-400 to-orange-500'
                    }`}>
                      <div className="bg-surface rounded-full p-0.5">
                        <Avatar src={avatarUrl} name={userName} size="lg" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                      <p className="text-xs text-muted truncate mt-0.5">{userEmail}</p>
                      <span className={`inline-block mt-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-semibold
                        ${userRole === 'admin'    ? 'bg-primary/12 text-primary'
                          : userRole === 'teacher' ? 'bg-violet-500/12 text-violet-600 dark:text-violet-400'
                          : 'bg-accent/12 text-accent'}`}>
                        {roleLabel}
                      </span>
                    </div>
                  </div>

                  {/* Photo change — viewers only */}
                  {isViewer && (
                    <>
                      {cooldownLoading ? (
                        <div className="flex items-center justify-center h-8">
                          <Loader2 className="w-3.5 h-3.5 text-muted animate-spin" />
                        </div>
                      ) : cooldown?.can_change ? (
                        <button
                          onClick={() => { setMenuOpen(false); setShowModal(true) }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium
                                     rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5" aria-hidden="true" />
                          Cambiar foto de perfil
                        </button>
                      ) : cooldown ? (
                        <p className="text-[11px] text-muted text-center py-1.5 px-2 bg-surface-hover rounded-xl border border-border">
                          Próximo cambio en{' '}
                          <strong className="text-foreground">{cooldown.days_until_change}</strong>{' '}
                          día{cooldown.days_until_change !== 1 ? 's' : ''}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>

                {/* Sign out */}
                <div className="p-2" style={{ backgroundColor: 'var(--surface)' }}>
                  <form action={signOut}>
                    <button
                      type="submit"
                      role="menuitem"
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-danger
                                 hover:bg-danger/8 rounded-xl transition-colors min-h-[44px] font-medium"
                      id="sign-out-button"
                    >
                      <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
                      Cerrar Sesión
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Avatar upload modal */}
      {showModal && (
        <AvatarUploadModal
          onClose={() => setShowModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </>
  )
}
