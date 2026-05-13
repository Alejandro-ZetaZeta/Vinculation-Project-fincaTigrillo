'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Save, X, Syringe, Loader2 } from 'lucide-react'
import { AssignVaccineModal } from './AssignVaccineModal'
import { formatVaccineAgeText } from '@/lib/vaccines/format'

type TargetSex = 'any' | 'macho' | 'hembra' | 'mixto'

function asTargetSex(v: string): TargetSex {
  if (v === 'macho' || v === 'hembra' || v === 'mixto' || v === 'any') return v
  return 'any'
}

interface Vaccine {
  id: string
  name: string
  description: string | null
  target_type_id: string | null
  target_sex: TargetSex
  age_min_days: number | null
  age_max_days: number | null
  allowed_reproductive_states: string[] | null
  default_next_dose_days: number | null
  is_active: boolean
}

const REPRO_TYPES = new Set(['bovino', 'equino', 'porcino', 'caprino'])
const REPRO_STATE_OPTIONS: { value: string; label: string }[] = [
  { value: 'preñada', label: 'Preñada' },
  { value: 'vacía', label: 'Vacía' },
  { value: 'lactando', label: 'Lactando' },
  { value: 'seca', label: 'Seca' },
]

export function VaccineManager() {
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [types, setTypes] = useState<{ id: string; name: string; slug: string; category_id: string }[]>([])

  // minimal create form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetTypeId, setTargetTypeId] = useState<string>('')
  const [targetSex, setTargetSex] = useState<TargetSex>('any')
  const [ageMinDays, setAgeMinDays] = useState('')
  const [ageMaxDays, setAgeMaxDays] = useState('')
  const [defaultNextDoseDays, setDefaultNextDoseDays] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [allowedReproStates, setAllowedReproStates] = useState<string[]>([])

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [editing, setEditing] = useState<Vaccine | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)

  async function fetchVaccines() {
    setLoading(true)
    try {
      const res = await fetch('/api/vaccines?active_only=0')
      const json = await res.json()
      setVaccines(Array.isArray(json?.data) ? json.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchVaccines() }, [])

  useEffect(() => {
    fetch('/api/animal-types')
      .then(r => r.json())
      .then(json => setTypes(Array.isArray(json?.data) ? json.data : []))
      .catch(() => setTypes([]))
  }, [])

  const createSelectedTypeSlug = types.find(t => t.id === targetTypeId)?.slug
  const showCreateReproRestriction =
    !!createSelectedTypeSlug &&
    REPRO_TYPES.has(createSelectedTypeSlug) &&
    (targetSex === 'hembra' || targetSex === 'any')

  useEffect(() => {
    if (!showCreateReproRestriction && allowedReproStates.length > 0) {
      setAllowedReproStates([])
    }
  }, [showCreateReproRestriction, allowedReproStates.length])

  useEffect(() => {
    if (!editing) return
    const editTypeSlug = types.find(t => t.id === editing.target_type_id)?.slug
    const showEdit = !!editTypeSlug && REPRO_TYPES.has(editTypeSlug) && (editing.target_sex === 'hembra' || editing.target_sex === 'any')
    if (!showEdit && editing.allowed_reproductive_states != null) {
      setEditing({ ...editing, allowed_reproductive_states: null })
    }
  }, [editing, types])

  async function createVaccine(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/vaccines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description || null,
          target_type_id: targetTypeId || null,
          target_sex: targetSex,
          age_min_days: ageMinDays ? parseInt(ageMinDays, 10) : null,
          age_max_days: ageMaxDays ? parseInt(ageMaxDays, 10) : null,
          allowed_reproductive_states: showCreateReproRestriction && allowedReproStates.length > 0 ? allowedReproStates : null,
          default_next_dose_days: defaultNextDoseDays ? parseInt(defaultNextDoseDays, 10) : null,
          is_active: isActive,
        })
      })
      const json = await res.json()
      if (!res.ok) { setError(json?.error || 'Error al crear'); return }
      setShowForm(false)
      setName('')
      setDescription('')
      setTargetTypeId('')
      setTargetSex('any')
      setAgeMinDays('')
      setAgeMaxDays('')
      setAllowedReproStates([])
      setDefaultNextDoseDays('')
      setIsActive(true)
      await fetchVaccines()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  async function updateVaccine(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setError('')
    if (!editing.name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/vaccines/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editing.name.trim(),
          description: editing.description || null,
          target_type_id: editing.target_type_id || null,
          target_sex: editing.target_sex,
          age_min_days: editing.age_min_days,
          age_max_days: editing.age_max_days,
          allowed_reproductive_states: editing.allowed_reproductive_states ?? null,
          default_next_dose_days: editing.default_next_dose_days,
          is_active: editing.is_active,
        })
      })
      const json = await res.json()
      if (!res.ok) { setError(json?.error || 'Error al actualizar'); return }
      setEditing(null)
      await fetchVaccines()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  async function deleteVaccine(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/vaccines/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setVaccines(prev => prev.filter(v => v.id !== id))
        setConfirmDelete(null)
      }
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6" id="vaccine-manager">
      <AssignVaccineModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        defaultAnimalIds={[]}
        defaultTypeId={null}
        isAdmin={true}
        title="Asignar vacuna por grupo"
        defaultMode="group"
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Syringe className="w-5 h-5 text-primary" aria-hidden="true" />
            Catálogo de Vacunas
          </h2>
          <p className="text-sm text-muted">{vaccines.length} vacuna{vaccines.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAssignOpen(true)}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-surface-hover"
            type="button"
          >
            Asignar por grupo
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark"
            type="button"
          >
            <Plus className="w-4 h-4" aria-hidden="true" /> Nueva vacuna
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm">{error}</div>
      )}

      {showForm && (
        <form onSubmit={createVaccine} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Nueva vacuna</h3>
            <button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-surface-hover text-muted" aria-label="Cerrar">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Nombre *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Ej: Aftosa"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Tipo objetivo *</label>
              <select
                value={targetTypeId}
                onChange={(e) => setTargetTypeId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              >
                <option value="">Seleccionar</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              <p className="text-xs text-muted">Este campo habilita el filtrado automático por especie.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Sexo objetivo</label>
                <select
                  value={targetSex}
                  onChange={(e) => setTargetSex(asTargetSex(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                <option value="any">Cualquiera</option>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Activa</label>
              <label className="flex items-center gap-2 text-sm text-foreground px-3 py-2.5 rounded-xl bg-background border border-border">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="accent-[color:var(--color-primary)]"
                />
                Visible para asignación
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Descripción</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="(opcional)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Edad mínima (días)</label>
              <input
                type="number"
                min={0}
                value={ageMinDays}
                onChange={(e) => setAgeMinDays(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Edad máxima (días)</label>
              <input
                type="number"
                min={0}
                value={ageMaxDays}
                onChange={(e) => setAgeMaxDays(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Intervalo próxima dosis (días)</label>
              <input
                type="number"
                min={0}
                value={defaultNextDoseDays}
                onChange={(e) => setDefaultNextDoseDays(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div
            className={[
              'overflow-hidden transition-all duration-200',
              showCreateReproRestriction ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
            ].join(' ')}
            aria-hidden={!showCreateReproRestriction}
          >
            <div className="pt-1">
              <div className="bg-background border border-border rounded-2xl p-4">
                <p className="text-sm font-medium text-foreground">Estados reproductivos permitidos</p>
                <p className="text-xs text-muted mt-1">Si no seleccionas ninguno, se asume que aplica para cualquier estado.</p>
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {REPRO_STATE_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm text-foreground px-3 py-2 rounded-xl bg-surface border border-border hover:bg-surface-hover">
                      <input
                        type="checkbox"
                        checked={allowedReproStates.includes(opt.value)}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setAllowedReproStates(prev => checked ? [...prev, opt.value] : prev.filter(v => v !== opt.value))
                        }}
                        className="accent-[color:var(--color-primary)]"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
            Guardar
          </button>
        </form>
      )}

      {editing && (
        <form onSubmit={updateVaccine} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Editar vacuna</h3>
            <button type="button" onClick={() => setEditing(null)} className="p-2 rounded-xl hover:bg-surface-hover text-muted" aria-label="Cerrar">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Nombre *</label>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Tipo objetivo *</label>
              <select
                value={editing.target_type_id || ''}
                onChange={(e) => setEditing({ ...editing, target_type_id: e.target.value || null })}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                required
              >
                <option value="">Seleccionar</option>
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          {(() => {
            const editTypeSlug = types.find(t => t.id === editing.target_type_id)?.slug
            const showEdit = !!editTypeSlug && REPRO_TYPES.has(editTypeSlug) && (editing.target_sex === 'hembra' || editing.target_sex === 'any')
            const current = Array.isArray(editing.allowed_reproductive_states) ? editing.allowed_reproductive_states : []
            return (
              <div
                className={[
                  'overflow-hidden transition-all duration-200',
                  showEdit ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
                ].join(' ')}
                aria-hidden={!showEdit}
              >
                <div className="pt-1">
                  <div className="bg-background border border-border rounded-2xl p-4">
                    <p className="text-sm font-medium text-foreground">Estados reproductivos permitidos</p>
                    <p className="text-xs text-muted mt-1">Si no seleccionas ninguno, se asume que aplica para cualquier estado.</p>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {REPRO_STATE_OPTIONS.map(opt => (
                        <label key={opt.value} className="flex items-center gap-2 text-sm text-foreground px-3 py-2 rounded-xl bg-surface border border-border hover:bg-surface-hover">
                          <input
                            type="checkbox"
                            checked={current.includes(opt.value)}
                            onChange={(e) => {
                              const checked = e.target.checked
                              const next = checked ? [...current, opt.value] : current.filter(v => v !== opt.value)
                              setEditing({
                                ...editing,
                                allowed_reproductive_states: showEdit && next.length > 0 ? next : null,
                              })
                            }}
                            className="accent-[color:var(--color-primary)]"
                          />
                          {opt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Descripción</label>
            <input
              value={editing.description || ''}
              onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Sexo objetivo</label>
              <select
                value={editing.target_sex}
                onChange={(e) => setEditing({ ...editing, target_sex: asTargetSex(e.target.value) })}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="any">Cualquiera</option>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Activa</label>
              <label className="flex items-center gap-2 text-sm text-foreground px-3 py-2.5 rounded-xl bg-background border border-border">
                <input
                  type="checkbox"
                  checked={editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
                  className="accent-[color:var(--color-primary)]"
                />
                Visible para asignación
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Edad mínima (días)</label>
              <input
                type="number"
                min={0}
                value={editing.age_min_days ?? ''}
                onChange={(e) => setEditing({ ...editing, age_min_days: toIntOrNull(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Edad máxima (días)</label>
              <input
                type="number"
                min={0}
                value={editing.age_max_days ?? ''}
                onChange={(e) => setEditing({ ...editing, age_max_days: toIntOrNull(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Intervalo próxima dosis (días)</label>
              <input
                type="number"
                min={0}
                value={editing.default_next_dose_days ?? ''}
                onChange={(e) => setEditing({ ...editing, default_next_dose_days: toIntOrNull(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
            Guardar cambios
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      ) : vaccines.length > 0 ? (
        <div className="space-y-3">
          {vaccines.map(v => (
            <div key={v.id} className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground truncate">{v.name}</h3>
                    {!v.is_active && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted/10 text-muted">Inactiva</span>
                    )}
                  </div>
                  {v.description && <p className="text-sm text-muted mt-1">{v.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-muted/10 text-muted font-medium">
                      Tipo: {types.find(t => t.id === v.target_type_id)?.name || '—'}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                      Sexo: {v.target_sex === 'any' ? 'cualquiera' : v.target_sex}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">
                      {formatVaccineAgeText(v.age_min_days, v.age_max_days)}
                    </span>
                    {v.default_next_dose_days != null && (
                      <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">
                        Próxima dosis: +{v.default_next_dose_days} días
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => setEditing(v)}
                    className="text-xs font-medium text-primary hover:text-primary-dark"
                    type="button"
                  >
                    Editar
                  </button>
                  {confirmDelete === v.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => deleteVaccine(v.id)}
                        disabled={deleting}
                        className="px-2 py-1 text-xs rounded-lg bg-danger text-white hover:bg-danger/80 disabled:opacity-50"
                      >
                        {deleting ? '...' : 'Sí'}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1 text-xs rounded-lg border border-border hover:bg-surface-hover"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(v.id)}
                      className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10"
                      aria-label={`Eliminar ${v.name}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <Syringe className="w-12 h-12 text-muted/30 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Sin vacunas</h3>
          <p className="text-sm text-muted">Crea tu primera vacuna para iniciar el catálogo</p>
        </div>
      )}
    </div>
  )
}

function toIntOrNull(v: string): number | null {
  if (v.trim() === '') return null
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}
