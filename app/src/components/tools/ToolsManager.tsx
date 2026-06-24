'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import {
  Wrench, Plus, Save, X, Loader2, Trash2, Pencil,
  PackagePlus, PackageMinus, Package, ChevronDown, ChevronUp,
  AlertTriangle, History, Power,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

const TOOL_CATEGORIES = [
  'Maquinaria',
  'Herramienta manual',
  'Veterinaria',
  'Riego',
  'Eléctrico',
  'Transporte',
  'Seguridad',
  'Otro',
] as const

type ToolCategory = typeof TOOL_CATEGORIES[number]

const ADJUST_REASONS = [
  'Compra',
  'Devolución',
  'Pérdida',
  'Daño',
  'Mantenimiento',
  'Ajuste de inventario',
] as const

type AdjustReason = typeof ADJUST_REASONS[number]

// ── Per-reason rules (mirrors server) ──────────────────────────────────────
// sign: 'positive' | 'negative' | 'either'
// notesRequired: notes field becomes mandatory
// requiresExpectedReturnDate: extra date input appears
const REASON_RULES: Record<AdjustReason, {
  sign: 'positive' | 'negative' | 'either'
  notesRequired?: boolean
  requiresExpectedReturnDate?: boolean
}> = {
  'Compra':               { sign: 'positive' },
  'Devolución':           { sign: 'negative' },
  'Pérdida':              { sign: 'negative' },
  'Daño':                 { sign: 'negative' },
  'Mantenimiento':        { sign: 'negative', requiresExpectedReturnDate: true },
  'Ajuste de inventario': { sign: 'either',   notesRequired: true },
}

interface FarmTool {
  id: string
  name: string
  description: string | null
  category: ToolCategory
  unit: string
  stock: number
  min_stock: number | null
  is_active: boolean
  created_at: string
}

interface ToolMovement {
  id: string
  delta: number
  reason: string
  notes: string | null
  expected_return_date: string | null
  created_at: string
}

