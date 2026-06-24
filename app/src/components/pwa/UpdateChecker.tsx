'use client'

import { useEffect, useState } from 'react'
import { ArrowUpCircle, X } from 'lucide-react'

const GITHUB_RELEASES_URL =
  'https://github.com/Alejandro-ZetaZeta/Vinculation-Project-fincaTigrillo/releases'
const GITHUB_API_LATEST =
  'https://api.github.com/repos/Alejandro-ZetaZeta/Vinculation-Project-fincaTigrillo/releases/latest'
const NOTIFIED_KEY = 'ft_update_notified_version'

function normalizeVersion(v: string): string {
  const clean = v.replace(/^v/, '')
  const parts = clean.split('.')
  while (parts.length < 3) parts.push('0')
  return parts.join('.')
}

function isNewerVersion(latest: string, current: string): boolean {
  const a = normalizeVersion(latest).split('.').map(Number)
  const b = normalizeVersion(current).split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true
    if (a[i] < b[i]) return false
  }
  return false
}

export default function UpdateChecker() {
  const [updateVersion, setUpdateVersion] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    async function check() {
      try {
        const { Capacitor } = await import('@capacitor/core')
        if (!Capacitor.isNativePlatform()) return

        const { App } = await import('@capacitor/app')
        const info = await App.getInfo()

        const res = await fetch(GITHUB_API_LATEST)
        if (!res.ok) return
        const data = await res.json()
        const latestTag: string = data.tag_name

        if (!isNewerVersion(latestTag, info.version)) return

        const latest = normalizeVersion(latestTag)
        setUpdateVersion(latest)

        const alreadyNotified = localStorage.getItem(NOTIFIED_KEY)
        if (alreadyNotified === latest) return

        const { LocalNotifications } = await import('@capacitor/local-notifications')
        const { display } = await LocalNotifications.requestPermissions()
        if (display === 'granted') {
          await LocalNotifications.schedule({
            notifications: [
              {
                id: 9001,
                title: 'Actualización disponible',
                body: `Versión ${latest} disponible. Instala la última versión estable de Finca Tigrillo.`,
                schedule: { at: new Date(Date.now() + 1500) },
              },
            ],
          })
          localStorage.setItem(NOTIFIED_KEY, latest)
        }
      } catch {
        // Update check is non-critical — fail silently
      }
    }

    check()
  }, [])

  if (!updateVersion || dismissed) return null

  async function handleUpdate() {
    const { Browser } = await import('@capacitor/browser')
    await Browser.open({ url: GITHUB_RELEASES_URL })
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 p-4"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      role="alert"
      aria-live="polite"
    >
      <div className="rounded-2xl bg-primary text-white shadow-2xl px-4 py-3 flex items-center gap-3">
        <ArrowUpCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Nueva versión disponible</p>
          <p className="text-xs text-white/80 truncate">v{updateVersion} — instala la versión estable</p>
        </div>
        <button
          onClick={handleUpdate}
          className="shrink-0 bg-white text-primary text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-white/90 transition-colors min-h-[36px]"
        >
          Actualizar
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 text-white/70 hover:text-white transition-colors rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label="Descartar"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
