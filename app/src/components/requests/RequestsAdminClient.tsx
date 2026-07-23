'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Clock, XCircle, Eye, Search, Trash2,
  AlertTriangle, Loader2, CheckSquare, Square,
} from 'lucide-react'
import { REQUEST_TYPE_LABELS } from '@/lib/requests/validatePayload'
import { RequestDetailModal } from './RequestDetailModal'

interface Request {
  id: string
  teacher_id: string
  teacher_name: string | null
  request_type: string
  status: 'pending' | 'approved' | 'rejected'
  payload: Record<string, unknown>
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending')  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20"><Clock className="w-3 h-3" />Pendiente</span>
  if (status === 'approved') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" />Aprobada</span>
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20"><XCircle className="w-3 h-3" />Rechazada</span>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })
}

const TABS = ['pending', 'approved', 'rejected'] as const
const TAB_LABELS: Record<string, string> = { pending: 'Pendientes', approved: 'Aprobadas', rejected: 'Rechazadas' }

/** Inline per-row delete confirmation state. */
type InlineConfirm = { id: string; loading: boolean } | null

export function RequestsAdminClient({ requests, userRole }: { requests: Request[]; userRole: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [teacherSearch, setTeacherSearch] = useState('')

  // ── Selection (multi-select) ──────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDeleteConfirm, setBatchDeleteConfirm] = useState(false)
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false)
  const [batchDeleteError, setBatchDeleteError] = useState<string | null>(null)

  // ── Single-row inline delete confirmation ────────────────────────────
  const [inlineConfirm, setInlineConfirm] = useState<InlineConfirm>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const isDeletable = activeTab !== 'pending'

  const filtered = requests
    .filter(r => r.status === activeTab)
    .filter(r => teacherSearch === '' || r.teacher_name?.toLowerCase().includes(teacherSearch.toLowerCase()))

  const tabCount = (tab: string) => requests.filter(r => r.status === tab).length

  // Switch tabs → clear selection
  function handleTabChange(tab: 'pending' | 'approved' | 'rejected') {
    setActiveTab(tab)
    setSelectedIds(new Set())
    setInlineConfirm(null)
    setDeleteError(null)
    setBatchDeleteError(null)
    setBatchDeleteConfirm(false)
  }

  // ── Checkbox logic ────────────────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map(r => r.id)))
    }
  }

  const allSelected = filtered.length > 0 && selectedIds.size === filtered.length
  const someSelected = selectedIds.size > 0 && !allSelected

  // ── Single delete ─────────────────────────────────────────────────────
  const handleSingleDelete = useCallback(async (id: string) => {
    setInlineConfirm({ id, loading: true })
    setDeleteError(null)
    try {
      const res = await fetch(`/api/requests/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        setInlineConfirm({ id, loading: false })
        setDeleteError(json.error ?? 'Error al eliminar')
        return
      }
      setInlineConfirm(null)
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n })
      router.refresh()
    } catch {
      setInlineConfirm({ id, loading: false })
      setDeleteError('Error de red')
    }
  }, [router])

  // ── Batch delete ──────────────────────────────────────────────────────
  async function handleBatchDelete() {
    setBatchDeleteLoading(true)
    setBatchDeleteError(null)
    try {
      const ids = [...selectedIds]
      const res = await fetch('/api/requests', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const json = await res.json()
      if (!res.ok) {
        setBatchDeleteError(json.error ?? 'Error al eliminar')
        setBatchDeleteLoading(false)
        return
      }
      setSelectedIds(new Set())
      setBatchDeleteConfirm(false)
      setBatchDeleteLoading(false)
      router.refresh()
    } catch {
      setBatchDeleteError('Error de red')
      setBatchDeleteLoading(false)
    }
  }

  return (
    <>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar por docente..."
              value={teacherSearch}
              onChange={e => setTeacherSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={[
                'flex-1 px-4 py-3.5 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted hover:text-foreground',
              ].join(' ')}
            >
              {TAB_LABELS[tab]}
              {tabCount(tab) > 0 && (
                <span className={[
                  'ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold',
                  tab === 'pending' ? 'bg-amber-500/15 text-amber-600' : 'bg-muted/20 text-muted',
                ].join(' ')}>
                  {tabCount(tab)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Inline single-delete error */}
        {deleteError && (
          <div className="mx-4 mt-3 flex items-center gap-2 p-3 bg-red-500/8 border border-red-500/20 rounded-xl text-sm text-red-600">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {deleteError}
            <button onClick={() => setDeleteError(null)} className="ml-auto text-xs underline">Cerrar</button>
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted text-sm">
            {teacherSearch ? 'Sin solicitudes para ese docente' : `No hay solicitudes ${TAB_LABELS[activeTab].toLowerCase()}`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  {/* Select-all checkbox — only on deletable tabs */}
                  {isDeletable && (
                    <th className="pl-6 pr-2 py-3 text-left">
                      <button
                        onClick={toggleSelectAll}
                        className="text-muted hover:text-foreground transition-colors"
                        title={allSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}
                      >
                        {allSelected
                          ? <CheckSquare className="w-4 h-4 text-primary" />
                          : someSelected
                            ? <CheckSquare className="w-4 h-4 text-primary/50" />
                            : <Square className="w-4 h-4" />
                        }
                      </button>
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Docente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(r => {
                  const isChecked = selectedIds.has(r.id)
                  const isThisInlineConfirm = inlineConfirm?.id === r.id
                  const isThisLoading = isThisInlineConfirm && inlineConfirm.loading

                  return (
                    <tr
                      key={r.id}
                      className={[
                        'hover:bg-surface/50 transition-colors',
                        isChecked ? 'bg-primary/5' : '',
                      ].join(' ')}
                    >
                      {/* Checkbox */}
                      {isDeletable && (
                        <td className="pl-6 pr-2 py-4">
                          <button
                            onClick={() => toggleSelect(r.id)}
                            className="text-muted hover:text-primary transition-colors"
                          >
                            {isChecked
                              ? <CheckSquare className="w-4 h-4 text-primary" />
                              : <Square className="w-4 h-4" />
                            }
                          </button>
                        </td>
                      )}

                      <td className="px-6 py-4 whitespace-nowrap text-muted">{formatDate(r.created_at)}</td>
                      <td className="px-6 py-4 font-medium text-foreground">
                        {REQUEST_TYPE_LABELS[r.request_type] ?? r.request_type}
                      </td>
                      <td className="px-6 py-4 text-muted">{r.teacher_name ?? '—'}</td>
                      <td className="px-6 py-4"><StatusBadge status={r.status} /></td>

                      {/* Actions: view + delete (with inline confirm) */}
                      <td className="px-6 py-4 text-right">
                        {isThisInlineConfirm && !isThisLoading ? (
                          // Inline confirmation
                          <span className="inline-flex items-center gap-2 text-xs">
                            <span className="text-muted">¿Eliminar?</span>
                            <button
                              onClick={() => handleSingleDelete(r.id)}
                              className="px-2.5 py-1 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                            >
                              Confirmar
                            </button>
                            <button
                              onClick={() => { setInlineConfirm(null); setDeleteError(null) }}
                              className="px-2.5 py-1 bg-surface border border-border rounded-lg text-muted hover:text-foreground transition-colors"
                            >
                              Cancelar
                            </button>
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-2 justify-end">
                            <button
                              onClick={() => setSelectedRequest(r)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-medium hover:bg-primary/20 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ver
                            </button>
                            {isDeletable && (
                              isThisLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin text-muted" />
                              ) : (
                                <button
                                  onClick={() => { setInlineConfirm({ id: r.id, loading: false }); setDeleteError(null) }}
                                  title="Eliminar solicitud"
                                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-muted hover:text-red-600 hover:bg-red-500/10 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Floating multi-select action bar ── */}
      {isDeletable && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-background border border-border rounded-2xl shadow-2xl shadow-black/20 animate-in slide-in-from-bottom-4 duration-200">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            Deseleccionar
          </button>
          <div className="w-px h-5 bg-border" />
          {batchDeleteError && (
            <span className="text-xs text-red-600 max-w-[200px] truncate">{batchDeleteError}</span>
          )}
          {!batchDeleteConfirm ? (
            <button
              onClick={() => { setBatchDeleteConfirm(true); setBatchDeleteError(null) }}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-medium hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar seleccionadas
            </button>
          ) : (
            <>
              <span className="text-xs text-muted">
                ¿Eliminar {selectedIds.size} solicitud{selectedIds.size !== 1 ? 'es' : ''}? Esta acción es permanente.
              </span>
              <button
                onClick={handleBatchDelete}
                disabled={batchDeleteLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {batchDeleteLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Confirmar
              </button>
              <button
                onClick={() => { setBatchDeleteConfirm(false); setBatchDeleteError(null) }}
                disabled={batchDeleteLoading}
                className="px-3 py-1.5 bg-surface border border-border rounded-xl text-xs font-medium text-foreground hover:bg-surface/80 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
            </>
          )}
        </div>
      )}

      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          userRole={userRole}
          onClose={() => setSelectedRequest(null)}
          onActionDone={() => {
            setSelectedRequest(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