// ── Category color mapping ────────────────────────────────────────────────────
const CAT_COLORS: Record<ToolCategory, { pill: string; dot: string }> = {
  'Maquinaria':        { pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',  dot: 'bg-amber-500' },
  'Herramienta manual':{ pill: 'bg-orange-500/10 text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
  'Veterinaria':       { pill: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',     dot: 'bg-blue-500' },
  'Riego':             { pill: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',     dot: 'bg-cyan-500' },
  'Eléctrico':         { pill: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
  'Transporte':        { pill: 'bg-violet-500/10 text-violet-700 dark:text-violet-400', dot: 'bg-violet-500' },
  'Seguridad':         { pill: 'bg-red-500/10 text-red-700 dark:text-red-400',        dot: 'bg-red-500' },
  'Otro':              { pill: 'bg-muted/10 text-muted',                               dot: 'bg-muted' },
}

// ── Category icon mapping ─────────────────────────────────────────────────────
const CAT_ICONS: Record<ToolCategory, string> = {
  'Maquinaria':         '/Maq.svg',
  'Herramienta manual': '/Her.svg',
  'Veterinaria':        '/Vet.svg',
  'Riego':              '/Rie.svg',
  'Eléctrico':          '/Ele.svg',
  'Transporte':         '/Tra.svg',
  'Seguridad':          '/Seg.svg',
  'Otro':               '/Otr.svg',
}

// ── Stock badge helper ────────────────────────────────────────────────────────
function stockBadgeClass(stock: number, minStock: number | null): string {
  if (stock === 0)                             return 'bg-danger/10 text-danger'
  if (minStock != null && stock <= minStock)   return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
  return 'bg-success/10 text-success'
}

// ── Blank form state ──────────────────────────────────────────────────────────
const BLANK_FORM = {
  name: '', description: '', category: 'Otro' as ToolCategory,
  unit: 'unidad', min_stock: '', is_active: true,
}

// ════════════════════════════════════════════════════════════════════════════
export function ToolsManager() {
  const [tools, setTools]           = useState<FarmTool[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  // Create / edit form
  const [showForm, setShowForm]       = useState(false)
  const [editing, setEditing]         = useState<FarmTool | null>(null)
  const [form, setForm]               = useState(BLANK_FORM)
  const [saving, setSaving]           = useState(false)

  // Delete / reactivate
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [reactivating, setReactivating]   = useState<string | null>(null)

  // Category filter
  const [filterCat, setFilterCat] = useState<ToolCategory | ''>('')

  // Movements log — expanded per tool card
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [movements, setMovements]     = useState<Record<string, ToolMovement[]>>({})
  const [loadingLog, setLoadingLog]   = useState<string | null>(null)

  // Stock adjust — inline per card
  const [stockOpen, setStockOpen]     = useState<string | null>(null)
  const [stockDelta, setStockDelta]   = useState('')
  const [stockReason, setStockReason] = useState<AdjustReason>('Compra')
  const [stockNotes, setStockNotes]   = useState('')
  const [stockReturnDate, setStockReturnDate] = useState('')
  const [stockSaving, setStockSaving] = useState(false)

  // Per-tool "log has been fetched at least once" flag — used to distinguish
  // "loading" from "empty result" in the movement log panel.
  const [logLoaded, setLogLoaded]     = useState<Record<string, boolean>>({})

  // ── Data fetching ──────────────────────────────────────────────────────────
  const fetchTools = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/tools?active_only=0')
      const json = await res.json()
      setTools(Array.isArray(json?.data) ? json.data : [])
    } catch {
      setError('Error al cargar herramientas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTools() }, [fetchTools])

  // ── Fetch movement log for a tool ─────────────────────────────────────────
  async function fetchMovements(toolId: string) {
    if (movements[toolId]) return  // already loaded
    setLoadingLog(toolId)
    try {
      const res  = await fetch(`/api/tools/${toolId}`)
      const json = await res.json()
      setMovements(prev => ({ ...prev, [toolId]: json.movements || [] }))
      setLogLoaded(prev => ({ ...prev, [toolId]: true }))
    } finally {
      setLoadingLog(null)
    }
  }

  // ── Enforce sign of stockDelta when reason changes ─────────────────────
  // Keeps |value| and re-applies the sign mandated by the selected reason.
  // User can still type freely, but switching reason snaps the sign in place.
  function handleReasonChange(next: AdjustReason) {
    setStockReason(next)
    const rule = REASON_RULES[next]
    const parsed = parseInt(stockDelta, 10)
    if (!Number.isFinite(parsed) || parsed === 0) return
    const abs = Math.abs(parsed)
    if (rule.sign === 'positive' && parsed < 0) setStockDelta(String(abs))
    if (rule.sign === 'negative' && parsed > 0) setStockDelta(String(-abs))
  }

  function resetStockForm() {
    setStockOpen(null)
    setStockDelta('')
    setStockReason('Compra')
    setStockNotes('')
    setStockReturnDate('')
  }

  function toggleLog(toolId: string) {
    if (expandedLog === toolId) {
      setExpandedLog(null)
    } else {
      setExpandedLog(toolId)
      fetchMovements(toolId)
    }
  }

  // ── Create tool ────────────────────────────────────────────────────────────
  async function createTool(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        form.name.trim(),
          description: form.description || null,
          category:    form.category,
          unit:        form.unit || 'unidad',
          min_stock:   form.min_stock !== '' ? parseInt(form.min_stock, 10) : null,
          is_active:   form.is_active,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json?.error || 'Error al crear'); return }
      setShowForm(false)
      setForm(BLANK_FORM)
      await fetchTools()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // ── Update tool ────────────────────────────────────────────────────────────
  async function updateTool(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setError('')
    if (!editing.name.trim()) { setError('El nombre es obligatorio'); return }
    setSaving(true)
    try {
      const res = await fetch(`/api/tools/${editing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:        editing.name.trim(),
          description: editing.description || null,
          category:    editing.category,
          unit:        editing.unit || 'unidad',
          min_stock:   editing.min_stock,
          is_active:   editing.is_active,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json?.error || 'Error al actualizar'); return }
      setEditing(null)
      await fetchTools()
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete / deactivate tool ───────────────────────────────────────────────
  // force=false → soft-delete (sets is_active=false, keeps history)
  // force=true  → hard-delete (cascades movements, irreversible)
  async function deleteTool(id: string, force: boolean) {
    setDeleting(true)
    try {
      const url = force ? `/api/tools/${id}?force=true` : `/api/tools/${id}`
      const res = await fetch(url, { method: 'DELETE' })
      if (res.ok) {
        const json = await res.json()
        if (json.deleted) {
          // Hard delete: tool + its history are gone
          setTools(prev => prev.filter(t => t.id !== id))
        } else {
          // Soft delete (or no-op if already inactive)
          setTools(prev => prev.map(t => t.id === id ? { ...t, is_active: false } : t))
        }
        setConfirmDelete(null)
      }
    } finally {
      setDeleting(false)
    }
  }

  // ── Reactivate tool ────────────────────────────────────────────────────────
  async function reactivateTool(id: string) {
    setReactivating(id)
    try {
      const res = await fetch(`/api/tools/${id}`, { method: 'POST' })
      if (res.ok) {
        setTools(prev => prev.map(t => t.id === id ? { ...t, is_active: true } : t))
      }
    } finally {
      setReactivating(null)
    }
  }

  // ── Adjust stock ───────────────────────────────────────────────────────────
  async function adjustStock(toolId: string) {
    const delta = parseInt(stockDelta, 10)
    if (!Number.isFinite(delta) || delta === 0) {
      setError('Ingresa un número válido distinto de cero')
      return
    }
    const rule = REASON_RULES[stockReason]
    // Sign pre-check (server is still source of truth)
    if (rule.sign === 'positive' && delta <= 0) {
      setError(`La razón "${stockReason}" requiere una cantidad positiva.`)
      return
    }
    if (rule.sign === 'negative' && delta >= 0) {
      setError(`La razón "${stockReason}" requiere una cantidad negativa.`)
      return
    }
    const trimmedNotes = stockNotes.trim()
    if (rule.notesRequired && trimmedNotes.length === 0) {
      setError(`La razón "${stockReason}" requiere notas que expliquen el ajuste.`)
      return
    }
    if (rule.requiresExpectedReturnDate && stockReturnDate.length === 0) {
      setError('Mantenimiento requiere una fecha de regreso esperada.')
      return
    }
    setError('')
    setStockSaving(true)
    try {
      const body: Record<string, unknown> = {
        delta,
        reason:   stockReason,
        notes:    trimmedNotes.length > 0 ? trimmedNotes : null,
      }
      if (rule.requiresExpectedReturnDate) {
        body.expected_return_date = stockReturnDate
      }
      const res = await fetch(`/api/tools/${toolId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(json?.error || 'Error al ajustar stock'); return }
      // Update local stock immediately
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, stock: json.stock } : t))
      // Prepend to movement log if it's open
      if (expandedLog === toolId && json.movement) {
        setMovements(prev => ({
          ...prev,
          [toolId]: [json.movement, ...(prev[toolId] || [])],
        }))
      }
      // Invalidate cached log so it re-fetches fresh on next open
      setMovements(prev => { const n = { ...prev }; delete n[toolId]; return n })
      setLogLoaded(prev => { const n = { ...prev }; n[toolId] = false; return n })
      resetStockForm()
    } catch {
      setError('Error de conexión')
    } finally {
      setStockSaving(false)
    }
  }

  // ── Derived list ───────────────────────────────────────────────────────────
  const visible = filterCat ? tools.filter(t => t.category === filterCat) : tools
  const usedCategories = [...new Set(tools.map(t => t.category))] as ToolCategory[]

  // ── Form field helper ──────────────────────────────────────────────────────
  const fieldCls = 'w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30'

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6" id="tools-manager">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" aria-hidden="true" />
            Inventario de Herramientas
          </h2>
          <p className="text-sm text-muted">
            {tools.length} ítem{tools.length !== 1 ? 's' : ''} registrado{tools.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setEditing(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
          type="button"
          id="tools-add-btn"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Nueva herramienta
        </button>
      </div>

      {/* ── Global error ────────────────────────────────────────────────── */}
      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {/* ── Create form ─────────────────────────────────────────────────── */}
      {showForm && (
        <form
          onSubmit={createTool}
          className="bg-surface border border-border rounded-2xl p-5 space-y-4"
          id="tool-create-form"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Nueva herramienta</h3>
            <button type="button" onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-surface-hover text-muted" aria-label="Cerrar formulario">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" htmlFor="tool-name">Nombre *</label>
              <input id="tool-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={fieldCls} placeholder="Ej: Machete" required />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" htmlFor="tool-category">Categoría *</label>
              <select id="tool-category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ToolCategory }))} className={fieldCls}>
                {TOOL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium" htmlFor="tool-description">Descripción</label>
            <input id="tool-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={fieldCls} placeholder="(opcional)" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" htmlFor="tool-unit">Unidad</label>
              <input id="tool-unit" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className={fieldCls} placeholder="unidad, kg, litro…" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium" htmlFor="tool-min-stock">Stock mínimo (alerta)</label>
              <input id="tool-min-stock" type="number" min={0} value={form.min_stock} onChange={e => setForm(f => ({ ...f, min_stock: e.target.value }))} className={fieldCls} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Activa</label>
              <label className="flex items-center gap-2 text-sm text-foreground px-3 py-2.5 rounded-xl bg-background border border-border cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="accent-[color:var(--color-primary)]" />
                Visible en inventario
              </label>
            </div>
          </div>

          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2 text-sm transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
            Guardar herramienta
          </button>
        </form>
      )}

      {/* ── Edit modal ───────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Editar herramienta">
          {/* Blurred backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setEditing(null)}
            aria-hidden="true"
          />

          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-xl flex flex-col max-h-[90vh]">

              {/* Header */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <Pencil className="w-5 h-5 text-primary" aria-hidden="true" />
                  <h3 className="text-base font-semibold text-foreground">Editar: {editing.name}</h3>
                </div>
                <button type="button" onClick={() => setEditing(null)} className="p-2 rounded-xl hover:bg-surface-hover text-muted" aria-label="Cerrar formulario">
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* Scrollable body + form */}
              <form onSubmit={updateTool} id="tool-edit-form" className="flex flex-col flex-1 min-h-0">
                <div className="overflow-y-auto flex-1 p-5 space-y-4">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium">Nombre *</label>
                      <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className={fieldCls} required autoFocus />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium">Categoría *</label>
                      <select value={editing.category} onChange={e => setEditing({ ...editing, category: e.target.value as ToolCategory })} className={fieldCls}>
                        {TOOL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium">Descripción</label>
                    <input value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} className={fieldCls} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium">Unidad</label>
                      <input value={editing.unit} onChange={e => setEditing({ ...editing, unit: e.target.value })} className={fieldCls} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium">Stock mínimo</label>
                      <input type="number" min={0} value={editing.min_stock ?? ''} onChange={e => setEditing({ ...editing, min_stock: e.target.value === '' ? null : parseInt(e.target.value, 10) })} className={fieldCls} placeholder="Opcional" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium">Activa</label>
                      <label className="flex items-center gap-2 text-sm text-foreground px-3 py-2.5 rounded-xl bg-background border border-border cursor-pointer">
                        <input type="checkbox" checked={editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} className="accent-[color:var(--color-primary)]" />
                        Visible en inventario
                      </label>
                    </div>
                  </div>
                </div>

                {/* Sticky footer */}
                <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
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
      )}


      {/* ── Category filter pills ────────────────────────────────────────── */}
      {!loading && usedCategories.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted uppercase tracking-widest">Filtrar por categoría</p>
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar snap-x snap-mandatory">
              <button
                type="button"
                onClick={() => setFilterCat('')}
                className={[
                  'shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  !filterCat
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-surface border-border text-muted hover:text-foreground hover:border-primary/40',
                ].join(' ')}
              >
                Todas
                <span className={['ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold', !filterCat ? 'bg-white/20 text-white' : 'bg-muted/10 text-muted'].join(' ')}>
                  {tools.length}
                </span>
              </button>
              {usedCategories.map(cat => {
                const count  = tools.filter(t => t.category === cat).length
                const active = filterCat === cat
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterCat(active ? '' : cat)}
                    className={[
                      'shrink-0 snap-start px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                      active
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface border-border text-muted hover:text-foreground hover:border-primary/40',
                    ].join(' ')}
                  >
                    {cat}
                    <span className={['ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold', active ? 'bg-white/20 text-white' : 'bg-muted/10 text-muted'].join(' ')}>
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

      {/* ── Tool cards ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      ) : visible.length > 0 ? (
        <div className="space-y-3">
          {visible.map(tool => {
            const catColors   = CAT_COLORS[tool.category] || CAT_COLORS['Otro']
            const stockBadge  = stockBadgeClass(tool.stock, tool.min_stock)
            const isLogOpen   = expandedLog === tool.id
            const isStockOpen = stockOpen   === tool.id

            return (
              <div
                key={tool.id}
                className={[
                  'bg-surface border rounded-2xl overflow-hidden transition-all duration-200',
                  !tool.is_active ? 'opacity-60 border-border' : 'border-border hover:border-primary/25',
                ].join(' ')}
              >
                {/* ── Card main row ──────────────────────────────────── */}
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3 md:gap-4">
                    {/* Category icon — no background, large responsive size */}
                    <Image
                      src={CAT_ICONS[tool.category] || '/Otr.svg'}
                      alt={tool.category}
                      title={tool.category}
                      width={64}
                      height={64}
                      className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 object-contain invert-0 [html[data-theme='dark']_&]:invert"
                      aria-hidden="true"
                    />

                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-foreground">{tool.name}</h3>
                        {!tool.is_active && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted/10 text-muted">Inactiva</span>
                        )}
                      </div>
                      {tool.description && <p className="text-sm text-muted mt-0.5 line-clamp-2">{tool.description}</p>}

                      {/* Badges row */}
                      <div className="flex flex-wrap gap-2 mt-3">
                        {/* Category pill — color dot only, no icon */}
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${catColors.pill}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${catColors.dot}`} aria-hidden="true" />
                          {tool.category}
                        </span>
                        {/* Unit */}
                        <span className="text-xs px-2.5 py-1 rounded-full bg-muted/10 text-muted font-medium">
                          {tool.unit}
                        </span>
                        {/* Stock */}
                        <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold ${stockBadge}`} title="Unidades en inventario">
                          <Package className="w-3 h-3" aria-hidden="true" />
                          {tool.stock} {tool.unit}
                        </span>
                        {/* Low-stock warning */}
                        {tool.min_stock != null && tool.stock > 0 && tool.stock <= tool.min_stock && (
                          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 font-semibold">
                            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                            Stock bajo (mín. {tool.min_stock})
                          </span>
                        )}
                      </div>

                      {/* ── Inline stock adjustment form ─────────────── */}
                      {isStockOpen && (
                        <div className="mt-4 p-4 bg-background border border-border rounded-xl space-y-3" role="group" aria-label={`Ajustar stock de ${tool.name}`}>
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Ajustar stock</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* Delta */}
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted" htmlFor={`delta-${tool.id}`}>
                                Cantidad <span className="text-muted">(+ añadir / − quitar)</span>
                              </label>
                              <input
                                id={`delta-${tool.id}`}
                                type="number"
                                value={stockDelta}
                                onChange={e => setStockDelta(e.target.value)}
                                placeholder="Ej: 5 ó -2"
                                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') adjustStock(tool.id) }}
                                aria-label={`Cantidad a ajustar para ${tool.name}`}
                              />
                            </div>
                            {/* Reason */}
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted" htmlFor={`reason-${tool.id}`}>Razón *</label>
                              <select
                                id={`reason-${tool.id}`}
                                value={stockReason}
                                onChange={e => handleReasonChange(e.target.value as AdjustReason)}
                                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              >
                                {ADJUST_REASONS.map(r => {
                                  const r0 = REASON_RULES[r]
                                  const signLabel = r0.sign === 'positive' ? ' (+)' : r0.sign === 'negative' ? ' (−)' : ''
                                  return <option key={r} value={r}>{r}{signLabel}</option>
                                })}
                              </select>
                            </div>
                            {/* Notes */}
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted" htmlFor={`notes-${tool.id}`}>
                                Notas {REASON_RULES[stockReason].notesRequired && <span className="text-danger">*</span>}
                              </label>
                              <input
                                id={`notes-${tool.id}`}
                                type="text"
                                value={stockNotes}
                                onChange={e => setStockNotes(e.target.value)}
                                placeholder={REASON_RULES[stockReason].notesRequired ? 'Obligatorio: explica el motivo' : '(opcional)'}
                                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                          </div>
                          {/* Maintenance-only: expected return date */}
                          {REASON_RULES[stockReason].requiresExpectedReturnDate && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <div className="space-y-1 sm:col-span-1">
                                <label className="text-xs font-medium text-muted" htmlFor={`return-${tool.id}`}>
                                  Fecha de regreso esperada <span className="text-danger">*</span>
                                </label>
                                <input
                                  id={`return-${tool.id}`}
                                  type="date"
                                  value={stockReturnDate}
                                  min={new Date().toISOString().slice(0, 10)}
                                  onChange={e => setStockReturnDate(e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                                <p className="text-[10px] text-muted">Temporal — la herramienta vuelve al inventario.</p>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => adjustStock(tool.id)}
                              disabled={stockSaving}
                              className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-1.5 transition-colors"
                            >
                              {stockSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Save className="w-3.5 h-3.5" aria-hidden="true" />}
                              Confirmar ajuste
                            </button>
                            <button
                              type="button"
                              onClick={resetStockForm}
                              className="px-3 py-2 rounded-xl border border-border hover:bg-surface-hover text-muted text-xs"
                              aria-label="Cancelar ajuste"
                            >
                              <X className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: action buttons */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {/* Stock adjust toggle */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isStockOpen) {
                            resetStockForm()
                          } else {
                            setStockOpen(tool.id); setEditing(null)
                          }
                        }}
                        className={[
                          'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-colors',
                          isStockOpen
                            ? 'bg-primary/20 text-primary'
                            : 'bg-primary/10 text-primary hover:bg-primary/20',
                        ].join(' ')}
                        aria-label={`Ajustar stock de ${tool.name}`}
                        aria-expanded={isStockOpen}
                      >
                        {parseInt(stockDelta, 10) < 0
                          ? <PackageMinus className="w-3.5 h-3.5" aria-hidden="true" />
                          : <PackagePlus  className="w-3.5 h-3.5" aria-hidden="true" />}
                        Stock
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(tool)
                          setShowForm(false)
                          setStockOpen(null)
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                        aria-label={`Editar ${tool.name}`}
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                        Editar
                      </button>

                      {/* Reactivate (inactive tools only) — one-click restore */}
                      {!tool.is_active && (
                        <button
                          type="button"
                          onClick={() => reactivateTool(tool.id)}
                          disabled={reactivating === tool.id}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl bg-success/10 text-success hover:bg-success/20 disabled:opacity-50 transition-colors"
                          aria-label={`Reactivar ${tool.name}`}
                        >
                          {reactivating === tool.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            : <Power className="w-3.5 h-3.5" aria-hidden="true" />}
                          Activar
                        </button>
                      )}

                      {/* Delete — soft (desactivar) OR hard (eliminar historial) */}
                      {confirmDelete === tool.id ? (
                        <div className="flex flex-col gap-1 items-end">
                          {tool.is_active && (
                            <button
                              onClick={() => deleteTool(tool.id, false)}
                              disabled={deleting}
                              className="px-2 py-1 text-xs rounded-lg bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30 disabled:opacity-50"
                            >
                              {deleting ? '…' : 'Desactivar'}
                            </button>
                          )}
                          <button
                            onClick={() => deleteTool(tool.id, true)}
                            disabled={deleting}
                            className="px-2 py-1 text-xs rounded-lg bg-danger text-white hover:opacity-80 disabled:opacity-50"
                            title="Elimina la herramienta y todo su historial de movimientos"
                          >
                            {deleting ? '…' : 'Eliminar todo'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 text-xs rounded-lg border border-border hover:bg-surface-hover"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(tool.id)}
                          className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                          aria-label={`Desactivar o eliminar ${tool.name}`}
                          title={tool.is_active ? 'Desactivar o eliminar' : 'Eliminar'}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── Movement log toggle footer ─────────────────────── */}
                <button
                  type="button"
                  onClick={() => toggleLog(tool.id)}
                  className="w-full flex items-center justify-between px-5 py-2.5 border-t border-border/60 text-xs text-muted hover:bg-surface-hover transition-colors"
                  aria-expanded={isLogOpen}
                  aria-controls={`log-${tool.id}`}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    <History className="w-3.5 h-3.5" aria-hidden="true" />
                    Historial de movimientos
                  </span>
                  {loadingLog === tool.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    : isLogOpen
                      ? <ChevronUp   className="w-3.5 h-3.5" aria-hidden="true" />
                      : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                  }
                </button>

                {/* ── Movement log panel ────────────────────────────── */}
                {isLogOpen && (
                  <div id={`log-${tool.id}`} className="border-t border-border/60 bg-background px-5 py-4">
                    {loadingLog === tool.id || !logLoaded[tool.id] ? (
                      <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                        Cargando movimientos…
                      </div>
                    ) : (movements[tool.id] || []).length === 0 ? (
                      <p className="text-xs text-muted text-center py-2">Sin movimientos registrados</p>
                    ) : (
                      <ul className="space-y-2" aria-label={`Historial de ${tool.name}`}>
                        {(movements[tool.id] || []).map(m => (
                          <li key={m.id} className="flex items-start justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
                            <div className="flex items-center gap-2">
                              <span className={[
                                'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                                m.delta > 0 ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
                              ].join(' ')} aria-hidden="true">
                                {m.delta > 0 ? '+' : '−'}
                              </span>
                              <div>
                                <p className="text-xs font-semibold text-foreground">
                                  <span className={m.delta > 0 ? 'text-success' : 'text-danger'}>
                                    {m.delta > 0 ? `+${m.delta}` : m.delta} {tool.unit}
                                  </span>
                                  {' '}— {m.reason}
                                  {m.expected_return_date && (
                                    <span className="ml-1.5 text-[10px] font-normal text-yellow-700 dark:text-yellow-400">
                                      · regreso: {new Date(m.expected_return_date + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                    </span>
                                  )}
                                </p>
                                {m.notes && <p className="text-[11px] text-muted">{m.notes}</p>}
                              </div>
                            </div>
                            <time className="text-[11px] text-muted shrink-0 mt-0.5" dateTime={m.created_at}>
                              {new Date(m.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </time>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <Wrench className="w-12 h-12 text-muted/30 mx-auto mb-3" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Sin herramientas</h3>
          <p className="text-sm text-muted">
            {filterCat
              ? `No hay herramientas en la categoría "${filterCat}"`
              : 'Registra tu primera herramienta para empezar el inventario'}
          </p>
        </div>
      )}
    </div>
  )
}
