'use client'

import { signOut } from '@/lib/auth/actions'
import { LogOut, Sun, Moon, Palette, Camera, Loader2 } from 'lucide-react'
import { useState, useRef, useEffect, useCallback } from 'react'
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
  const roleLabel = userRole === 'admin' ? 'Administrador' : 'Estudiante'

  /* Fetch cooldown info the first time a viewer opens the menu */
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
    if (menuOpen && isViewer && cooldown === null && !cooldownLoading) {
      fetchCooldown()
    }
  }, [menuOpen, isViewer, cooldown, cooldownLoading, fetchCooldown])

  /* Click-outside + Escape to close menu */
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
    // Reset cooldown so it re-fetches next time the menu opens
    setCooldown(null)
  }

  return (
    <>
      <header
        id="app-header"
        className="sticky top-0 z-20 h-16 bg-surface/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-6 lg:px-8"
      >
        {/* Left spacer (mobile: offset for hamburger) */}
        <div className="md:hidden w-12" aria-hidden="true" />
        <div className="hidden md:block flex-1" aria-hidden="true" />

        {/* Right actions */}
        <div className="flex items-center gap-1.5">

          <NotificationBell userRole={userRole} />

          {/* Theme toggles */}
          <button
            onClick={() => setTheme(theme === 'uleam' ? 'light' : 'uleam')}
            className={`p-2.5 rounded-xl transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center mr-1 ${theme === 'uleam' ? 'bg-primary/10 text-primary' : 'text-muted hover:text-foreground hover:bg-surface-hover'}`}
            title="Tema Uleam (Material Design 3)"
            aria-label="Cambiar a tema Uleam"
          >
            <Palette className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            onClick={() => theme === 'dark' ? setTheme('light') : setTheme('dark')}
            className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            id="theme-toggle"
            aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark'
              ? <Sun  className="w-4 h-4" aria-hidden="true" />
              : <Moon className="w-4 h-4" aria-hidden="true" />
            }
          </button>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2.5 pl-1 pr-2 py-1.5 rounded-xl hover:bg-surface-hover transition-colors min-h-[44px]"
              id="user-menu-toggle"
              aria-label={`Menú de usuario: ${userName}`}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-controls="user-dropdown"
            >
              <Avatar src={avatarUrl} name={userName} size="sm" />
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-foreground leading-tight">{userName}</p>
                <p className="text-[11px] text-muted leading-tight">{roleLabel}</p>
              </div>
            </button>

            {menuOpen && (
              <div
                id="user-dropdown"
                role="menu"
                aria-label="Opciones de usuario"
                className="absolute right-0 top-full mt-2 w-72 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
              >
                {/* User info */}
                <div className="p-4 border-b border-border bg-surface-hover/40">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar src={avatarUrl} name={userName} size="lg" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                      <p className="text-xs text-muted truncate mt-0.5">{userEmail}</p>
                      <span className="inline-block mt-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/12 text-primary font-semibold">
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
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        >
                          <Camera className="w-3.5 h-3.5" /> Cambiar foto de perfil
                        </button>
                      ) : cooldown ? (
                        <p className="text-[11px] text-muted text-center py-1.5 px-2 bg-muted/5 rounded-lg">
                          Próximo cambio disponible en{' '}
                          <strong>{cooldown.days_until_change}</strong>{' '}
                          día{cooldown.days_until_change !== 1 ? 's' : ''}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>

                {/* Sign out */}
                <div className="p-2">
                  <form action={signOut}>
                    <button
                      type="submit"
                      role="menuitem"
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-danger hover:bg-danger/10 rounded-xl transition-colors min-h-[44px]"
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

      {/* Avatar upload modal (viewers only) */}
      {showModal && (
        <AvatarUploadModal
          onClose={() => setShowModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </>
  )
}
