'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Share, Smartphone, Check, Monitor } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type Variant = 'banner' | 'inline'
type Platform = 'ios' | 'android' | 'desktop'
type Support = 'native' | 'manual' | 'unsupported'

interface Context {
  platform: Platform
  support: Support
}

interface PWAInstallButtonProps {
  variant?: Variant
  className?: string
}

function detectContext(): Context {
  if (typeof navigator === 'undefined') return { platform: 'desktop', support: 'unsupported' }
  const ua = navigator.userAgent

  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && 'ontouchend' in document && navigator.maxTouchPoints > 1)
  const isAndroid = /Android/i.test(ua)

  const isFirefox = /Firefox/i.test(ua) && !/Seamonkey/i.test(ua)

  // Chromium family: Chrome, Edge, Opera, Brave, Vivaldi, Samsung, Arc, Yandex, etc.
  const isChromium =
    /Chrome|Chromium|Edg|OPR|Opera|Brave|Vivaldi|SamsungBrowser|YaBrowser|Arc/i.test(ua) &&
    !isFirefox

  // iOS browsers (Chrome iOS, Edge iOS, Firefox iOS) are all WebKit under the hood
  // and support Add to Home Screen via the system Share sheet.
  const isWebKitIOS = isIOS

  let support: Support
  if (isWebKitIOS || isAndroid) support = 'manual'
  else if (isChromium) support = 'native'
  else support = 'unsupported'

  const platform: Platform = isIOS ? 'ios' : isAndroid ? 'android' : 'desktop'
  return { platform, support }
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  if (window.matchMedia?.('(display-mode: minimal-ui)').matches) return true
  const nav = navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  return false
}

interface Instructions {
  title: string
  steps: string[]
}

function getInstructions(platform: Platform, browserLabel?: string): Instructions {
  if (platform === 'ios') {
    return {
      title: 'Instalar en iOS',
      steps: [
        'Toca el botón Compartir en la barra inferior de Safari.',
        'Selecciona "Añadir a pantalla de inicio".',
        'Toca "Añadir". La app aparecerá con el ícono de Tigrillo.',
      ],
    }
  }
  if (platform === 'android') {
    return {
      title: `Instalar en ${browserLabel ?? 'Android'}`,
      steps: [
        'Toca el menú (⋮) en la esquina superior del navegador.',
        'Selecciona "Instalar app" o "Añadir a pantalla principal".',
        'Confirma. La app aparecerá en tu lista de aplicaciones.',
      ],
    }
  }
  return {
    title: 'Instalación no disponible',
    steps: [
      'Tu navegador actual no soporta la instalación de aplicaciones web progresivas.',
      'Para descargar la app, abre este sitio en Chrome, Edge o desde tu teléfono.',
    ],
  }
}

