export interface StageDefinition {
  key: string
  label: string
  order: number
  duration_days: number
}

export interface SembrioStageConfig {
  id: string
  sembrio_id: string
  stages: StageDefinition[]
  created_by: string | null
  updated_at: string
}

export interface SembrioStageLog {
  id: string
  sembrio_id: string
  from_stage: string | null
  to_stage: string
  changed_by: string | null
  change_type: 'manual' | 'suggestion_accepted' | 'suggestion_rejected'
  rejection_reason: string | null
  notes: string | null
  created_at: string
}

export interface StageSuggestion {
  id: string
  sembrio_id: string
  current_stage: string
  suggested_stage: string
  days_in_current: number
  theoretical_days: number
  message: string | null
  status: 'pending' | 'accepted' | 'rejected' | 'dismissed'
  resolved_by: string | null
  resolved_at: string | null
  rejection_reason: string | null
  created_at: string
}

export interface SembrioWithStages {
  id: string
  potrero_id: string
  tipo_cultivo: string
  variedad: string | null
  area_sembrada_m2: number
  fecha_siembra: string
  fecha_cosecha_estimada: string | null
  fecha_cosecha_real: string | null
  estado: string
  current_stage: string | null
  stage_updated_at: string | null
  rendimiento_kg: number | null
  observaciones: string | null
  potreros?: { nombre: string; area_total_m2: number; tipo_suelo: string | null }
  stage_config?: SembrioStageConfig | null
}

export interface StageTimelineEntry {
  key: string
  label: string
  order: number
  status: 'completed' | 'current' | 'future'
  entered_at: string | null
  duration_days: number
}

export interface SuggestionResult {
  shouldSuggest: boolean
  suggestedStage: string | null
  daysInCurrent: number
  theoreticalDays: number
  message: string
}
