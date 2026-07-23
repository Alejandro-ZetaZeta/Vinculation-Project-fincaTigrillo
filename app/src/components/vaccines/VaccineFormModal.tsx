'use client'

import { useEffect, useState } from 'react'
import { Loader2, Save, X, Pencil } from 'lucide-react'
import {
  type Vaccine,
  type AnimalTypeOption,
  asTargetSex,
  REPRO_TYPES,
  POULTRY_SLUG,
  REPRO_STATE_OPTIONS,
} from './types'

export interface VaccineFormModalProps {
  open: boolean
  vaccine: Vaccine
  types: AnimalTypeOption[]
  onClose: () => void
  onSaved: (updated: Vaccine) => void
}

function toIntOrNull(v: string): number | null {
  if (v.trim() === '') return null
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

export function VaccineFormModal({
  open,
  vaccine,
  types,
  onClose,
  onSaved,
}: VaccineFormModalProps) {
  const [editing, setEditing] = useState<Vaccine>(vaccine)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Reset local state whenever a different vaccine is loaded into the modal
  useEffect(() => {
    setEditing(vaccine)
    setError('')
  }, [vaccine])

  // Clear repro states when target changes to a non-restricted combination
  useEffect(() => {
    const editTypeSlug = types.find(t => t.id === editing.target_type_id)?.slug
    const showEdit = !!editTypeSlug && REPRO_TYPES.has(editTypeSlug) && editing.target_sex === 'hembra'
    if (!showEdit && editing.allowed_reproductive_states != null) {
      setEditing(prev => ({ ...prev, allowed_reproductive_states: null }))
    }
  }, [editing.target_type_id, editing.target_sex, types, editing.allowed_reproductive_states])

  if (!open) return null

  async function submit(e: React.FormEvent) {
    e.preventDefault()
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
          total_doses: editing.total_doses,
          min_stock: editing.min_stock,
          is_active: editing.is_active,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json?.error || 'Error al actualizar'); return }
      onSaved(json.data as Vaccine)
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  const editTypeSlug = types.find(t => t.id === editing.target_type_id)?.slug
  const showRepro = !!editTypeSlug && REPRO_TYPES.has(editTypeSlug) && editing.target_sex === 'hembra'
  const currentRepro = Array.isArray(editing.allowed_reproductive_states) ? editing.allowed_reproductive_states : []

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Editar vacuna">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-xl flex flex-col max-h-[90vh]">

          <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" aria-hidden="true" />
              <h3 className="text-base font-semibold text-foreground">Editar vacuna</h3>
            </div>
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-surface-hover text-muted" aria-label="Cerrar">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={submit} id="vaccine-edit-form" className="flex flex-col flex-1 min-h-0">
            <div className="overflow-y-auto flex-1 p-5 space-y-4">

              {error && (
                <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm">{error}</div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Nombre *</label>
                  <input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    required
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Tipo objetivo *</label>
                  <select
                    value={editing.target_type_id || ''}
                    onChange={(e) => {
                      const newSlug = types.find(t => t.id === e.target.value)?.slug
                      const newSex = newSlug !== POULTRY_SLUG && editing.target_sex === 'mixto' ? 'any' : editing.target_sex
                      setEditing({ ...editing, target_type_id: e.target.value || null, target_sex: newSex })
                    }}
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

              <div
                className={[
                  'overflow-hidden transition-all duration-200',
                  showRepro ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0 pointer-events-none',
                ].join(' ')}
                aria-hidden={!showRepro}
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
                            checked={currentRepro.includes(opt.value)}
                            onChange={(e) => {
                              const checked = e.target.checked
                              const next = checked ? [...currentRepro, opt.value] : currentRepro.filter(v => v !== opt.value)
                              setEditing({
                                ...editing,
                                allowed_reproductive_states: showRepro && next.length > 0 ? next : null,
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
                    {editTypeSlug === POULTRY_SLUG && (
                      <option value="mixto">Mixto</option>
                    )}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Activa</label>
                  <label className="flex items-center gap-2 text-sm text-foreground px-3 py-2.5 rounded-xl bg-background border border-border cursor-pointer">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Nº total de dosis</label>
                  <input
                    type="number"
                    min={1}
                    value={editing.total_doses ?? ''}
                    onChange={(e) => setEditing({ ...editing, total_doses: toIntOrNull(e.target.value) })}
                    placeholder="(vacío = ilimitado)"
                    disabled={editing.default_next_dose_days == null}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium">Stock mínimo (alerta)</label>
                <input
                  type="number"
                  min={0}
                  value={editing.min_stock ?? ''}
                  onChange={(e) => setEditing({ ...editing, min_stock: toIntOrNull(e.target.value) })}
                  placeholder="(vacío = sin alerta)"
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <p className="text-xs text-muted">Cuando el stock sea igual o menor a este número, se mostrará una alerta visual.</p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-surface-hover"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
