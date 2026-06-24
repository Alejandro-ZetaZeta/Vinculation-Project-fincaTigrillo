'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'uleam' | 'uleam-dark'

const ThemeContext = createContext<{
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('ft-theme') as Theme | null
    if (stored === 'dark' || stored === 'light' || stored === 'uleam' || stored === 'uleam-dark') {
      setTheme(stored)
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute('data-theme', theme)
      localStorage.setItem('ft-theme', theme)
    }
  }, [theme, mounted])

  function toggleTheme() {
    setTheme(prev => {
      if (prev === 'light') return 'dark'
      if (prev === 'dark') return 'light'
      if (prev === 'uleam') return 'uleam-dark'
      if (prev === 'uleam-dark') return 'uleam'
      return 'light'
    })
  }

  // Prevent flash of wrong theme
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
