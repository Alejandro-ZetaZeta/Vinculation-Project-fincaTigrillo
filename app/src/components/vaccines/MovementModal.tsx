'use client'

import { useMemo, useState } from 'react'
import { Loader2, Save, X, ArrowUp, ArrowDown } from 'lucide-react'

export type ManualReason = 'Compra' | 'Pérdida' | 'Daño' | 'Vencimiento' | 'Ajuste de inventario'

export interface MovementRule {
  sign: 'positive' | 'negative' | 'either'
  notesRequired?: boolean
  helper: string
}

export const MOVEMENT_RULES: Record<ManualReason, MovementRule> = {
  'Compra':               { sign: 'positive', helper: 'Suma dosis al inventario. Usar al recibir compra o reposición.' },
  'Pérdida':              { sign: 'negative', helper: 'Resta dosis por extravío o consumo no registrado.' },
  'Daño':                 { sign: 'negative', helper: 'Resta dosis por frascos rotos o cadena de frío rota.' },
  'Vencimiento':          { sign: 'negative', helper: 'Resta dosis por caducidad de lotes.' },
  'Ajuste de inventario': { sign: 'either',   notesRequired: true, helper: 'Corrige el conteo físico. Notas obligatorias explicando el motivo.' },
}

const REASON_OPTIONS: ManualReason[] = [
  'Compra',
  'Pérdida',
  'Daño',
  'Vencimiento',
  'Ajuste de inventario',
]

export interface MovementModalProps {
  open: boolean
  vaccineId: string
  vaccineName: string
  currentStock: number
  onClose: () => void
  onSaved: (newStock: number) => void
}

export function MovementModal({
  open,
  vaccineId,
  vaccineName,
  currentStock,
  onClose,
  onSaved,
}: MovementModalProps) {
  const [reason, setReason] = useState<ManualReason>('Compra')
  const [deltaText, setDeltaText] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const rule = MOVEMENT_RULES[reason]
  const notesRequired = !!rule.notesRequired

  const delta = useMemo(() => {
    const n = parseInt(deltaText, 10)
    return Number.isFinite(n) ? n : null
  }, [deltaText])

  const signWarning = useMemo(() => {
    if (delta == null || delta === 0) return null
    if (rule.sign === 'positive' && delta <= 0) return 'Compra requiere un número positivo.'
    if (rule.sign === 'negative' && delta >= 0) return `${reason} requiere un número negativo.`
    return null
  }, [delta, rule, reason])

  const previewStock = delta != null && delta !== 0 ? currentStock + delta : null
  const previewInvalid = previewStock != null && previewStock < 0

  function reset() {
    setReason('Compra')
    setDeltaText('')
    setNotes('')
    setError('')
  }

  async function submit() {
    setError('')
    if (delta == null || delta === 0) {
      setError('Ingresa un número de dosis distinto de cero.')
      return
    }
    if (signWarning) { setError(signWarning); return }
    if (notesRequired && notes.trim().length === 0) {
      setError('Esta razón requiere notas que expliquen el ajuste.')
      return
    }
    if (previewInvalid) {
      setError(`Stock insuficiente. Stock actual: ${currentStock}, delta: ${delta}.`)
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/vaccines/${vaccineId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delta,
          reason,
          notes: notes.trim() || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json?.error || 'Error al registrar movimiento'); return }
      onSaved(json.stock_doses as number)
      reset()
      onClose()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Registrar movimiento de stock"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => { reset(); onClose() }}
        aria-hidden="true"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-base font-semibold text-foreground">Registrar movimiento</h3>
              <p className="text-xs text-muted mt-0.5">{vaccineName} · Stock actual: {currentStock}</p>
            </div>
            <button
              type="button"
              onClick={() => { reset(); onClose() }}
              className="p-2 rounded-xl hover:bg-surface-hover text-muted"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-4">
            {error && (
              <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm">{error}</div>
            )}

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Razón *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ManualReason)}
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {REASON_OPTIONS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <p className="text-xs text-muted">{rule.helper}</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Delta (dosis) *</label>
              <div className="relative">
                <input
                  type="number"
                  step={1}
                  value={deltaText}
                  onChange={(e) => setDeltaText(e.target.value)}
                  placeholder={rule.sign === 'positive' ? '+10' : rule.sign === 'negative' ? '-5' : '±5'}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                  {delta != null && delta > 0 && <ArrowUp className="w-4 h-4 text-success" aria-hidden="true" />}
                  {delta != null && delta < 0 && <ArrowDown className="w-4 h-4 text-danger" aria-hidden="true" />}
                </div>
              </div>
              {previewStock != null && !previewInvalid && (
                <p className="text-xs text-muted">
                  Stock resultante: <span className="font-semibold text-foreground">{previewStock}</span>
                </p>
              )}
              {previewInvalid && (
                <p className="text-xs text-danger">
                  Stock resultante sería negativo ({previewStock}). Ajusta el delta.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium">
                Notas {notesRequired ? '*' : <span className="text-muted font-normal">(opcional)</span>}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder={notesRequired ? 'Explica el motivo del ajuste…' : 'Información adicional…'}
                className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => { reset(); onClose() }}
              className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-surface-hover"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
              Registrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
