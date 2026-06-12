import { createInsForgeServerClient } from '@/lib/insforge/server'
import { calcFechaParto } from '@/lib/formulas'
import { validateRequestPayload } from './validatePayload'

type InsForgeClient = ReturnType<typeof createInsForgeServerClient>

const REPRO_STATE_CANONICAL: Record<string, string> = {
  prenada:   'preñada',
  'preñada': 'preñada',
  vacia:     'vacía',
  'vacía':   'vacía',
  lactando:  'lactando',
  seca:      'seca',
}

function normalizeAllowedReproStates(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null
  const out: string[] = []
  for (const raw of input) {
    if (raw == null) continue
    const key = String(raw).trim().toLowerCase()
    const canon = REPRO_STATE_CANONICAL[key]
    if (!canon) continue
    if (!out.includes(canon)) out.push(canon)
  }
  return out.length > 0 ? out : null
}

function addDaysISODate(dateISO: string, days: number): string {
  const base = new Date(`${dateISO}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

export async function executeApprovedRequest(
  client: InsForgeClient,
  adminUserId: string,
  request: { id: string; request_type: string; payload: Record<string, unknown> }
): Promise<{ ok: boolean; error?: string }> {
  const { valid, error: validErr, sanitized } = validateRequestPayload(
    request.request_type,
    request.payload
  )
  if (!valid || !sanitized) return { ok: false, error: validErr ?? 'Payload inválido' }

  try {
    switch (request.request_type) {
      case 'animal_record': {
        const identCode = sanitized.identification_code as string | null
        if (identCode) {
          const { data: existing } = await client.database
            .from('animals')
            .select('id, name, identification_code')
            .eq('identification_code', identCode)
            .limit(1)
          if (Array.isArray(existing) && existing.length > 0) {
            const dup = existing[0] as { name: string | null; identification_code: string }
            return { ok: false, error: `El código "${identCode}" ya está en uso por el animal "${dup.name || dup.identification_code}"` }
          }
        }
        const isLitter = sanitized.is_litter === true
        const litterCount = sanitized.litter_count as number | null
        const { error } = await client.database
          .from('animals')
          .insert([{
            ...sanitized,
            litter_alive: isLitter ? litterCount : null,
            created_by: adminUserId,
          }])
        if (error) return { ok: false, error: error.message }
        return { ok: true }
      }

      case 'reproductive_event': {
        const { animal_id, event_type, event_date, notes, species_slug, sire_id } = sanitized as {
          animal_id: string; event_type: string; event_date: string;
          notes: string | null; species_slug: string | null; sire_id: string | null
        }

        const { data: animalRow, error: animalErr } = await client.database
          .from('animals')
          .select('id, sex, status, metadata, is_litter, litter_count, litter_alive, animal_types(slug)')
          .eq('id', animal_id)
          .maybeSingle()

        if (animalErr || !animalRow) return { ok: false, error: 'Animal no encontrado' }

        const animalTypes = (animalRow as unknown as { animal_types?: { slug?: string } | { slug?: string }[] | null }).animal_types
        const typeSlug = Array.isArray(animalTypes) ? (animalTypes[0]?.slug ?? undefined) : (animalTypes?.slug ?? undefined)
        const sexRaw = (animalRow as unknown as { sex?: unknown }).sex
        const sex = typeof sexRaw === 'string' ? sexRaw.toLowerCase() : null
        const isPoultryBatch = typeSlug === 'aves-de-corral'
        const isLitterRaw = (animalRow as unknown as { is_litter?: unknown }).is_litter
        const isPorcinoLitter = isLitterRaw === true && typeSlug === 'porcino'
        const isBatchAnimal = isPoultryBatch || isPorcinoLitter

        const reproductiveOnlyTypes = new Set(['monta_natural','inseminacion','confirmacion_prenez','parto','aborto'])

        if (reproductiveOnlyTypes.has(event_type)) {
          if (isBatchAnimal) return { ok: false, error: 'Los eventos reproductivos no aplican a lotes' }
          if (sex !== 'hembra') return { ok: false, error: 'Los eventos reproductivos solo aplican a hembras' }
        } else if (event_type === 'destete') {
          if (isPoultryBatch) return { ok: false, error: 'El destete no aplica a lotes avícolas' }
          if (!isPorcinoLitter && sex !== 'hembra') return { ok: false, error: 'El destete solo aplica a hembras' }
        }

        let expected_due_date: string | null = null
        if ((event_type === 'monta_natural' || event_type === 'inseminacion') && species_slug) {
          const dueDate = calcFechaParto(new Date(event_date + 'T12:00:00'), species_slug)
          if (dueDate) expected_due_date = dueDate.toISOString().split('T')[0]
        }

        const { error } = await client.database
          .from('reproductive_events')
          .insert([{
            animal_id,
            event_type,
            event_date,
            expected_due_date,
            notes,
            quantity: null,
            sire_id: event_type === 'monta_natural' && sire_id ? sire_id : null,
            created_by: adminUserId,
          }])

        if (error) return { ok: false, error: error.message }
        return { ok: true }
      }

      case 'mortality_event': {
        const { animal_id, event_date, quantity, notes } = sanitized as {
          animal_id: string; event_date: string; quantity: number; notes: string | null
        }

        const { data: animalRow, error: animalErr } = await client.database
          .from('animals')
          .select('id, status, metadata, is_litter, litter_count, animal_types(slug)')
          .eq('id', animal_id)
          .maybeSingle()

        if (animalErr || !animalRow) return { ok: false, error: 'Animal no encontrado' }

        const animalTypes = (animalRow as unknown as { animal_types?: { slug?: string } | { slug?: string }[] | null }).animal_types
        const typeSlug = Array.isArray(animalTypes) ? (animalTypes[0]?.slug ?? undefined) : (animalTypes?.slug ?? undefined)
        const isPoultryBatch = typeSlug === 'aves-de-corral'
        const isLitterRaw = (animalRow as unknown as { is_litter?: unknown }).is_litter
        const isPorcinoLitter = isLitterRaw === true && typeSlug === 'porcino'
        const isBatchAnimal = isPoultryBatch || isPorcinoLitter

        if (!isBatchAnimal) return { ok: false, error: 'El evento de mortalidad solo aplica a lotes de aves de corral o camadas porcinas' }

        const { error: insertErr } = await client.database
          .from('reproductive_events')
          .insert([{ animal_id, event_type: 'muerte', event_date, notes, quantity, created_by: adminUserId }])

        if (insertErr) return { ok: false, error: insertErr.message }

        // Post-insert: update batch counts
        if (isPoultryBatch) {
          const meta = (animalRow as unknown as { metadata?: Record<string, unknown> | null }).metadata
          const initial = typeof meta?.cantidad === 'number' ? meta.cantidad : parseInt(String(meta?.cantidad ?? ''), 10)
          if (Number.isFinite(initial)) {
            const { data: deathsData } = await client.database
              .from('reproductive_events').select('quantity').eq('animal_id', animal_id).eq('event_type', 'muerte')
            const totalDeaths = (deathsData || []).reduce((sum: number, row: unknown) => {
              const q = (row as { quantity?: unknown }).quantity
              return sum + (typeof q === 'number' ? q : (parseInt(String(q ?? ''), 10) || 0))
            }, 0)
            if (initial - totalDeaths <= 0) {
              await client.database.from('animals').update({ status: 'muerto' }).eq('id', animal_id)
            }
          }
        } else if (isPorcinoLitter) {
          const litterCountRaw = (animalRow as unknown as { litter_count?: unknown }).litter_count
          const litterCount = typeof litterCountRaw === 'number' ? litterCountRaw : parseInt(String(litterCountRaw ?? ''), 10)
          if (Number.isFinite(litterCount)) {
            const { data: deathsData } = await client.database
              .from('reproductive_events').select('quantity').eq('animal_id', animal_id).eq('event_type', 'muerte')
            const totalDeaths = (deathsData || []).reduce((sum: number, row: unknown) => {
              const q = (row as { quantity?: unknown }).quantity
              return sum + (typeof q === 'number' ? q : (parseInt(String(q ?? ''), 10) || 0))
            }, 0)
            const remaining = Math.max(0, litterCount - totalDeaths)
            const update: Record<string, unknown> = { litter_alive: remaining }
            if (remaining <= 0) update.status = 'muerto'
            await client.database.from('animals').update(update).eq('id', animal_id)
          }
        }

        return { ok: true }
      }

      case 'production_event': {
        const { animal_id, recorded_date, liters_am, liters_pm, notes } = sanitized as {
          animal_id: string; recorded_date: string; liters_am: number; liters_pm: number; notes: string | null
        }

        const { data: animal } = await client.database
          .from('animals').select('id, sex, animal_types(slug)').eq('id', animal_id).maybeSingle()

        if (!animal) return { ok: false, error: 'Animal no encontrado' }
        const rawTypes = (animal as unknown as { animal_types?: { slug?: string } | { slug?: string }[] | null }).animal_types
        const typeSlug = Array.isArray(rawTypes) ? rawTypes[0]?.slug : rawTypes?.slug
        const sexRaw = (animal as unknown as { sex?: string }).sex?.toLowerCase()

        if (typeSlug !== 'bovino' && typeSlug !== 'caprino') {
          return { ok: false, error: 'La producción de leche solo aplica a bovinos y caprinos' }
        }
        if (sexRaw !== 'hembra') {
          return { ok: false, error: 'Solo se registra producción de leche para hembras' }
        }

        const { error } = await client.database
          .from('milk_production_events')
          .insert([{ animal_id, recorded_date, liters_am, liters_pm, notes, created_by: adminUserId }])

        if (error) return { ok: false, error: error.message }
        return { ok: true }
      }

      case 'vaccine_profile': {
        const s = sanitized
        const { error } = await client.database
          .from('vaccine_catalog')
          .insert([{
            ...s,
            allowed_reproductive_states: normalizeAllowedReproStates(s.allowed_reproductive_states),
            created_by: adminUserId,
          }])
        if (error) return { ok: false, error: error.message }
        return { ok: true }
      }

      case 'vaccine_assignment': {
        const { animal_ids, vaccine_id, applied_at, next_dose_at, notes, doses_count } = sanitized as {
          animal_ids: string[]; vaccine_id: string; applied_at: string;
          next_dose_at: string | null; notes: string | null; doses_count: number | null
        }

        const { data: vax } = await client.database
          .from('vaccine_catalog').select('default_next_dose_days').eq('id', vaccine_id).maybeSingle()
        if (!vax) return { ok: false, error: 'Vacuna no encontrada' }

        const interval = (vax as { default_next_dose_days: number | null }).default_next_dose_days
        const isSingleDose = interval == null || interval === 0

        if (isSingleDose) {
          const { data: existing } = await client.database
            .from('animal_vaccinations').select('animal_id').eq('vaccine_id', vaccine_id).in('animal_id', animal_ids)
          const dupIds = Array.isArray(existing) ? (existing as { animal_id: string }[]).map(r => r.animal_id) : []
          if (dupIds.length > 0) return { ok: false, error: 'El animal ya tiene esta vacuna de dosis única' }
        }

        let computedNext: string | null = null
        if (!isSingleDose) {
          computedNext = next_dose_at ?? null
          if (!computedNext && typeof interval === 'number' && interval > 0) {
            computedNext = addDaysISODate(applied_at, interval)
          }
        }

        const { error: rpcError } = await client.database.rpc('assign_vaccines_and_deduct_stock', {
          p_vaccine_id:   vaccine_id,
          p_animal_ids:   animal_ids,
          p_applied_at:   applied_at,
          p_next_dose_at: computedNext,
          p_notes:        notes ?? null,
          p_created_by:   adminUserId,
          p_doses_count:  typeof doses_count === 'number' ? doses_count : null,
        })

        if (rpcError) return { ok: false, error: rpcError.message }
        return { ok: true }
      }

      default:
        return { ok: false, error: 'Tipo de solicitud desconocido' }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error interno al ejecutar solicitud'
    return { ok: false, error: msg }
  }
}