function getBrowserLabel(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge'
  if (/OPR\/|Opera/.test(ua)) return 'Opera'
  if (/Brave/.test(ua)) return 'Brave'
  if (/Vivaldi/.test(ua)) return 'Vivaldi'
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet'
  if (/Firefox\//.test(ua)) return 'Firefox'
  return 'Android'
}

export default function PWAInstallButton({
  variant = 'banner',
  className = '',
}: PWAInstallButtonProps) {
  const [mounted, setMounted] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [promptAvailable, setPromptAvailable] = useState(false)
  const [context, setContext] = useState<Context>({ platform: 'desktop', support: 'unsupported' })
  const [modalOpen, setModalOpen] = useState(false)
  const [outcomeMsg, setOutcomeMsg] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)

    if (isStandalone()) {
      setInstalled(true)
      return
    }

    const ctx = detectContext()
    setContext(ctx)

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setPromptAvailable(true)
    }

    const onAppInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
      setPromptAvailable(false)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === 'accepted') {
          setInstalled(true)
        } else {
          setOutcomeMsg('Instalación cancelada. Puedes intentarlo de nuevo cuando quieras.')
          window.setTimeout(() => setOutcomeMsg(null), 4000)
        }
        setDeferredPrompt(null)
        setPromptAvailable(false)
      } catch {
        setDeferredPrompt(null)
        setPromptAvailable(false)
        setModalOpen(true)
      }
      return
    }
    // No native prompt → fall back to manual instructions for the user's platform
    setModalOpen(true)
  }, [deferredPrompt])

  if (!mounted) return null
  if (installed) return null
  if (context.support === 'unsupported' && !promptAvailable) return null

  const browserLabel =
    typeof navigator !== 'undefined' ? getBrowserLabel(navigator.userAgent) : undefined
  const instructions = getInstructions(context.platform, browserLabel)

  // ── Inline variant: small bordered button (used on /) ─────────────────
  if (variant === 'inline') {
    return (
      <>
        <button
          type="button"
          onClick={handleInstall}
          className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-surface border border-border text-foreground text-sm font-semibold hover:bg-surface-hover focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background transition-all min-h-[44px] ${className}`}
          aria-label="Descargar Finca Tigrillo como aplicación"
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Descargar app
        </button>
        {modalOpen && (
          <InstructionsModal
            instructions={instructions}
            platform={context.platform}
            onClose={() => setModalOpen(false)}
          />
        )}
        {outcomeMsg && <OutcomeToast message={outcomeMsg} />}
      </>
    )
  }

  // ── Banner variant: prominent callout (used on /login and /register) ──
  return (
    <>
      <div
        className={`rounded-2xl bg-primary/10 border border-primary/30 p-3.5 flex items-center gap-3 ${className}`}
        role="region"
        aria-label="Descargar la aplicación"
      >
        <div className="shrink-0 w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
          <Download className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">Descarga la app</p>
          <p className="text-xs text-muted leading-snug mt-0.5">
            {context.platform === 'ios'
              ? 'Úsala desde tu pantalla con un toque'
              : 'Acceso rápido desde tu pantalla, sin descargas de tienda'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="shrink-0 px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background transition-colors min-h-[40px]"
        >
          Descargar
        </button>
      </div>
      {modalOpen && (
        <InstructionsModal
          instructions={instructions}
          platform={context.platform}
          onClose={() => setModalOpen(false)}
        />
      )}
      {outcomeMsg && <OutcomeToast message={outcomeMsg} />}
    </>
  )
}

function InstructionsModal({
  instructions,
  platform,
  onClose,
}: {
  instructions: Instructions
  platform: Platform
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-surface border border-border shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center">
            {platform === 'ios' ? (
              <Share className="w-5 h-5" aria-hidden="true" />
            ) : platform === 'android' ? (
              <Smartphone className="w-5 h-5" aria-hidden="true" />
            ) : (
              <Monitor className="w-5 h-5" aria-hidden="true" />
            )}
          </div>
          <h2
            id="pwa-install-modal-title"
            className="font-display text-lg font-semibold text-foreground"
          >
            {instructions.title}
          </h2>
        </div>

        <ol className="space-y-3 text-sm text-foreground">
          {instructions.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span>
                {i === 0 && platform === 'ios' ? (
                  <>
                    Toca el botón <Share className="inline w-4 h-4 text-primary align-text-bottom" aria-hidden="true" /> <strong>Compartir</strong> en la barra inferior de Safari.
                  </>
                ) : i === 0 && platform === 'android' ? (
                  <>
                    Toca el menú <strong>(⋮)</strong> en la esquina superior del navegador.
                  </>
                ) : (
                  step
                )}
              </span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-6 py-2.5 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-surface transition-all min-h-[44px] flex items-center justify-center gap-2"
        >
          <Check className="w-4 h-4" aria-hidden="true" />
          Entendido
        </button>
      </div>
    </div>
  )
}

function OutcomeToast({ message }: { message: string }) {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-foreground text-background text-sm shadow-2xl"
      style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}
