'use client'

import { useState } from 'react'
import {
  Brain, Sparkles, AlertTriangle, AlertCircle, Info,
  CheckCircle2, Clock, Calendar, RefreshCw, PawPrint,
  ChevronRight, Zap, TrendingUp, Activity
} from 'lucide-react'
import type {
  PredictionResult, AnimalPrediction, PredictiveAlert,
  GestationStatus, AlertLevel
} from '@/lib/ai/provider'

// ─── Helpers de presentación ──────────────────────────────────

const STATUS_CONFIG: Record<GestationStatus, {
  label: string
  color: string
  bg: string
  border: string
  icon: React.ReactNode
}> = {
  en_gestacion: {
    label: 'En Gestación',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800/40',
    icon: <Activity className="w-4 h-4" />,
  },
  recien_pario: {
    label: 'Recién Parió',
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800/40',
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  pendiente_monta: {
    label: 'Pendiente de Monta',
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800/40',
    icon: <Clock className="w-4 h-4" />,
  },
  alerta_sobretiempo: {
    label: 'Alerta: Sobretiempo',
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800/40',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  sin_historial: {
    label: 'Sin Historial',
    color: 'text-muted',
    bg: 'bg-surface',
    border: 'border-border',
    icon: <PawPrint className="w-4 h-4" />,
  },
}

const ALERT_CONFIG: Record<AlertLevel, {
  color: string
  bg: string
  border: string
  icon: React.ReactNode
  label: string
}> = {
  urgente: {
    color: 'text-red-700 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-300 dark:border-red-800/50',
    icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
    label: 'Urgente',
  },
  atencion: {
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-300 dark:border-amber-800/50',
    icon: <AlertCircle className="w-4 h-4 shrink-0" />,
    label: 'Atención',
  },
  info: {
    color: 'text-blue-700 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-300 dark:border-blue-800/50',
    icon: <Info className="w-4 h-4 shrink-0" />,
    label: 'Info',
  },
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric'
  })
}

function DaysChip({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted text-xs">—</span>
  if (days < 0) return (
    <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40 px-2 py-0.5 rounded-full">
      Hace {Math.abs(days)}d
    </span>
  )
  if (days === 0) return (
    <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">Hoy</span>
  )
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
      days <= 14
        ? 'text-amber-700 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-400'
        : 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400'
    }`}>
      En {days}d
    </span>
  )
}

// ─── Subcomponentes ───────────────────────────────────────────

function ProviderBadge({ provider, model }: { provider: string; model: string }) {
  const isLocal = provider === 'local'
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
      isLocal
        ? 'text-violet-700 bg-violet-50 border-violet-200 dark:text-violet-400 dark:bg-violet-950/30 dark:border-violet-800/40'
        : 'text-primary bg-primary/8 border-primary/20'
    }`}>
      <Zap className="w-3 h-3" />
      {isLocal ? '🏠 IA Local' : provider === 'gemini' ? '✦ Gemini' : '⬡ OpenAI'} · {model}
    </span>
  )
}

