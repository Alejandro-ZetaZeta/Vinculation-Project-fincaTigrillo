import {
  sanitizeText, sanitizeIdent, sanitizeNumber, sanitizeInt, sanitizeDate,
  sanitizeUUID, sanitizeStringArray, sanitizeMetadata, isValidUUID, MAX_LEN,
} from './sanitize'

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

/* ── Enum allow-lists (single source of truth for server validation) ──── */
const SEX_VALUES        = ['macho', 'hembra', 'mixto'] as const
const ACQ_TYPES         = ['nacimiento', 'compra', 'donacion'] as const
const REPRO_EVENT_TYPES = ['monta_natural', 'inseminacion', 'confirmacion_prenez', 'parto', 'aborto', 'destete'] as const
const SPECIES_SLUGS     = ['bovino', 'equino', 'porcino', 'caprino'] as const
const TARGET_SEX_VALUES = ['any', 'macho', 'hembra', 'mixto'] as const

function inEnum<T extends string>(v: unknown, list: readonly T[]): v is T {
  return typeof v === 'string' && (list as readonly string[]).includes(v)
}

/**
 * Validate + sanitize a request payload before it is persisted to the
 * `requests` table OR executed against the live tables.
 *
 * Every string is run through the sanitize helpers (HTML/script stripping,
 * control-char removal, length caps) so stored payloads cannot carry
 * malicious markup, and every foreign-key-style id is checked for UUID shape.
 *
 * Returns `{ valid, error, sanitized }`. `sanitized` is the clean object the
 * caller should store/execute — never trust the raw input afterwards.
 */
