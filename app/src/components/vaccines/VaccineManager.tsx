'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Trash2, Save, X, Syringe, Loader2, PackagePlus, Package, Pencil, History, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react'
import { AssignVaccineModal } from './AssignVaccineModal'
import { MovementModal, type ManualReason } from './MovementModal'
import { VaccineFormModal } from './VaccineFormModal'
import { formatVaccineAgeText } from '@/lib/vaccines/format'
import {
  type Vaccine,
  type TargetSex,
  type AnimalTypeOption,
  asTargetSex,
  REPRO_TYPES,
  POULTRY_SLUG,
  REPRO_STATE_OPTIONS,
} from './types'

interface StockMovement {
  id: string
  vaccine_id: string
  delta: number
  reason: ManualReason | 'Aplicación'
  notes: string | null
  related_vaccination_id: string | null
  created_at: string
  created_by: string | null
}

function stockBadgeClasses(stock: number, minStock: number | null | undefined): string {
  if (stock === 0) {
    return 'bg-danger/10 text-danger'
  }
  if (minStock != null && stock <= minStock) {
    return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
  }
  return 'bg-success/10 text-success'
}

function reasonBadgeClasses(reason: string): string {
  switch (reason) {
    case 'Compra':                return 'bg-success/10 text-success'
    case 'Aplicación':            return 'bg-primary/10 text-primary'
    case 'Ajuste de inventario':  return 'bg-accent/10 text-accent'
    case 'Vencimiento':           return 'bg-warning/10 text-warning'
    case 'Pérdida':
    case 'Daño':                  return 'bg-danger/10 text-danger'
    default:                      return 'bg-muted/10 text-muted'
  }
}

