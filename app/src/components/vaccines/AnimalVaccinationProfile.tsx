'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Syringe, AlertTriangle, CheckCircle2, ShieldCheck, Trash2 } from 'lucide-react'
import { AssignVaccineModal } from './AssignVaccineModal'

interface VaccinationRow {
  id: string
  applied_at: string
  next_dose_at: string | null
  notes: string | null
  vaccine_catalog?: {
    id: string
    name: string
    target_type_id: string | null
    default_next_dose_days: number | null
    total_doses: number | null
  }
}

function daysUntil(dateISO: string): number {
  const today = new Date()
  const t0 = new Date(today.toISOString().slice(0, 10) + 'T00:00:00Z').getTime()
  const d0 = new Date(dateISO + 'T00:00:00Z').getTime()
  return Math.round((d0 - t0) / (1000 * 60 * 60 * 24))
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

export function AnimalVaccinationProfile(props: {
  animalId: string
  animalTypeId?: string | null
  animalTypeSlug?: string | null
  isAdmin: boolean
  defaultOpenAssign?: boolean
}) {
  const { animalId, animalTypeId, animalTypeSlug, isAdmin, defaultOpenAssign } = props
  const [rows, setRows] = useState<VaccinationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [assignOpen, setAssignOpen] = useState(!!defaultOpenAssign)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string>('')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/animals/${animalId}/vaccinations`)
      .then(r => r.json())
      .then(json => {
        const list = Array.isArray(json?.data) ? (json.data as VaccinationRow[]) : []
        setRows(list)
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [animalId, assignOpen])

  async function deleteRecord(id: string) {
    if (!isAdmin) return
    setActionError('')
    setDeletingId(id)
    try {
      const res = await fetch(`/api/vaccinations/${encodeURIComponent(id)}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionError(json?.error || 'No se pudo eliminar el registro')
        return
      }
      setRows(prev => prev.filter(r => r.id !== id))
      setConfirmDeleteId(null)
    } catch {
      setActionError('Error de conexión')
    } finally {
      setDeletingId(null)
    }
  }

  const enriched = useMemo(() => {
    // rows are ordered by applied_at ASC from the API
    // build ordered sequence of record ids per vaccine so we can compute dose number
    const doseSequence = new Map<string, string[]>()
    for (const r of rows) {
      const vid = r.vaccine_catalog?.id
      if (!vid) continue
      if (!doseSequence.has(vid)) doseSequence.set(vid, [])
      doseSequence.get(vid)!.push(r.id)
    }

    return rows.map(r => {
      const dueIn = r.next_dose_at ? daysUntil(r.next_dose_at) : null
      const isMultiDose = r.vaccine_catalog?.default_next_dose_days != null
      const status: 'single' | 'overdue' | 'soon' | 'ok' =
        dueIn == null ? 'single' : (dueIn < 0 ? 'overdue' : (dueIn <= 7 ? 'soon' : 'ok'))

      let doseNumber: number | null = null
      if (isMultiDose && r.vaccine_catalog?.id) {
        const seq = doseSequence.get(r.vaccine_catalog.id) ?? []
        const idx = seq.indexOf(r.id)
        if (idx !== -1) doseNumber = idx + 1
      }

      return { ...r, dueIn, status, isMultiDose, doseNumber }
    })
  }, [rows])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Syringe className="w-4 h-4 text-primary" aria-hidden="true" />
          Vacunación
        </h4>
        {isAdmin && (
          <button
            onClick={() => setAssignOpen(true)}
            className="text-xs font-medium text-primary hover:text-primary-dark flex items-center gap-1 bg-primary/5 px-2 py-1 rounded-lg transition-colors"
          >
            <CalendarClock className="w-3 h-3" aria-hidden="true" />
            Registrar vacuna
          </button>
        )}
      </div>

      <AssignVaccineModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        defaultAnimalIds={[animalId]}
        defaultTypeId={animalTypeId ?? null}
        animalTypeSlug={animalTypeSlug ?? null}
        isAdmin={isAdmin}
        title="Registrar Vacuna"
      />

      {actionError && (
        <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm">{actionError}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : enriched.length > 0 ? (
        <div className="space-y-2">
          {enriched.map((r) => {
            const cls =
              r.status === 'overdue'
                ? 'border-danger/30 bg-danger/5'
                : r.status === 'soon'
                  ? 'border-warning/30 bg-warning/5'
                  : r.status === 'single'
                    ? 'border-success/20 bg-success/5'
                    : 'border-border bg-background'

            const icon =
              r.status === 'overdue'
                ? <AlertTriangle className="w-4 h-4 text-danger" aria-hidden="true" />
                : r.status === 'single'
                  ? <ShieldCheck className="w-4 h-4 text-success" aria-hidden="true" />
                  : <CheckCircle2 className="w-4 h-4 text-success" aria-hidden="true" />

            return (
              <div key={r.id} className={`border rounded-2xl p-4 ${cls}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.vaccine_catalog?.name || 'Vacuna'}</p>
                    <p className="text-xs text-muted mt-0.5">
                      Aplicada: {formatDate(r.applied_at)}
                      {r.next_dose_at ? ` · Próxima: ${formatDate(r.next_dose_at)}` : ''}
                    </p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {icon}
                    {r.status === 'overdue' && (
                      <span className="text-[11px] font-semibold text-danger">Vencida</span>
                    )}
                    {r.status === 'soon' && (
                      <span className="text-[11px] font-semibold text-warning">Próxima</span>
                    )}
                    {r.status === 'ok' && r.next_dose_at && (
                      <span className="text-[11px] font-semibold text-success">Al día</span>
                    )}
                    {r.status === 'single' && (
                      <span className="text-[11px] font-semibold text-success">Dosis única</span>
                    )}
                    {r.isMultiDose && r.doseNumber != null && (
                      <span className="text-[11px] font-semibold text-primary/80 bg-primary/8 px-1.5 py-0.5 rounded-full">
                        {r.vaccine_catalog?.total_doses != null
                          ? `Dosis ${r.doseNumber} de ${r.vaccine_catalog.total_doses}`
                          : `Dosis ${r.doseNumber}`}
                      </span>
                    )}

                    {isAdmin && (
                      confirmDeleteId === r.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => deleteRecord(r.id)}
                            disabled={deletingId === r.id}
                            className="px-2 py-1 text-[11px] rounded-lg bg-danger text-white hover:bg-danger/80 disabled:opacity-50"
                          >
                            {deletingId === r.id ? '...' : 'Sí'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 text-[11px] rounded-lg border border-border hover:bg-surface-hover"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(r.id)}
                          className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10"
                          aria-label="Eliminar registro"
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )
                    )}
                  </div>
                </div>
                {r.notes && (
                  <p className="text-sm text-foreground/90 mt-2">{r.notes}</p>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-surface/50 border border-dashed border-border rounded-2xl p-8 text-center">
          <p className="text-xs text-muted">No hay historial de vacunación para este animal.</p>
        </div>
      )}
    </div>
  )
}
