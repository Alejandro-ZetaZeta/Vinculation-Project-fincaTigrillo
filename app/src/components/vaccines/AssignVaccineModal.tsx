'use client'

import { useEffect, useMemo, useState } from 'react'
import { X, Syringe, Filter, Save, Loader2, Users } from 'lucide-react'

export interface VaccineCatalogItem {
  id: string
  name: string
  description: string | null
  target_type_id: string | null
  target_sex: 'any' | 'macho' | 'hembra' | 'mixto'
  age_min_days: number | null
  age_max_days: number | null
  default_next_dose_days: number | null
  is_active: boolean
  stock_doses: number
}

export interface EligibleAnimal {
  id: string
  name: string | null
  identification_code: string | null
  sex: string | null
  birth_date: string | null
  animal_types?: { id: string; name: string; slug: string }
}

function addDaysISODate(dateISO: string, days: number): string {
  const base = new Date(`${dateISO}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

export function AssignVaccineModal(props: {
  open: boolean
  onClose: () => void
  defaultAnimalIds: string[]
  defaultTypeId?: string | null
  isAdmin: boolean
  title?: string
  defaultMode?: 'single' | 'group'
  /** Slug of the animal type (used to detect poultry batches) */
  animalTypeSlug?: string | null
}) {
  const { open, onClose, defaultAnimalIds, defaultTypeId, isAdmin, title, defaultMode, animalTypeSlug } = props

  const [vaccines, setVaccines] = useState<VaccineCatalogItem[]>([])
  const [loadingVaccines, setLoadingVaccines] = useState(false)
  const [vaccineId, setVaccineId] = useState('')
  const [appliedAt, setAppliedAt] = useState(() => {
    const _d = new Date()
    return `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`
  })
  const [nextDoseAt, setNextDoseAt] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [mode, setMode] = useState<'single' | 'group'>(defaultMode ?? (defaultAnimalIds.length > 1 ? 'group' : 'single'))
  const [eligibleAnimals, setEligibleAnimals] = useState<EligibleAnimal[]>([])
  const [loadingEligible, setLoadingEligible] = useState(false)
  const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>(defaultAnimalIds)

  // Poultry batch: live bird count used for dose deduction and stock checks
  const isPoultryBatch = animalTypeSlug === 'aves-de-corral' && defaultAnimalIds.length === 1
  const [poultryLiveCount, setPoultryLiveCount] = useState<number | null>(null)
  const [loadingPoultryCount, setLoadingPoultryCount] = useState(false)

  const selectedVaccine = useMemo(
    () => vaccines.find(v => v.id === vaccineId) || null,
    [vaccines, vaccineId]
  )

  // How many doses are actually needed:
  // - poultry batch → live bird count (initial minus deaths)
  // - everything else → number of selected animal rows
  const effectiveDoseCount = isPoultryBatch
    ? (poultryLiveCount ?? 0)
    : (mode === 'single' ? defaultAnimalIds.length : selectedAnimalIds.length)

  // For the stock-insufficient guard in the UI
  const animalCount = effectiveDoseCount
  const stockInsufficient =
    selectedVaccine !== null &&
    typeof selectedVaccine.stock_doses === 'number' &&
    selectedVaccine.stock_doses < animalCount

  useEffect(() => {
    if (!open) return
    setError('')
    setSelectedAnimalIds(defaultAnimalIds)
    setMode(defaultMode ?? (defaultAnimalIds.length > 1 ? 'group' : 'single'))
    setPoultryLiveCount(null)
  }, [open, defaultAnimalIds, defaultMode])

  // Fetch live bird count for poultry batches
  useEffect(() => {
    if (!open || !isPoultryBatch || !defaultAnimalIds[0]) return
    setLoadingPoultryCount(true)
    const animalId = defaultAnimalIds[0]
    fetch(`/api/reproductive-events?animal_id=${encodeURIComponent(animalId)}`)
      .then(r => r.json())
      .then((events: unknown) => {
        // reproductive-events returns an array; count 'muerte' events
        const list = Array.isArray(events) ? events as Array<{ event_type?: string; quantity?: unknown }> : []
        const deaths = list.reduce((sum, ev) => {
          if (ev?.event_type !== 'muerte') return sum
          const q = typeof ev.quantity === 'number' ? ev.quantity : (parseInt(String(ev.quantity ?? ''), 10) || 0)
          return sum + q
        }, 0)
        // Also fetch the initial batch count from the animal metadata
        fetch(`/api/animals/${encodeURIComponent(animalId)}`)
          .then(r2 => r2.json())
          .then((animal: unknown) => {
            const meta = (animal as { metadata?: Record<string, unknown> })?.metadata
            const rawQty = meta?.cantidad
            const initial = typeof rawQty === 'number' ? rawQty : (parseInt(String(rawQty ?? ''), 10) || 0)
            setPoultryLiveCount(Math.max(0, initial - deaths))
          })
          .catch(() => setPoultryLiveCount(null))
      })
      .catch(() => setPoultryLiveCount(null))
      .finally(() => setLoadingPoultryCount(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isPoultryBatch, defaultAnimalIds[0]])

  useEffect(() => {
    if (!open) return
    setLoadingVaccines(true)
    const url = defaultTypeId
      ? `/api/vaccines?type_id=${encodeURIComponent(defaultTypeId)}&active_only=1`
      : '/api/vaccines?active_only=1'

    fetch(url)
      .then(r => r.json())
      .then((json) => {
        const list = Array.isArray(json?.data) ? (json.data as VaccineCatalogItem[]) : []
        setVaccines(list)
        // If only one vaccine exists, preselect
        if (list.length === 1) setVaccineId(list[0].id)
      })
      .catch(() => setVaccines([]))
      .finally(() => setLoadingVaccines(false))
  }, [open, defaultTypeId])

  // Auto-suggest next dose based on catalog interval (editable)
  useEffect(() => {
    if (!selectedVaccine) return
    if (!appliedAt) return
    if (nextDoseAt) return
    const interval = selectedVaccine.default_next_dose_days
    // Only suggest when interval is > 0; 0 or null means single-dose.
    if (typeof interval === 'number' && interval > 0) {
      setNextDoseAt(addDaysISODate(appliedAt, interval))
    }
  }, [selectedVaccine, appliedAt, nextDoseAt])

  async function filterEligibleAnimals() {
    if (!vaccineId) {
      setError('Selecciona una vacuna primero')
      return
    }
    setError('')
    setLoadingEligible(true)
    try {
      const res = await fetch(`/api/animals/eligible?vaccine_id=${encodeURIComponent(vaccineId)}`)
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'No se pudo filtrar animales elegibles')
        setEligibleAnimals([])
        return
      }
      const list = Array.isArray(json?.data) ? (json.data as EligibleAnimal[]) : []
      setEligibleAnimals(list)
      setSelectedAnimalIds(list.map(a => a.id))
      if (mode !== 'group') setMode('group')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoadingEligible(false)
    }
  }

  function toggleSelected(id: string) {
    setSelectedAnimalIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleAssign() {
    if (!isAdmin) return
    setError('')
    if (!vaccineId) { setError('Selecciona una vacuna'); return }
    if (!appliedAt) { setError('Selecciona la fecha de aplicación'); return }

    const ids = mode === 'single' ? defaultAnimalIds : selectedAnimalIds
    if (!ids || ids.length === 0) { setError('Selecciona al menos un animal'); return }

    if (isPoultryBatch && (poultryLiveCount === null || loadingPoultryCount)) {
      setError('Espera a que se calcule el conteo de aves vivas')
      return
    }
    if (isPoultryBatch && poultryLiveCount === 0) {
      setError('No hay aves vivas en este lote')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/vaccinations/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animal_ids: ids,
          vaccine_id: vaccineId,
          applied_at: appliedAt,
          next_dose_at: nextDoseAt || null,
          notes: notes || null,
          // For poultry batches: deduct live bird count from stock, not 1
          ...(isPoultryBatch && poultryLiveCount !== null ? { doses_count: poultryLiveCount } : {}),
        })
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || 'No se pudo asignar la vacuna')
        return
      }
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Syringe className="w-5 h-5 text-primary" aria-hidden="true" />
              <h3 className="text-base font-semibold text-foreground">{title || 'Asignar Vacuna'}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-surface-hover text-muted"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm">{error}</div>
            )}

            {stockInsufficient && selectedVaccine && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 rounded-xl text-sm flex items-start gap-2" role="alert">
                <span className="text-base leading-none mt-0.5" aria-hidden="true">⚠️</span>
                <span>
                  <strong>Stock insuficiente:</strong> {selectedVaccine.stock_doses} dosis disponible{selectedVaccine.stock_doses !== 1 ? 's' : ''},
                  se requieren {animalCount}{isPoultryBatch ? ' (aves vivas en el lote)' : ''}.
                </span>
              </div>
            )}

            {/* Poultry batch live count info */}
            {isPoultryBatch && (
              <div className="p-3 bg-primary/8 border border-primary/20 text-primary rounded-xl text-sm flex items-start gap-2">
                <span className="text-base leading-none mt-0.5" aria-hidden="true">🐔</span>
                <span>
                  {loadingPoultryCount
                    ? 'Calculando aves vivas…'
                    : poultryLiveCount === null
                    ? 'No se pudo obtener el conteo de aves vivas'
                    : <><strong>{poultryLiveCount} aves vivas</strong> en este lote — se descontarán <strong>{poultryLiveCount} dosis</strong> del inventario.</>}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Vacuna *</label>
                <select
                  value={vaccineId}
                  onChange={(e) => { setVaccineId(e.target.value); setNextDoseAt('') }}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={loadingVaccines}
                >
                  <option value="">{loadingVaccines ? 'Cargando...' : 'Seleccionar'}</option>
                  {vaccines.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.name}{typeof v.stock_doses === 'number' ? ` (${v.stock_doses} dosis)` : ''}
                    </option>
                  ))}
                </select>
                {defaultTypeId && (
                  <p className="text-xs text-muted">Mostrando vacunas catalogadas para este tipo de animal.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Modo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('single')}
                    className={[
                      'flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium',
                      mode === 'single' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background border-border text-muted hover:bg-surface-hover'
                    ].join(' ')}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('group')}
                    className={[
                      'flex-1 px-3 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-center gap-1.5',
                      mode === 'group' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-background border-border text-muted hover:bg-surface-hover'
                    ].join(' ')}
                  >
                    <Users className="w-4 h-4" aria-hidden="true" /> Grupo
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Fecha de aplicación *</label>
                <input
                  type="date"
                  value={appliedAt}
                  onChange={(e) => { setAppliedAt(e.target.value); setNextDoseAt('') }}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Próxima dosis (opcional)</label>
                <input
                  type="date"
                  value={nextDoseAt}
                  onChange={(e) => setNextDoseAt(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {selectedVaccine?.default_next_dose_days != null && (
                  <p className="text-xs text-muted">Sugerida por intervalo: {selectedVaccine.default_next_dose_days} días.</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Notas (opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Ej: lote, marca, observaciones"
              />
            </div>

            {mode === 'group' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Animales elegibles</p>
                    <p className="text-xs text-muted">Filtra por especie, sexo y rango de edad según la vacuna.</p>
                  </div>
                  <button
                    type="button"
                    onClick={filterEligibleAnimals}
                    disabled={loadingEligible}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50"
                  >
                    {loadingEligible ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Filter className="w-4 h-4" aria-hidden="true" />}
                    Filtrar elegibles
                  </button>
                </div>

                {eligibleAnimals.length > 0 ? (
                  <div className="border border-border rounded-2xl overflow-hidden">
                    <div className="px-4 py-2.5 bg-surface border-b border-border flex items-center justify-between">
                      <p className="text-xs text-muted">Seleccionados: {selectedAnimalIds.length} / {eligibleAnimals.length}</p>
                      <button
                        type="button"
                        className="text-xs font-medium text-primary hover:text-primary-dark"
                        onClick={() => setSelectedAnimalIds(eligibleAnimals.map(a => a.id))}
                      >
                        Marcar todos
                      </button>
                    </div>
                    <div className="max-h-56 overflow-y-auto divide-y divide-border">
                      {eligibleAnimals.map(a => {
                        const checked = selectedAnimalIds.includes(a.id)
                        const label = a.name || a.identification_code || a.id
                        return (
                          <label key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-hover cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelected(a.id)}
                              className="accent-[color:var(--color-primary)]"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{label}</p>
                              <p className="text-xs text-muted truncate">
                                {(a.animal_types?.name || '—') + ' · ' + (a.sex || '—') + (a.birth_date ? ` · Nac: ${a.birth_date}` : '')}
                              </p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="bg-surface/40 border border-dashed border-border rounded-2xl p-6 text-center">
                    <p className="text-sm text-muted">Usa “Filtrar elegibles” para cargar la lista.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-surface-hover"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleAssign}
              disabled={!isAdmin || saving || stockInsufficient}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
