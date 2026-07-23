'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowDown, ArrowUp, History, Package, Pencil, Pill, Syringe, AlertTriangle,
} from 'lucide-react'
import { MovementModal, type ManualReason } from './MovementModal'
import { VaccineFormModal } from './VaccineFormModal'
import { formatVaccineAgeText } from '@/lib/vaccines/format'
import {
  type Vaccine,
  type AnimalTypeOption,
  REPRO_STATE_OPTIONS,
} from './types'

export interface Movement {
  id: string
  vaccine_id: string
  delta: number
  reason: ManualReason | 'Aplicación'
  notes: string | null
  related_vaccination_id: string | null
  created_at: string
  created_by: string | null
  created_by_name?: string | null
}

export interface VaccinationWithAnimal {
  id: string
  vaccine_id: string
  animal_id: string
  applied_at: string
  next_dose_at: string | null
  notes: string | null
  created_at: string
  animals: {
    id: string
    name: string | null
    identification_code: string | null
  } | null
}

function stockBadgeClasses(stock: number, minStock: number | null | undefined): string {
  if (stock === 0) return 'bg-danger/10 text-danger'
  if (minStock != null && stock <= minStock) return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
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

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString('es', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
}

export interface VaccineDetailClientProps {
  vaccine: Vaccine
  types: AnimalTypeOption[]
  isAdmin: boolean
  initialMovements: Movement[]
  initialMovementsHasMore: boolean
  recentVaccinations: VaccinationWithAnimal[]
}

export function VaccineDetailClient({
  vaccine,
  types,
  isAdmin,
  initialMovements,
  initialMovementsHasMore: initialHasMore,
  recentVaccinations,
}: VaccineDetailClientProps) {
  const [current, setCurrent] = useState<Vaccine>(vaccine)
  const [editing, setEditing] = useState(false)
  const [movementOpen, setMovementOpen] = useState(false)
  const [movements, setMovements] = useState<Movement[]>(initialMovements)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const typeName = types.find(t => t.id === current.target_type_id)?.name || '—'
  const reproStates = Array.isArray(current.allowed_reproductive_states) ? current.allowed_reproductive_states : []
  const reproLabels = reproStates
    .map(s => REPRO_STATE_OPTIONS.find(o => o.value === s)?.label || s)

  async function loadMore() {
    if (!hasMore || movements.length === 0) return
    setLoadingMore(true)
    setError('')
    try {
      const lastIso = movements[movements.length - 1].created_at
      const res = await fetch(`/api/vaccines/${current.id}/movements?limit=51&before=${encodeURIComponent(lastIso)}`)
      const json = await res.json()
      if (!res.ok) { setError(json?.error || 'Error al cargar más'); return }
      const list = (json?.data || []) as Movement[]
      const slice = list.slice(0, 50)
      setHasMore(list.length > 50)
      setMovements(prev => [...prev, ...slice])
    } catch {
      setError('Error de conexión')
    } finally {
      setLoadingMore(false)
    }
  }

  function onMovementSaved(newStock: number) {
    setCurrent(prev => ({ ...prev, stock_doses: newStock }))
    // Re-fetch first page so the new Aplicación row appears at the top
    fetch(`/api/vaccines/${current.id}/movements?limit=50`)
      .then(r => r.json())
      .then(json => {
        if (Array.isArray(json?.data)) {
          const list = json.data as Movement[]
          setHasMore(list.length > 50)
          setMovements(list.slice(0, 50))
        }
      })
      .catch(() => { /* silent */ })
  }

  return (
    <div className="space-y-6">
      {editing && (
        <VaccineFormModal
          open={editing}
          vaccine={current}
          types={types}
          onClose={() => setEditing(false)}
          onSaved={(updated) => setCurrent(prev => ({ ...prev, ...updated }))}
        />
      )}

      {movementOpen && (
        <MovementModal
          open={movementOpen}
          vaccineId={current.id}
          vaccineName={current.name}
          currentStock={current.stock_doses}
          onClose={() => setMovementOpen(false)}
          onSaved={onMovementSaved}
        />
      )}

      {/* ── Header card ──────────────────────────────────────────────── */}
      <div className="bg-surface border border-border rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            {current.description && (
              <p className="text-sm text-muted">{current.description}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs px-2 py-1 rounded-full bg-muted/10 text-muted font-medium">
                Tipo: {typeName}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                Sexo: {current.target_sex === 'any' ? 'cualquiera' : current.target_sex}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">
                {formatVaccineAgeText(current.age_min_days, current.age_max_days)}
              </span>
              {current.default_next_dose_days != null && (
                <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success font-medium">
                  Próxima dosis: +{current.default_next_dose_days} días
                </span>
              )}
              {current.default_next_dose_days != null && (
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                  {current.total_doses != null ? `Serie: ${current.total_doses} dosis` : 'Dosis recurrente'}
                </span>
              )}
              {reproLabels.length > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">
                  Estados: {reproLabels.join(', ')}
                </span>
              )}
              {!current.is_active && (
                <span className="text-xs px-2 py-1 rounded-full bg-muted/10 text-muted font-semibold">Inactiva</span>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className={[
              'inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-xl font-bold',
              stockBadgeClasses(current.stock_doses, current.min_stock),
            ].join(' ')}>
              <Package className="w-4 h-4" aria-hidden="true" />
              Stock: {current.stock_doses}
              {current.min_stock != null && (
                <span className="font-normal text-xs opacity-80">/ mín. {current.min_stock}</span>
              )}
            </div>
            {current.min_stock != null && current.stock_doses <= current.min_stock && current.stock_doses > 0 && (
              <div className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                Por debajo del mínimo
              </div>
            )}
            {current.stock_doses === 0 && (
              <div className="inline-flex items-center gap-1 text-xs text-danger font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                Sin stock
              </div>
            )}

            {isAdmin && (
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setMovementOpen(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-success/10 text-success hover:bg-success/20 transition-colors"
                >
                  <Pill className="w-3.5 h-3.5" aria-hidden="true" />
                  Registrar movimiento
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                  Editar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Movements table (admin only) ─────────────────────────────── */}
      {isAdmin ? (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <History className="w-4 h-4 text-primary" aria-hidden="true" />
              Historial de movimientos
            </h2>
            <span className="text-xs text-muted">{movements.length} registro{movements.length !== 1 ? 's' : ''}</span>
          </div>

          {error && (
            <div className="p-3 m-5 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm">{error}</div>
          )}

          {movements.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-12 h-12 text-muted/30 mx-auto mb-3" aria-hidden="true" />
              <h3 className="text-base font-semibold text-foreground mb-1">Sin movimientos</h3>
              <p className="text-sm text-muted">No se han registrado movimientos para esta vacuna.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-background border-b border-border">
                  <tr className="text-left text-[11px] font-semibold text-muted uppercase tracking-wider">
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Delta</th>
                    <th className="px-4 py-3">Razón</th>
                    <th className="px-4 py-3">Notas</th>
                    <th className="px-4 py-3">Autor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {movements.map(m => (
                    <tr key={m.id} className="hover:bg-surface-hover/40">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted">
                        {formatDateTime(m.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={[
                          'inline-flex items-center gap-1 font-mono font-bold',
                          m.delta > 0 ? 'text-success' : 'text-danger',
                        ].join(' ')}>
                          {m.delta > 0
                            ? <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                            : <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />}
                          {m.delta > 0 ? '+' : ''}{m.delta}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={['inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold', reasonBadgeClasses(m.reason)].join(' ')}>
                          {m.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {m.notes
                          ? <span className="text-foreground">{m.notes}</span>
                          : <span className="text-muted">—</span>}
                        {m.related_vaccination_id && (
                          <span className="ml-2 text-[10px] text-muted">
                            (asignación)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                        {m.created_by_name || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {hasMore && (
            <div className="px-5 py-3 border-t border-border flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
              >
                {loadingMore ? 'Cargando…' : 'Cargar más movimientos'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-5 text-sm text-muted">
          El historial de movimientos solo está disponible para administradores.
        </div>
      )}

      {/* ── Recent vaccinations (admin only) ─────────────────────────── */}
      {isAdmin && (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Syringe className="w-4 h-4 text-primary" aria-hidden="true" />
              Vacunaciones recientes
            </h2>
            <span className="text-xs text-muted">{recentVaccinations.length} registro{recentVaccinations.length !== 1 ? 's' : ''}</span>
          </div>

          {recentVaccinations.length === 0 ? (
            <div className="p-12 text-center">
              <Syringe className="w-12 h-12 text-muted/30 mx-auto mb-3" aria-hidden="true" />
              <h3 className="text-base font-semibold text-foreground mb-1">Sin aplicaciones</h3>
              <p className="text-sm text-muted">Esta vacuna aún no se ha aplicado a ningún animal.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {recentVaccinations.map(v => (
                <li key={v.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground truncate">
                      {v.animals?.name || v.animals?.identification_code || 'Animal'}
                      {v.animals?.identification_code && v.animals?.name && (
                        <span className="text-muted font-normal"> · {v.animals.identification_code}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted mt-0.5">
                      Aplicada: {formatDate(v.applied_at)}
                      {v.next_dose_at && (
                        <> · Próxima: {formatDate(v.next_dose_at)}</>
                      )}
                    </div>
                    {v.notes && (
                      <div className="text-xs text-muted mt-0.5 truncate" title={v.notes}>“{v.notes}”</div>
                    )}
                  </div>
                  {v.animals && (
                    <Link
                      href={`/dashboard/animals/list?focus=${v.animals.id}`}
                      className="text-xs font-semibold text-primary hover:underline shrink-0"
                    >
                      Ver animal →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
