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
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header id="app-header" className="sticky top-0 z-20 h-16 bg-surface border-b border-border flex items-center justify-between px-4 md:px-6 lg:px-8">
      <div className="md:hidden w-10" />
      <div className="hidden md:block" />

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover"
          id="theme-toggle"
          title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* User menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-surface-hover"
            id="user-menu-toggle"
          >
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground leading-tight">{userName}</p>
              <p className="text-xs text-muted">{userRole === 'admin' ? 'Administrador' : 'Estudiante'}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
              <div className="p-4 border-b border-border">
                <p className="text-sm font-medium text-foreground">{userName}</p>
                <p className="text-xs text-muted truncate">{userEmail}</p>
                <span className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                  {userRole === 'admin' ? '🛡️ Admin' : '👁️ Estudiante'}
                </span>
              </div>
              <div className="p-2">
                <form action={signOut}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-danger/10 rounded-lg"
                    id="sign-out-button"
                  >
                    <LogOut className="w-4 h-4" />
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
