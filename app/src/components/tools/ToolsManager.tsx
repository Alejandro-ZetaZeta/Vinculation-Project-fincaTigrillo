'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Wrench, Plus, Save, X, Loader2, Trash2,
  PackagePlus, PackageMinus, Package, ChevronDown, ChevronUp,
  AlertTriangle, History,
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
  'Otro',
] as const

type AdjustReason = typeof ADJUST_REASONS[number]

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

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting]           = useState(false)

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
  const [stockSaving, setStockSaving] = useState(false)

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
    } finally {
      setLoadingLog(null)
    }
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
  async function deleteTool(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/tools/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTools(prev => prev.filter(t => t.id !== id))
        setConfirmDelete(null)
      }
    } finally {
      setDeleting(false)
    }
  }

  // ── Adjust stock ───────────────────────────────────────────────────────────
  async function adjustStock(toolId: string) {
    const delta = parseInt(stockDelta, 10)
    if (!Number.isFinite(delta) || delta === 0) {
      setError('Ingresa un número válido distinto de cero')
      return
    }
    setError('')
    setStockSaving(true)
    try {
      const res = await fetch(`/api/tools/${toolId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta, reason: stockReason, notes: stockNotes || null }),
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
      setStockOpen(null)
      setStockDelta('')
      setStockReason('Compra')
      setStockNotes('')
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

      {/* ── Edit form ────────────────────────────────────────────────────── */}
      {editing && (
        <form
          onSubmit={updateTool}
          className="bg-surface border border-primary/30 rounded-2xl p-5 space-y-4"
          id="tool-edit-form"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Editar: {editing.name}</h3>
            <button type="button" onClick={() => setEditing(null)} className="p-2 rounded-xl hover:bg-surface-hover text-muted" aria-label="Cerrar formulario">
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium">Nombre *</label>
              <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} className={fieldCls} required />
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

          <button type="submit" disabled={saving} className="w-full py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2 text-sm transition-colors">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Save className="w-4 h-4" aria-hidden="true" />}
            Guardar cambios
          </button>
        </form>
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
                  <div className="flex items-start justify-between gap-4">
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
                        {/* Category */}
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
                                onChange={e => setStockReason(e.target.value as AdjustReason)}
                                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              >
                                {ADJUST_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </div>
                            {/* Notes */}
                            <div className="space-y-1">
                              <label className="text-xs font-medium text-muted" htmlFor={`notes-${tool.id}`}>Notas</label>
                              <input
                                id={`notes-${tool.id}`}
                                type="text"
                                value={stockNotes}
                                onChange={e => setStockNotes(e.target.value)}
                                placeholder="(opcional)"
                                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              />
                            </div>
                          </div>
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
                              onClick={() => { setStockOpen(null); setStockDelta(''); setStockReason('Compra'); setStockNotes('') }}
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
                            setStockOpen(null); setStockDelta(''); setStockReason('Compra'); setStockNotes('')
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
                        onClick={() => { setEditing(tool); setShowForm(false); setStockOpen(null) }}
                        className="text-xs font-medium text-primary hover:text-primary-dark transition-colors"
                      >
                        Editar
                      </button>

                      {/* Delete / deactivate */}
                      {confirmDelete === tool.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => deleteTool(tool.id)} disabled={deleting} className="px-2 py-1 text-xs rounded-lg bg-danger text-white hover:opacity-80 disabled:opacity-50">
                            {deleting ? '…' : 'Sí'}
                          </button>
                          <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 text-xs rounded-lg border border-border hover:bg-surface-hover">
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(tool.id)}
                          className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                          aria-label={`Desactivar o eliminar ${tool.name}`}
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
                    {(movements[tool.id] || []).length === 0 ? (
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
