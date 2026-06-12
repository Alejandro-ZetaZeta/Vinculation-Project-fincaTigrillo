export const REQUEST_TYPE_LABELS: Record<string, string> = {
  animal_record:       'Registro de Animal',
  reproductive_event:  'Evento Reproductivo',
  mortality_event:     'Evento de Mortalidad',
  production_event:    'Producción de Leche',
  vaccine_profile:     'Perfil de Vacuna',
  vaccine_assignment:  'Asignación de Vacuna',
}

export type RequestType =
  | 'animal_record'
  | 'reproductive_event'
  | 'mortality_event'
  | 'production_event'
  | 'vaccine_profile'
  | 'vaccine_assignment'

export const VALID_REQUEST_TYPES: RequestType[] = [
  'animal_record',
  'reproductive_event',
  'mortality_event',
  'production_event',
  'vaccine_profile',
  'vaccine_assignment',
]

export function validateRequestPayload(
  type: string,
  payload: unknown
): { valid: boolean; error?: string; sanitized?: Record<string, unknown> } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload inválido' }
  }
  const p = payload as Record<string, unknown>

  switch (type) {
    case 'animal_record': {
      if (!p.breed || String(p.breed).trim() === '') return { valid: false, error: 'La raza es obligatoria' }
      if (!p.type_id) return { valid: false, error: 'El tipo de animal es obligatorio' }
      const isLitter = p.is_litter === true
      const litterCount = typeof p.litter_count === 'number'
        ? p.litter_count
        : parseInt(String(p.litter_count ?? ''), 10)
      if (isLitter && (!Number.isFinite(litterCount) || litterCount <= 0)) {
        return { valid: false, error: 'Una camada debe tener al menos 1 lechón nacido vivo' }
      }
      let sex = typeof p.sex === 'string' ? p.sex.toLowerCase() : p.sex
      if (sex === 'machos') sex = 'macho'
      if (sex === 'hembras') sex = 'hembra'
      return {
        valid: true,
        sanitized: {
          name:                p.name ?? null,
          breed:               String(p.breed).trim(),
          sex:                 sex ?? null,
          birth_date:          p.birth_date ?? null,
          identification_code: p.identification_code ? String(p.identification_code).trim() : null,
          color:               p.color ?? null,
          weight_kg:           p.weight_kg ?? null,
          type_id:             p.type_id,
          status:              p.status ?? 'activo',
          metadata:            p.metadata ?? null,
          is_litter:           isLitter,
          litter_count:        isLitter ? litterCount : null,
          acquisition_type:    p.acquisition_type ?? null,
          acquisition_date:    p.acquisition_date ?? null,
          notes:               p.notes ?? null,
        },
      }
    }

    case 'reproductive_event': {
      if (!p.animal_id) return { valid: false, error: 'animal_id es obligatorio' }
      if (!p.event_type) return { valid: false, error: 'event_type es obligatorio' }
      if (!p.event_date) return { valid: false, error: 'event_date es obligatorio' }
      const validTypes = ['monta_natural', 'inseminacion', 'confirmacion_prenez', 'parto', 'aborto', 'destete']
      if (!validTypes.includes(String(p.event_type))) {
        return { valid: false, error: 'event_type inválido para evento reproductivo' }
      }
      return {
        valid: true,
        sanitized: {
          animal_id:    p.animal_id,
          event_type:   p.event_type,
          event_date:   p.event_date,
          notes:        p.notes ?? null,
          species_slug: p.species_slug ?? null,
          sire_id:      p.sire_id ?? null,
        },
      }
    }

    case 'mortality_event': {
      if (!p.animal_id) return { valid: false, error: 'animal_id es obligatorio' }
      if (!p.event_date) return { valid: false, error: 'event_date es obligatorio' }
      const q = typeof p.quantity === 'number' ? p.quantity : parseInt(String(p.quantity ?? ''), 10)
      if (!Number.isFinite(q) || q <= 0) return { valid: false, error: 'Cantidad de mortalidad inválida' }
      return {
        valid: true,
        sanitized: {
          animal_id:  p.animal_id,
          event_date: p.event_date,
          quantity:   q,
          notes:      p.notes ?? null,
        },
      }
    }

    case 'production_event': {
      if (!p.animal_id) return { valid: false, error: 'animal_id es obligatorio' }
      if (!p.recorded_date) return { valid: false, error: 'recorded_date es obligatorio' }
      const am = p.liters_am != null && p.liters_am !== '' ? parseFloat(String(p.liters_am)) : 0
      const pm = p.liters_pm != null && p.liters_pm !== '' ? parseFloat(String(p.liters_pm)) : 0
      if (am === 0 && pm === 0) return { valid: false, error: 'Debe ingresar al menos una medición mayor a 0' }
      if (isNaN(am) || isNaN(pm) || am < 0 || pm < 0) return { valid: false, error: 'Valores de litros inválidos' }
      return {
        valid: true,
        sanitized: {
          animal_id:     p.animal_id,
          recorded_date: p.recorded_date,
          liters_am:     am,
          liters_pm:     pm,
          notes:         p.notes ?? null,
        },
      }
    }

    case 'vaccine_profile': {
      if (!p.name || String(p.name).trim() === '') return { valid: false, error: 'El nombre de la vacuna es obligatorio' }
      return {
        valid: true,
        sanitized: {
          name:                        String(p.name).trim(),
          description:                 p.description ?? null,
          target_type_id:              p.target_type_id ?? null,
          target_sex:                  p.target_sex ?? 'any',
          age_min_days:                p.age_min_days === '' ? null : (p.age_min_days ?? null),
          age_max_days:                p.age_max_days === '' ? null : (p.age_max_days ?? null),
          allowed_reproductive_states: Array.isArray(p.allowed_reproductive_states)
            ? p.allowed_reproductive_states
            : null,
          default_next_dose_days:      p.default_next_dose_days === '' ? null : (p.default_next_dose_days ?? null),
          total_doses:                 p.total_doses === '' ? null : (p.total_doses ?? null),
          is_active:                   typeof p.is_active === 'boolean' ? p.is_active : true,
        },
      }
    }

    case 'vaccine_assignment': {
      if (!Array.isArray(p.animal_ids) || p.animal_ids.length === 0) {
        return { valid: false, error: 'Selecciona al menos un animal' }
      }
      if (!p.vaccine_id) return { valid: false, error: 'vaccine_id es obligatorio' }
      if (!p.applied_at) return { valid: false, error: 'applied_at es obligatorio' }
      return {
        valid: true,
        sanitized: {
          animal_ids:  p.animal_ids,
          vaccine_id:  p.vaccine_id,
          applied_at:  p.applied_at,
          next_dose_at: p.next_dose_at ?? null,
          notes:       p.notes ?? null,
          doses_count: p.doses_count ?? null,
        },
      }
    }

    default:
      return { valid: false, error: 'Tipo de solicitud inválido' }
  }
}
