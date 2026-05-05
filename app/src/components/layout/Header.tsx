'use client'

import { signOut } from '@/lib/auth/actions'
import { LogOut, User, Sun, Moon } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useTheme } from '@/components/ThemeProvider'

interface HeaderProps {
  userName: string
  userRole: string
  userEmail: string
}

export function Header({ userName, userRole, userEmail }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [])

  const roleLabel = userRole === 'admin' ? 'Administrador' : 'Estudiante'

  return (
    <header
      id="app-header"
      className="sticky top-0 z-20 h-16 bg-surface/95 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-6 lg:px-8"
    >
      {/* Left spacer (mobile: offset for hamburger) */}
      <div className="md:hidden w-12" aria-hidden="true" />
      <div className="hidden md:block flex-1" aria-hidden="true" />

      {/* Right actions */}
      <div className="flex items-center gap-1.5">

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          id="theme-toggle"
          aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
        >
          {theme === 'light'
            ? <Moon className="w-4 h-4" aria-hidden="true" />
            : <Sun  className="w-4 h-4" aria-hidden="true" />
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
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            </div>
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
              className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
            >
              {/* User info header */}
              <div className="p-4 border-b border-border bg-surface-hover/40">
                <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                <p className="text-xs text-muted truncate mt-0.5">{userEmail}</p>
                <span className="inline-block mt-2 text-[11px] px-2.5 py-0.5 rounded-full bg-primary/12 text-primary font-semibold">
                  {roleLabel}
                </span>
              </div>

              {/* Actions */}
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
  )
}