function AlertCard({ alert }: { alert: PredictiveAlert }) {
  const cfg = ALERT_CONFIG[alert.level]
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border}`}>
      <span className={cfg.color}>{cfg.icon}</span>
      <div className="min-w-0">
        <span className={`text-[10px] font-black uppercase tracking-widest ${cfg.color} block mb-0.5`}>
          {cfg.label}
        </span>
        <p className="text-sm text-foreground leading-snug">{alert.message}</p>
      </div>
    </div>
  )
}

function PredictionCard({ pred }: { pred: AnimalPrediction }) {
  const cfg = STATUS_CONFIG[pred.status] ?? STATUS_CONFIG.sin_historial
  return (
    <div className={`relative bg-surface border ${cfg.border} rounded-2xl p-5 transition-all hover:shadow-md`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="font-bold text-foreground truncate">{pred.animal_name}</p>
          <p className="text-xs text-muted">{pred.species}</p>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${cfg.color} ${cfg.bg}`}>
          {cfg.icon}
          <span>{cfg.label}</span>
        </div>
      </div>

      {/* Fechas */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Último Evento</p>
          <p className="text-xs font-medium text-foreground">{pred.last_event_type?.replace(/_/g, ' ') ?? '—'}</p>
          <p className="text-[11px] text-muted">{formatDate(pred.last_event_date)}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Parto Estimado</p>
          <p className="text-xs font-medium text-foreground">{formatDate(pred.expected_birth_date)}</p>
          <DaysChip days={pred.days_until_birth} />
        </div>
      </div>

      {/* Recomendación */}
      <div className="bg-background rounded-xl p-3 border border-border">
        <p className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> Recomendación
        </p>
        <p className="text-xs text-foreground/80 leading-relaxed">{pred.recommendation}</p>
      </div>

      {/* Confianza */}
      <div className="flex items-center justify-end mt-3">
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
          pred.confidence === 'alta'   ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' :
          pred.confidence === 'media'  ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' :
                                         'text-muted bg-muted/10'
        }`}>
          Confianza {pred.confidence}
        </span>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="w-20 h-20 rounded-3xl bg-primary/8 flex items-center justify-center">
        <Brain className="w-10 h-10 text-primary/50" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground text-lg mb-1">Sin análisis aún</h3>
        <p className="text-muted text-sm max-w-sm">
          Presiona <strong>"Analizar con IA"</strong> para generar predicciones reproductivas
          basadas en el historial de eventos de la finca.
        </p>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
          <Brain className="w-10 h-10 text-primary" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
          <RefreshCw className="w-3.5 h-3.5 text-white animate-spin" />
        </div>
      </div>
      <div>
        <h3 className="font-semibold text-foreground text-lg mb-1">Analizando hato...</h3>
        <p className="text-muted text-sm">La IA está procesando el historial reproductivo</p>
      </div>
      {/* Animated skeleton cards */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 animate-pulse mt-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-surface border border-border rounded-2xl p-5 h-44" />
        ))}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────

export default function PrediccionesPage() {
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function runAnalysis() {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/ai/predict-reproductive', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`)
        return
      }
      setResult(data as PredictionResult)
    } catch {
      setError('Error de red. Verifica tu conexión e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Contadores para el resumen ──
  const urgentCount  = result?.alerts.filter(a => a.level === 'urgente').length  ?? 0
  const atentionCount = result?.alerts.filter(a => a.level === 'atencion').length ?? 0
  const gestCount    = result?.predictions.filter(p => p.status === 'en_gestacion').length ?? 0

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Brain className="w-7 h-7 text-primary" aria-hidden="true" />
            Predicciones Reproductivas
          </h1>
          <p className="text-muted mt-1.5 text-sm">
            Análisis inteligente del historial de eventos para anticipar partos y detectar alertas.
          </p>
        </div>

        <button
          id="btn-analizar-ia"
          onClick={runAnalysis}
          disabled={loading}
          className="flex items-center gap-2.5 bg-primary text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        >
          {loading
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Analizando...</>
            : <><Sparkles className="w-4 h-4" /> Analizar con IA</>
          }
        </button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/40 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Error al ejecutar análisis</p>
            <p className="text-red-600 dark:text-red-500 text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── Resultado ── */}
      {loading && <LoadingState />}

      {!loading && !result && !error && <EmptyState />}

      {!loading && result && (
        <div className="space-y-8">

          {/* Metadata del análisis */}
          <div className="flex flex-wrap items-center gap-3">
            <ProviderBadge provider={result.provider} model={result.model} />
            <span className="text-[11px] text-muted flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(result.generated_at).toLocaleString('es-CO', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
              })}
            </span>
          </div>

          {/* Resumen rápido */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-surface border border-border rounded-2xl p-4 text-center">
              <p className="font-display text-3xl font-bold text-primary">{result.predictions.length}</p>
              <p className="text-xs text-muted mt-1">Hembras analizadas</p>
            </div>
            <div className={`rounded-2xl p-4 text-center border ${urgentCount > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/40' : 'bg-surface border-border'}`}>
              <p className={`font-display text-3xl font-bold ${urgentCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{urgentCount}</p>
              <p className="text-xs text-muted mt-1">Alertas urgentes</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 text-center">
              <p className="font-display text-3xl font-bold text-emerald-600 dark:text-emerald-400">{gestCount}</p>
              <p className="text-xs text-muted mt-1">En gestación</p>
            </div>
          </div>

          {/* Resumen narrativo de la IA */}
          {result.summary && (
            <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Resumen del Análisis
              </p>
              <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
            </div>
          )}

          {/* Alertas */}
          {result.alerts.length > 0 && (
            <section aria-label="Alertas del análisis">
              <h2 className="font-display font-semibold text-base text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Alertas ({result.alerts.length})
              </h2>
              <div className="space-y-2">
                {/* Urgentes primero */}
                {[...result.alerts]
                  .sort((a, b) => {
                    const order: Record<string, number> = { urgente: 0, atencion: 1, info: 2 }
                    return (order[a.level] ?? 3) - (order[b.level] ?? 3)
                  })
                  .map((alert, i) => (
                    <AlertCard key={i} alert={alert} />
                  ))}
              </div>
            </section>
          )}

          {/* Predicciones por animal */}
          <section aria-label="Predicciones por animal">
            <h2 className="font-display font-semibold text-base text-foreground mb-4 flex items-center gap-2">
              <PawPrint className="w-4 h-4 text-primary" />
              Predicciones por Animal
            </h2>

            {result.predictions.length === 0 ? (
              <p className="text-muted text-sm italic text-center py-8">
                No se generaron predicciones individuales.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Ordenar: alerta primero, luego gestación, luego resto */}
                {[...result.predictions]
                  .sort((a, b) => {
                    const order: Record<string, number> = {
                      alerta_sobretiempo: 0,
                      en_gestacion: 1,
                      pendiente_monta: 2,
                      recien_pario: 3,
                      sin_historial: 4,
                    }
                    return (order[a.status] ?? 5) - (order[b.status] ?? 5)
                  })
                  .map(pred => (
                    <PredictionCard key={pred.animal_id} pred={pred} />
                  ))}
              </div>
            )}
          </section>

          {/* Volver a analizar */}
          <div className="flex justify-center pt-4">
            <button
              onClick={runAnalysis}
              disabled={loading}
              className="flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Volver a analizar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
