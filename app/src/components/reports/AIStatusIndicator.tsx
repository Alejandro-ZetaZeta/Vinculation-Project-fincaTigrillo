'use client'

import React, { useEffect, useState } from 'react'
import { Bot, Loader2, AlertTriangle, WifiOff, Clock, Sparkles } from 'lucide-react'

export type AIStatus = 'idle' | 'loading' | 'slow' | 'success' | 'error'

interface AIStatusIndicatorProps {
  status: AIStatus
  error?: string | null
  startTime?: number | null
  loadingText?: string
}

const SLOW_THRESHOLD_MS = 10_000

function classifyError(error: string): { icon: React.ReactNode; title: string; detail: string; suggestions: string[] } {
  const lower = error.toLowerCase()

  if (lower.includes('fetch') || lower.includes('econnrefused') || lower.includes('network') || lower.includes('connect')) {
    return {
      icon: <WifiOff className="w-5 h-5 text-red-500" />,
      title: 'No se puede conectar al servidor de IA',
      detail: 'El servicio de inteligencia artificial no está disponible en este momento.',
      suggestions: [
        'El servidor local está apagado o reiniciándose.',
        'Hay un corte eléctrico o fallo de red.',
        'El servicio de IA no se ha iniciado.',
        'Problema de conectividad de red.',
      ],
    }
  }

  if (lower.includes('timeout') || lower.includes('aborted') || lower.includes('timed out')) {
    return {
      icon: <Clock className="w-5 h-5 text-amber-500" />,
      title: 'Tiempo de espera agotado',
      detail: 'La solicitud tardó demasiado en procesarse.',
      suggestions: [
        'El modelo de IA podría estar sobrecargado.',
        'Intente nuevamente en unos momentos.',
        'Considere usar un modelo más ligero.',
      ],
    }
  }

  if (lower.includes('401') || lower.includes('autenticado') || lower.includes('auth')) {
    return {
      icon: <AlertTriangle className="w-5 h-5 text-amber-500" />,
      title: 'Error de autenticación',
      detail: 'Su sesión puede haber expirado.',
      suggestions: [
        'Recargue la página e intente de nuevo.',
        'Cierre sesión y vuelva a iniciarla.',
      ],
    }
  }

  return {
    icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    title: 'Error al procesar la solicitud',
    detail: error,
    suggestions: [
      'Intente nuevamente en unos momentos.',
      'Si el problema persiste, contacte al administrador.',
    ],
  }
}

export function AIStatusIndicator({ status, error, startTime, loadingText = 'Generando reporte con IA...' }: AIStatusIndicatorProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (status !== 'loading' || !startTime) {
      setElapsed(0)
      return
    }
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime)
    }, 1000)
    return () => clearInterval(interval)
  }, [status, startTime])

  if (status === 'idle') return null

  if (status === 'loading' || status === 'slow') {
    const isSlow = elapsed > SLOW_THRESHOLD_MS

    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-10 gap-4 animate-fade-up">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg">
            <Sparkles className="w-7 h-7 text-white ai-icon-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-surface border-2 border-border flex items-center justify-center">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {loadingText}
          </p>
          {isSlow && (
            <div className="animate-fade-up">
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                El servicio está tardando más de lo esperado
              </p>
              <p className="text-[10px] text-muted mt-1">
                {Math.round(elapsed / 1000)}s transcurridos — por favor espere
              </p>
            </div>
          )}
          {!isSlow && (
            <p className="text-xs text-muted">Analizando datos de la finca...</p>
          )}
        </div>

        {/* Skeleton preview */}
        <div className="w-full max-w-md space-y-3 px-4">
          <div className="h-3 skeleton-shimmer rounded-full w-full" />
          <div className="h-3 skeleton-shimmer rounded-full w-4/5" />
          <div className="h-3 skeleton-shimmer rounded-full w-3/5" />
          <div className="grid grid-cols-3 gap-2 mt-4">
            <div className="h-16 skeleton-shimmer rounded-xl" />
            <div className="h-16 skeleton-shimmer rounded-xl" />
            <div className="h-16 skeleton-shimmer rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error' && error) {
    const classified = classifyError(error)

    return (
      <div className="animate-fade-up">
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3">
            {classified.icon}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-red-700 dark:text-red-400">
                {classified.title}
              </h4>
              <p className="text-xs text-red-600/80 dark:text-red-300/70 mt-1 leading-relaxed">
                {classified.detail}
              </p>

              {classified.suggestions.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-red-500/70 dark:text-red-400/60">
                    Causas posibles:
                  </p>
                  <ul className="space-y-1">
                    {classified.suggestions.map((s, i) => (
                      <li key={i} className="text-xs text-red-600/70 dark:text-red-300/60 flex items-start gap-2">
                        <span className="w-1 h-1 rounded-full bg-red-400 shrink-0 mt-1.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