export function validateRequestPayload(
  type: string,
  payload: unknown
): { valid: boolean; error?: string; sanitized?: Record<string, unknown> } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Payload inválido' }
  }
  const p = payload as Record<string, unknown>

  switch (type) {
    /* ── animal_record ─────────────────────────────────────────────── */
    case 'animal_record': {
      // type_id (FK → animal_types)
      const typeId = sanitizeUUID(p.type_id)
      if (!typeId) return { valid: false, error: 'El tipo de animal es obligatorio' }

      // breed (required free text)
      const breed = sanitizeIdent(p.breed, MAX_LEN.BREED)
      if (!breed) return { valid: false, error: 'La raza es obligatoria' }

      // sex (required, enum)
      let sexRaw = typeof p.sex === 'string' ? p.sex.toLowerCase() : p.sex
      if (sexRaw === 'machos') sexRaw = 'macho'
      if (sexRaw === 'hembras') sexRaw = 'hembra'
      if (!inEnum(sexRaw, SEX_VALUES)) {
        return { valid: false, error: 'El sexo es obligatorio (macho, hembra o mixto)' }
      }
      const sex: string = sexRaw

      // birth_date (required, ISO)
      const birthDate = sanitizeDate(p.birth_date)
      if (!birthDate) return { valid: false, error: 'La fecha de nacimiento es obligatoria' }

      // identification_code (required, unique-enforced at execute time)
      const identCode = sanitizeIdent(p.identification_code, MAX_LEN.CODE)
      if (!identCode) return { valid: false, error: 'El código de identificación es obligatorio' }

      // litter handling
      const isLitter = p.is_litter === true
      const litterCount = sanitizeInt(p.litter_count)
      if (isLitter && (!litterCount || litterCount <= 0)) {
        return { valid: false, error: 'Una camada debe tener al menos 1 lechón nacido vivo' }
      }

      // acquisition_type (optional but, if present, must be a known enum)
      const acqRaw = typeof p.acquisition_type === 'string' ? p.acquisition_type.toLowerCase() : p.acquisition_type
      const acquisitionType = (acqRaw == null || acqRaw === '')
        ? null
        : inEnum(acqRaw, ACQ_TYPES) ? acqRaw : null
      if (acqRaw != null && acqRaw !== '' && !inEnum(acqRaw, ACQ_TYPES)) {
        return { valid: false, error: 'Tipo de adquisición inválido' }
      }
      const acquisitionDate = sanitizeDate(p.acquisition_date)

      // weight (optional, non-negative number)
      const weight = sanitizeNumber(p.weight_kg)
      if (weight != null && weight < 0) {
        return { valid: false, error: 'El peso no puede ser negativo' }
      }

      // metadata (type-specific extra fields: uso, doma, alzada, estado_reproductivo,
      // numero_pezones, cantidad, etapa, proposito, padre_id/nombre, etc.)
      const metadata = sanitizeMetadata(p.metadata)

      // aves-de-corral required metadata (cantidad + etapa). The client stashes
      // the selected type's slug under _typeSlug; we use it here then drop it
      // (it's not in the sanitized output so it never persists).
      const typeSlugHint = typeof p._typeSlug === 'string' ? p._typeSlug : ''
      if (typeSlugHint === 'aves-de-corral' && metadata) {
        if (metadata.cantidad == null || Number(metadata.cantidad) <= 0) {
          return { valid: false, error: 'El número inicial de aves es obligatorio' }
        }
        if (!metadata.etapa) {
          return { valid: false, error: 'La etapa productiva es obligatoria' }
        }
      }

      return {
        valid: true,
        sanitized: {
          name:                sanitizeIdent(p.name, MAX_LEN.NAME),
          breed,
          sex,
          birth_date:          birthDate,
          identification_code: identCode,
          color:               sanitizeIdent(p.color, MAX_LEN.COLOR),
          weight_kg:           weight,
          type_id:             typeId,
          status:              'activo',
          metadata,
          is_litter:           isLitter,
          litter_count:        isLitter ? litterCount : null,
          acquisition_type:    acquisitionType,
          acquisition_date:    acquisitionDate,
          notes:               sanitizeText(p.notes, MAX_LEN.NOTES),
        },
      }
    }

    /* ── reproductive_event ────────────────────────────────────────── */
    case 'reproductive_event': {
      const animalId = sanitizeUUID(p.animal_id)
      if (!animalId) return { valid: false, error: 'Debes seleccionar un animal' }

      const eventType = typeof p.event_type === 'string' ? p.event_type : ''
      if (!inEnum(eventType, REPRO_EVENT_TYPES)) {
        return { valid: false, error: 'Tipo de evento reproductivo inválido' }
      }

      const eventDate = sanitizeDate(p.event_date)
      if (!eventDate) return { valid: false, error: 'La fecha del evento es obligatoria' }

      const speciesSlug = inEnum(p.species_slug, SPECIES_SLUGS) ? p.species_slug : null
      const sireId = p.sire_id ? sanitizeUUID(p.sire_id) : null
      if (p.sire_id && !sireId) return { valid: false, error: 'Semental inválido' }

      return {
        valid: true,
        sanitized: {
          animal_id:    animalId,
          event_type:   eventType,
          event_date:   eventDate,
          notes:        sanitizeText(p.notes, MAX_LEN.NOTES),
          species_slug: speciesSlug,
          sire_id:      sireId,
        },
      }
    }

    /* ── mortality_event ───────────────────────────────────────────── */
    case 'mortality_event': {
      const animalId = sanitizeUUID(p.animal_id)
      if (!animalId) return { valid: false, error: 'Debes seleccionar un lote o camada' }

      const eventDate = sanitizeDate(p.event_date)
      if (!eventDate) return { valid: false, error: 'La fecha es obligatoria' }

      const q = sanitizeInt(p.quantity)
      if (q == null || q <= 0) return { valid: false, error: 'La cantidad de bajas debe ser mayor a 0' }

      return {
        valid: true,
        sanitized: {
          animal_id:  animalId,
          event_date: eventDate,
          quantity:   q,
          notes:      sanitizeText(p.notes, MAX_LEN.NOTES),
        },
      }
    }

    /* ── production_event ──────────────────────────────────────────── */
    case 'production_event': {
      const animalId = sanitizeUUID(p.animal_id)
      if (!animalId) return { valid: false, error: 'Debes seleccionar un animal' }

      const recordedDate = sanitizeDate(p.recorded_date)
      if (!recordedDate) return { valid: false, error: 'La fecha de registro es obligatoria' }

      const am = sanitizeNumber(p.liters_am) ?? 0
      const pm = sanitizeNumber(p.liters_pm) ?? 0
      if (am <= 0 && pm <= 0) return { valid: false, error: 'Debe ingresar al menos una medición mayor a 0' }
      if (am < 0 || pm < 0) return { valid: false, error: 'Los litros no pueden ser negativos' }

      return {
        valid: true,
        sanitized: {
          animal_id:     animalId,
          recorded_date: recordedDate,
          liters_am:     am,
          liters_pm:     pm,
          notes:         sanitizeText(p.notes, MAX_LEN.NOTES),
        },
      }
    }

    /* ── vaccine_profile ───────────────────────────────────────────── */
    case 'vaccine_profile': {
      const name = sanitizeIdent(p.name, MAX_LEN.NAME)
      if (!name) return { valid: false, error: 'El nombre de la vacuna es obligatorio' }

      const targetType = p.target_type_id ? sanitizeUUID(p.target_type_id) : null
      if (p.target_type_id && !targetType) return { valid: false, error: 'Tipo de animal objetivo inválido' }

      const targetSex = inEnum(p.target_sex, TARGET_SEX_VALUES) ? p.target_sex : 'any'
      const ageMin = sanitizeInt(p.age_min_days)
      const ageMax = sanitizeInt(p.age_max_days)
      const nextDose = sanitizeInt(p.default_next_dose_days)
      const totalDoses = sanitizeInt(p.total_doses)

      const allowedRepro = Array.isArray(p.allowed_reproductive_states)
        ? sanitizeStringArray(p.allowed_reproductive_states)
        : null

      return {
        valid: true,
        sanitized: {
          name,
          description:                 sanitizeText(p.description, MAX_LEN.DESCRIPTION),
          target_type_id:              targetType,
          target_sex:                  targetSex,
          age_min_days:                ageMin,
          age_max_days:                ageMax,
          allowed_reproductive_states: allowedRepro,
          default_next_dose_days:      nextDose,
          total_doses:                 totalDoses,
          is_active:                   typeof p.is_active === 'boolean' ? p.is_active : true,
        },
      }
    }

    /* ── vaccine_assignment ────────────────────────────────────────── */
    case 'vaccine_assignment': {
      if (!Array.isArray(p.animal_ids) || p.animal_ids.length === 0) {
        return { valid: false, error: 'Selecciona al menos un animal' }
      }
      const animalIds = (p.animal_ids as unknown[])
        .map(sanitizeUUID)
        .filter((x): x is string => Boolean(x))
      if (animalIds.length === 0) return { valid: false, error: 'Los animales seleccionados son inválidos' }

      const vaccineId = sanitizeUUID(p.vaccine_id)
      if (!vaccineId) return { valid: false, error: 'Debes seleccionar una vacuna' }

      const appliedAt = sanitizeDate(p.applied_at)
      if (!appliedAt) return { valid: false, error: 'La fecha de aplicación es obligatoria' }

      const nextDoseAt = sanitizeDate(p.next_dose_at)
      const dosesCount = sanitizeInt(p.doses_count)

      return {
        valid: true,
        sanitized: {
          animal_ids:   animalIds,
          vaccine_id:   vaccineId,
          applied_at:   appliedAt,
          next_dose_at: nextDoseAt,
          notes:        sanitizeText(p.notes, MAX_LEN.NOTES),
          doses_count:  dosesCount,
        },
      }
    }

    default:
      return { valid: false, error: 'Tipo de solicitud inválido' }
  }
}

/* Re-export for callers that want the runtime enum lists (e.g. UI selects). */
export { SEX_VALUES, ACQ_TYPES, REPRO_EVENT_TYPES, SPECIES_SLUGS, TARGET_SEX_VALUES, isValidUUID }
