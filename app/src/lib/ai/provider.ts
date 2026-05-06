/**
 * ============================================================
 * AI PROVIDER — Tipos e interfaces compartidos
 * ============================================================
 * Todos los módulos de IA del proyecto importan desde aquí.
 * Nunca importar directamente del SDK de openai fuera de factory.ts.
 * ============================================================
 */

// ─── Tipos de entrada ────────────────────────────────────────

export interface AnimalContext {
  id: string
  name: string | null
  identification_code: string | null
  species_slug: string
  species_name: string
  sex: string | null
  birth_date: string | null
  status: string
}

export interface ReproductiveEventContext {
  id: string
  animal_id: string
  event_type: string
  event_date: string
  expected_due_date: string | null
  notes: string | null
}

// ─── Tipos de salida (respuesta de la IA) ────────────────────

export type GestationStatus =
  | 'en_gestacion'
  | 'pendiente_monta'
  | 'recien_pario'
  | 'sin_historial'
  | 'alerta_sobretiempo'

export type ConfidenceLevel = 'alta' | 'media' | 'baja'

export interface AnimalPrediction {
  animal_id: string
  animal_name: string
  species: string
  last_event_type: string | null
  last_event_date: string | null
  expected_birth_date: string | null   // ISO date o null
  days_until_birth: number | null      // negativo = ya debió parir
  status: GestationStatus
  confidence: ConfidenceLevel
  recommendation: string
}

export type AlertLevel = 'urgente' | 'atencion' | 'info'

export interface PredictiveAlert {
  level: AlertLevel
  message: string
  animal_id?: string
}

export interface PredictionResult {
  predictions: AnimalPrediction[]
  alerts: PredictiveAlert[]
  summary: string          // Párrafo narrativo en español generado por la IA
  generated_at: string     // ISO datetime
  provider: string         // Qué proveedor respondió (openai / gemini / local)
  model: string            // Modelo exacto usado
}
