'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  X, CheckCircle2, XCircle, Edit3, Save, AlertTriangle, Loader2,
} from 'lucide-react'
import { REQUEST_TYPE_LABELS } from '@/lib/requests/validatePayload'
import {
  FORM_COMPONENTS, ReadonlyPayload, clientSideValidate,
  type ResolverMaps,
} from '@/components/requests/RequestForms'

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

/** Fetch the id→name maps needed to resolve ids in the read-only view. */
function useResolverMaps(): ResolverMaps {
  const [maps, setMaps] = useState<ResolverMaps>({
    animalTypes: {}, animals: {}, vaccines: {},
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [typesRes, animalsRes, vaxRes] = await Promise.all([
        fetch('/api/animal-types').then(r => r.json()).catch(() => null),
        fetch('/api/animals').then(r => r.json()).catch(() => null),
        fetch('/api/vaccines').then(r => r.json()).catch(() => null),
      ])

      if (cancelled) return

      const typeArr = Array.isArray(typesRes) ? typesRes : (typesRes?.data ?? [])
      const animalArr = Array.isArray(animalsRes) ? animalsRes : (animalsRes?.data ?? [])
      const vaxArr = Array.isArray(vaxRes?.data) ? vaxRes.data : []

      const animalTypes: Record<string, string> = {}
      for (const t of typeArr as { id: string; name: string }[]) animalTypes[t.id] = t.name

      const animals: Record<string, string> = {}
      for (const a of animalArr as { id: string; name: string | null; identification_code: string | null }[]) {
        const label = a.name
          ? (a.identification_code ? `${a.name} (${a.identification_code})` : a.name)
          : (a.identification_code ?? a.id)
        animals[a.id] = label
      }

      const vaccines: Record<string, string> = {}
      for (const v of vaxArr as { id: string; name: string }[]) vaccines[v.id] = v.name

      setMaps({ animalTypes, animals, vaccines })
    }

    load()
    return () => { cancelled = true }
  }, [])

  return maps
}

/** Drop UI-only keys before sending to the API. _typeSlug is kept because the
 *  server uses it for aves-de-corral required-metadata validation. */
function stripInternal(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (k === '_codeStatus') continue
    out[k] = v
  }
  return out
}

export function RequestDetailModal({ request, userRole, onClose, onActionDone }: Props) {
  const isPending = request.status === 'pending'
  const resolvers = useResolverMaps()

  const [isEditing, setIsEditing]     = useState(false)
  const [editedPayload, setEditedPayload] = useState<Record<string, unknown>>(() => ({ ...request.payload }))
  const [rejectMode, setRejectMode]   = useState(false)
  const [adminNotes, setAdminNotes]   = useState(request.admin_notes ?? '')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [editError, setEditError]     = useState<string | null>(null)

  const FormComponent = useMemo(() => FORM_COMPONENTS[request.request_type] ?? null, [request.request_type])

  function startEditing() {
    setEditedPayload({ ...request.payload })
    setEditError(null)
    setIsEditing(true)
  }

  async function handleApprove(withEdit = false) {
    setLoading(true)
    setError(null)
    const body: Record<string, unknown> = {}

    if (withEdit) {
      // Client-side gating on the edited payload (required fields + code check).
      const clientErr = clientSideValidate(request.request_type, editedPayload)
      if (clientErr) {
        setEditError(clientErr)
        setLoading(false)
        return
      }
      body.payload = stripInternal(editedPayload)
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

  const hasEdits = isEditing

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

          {/* Payload: read-only or form-based edit */}
          {!isEditing ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Datos de la Solicitud</h3>
                {isPending && userRole === 'admin' && (
                  <button
                    onClick={startEditing}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                )}
              </div>
              <ReadonlyPayload
                requestType={request.request_type}
                payload={request.payload}
                resolvers={resolvers}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide">Editar Datos</h3>
                <button
                  onClick={() => { setIsEditing(false); setEditError(null) }}
                  className="text-xs text-muted hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
              {editError && (
                <div className="flex items-center gap-2 p-3 bg-red-500/8 border border-red-500/20 rounded-xl text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {editError}
                </div>
              )}
              {FormComponent ? (
                <FormComponent value={editedPayload} onChange={setEditedPayload} />
              ) : (
                <p className="text-sm text-muted">Este tipo de solicitud no tiene formulario de edición.</p>
              )}
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
                maxLength={2000}
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
                {hasEdits && (
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
