import type {
  StageDefinition,
  StageTimelineEntry,
  SuggestionResult,
  SembrioStageLog,
} from './types'

export const DEFAULT_STAGES: StageDefinition[] = [
  { key: 'en_preparacion', label: 'En Preparación', order: 1, duration_days: 0 },
  { key: 'siembra', label: 'Siembra', order: 2, duration_days: 0 },
  { key: 'germinacion', label: 'Germinación', order: 3, duration_days: 15 },
  { key: 'crecimiento', label: 'Crecimiento', order: 4, duration_days: 45 },
  { key: 'maduracion', label: 'Maduración', order: 5, duration_days: 30 },
  { key: 'cosecha', label: 'Cosecha', order: 6, duration_days: 0 },
]

function parseLocalDate(dateStr: string): Date {
  if (dateStr.includes('T')) {
    const d = new Date(dateStr)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate())
  }
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function getDaysSince(dateStr: string): number {
  const base = parseLocalDate(dateStr)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - base.getTime()) / 86_400_000)
}

export function getStageByKey(stages: StageDefinition[], key: string): StageDefinition | undefined {
  return stages.find(s => s.key === key)
}

export function getNextStage(stages: StageDefinition[], currentKey: string): StageDefinition | undefined {
  const current = getStageByKey(stages, currentKey)
  if (!current) return undefined
  return stages.find(s => s.order === current.order + 1)
}

export function shouldSuggestStage(
  currentStage: string | null,
  stageUpdatedAt: string | null,
  stages: StageDefinition[]
): SuggestionResult {
  if (!currentStage || !stageUpdatedAt || stages.length === 0) {
    return {
      shouldSuggest: false,
      suggestedStage: null,
      daysInCurrent: 0,
      theoreticalDays: 0,
      message: 'Sin configuración de etapas',
    }
  }

  const currentDef = getStageByKey(stages, currentStage)
  if (!currentDef) {
    return {
      shouldSuggest: false,
      suggestedStage: null,
      daysInCurrent: 0,
      theoreticalDays: 0,
      message: 'Etapa actual no encontrada en la configuración',
    }
  }

  const nextStage = getNextStage(stages, currentStage)
  if (!nextStage) {
    return {
      shouldSuggest: false,
      suggestedStage: null,
      daysInCurrent: getDaysSince(stageUpdatedAt),
      theoreticalDays: currentDef.duration_days,
      message: 'Etapa final alcanzada',
    }
  }

  const daysInCurrent = getDaysSince(stageUpdatedAt)
  const theoreticalDays = currentDef.duration_days

  if (theoreticalDays <= 0) {
    return {
      shouldSuggest: false,
      suggestedStage: null,
      daysInCurrent,
      theoreticalDays,
      message: 'Etapa sin duración teórica definida',
    }
  }

  const shouldSuggest = daysInCurrent >= theoreticalDays

  return {
    shouldSuggest,
    suggestedStage: shouldSuggest ? nextStage.key : null,
    daysInCurrent,
    theoreticalDays,
    message: shouldSuggest
      ? `Basado en ${daysInCurrent} días desde la última actualización, el cultivo ha completado teóricamente '${currentDef.label}' (${theoreticalDays} días) y debería pasar a '${nextStage.label}'.`
      : `Etapa '${currentDef.label}' en progreso: ${daysInCurrent}/${theoreticalDays} días.`,
  }
}

export function buildTimeline(
  stages: StageDefinition[],
  currentStage: string | null,
  stageLogs: SembrioStageLog[],
  referenceDate?: string | null
): StageTimelineEntry[] {
  const emptyExtras: Pick<StageTimelineEntry, 'days_in_current' | 'is_overdue' | 'days_overdue' | 'progress_pct' | 'reference_date' | 'projected_end_date'> = {
    days_in_current: null,
    is_overdue: false,
    days_overdue: 0,
    progress_pct: 0,
    reference_date: null,
    projected_end_date: null,
  }

  if (!currentStage || stages.length === 0) {
    return stages.map(s => ({
      key: s.key,
      label: s.label,
      order: s.order,
      status: 'future' as const,
      entered_at: null,
      duration_days: s.duration_days,
      ...emptyExtras,
    }))
  }

  const currentDef = getStageByKey(stages, currentStage)
  if (!currentDef) {
    return stages.map(s => ({
      key: s.key,
      label: s.label,
      order: s.order,
      status: 'future' as const,
      entered_at: null,
      duration_days: s.duration_days,
      ...emptyExtras,
    }))
  }

  const logMap = new Map<string, string>()
  for (const log of stageLogs) {
    if (!logMap.has(log.to_stage)) {
      logMap.set(log.to_stage, log.created_at)
    }
  }

  let currentExtras = { ...emptyExtras }
  if (referenceDate) {
    const daysIn = getDaysSince(referenceDate)
    const dur = currentDef.duration_days
    if (dur > 0) {
      const pct = Math.min(100, Math.round((daysIn / dur) * 100))
      const overdue = daysIn > dur
      const daysOver = overdue ? daysIn - dur : 0
      const projectedEnd = parseLocalDate(referenceDate)
      projectedEnd.setDate(projectedEnd.getDate() + dur)
      currentExtras = {
        days_in_current: daysIn,
        is_overdue: overdue,
        days_overdue: daysOver,
        progress_pct: pct,
        reference_date: referenceDate,
        projected_end_date: projectedEnd.toISOString().slice(0, 10),
      }
    } else {
      currentExtras = {
        days_in_current: daysIn,
        is_overdue: false,
        days_overdue: 0,
        progress_pct: 0,
        reference_date: referenceDate,
        projected_end_date: null,
      }
    }
  }

  return stages.map(s => {
    let status: 'completed' | 'current' | 'future'
    if (s.order < currentDef.order) {
      status = 'completed'
    } else if (s.order === currentDef.order) {
      status = 'current'
    } else {
      status = 'future'
    }

    return {
      key: s.key,
      label: s.label,
      order: s.order,
      status,
      entered_at: logMap.get(s.key) || null,
      duration_days: s.duration_days,
      ...(s.order === currentDef.order ? currentExtras : emptyExtras),
    }
  })
}