function formatRelative(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const diffMs = Date.now() - d.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `hace ${days} d`
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function VaccineManager({ userRole }: { userRole?: string }) {
  const isAdmin = userRole === 'admin'
  const [vaccines, setVaccines] = useState<Vaccine[]>([])
  const [movementsByVaccine, setMovementsByVaccine] = useState<Record<string, StockMovement[]>>({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [types, setTypes] = useState<AnimalTypeOption[]>([])

  // minimal create form
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [targetTypeId, setTargetTypeId] = useState<string>('')
  const [targetSex, setTargetSex] = useState<TargetSex>('any')
  const [ageMinDays, setAgeMinDays] = useState('')
  const [ageMaxDays, setAgeMaxDays] = useState('')
  const [defaultNextDoseDays, setDefaultNextDoseDays] = useState('')
  const [totalDoses, setTotalDoses] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [allowedReproStates, setAllowedReproStates] = useState<string[]>([])

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [editing, setEditing] = useState<Vaccine | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)
  const [filterTypeId, setFilterTypeId] = useState<string>('')

  // Movement modal per-vaccine
  const [movementFor, setMovementFor] = useState<Vaccine | null>(null)

  const fetchVaccines = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/vaccines?active_only=0')
      const json = await res.json()
      const list: Vaccine[] = Array.isArray(json?.data) ? json.data : []
      setVaccines(list)
      // Prefetch last 3 movements per vaccine (admin only — server returns empty for others)
      if (isAdmin) {
        const entries = await Promise.all(
          list.map(async (v) => {
            try {
              const r = await fetch(`/api/vaccines/${v.id}/movements?limit=3`)
              const j = await r.json()
              return [v.id, Array.isArray(j?.data) ? j.data as StockMovement[] : []] as const
            } catch {
              return [v.id, [] as StockMovement[]] as const
            }
          })
        )
        const map: Record<string, StockMovement[]> = {}
      for (const [id, mv] of entries) map[id] = mv
      setMovementsByVaccine(map)
      }
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  useEffect(() => { fetchVaccines() }, [fetchVaccines])

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
    targetSex === 'hembra'

  useEffect(() => {
    if (!showCreateReproRestriction && allowedReproStates.length > 0) {
      setAllowedReproStates([])
    }
  }, [showCreateReproRestriction, allowedReproStates.length])

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
          total_doses: totalDoses ? parseInt(totalDoses, 10) : null,
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
      setTotalDoses('')
      setIsActive(true)
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

  async function onMovementSaved(vaccineId: string, newStock: number) {
    setVaccines(prev => prev.map(v => v.id === vaccineId ? { ...v, stock_doses: newStock } : v))
    // Refresh just that vaccine's recent movements
    if (isAdmin) {
      try {
        const r = await fetch(`/api/vaccines/${vaccineId}/movements?limit=3`)
        const j = await r.json()
        if (Array.isArray(j?.data)) {
          setMovementsByVaccine(prev => ({ ...prev, [vaccineId]: j.data as StockMovement[] }))
        }
      } catch { /* silent */ }
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
        hideModeToggle={true}
      />

      {movementFor && (
        <MovementModal
          open={!!movementFor}
          vaccineId={movementFor.id}
          vaccineName={movementFor.name}
          currentStock={movementFor.stock_doses}
          onClose={() => setMovementFor(null)}
          onSaved={(newStock) => onMovementSaved(movementFor.id, newStock)}
        />
      )}

      {editing && (
        <VaccineFormModal
          open={!!editing}
          vaccine={editing}
          types={types}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setVaccines(prev => prev.map(v => v.id === updated.id ? { ...v, ...updated } : v))
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Syringe className="w-5 h-5 text-primary" aria-hidden="true" />
            Catálogo de Vacunas
          </h2>
          <p className="text-sm text-muted">{vaccines.length} vacuna{vaccines.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setAssignOpen(true)}
              className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-surface-hover"
              type="button"
            >
              Asignar por grupo
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark"
              type="button"
            >
              <Plus className="w-4 h-4" aria-hidden="true" /> Nueva vacuna
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm">{error}</div>
      )}

      {isAdmin && showForm && (
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
                onChange={(e) => {
                  const newSlug = types.find(t => t.id === e.target.value)?.slug
                  if (newSlug !== POULTRY_SLUG && targetSex === 'mixto') setTargetSex('any')
                  setTargetTypeId(e.target.value)
                }}
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
                {createSelectedTypeSlug === POULTRY_SLUG && (
                  <option value="mixto">Mixto</option>
                )}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Nº total de dosis</label>
              <input
                type="number"
                min={1}
                value={totalDoses}
                onChange={(e) => setTotalDoses(e.target.value)}
                placeholder="(vacío = ilimitado)"
                disabled={!defaultNextDoseDays}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40 disabled:cursor-not-allowed"
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

      {!loading && types.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Filtrar por especie</p>
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar snap-x snap-mandatory">
            <button
              type="button"
              onClick={() => setFilterTypeId('')}
              className={[
                'shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                !filterTypeId
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-surface border-border text-muted hover:text-foreground hover:border-primary/40',
              ].join(' ')}
            >
              Todas
              <span className={[
                'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                !filterTypeId ? 'bg-white/20 text-white' : 'bg-muted/10 text-muted',
              ].join(' ')}>
                {vaccines.length}
              </span>
            </button>
            {types.filter(t => vaccines.some(v => v.target_type_id === t.id)).map(t => {
              const count = vaccines.filter(v => v.target_type_id === t.id).length
              const active = filterTypeId === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFilterTypeId(active ? '' : t.id)}
                  className={[
                    'shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                    active
                      ? 'bg-primary text-white border-primary shadow-sm'
                      : 'bg-surface border-border text-muted hover:text-foreground hover:border-primary/40',
                  ].join(' ')}
                >
                  {t.name}
                  <span className={[
                    'ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                    active ? 'bg-white/20 text-white' : 'bg-muted/10 text-muted',
                  ].join(' ')}>
                    {count}
                  </span>
                </button>
              )
            })}
            </div>
            <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent" />
          </div>
        </div>
      )}

      {(() => {
        const visible = filterTypeId
          ? vaccines.filter(v => v.target_type_id === filterTypeId)
          : vaccines
        return loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      ) : visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map(v => {
            const recent = movementsByVaccine[v.id] || []
            return (
            <div key={v.id} className="bg-surface border border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/vaccines/${v.id}`}
                      className="text-base font-semibold text-foreground truncate hover:text-primary transition-colors"
                    >
                      {v.name}
                    </Link>
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
                    {v.default_next_dose_days != null && (
                      <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                        {v.total_doses != null ? `Serie: ${v.total_doses} dosis` : 'Dosis recurrente'}
                      </span>
                    )}
                    {v.min_stock != null && (
                      <span className="text-xs px-2 py-1 rounded-full bg-muted/10 text-muted font-medium">
                        Mínimo: {v.min_stock}
                      </span>
                    )}
                    <span
                      className={[
                        'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold',
                        stockBadgeClasses(v.stock_doses, v.min_stock),
                      ].join(' ')}
                      title="Dosis en inventario"
                    >
                      <Package className="w-3 h-3" aria-hidden="true" />
                      Stock: {v.stock_doses}
                    </span>
                  </div>

                  {/* Recent movements (admin only) */}
                  {isAdmin && recent.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-border/60">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[11px] font-semibold text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <History className="w-3 h-3" aria-hidden="true" />
                          Movimientos recientes
                        </p>
                        <Link
                          href={`/dashboard/vaccines/${v.id}`}
                          className="text-xs text-primary font-semibold inline-flex items-center gap-0.5 hover:underline"
                        >
                          Ver historial completo
                          <ChevronRight className="w-3 h-3" aria-hidden="true" />
                        </Link>
                      </div>
                      <ul className="space-y-1.5">
                        {recent.map(m => (
                          <li key={m.id} className="flex items-center gap-2 text-xs">
                            <span
                              className={[
                                'inline-flex items-center gap-0.5 font-mono font-bold w-12 shrink-0',
                                m.delta > 0 ? 'text-success' : 'text-danger',
                              ].join(' ')}
                            >
                              {m.delta > 0 ? <ArrowUp className="w-3 h-3" aria-hidden="true" /> : <ArrowDown className="w-3 h-3" aria-hidden="true" />}
                              {m.delta > 0 ? '+' : ''}{m.delta}
                            </span>
                            <span className={['inline-flex px-1.5 py-0.5 rounded-md text-[10px] font-semibold', reasonBadgeClasses(m.reason)].join(' ')}>
                              {m.reason}
                            </span>
                            <span className="text-muted truncate flex-1" title={m.notes ?? ''}>
                              {m.notes || '—'}
                            </span>
                            <span className="text-muted text-[10px] shrink-0">{formatRelative(m.created_at)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {isAdmin && (
                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={() => setMovementFor(v)}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-colors"
                    aria-label={`Registrar movimiento para ${v.name}`}
                  >
                    <PackagePlus className="w-3.5 h-3.5" aria-hidden="true" />
                    Movimiento
                  </button>
                  <button
                    onClick={() => {
                      setEditing(v)
                      setShowForm(false)
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    type="button"
                    aria-label={`Editar ${v.name}`}
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
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
                )}
              </div>
            </div>
          )})}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <Syringe className="w-12 h-12 text-muted/30 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Sin vacunas</h3>
          <p className="text-sm text-muted">
            {filterTypeId
              ? `No hay vacunas para ${types.find(t => t.id === filterTypeId)?.name || 'este tipo'}`
              : 'Crea tu primera vacuna para iniciar el catálogo'}
          </p>
        </div>
      )
      })()}
    </div>
  )
}
