export type TargetSex = 'any' | 'macho' | 'hembra' | 'mixto'

export function asTargetSex(v: string): TargetSex {
  if (v === 'macho' || v === 'hembra' || v === 'mixto' || v === 'any') return v
  return 'any'
}

export interface Vaccine {
  id: string
  name: string
  description: string | null
  target_type_id: string | null
  target_sex: TargetSex
  age_min_days: number | null
  age_max_days: number | null
  allowed_reproductive_states: string[] | null
  default_next_dose_days: number | null
  total_doses: number | null
  min_stock: number | null
  is_active: boolean
  stock_doses: number
}

export interface AnimalTypeOption {
  id: string
  name: string
  slug: string
  category_id: string
}

export const REPRO_TYPES = new Set(['bovino', 'equino', 'porcino', 'caprino'])
export const POULTRY_SLUG = 'aves-de-corral'

export const REPRO_STATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'preñada', label: 'Preñada' },
  { value: 'vacía', label: 'Vacía' },
  { value: 'lactando', label: 'Lactando' },
  { value: 'seca', label: 'Seca' },
]
