'use client'

import { useState } from 'react'
import {
  X, CheckCircle2, XCircle, Edit3, Save, AlertTriangle, Loader2
} from 'lucide-react'
import { REQUEST_TYPE_LABELS } from '@/lib/requests/validatePayload'

interface Request {
  id: string
  teacher_id: string
  teacher_name?: string | null
  request_type: string
  status: 'pending' | 'approved' | 'rejected'
  payload: Record<string, unknown>
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
}

interface Props {
  request: Request
  userRole: string
  onClose: () => void
  onActionDone: () => void
}

function PayloadField({ label, value }: { label: string; value: unknown }) {
  if (value == null || value === '') return null
  const display = Array.isArray(value)
    ? value.join(', ')
    : typeof value === 'object'
      ? JSON.stringify(value, null, 2)
      : String(value)
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
      <span className="text-sm text-foreground font-medium break-words">{display}</span>
    </div>
  )
}

const PAYLOAD_LABELS: Record<string, Record<string, string>> = {
  animal_record: {
    name: 'Nombre', breed: 'Raza', sex: 'Sexo', birth_date: 'Fecha nacimiento',
    identification_code: 'Código', color: 'Color', weight_kg: 'Peso (kg)',
    type_id: 'Tipo (ID)', status: 'Estado', acquisition_type: 'Tipo adquisición',
    acquisition_date: 'Fecha adquisición', notes: 'Notas',
    is_litter: 'Camada', litter_count: 'Cant. lechones',
  },
  reproductive_event: {
    animal_id: 'Animal (ID)', event_type: 'Tipo evento', event_date: 'Fecha',
    notes: 'Notas', species_slug: 'Especie', sire_id: 'Semental (ID)',
  },
  mortality_event: {
    animal_id: 'Animal (ID)', event_date: 'Fecha', quantity: 'Cantidad bajas', notes: 'Notas',
  },
  production_event: {
    animal_id: 'Animal (ID)', recorded_date: 'Fecha', liters_am: 'Litros AM',
    liters_pm: 'Litros PM', notes: 'Notas',
  },
  vaccine_profile: {
    name: 'Nombre', description: 'Descripción', target_type_id: 'Tipo animal (ID)',
    target_sex: 'Sexo objetivo', age_min_days: 'Edad mín. (días)',
    age_max_days: 'Edad máx. (días)', allowed_reproductive_states: 'Estados reproductivos',
    default_next_dose_days: 'Días siguiente dosis', total_doses: 'Dosis totales',
    is_active: 'Activa',
  },
  vaccine_assignment: {
    animal_ids: 'Animales (IDs)', vaccine_id: 'Vacuna (ID)', applied_at: 'Fecha aplicación',
    next_dose_at: 'Próxima dosis', notes: 'Notas', doses_count: 'Cant. dosis',
  },
}

export function RequestDetailModal({ request, userRole, onClose, onActionDone }: Props) {
  const [isEditing, setIsEditing]   = useState(false)
  const [editedPayload, setEditedPayload] = useState(() => JSON.stringify(request.payload, null, 2))
  const [payloadError, setPayloadError]   = useState<string | null>(null)
  const [rejectMode, setRejectMode] = useState(false)
  const [adminNotes, setAdminNotes] = useState(request.admin_notes ?? '')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const isPending = request.status === 'pending'
  const fieldLabels = PAYLOAD_LABELS[request.request_type] ?? {}

  function parseEditedPayload() {
    try {
      const parsed = JSON.parse(editedPayload)
      setPayloadError(null)
      return { ok: true as const, value: parsed as Record<string, unknown> }
    } catch {
      setPayloadError('JSON inválido')
      return { ok: false as const }
    }
  }

  async function handleApprove(withEdit = false) {
    setLoading(true)
    setError(null)
    let body: Record<string, unknown> = {}

    if (withEdit) {
      const parsed = parseEditedPayload()
      if (!parsed.ok) { setLoading(false); return }
      body.payload = parsed.value
    }

    try {
      const res = await fetch(`/api/requests/${request.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Error al aprobar'); setLoading(false); return }
      onActionDone()
    } catch {
      setError('Error de red')
      setLoading(false)
    }
  }

  async function handleReject() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected', admin_notes: adminNotes || null }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Error al rechazar'); setLoading(false); return }
      onActionDone()
    } catch {
      setError('Error de red')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-background border border-border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div>
            <h2 className="font-semibold text-foreground">
              {REQUEST_TYPE_LABELS[request.request_type] ?? request.request_type}
            </h2>
            {request.teacher_name && (
              <p className="text-xs text-muted mt-0.5">Por {request.teacher_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/8 border border-red-500/20 rounded-xl text-sm text-red-600">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Payload display or edit */}
          {!isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Datos de la Solicitud</h3>
                {isPending && userRole === 'admin' && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                )}
              </div>
              <div className="bg-surface border border-border rounded-xl p-4 grid grid-cols-1 gap-3">
                {Object.entries(request.payload).map(([key, value]) => (
                  <PayloadField key={key} label={fieldLabels[key] ?? key} value={value} />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Editar Payload (JSON)</h3>
                <button
                  onClick={() => { setIsEditing(false); setPayloadError(null) }}
                  className="text-xs text-muted hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
              <textarea
                value={editedPayload}
                onChange={e => { setEditedPayload(e.target.value); setPayloadError(null) }}
                rows={12}
                className="w-full font-mono text-xs bg-surface border border-border rounded-xl p-3 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {payloadError && <p className="text-xs text-red-500">{payloadError}</p>}
            </div>
          )}

          {/* Admin notes on rejected */}
          {request.status === 'rejected' && request.admin_notes && (
            <div className="p-4 bg-red-500/8 border border-red-500/20 rounded-xl">
              <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">Motivo de Rechazo</p>
              <p className="text-sm text-foreground">{request.admin_notes}</p>
            </div>
          )}

          {/* Reject form */}
          {rejectMode && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">
                Motivo del rechazo (opcional)
              </label>
              <textarea
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Explica el motivo del rechazo..."
                rows={3}
                className="w-full text-sm bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
        </div>

        {/* Footer actions (pending + admin only) */}
        {isPending && userRole === 'admin' && (
          <div className="px-6 py-4 border-t border-border shrink-0 flex flex-wrap gap-3">
            {!rejectMode ? (
              <>
                <button
                  onClick={() => handleApprove(false)}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Aprobar
                </button>
                {isEditing && (
                  <button
                    onClick={() => handleApprove(true)}
                    disabled={loading}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Aprobar con cambios
                  </button>
                )}
                <button
                  onClick={() => setRejectMode(true)}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-600 border border-red-500/20 rounded-xl text-sm font-medium hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Rechazar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleReject}
                  disabled={loading}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Confirmar Rechazo
                </button>
                <button
                  onClick={() => setRejectMode(false)}
                  disabled={loading}
                  className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium text-foreground hover:bg-surface/80 disabled:opacity-50 transition-colors"
                >
                  Cancelar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
