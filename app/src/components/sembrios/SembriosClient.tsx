'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sprout, Plus, MapPin, Ruler, Trash2, X, ChevronRight, Leaf, TreePine, Calendar, Edit, Check, AlertTriangle, Clock, Settings, FileText, Info, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import { shouldSuggestStage, buildTimeline, getStageByKey, DEFAULT_STAGES } from '@/lib/sembrios/stages'
import type { StageDefinition, StageSuggestion, SembrioStageConfig, SembrioStageLog } from '@/lib/sembrios/types'

/* ─── Types ─────────────────────────────────────────── */
interface Potrero {
  id: string
  nombre: string
  descripcion?: string
  area_total_m2: number
  tipo_suelo?: string
  ubicacion_referencia?: string
  activo: boolean
  area_ocupada_m2: number
  area_disponible_m2: number
  total_sembrios: number
  sembrios?: Sembrio[]
}

interface Sembrio {
  id: string
  potrero_id: string
  tipo_cultivo: string
  variedad?: string
  area_sembrada_m2: number
  fecha_siembra: string
  fecha_cosecha_estimada?: string
  estado: string
  current_stage?: string | null
  stage_updated_at?: string | null
  observaciones?: string
  potreros?: { nombre: string; area_total_m2: number; tipo_suelo?: string }
}

interface SembriosClientProps {
  userRole?: string
}

const ESTADO_STYLE: Record<string, { color: string; bg: string; border: string; glow: string }> = {
  en_crecimiento: {
    color:  'var(--primary)',
    bg:     'color-mix(in srgb, var(--primary) 13%, transparent)',
    border: 'color-mix(in srgb, var(--primary) 33%, transparent)',
    glow:   'color-mix(in srgb, var(--primary) 53%, transparent)',
  },
  cosechado: {
    color:  '#a78bfa',
    bg:     'rgba(167,139,250,0.13)',
    border: 'rgba(167,139,250,0.33)',
    glow:   'rgba(167,139,250,0.53)',
  },
  en_descanso: {
    color:  'var(--warning)',
    bg:     'color-mix(in srgb, var(--warning) 13%, transparent)',
    border: 'color-mix(in srgb, var(--warning) 33%, transparent)',
    glow:   'color-mix(in srgb, var(--warning) 53%, transparent)',
  },
  fallido: {
    color:  'var(--danger)',
    bg:     'color-mix(in srgb, var(--danger) 13%, transparent)',
    border: 'color-mix(in srgb, var(--danger) 33%, transparent)',
    glow:   'color-mix(in srgb, var(--danger) 53%, transparent)',
  },
  en_preparacion: {
    color:  '#38bdf8',
    bg:     'rgba(56,189,248,0.13)',
    border: 'rgba(56,189,248,0.33)',
    glow:   'rgba(56,189,248,0.53)',
  },
}

const ESTADO_LABEL: Record<string, string> = {
  en_crecimiento: 'En Crecimiento',
  cosechado: 'Cosechado',
  en_descanso: 'En Descanso',
  fallido: 'Fallido',
  en_preparacion: 'En Preparación',
}

const fmt = (n: number) => n.toLocaleString('es-EC', { maximumFractionDigits: 2 })

/* ─── Main Component ─────────────────────────────────── */
export function SembriosClient({ userRole }: SembriosClientProps) {
  const isAdmin = userRole === 'admin'

  const [potreros, setPotreros] = useState<Potrero[]>([])
  const [sembrios, setSembrios] = useState<Sembrio[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'mapa' | 'potreros' | 'sembrios' | 'detalle'>('mapa')
  const [selectedPotrero, setSelectedPotrero] = useState<Potrero | null>(null)
  const [showPotreroForm, setShowPotreroForm] = useState(false)
  const [showSembrioForm, setShowSembrioForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMapModal, setShowMapModal] = useState(false)

  const [potreroForm, setPotreroForm] = useState({ nombre: '', descripcion: '', area_total_m2: '', tipo_suelo: '', ubicacion_referencia: '' })
  const [sembrioForm, setSembrioForm] = useState({ potrero_id: '', tipo_cultivo: '', variedad: '', area_sembrada_m2: '', fecha_siembra: '', fecha_cosecha_estimada: '', estado: 'en_crecimiento', observaciones: '' })

  const [selectedSembrioId, setSelectedSembrioId] = useState<string>('')
  const [stageConfig, setStageConfig] = useState<SembrioStageConfig | null>(null)
  const [stageLogs, setStageLogs] = useState<SembrioStageLog[]>([])
  const [pendingSuggestion, setPendingSuggestion] = useState<StageSuggestion | null>(null)
  const [showStageConfig, setShowStageConfig] = useState(false)
  const [showManualStageChange, setShowManualStageChange] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [stageConfigForm, setStageConfigForm] = useState<StageDefinition[]>(DEFAULT_STAGES)
  const [manualStageTarget, setManualStageTarget] = useState('')
  const [manualStageNotes, setManualStageNotes] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    const [pr, sr] = await Promise.all([fetch('/api/potreros'), fetch('/api/sembrios')])
    const [pd, sd] = await Promise.all([pr.json(), sr.json()])
    setPotreros(pd.data || [])
    setSembrios(sd.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const selectedSembrio = sembrios.find(s => s.id === selectedSembrioId) || null

  const loadDetalleData = useCallback(async (sembrioId: string) => {
    if (!sembrioId) return
    const [configRes, logsRes, suggestionsRes] = await Promise.all([
      fetch(`/api/sembrios/${sembrioId}/stage-config`),
      fetch(`/api/sembrios/${sembrioId}/stages`),
      fetch(`/api/sembrios/${sembrioId}/suggestions?status=pending`),
    ])
    const configData = await configRes.json()
    const logsData = await logsRes.json()
    const suggestionsData = await suggestionsRes.json()
    setStageConfig(configData.data || null)
    setStageLogs(logsData.data || [])
    const pending = suggestionsData.data?.[0] || null
    setPendingSuggestion(pending)
  }, [])

  useEffect(() => {
    if (tab === 'detalle' && selectedSembrioId) {
      loadDetalleData(selectedSembrioId)
    }
  }, [tab, selectedSembrioId, loadDetalleData])

  async function saveStageConfig() {
    if (!isAdmin || !selectedSembrioId) return
    setSaving(true); setError(null)
    const res = await fetch(`/api/sembrios/${selectedSembrioId}/stage-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stages: stageConfigForm }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setStageConfig(data.data)
    setShowStageConfig(false)
    setSaving(false)
  }

  async function acceptSuggestion() {
    if (!isAdmin || !pendingSuggestion || !selectedSembrioId) return
    setSaving(true); setError(null)
    const res = await fetch(`/api/sembrios/${selectedSembrioId}/suggestions/${pendingSuggestion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    })
    if (!res.ok) { const data = await res.json(); setError(data.error) }
    setPendingSuggestion(null)
    await loadDetalleData(selectedSembrioId)
    await loadData()
    setSaving(false)
  }

  async function rejectSuggestion() {
    if (!isAdmin || !pendingSuggestion || !selectedSembrioId) return
    setSaving(true); setError(null)
    const res = await fetch(`/api/sembrios/${selectedSembrioId}/suggestions/${pendingSuggestion.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', rejection_reason: rejectionReason }),
    })
    if (!res.ok) { const data = await res.json(); setError(data.error) }
    setPendingSuggestion(null)
    setShowRejectForm(false)
    setRejectionReason('')
    await loadDetalleData(selectedSembrioId)
    setSaving(false)
  }

  async function manualStageChange() {
    if (!isAdmin || !selectedSembrioId || !manualStageTarget) return
    setSaving(true); setError(null)
    const res = await fetch(`/api/sembrios/${selectedSembrioId}/stages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_stage: manualStageTarget, notes: manualStageNotes }),
    })
    if (!res.ok) { const data = await res.json(); setError(data.error) }
    setShowManualStageChange(false)
    setManualStageTarget('')
    setManualStageNotes('')
    await loadDetalleData(selectedSembrioId)
    await loadData()
    setSaving(false)
  }

  async function createSuggestionFromClient() {
    if (!isAdmin || !selectedSembrioId || !selectedSembrio || !stageConfig) return
    const stages = stageConfig.stages as StageDefinition[]
    const result = shouldSuggestStage(
      selectedSembrio.current_stage || null,
      selectedSembrio.stage_updated_at || null,
      stages
    )
    if (!result.shouldSuggest || !result.suggestedStage) return
    setSaving(true); setError(null)
    const res = await fetch(`/api/sembrios/${selectedSembrioId}/suggestions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_stage: selectedSembrio.current_stage,
        suggested_stage: result.suggestedStage,
        days_in_current: result.daysInCurrent,
        theoretical_days: result.theoreticalDays,
        message: result.message,
      }),
    })
    const data = await res.json()
    if (!res.ok && !data.duplicate) { setError(data.error) }
    await loadDetalleData(selectedSembrioId)
    setSaving(false)
  }

  async function savePotrero() {
    if (!isAdmin) return
    setSaving(true); setError(null)
    const res = await fetch('/api/potreros', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...potreroForm, area_total_m2: Number(potreroForm.area_total_m2) }) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setShowPotreroForm(false)
    setPotreroForm({ nombre: '', descripcion: '', area_total_m2: '', tipo_suelo: '', ubicacion_referencia: '' })
    await loadData()
    setSaving(false)
  }

  async function saveSembrio() {
    if (!isAdmin) return
    setSaving(true); setError(null)
    const res = await fetch('/api/sembrios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sembrioForm, area_sembrada_m2: Number(sembrioForm.area_sembrada_m2) }) })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setSaving(false); return }
    setShowSembrioForm(false)
    setSembrioForm({ potrero_id: '', tipo_cultivo: '', variedad: '', area_sembrada_m2: '', fecha_siembra: '', fecha_cosecha_estimada: '', estado: 'en_crecimiento', observaciones: '' })
    await loadData()
    setSaving(false)
  }

  async function deletePotrero(id: string) {
    if (!isAdmin) return
    if (!confirm('¿Eliminar este potrero y todos sus sembríos?')) return
    await fetch(`/api/potreros/${id}`, { method: 'DELETE' })
    await loadData()
  }

  async function deleteSembrio(id: string) {
    if (!isAdmin) return
    if (!confirm('¿Eliminar este sembrío?')) return
    await fetch(`/api/sembrios/${id}`, { method: 'DELETE' })
    await loadData()
  }

  const totalArea = potreros.reduce((s, p) => s + p.area_total_m2, 0)
  const totalOcupado = potreros.reduce((s, p) => s + p.area_ocupada_m2, 0)

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui)', color: 'var(--foreground)', paddingBottom: '3rem' }}>
      <style>{`
        @media (max-width: 640px) {
          .semb-header-btns { flex-direction: column !important; width: 100% !important; }
          .semb-header-btns button { width: 100% !important; justify-content: center !important; }
          .semb-stats { grid-template-columns: 1fr !important; }
          .semb-tabs { width: 100% !important; overflow-x: auto !important; }
          .semb-tabs button { padding: 0.5rem 0.75rem !important; font-size: 0.8rem !important; white-space: nowrap !important; }
          .semb-card { flex-direction: column !important; align-items: flex-start !important; gap: 0.75rem !important; }
          .semb-card-row { flex-direction: column !important; align-items: flex-start !important; gap: 0.5rem !important; }
          .semb-detail-actions { flex-direction: column !important; }
          .semb-detail-actions button { width: 100% !important; justify-content: center !important; }
          .semb-detail-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .semb-suggestion-btns { flex-direction: column !important; }
          .semb-suggestion-btns button { min-width: 0 !important; width: 100% !important; justify-content: center !important; }
          .semb-timeline-desktop { display: none !important; }
          .semb-timeline-mobile { display: block !important; }
          .semb-potrero-grid { grid-template-columns: 1fr !important; }
          .semb-form-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 400px) {
          .semb-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem', background: 'color-mix(in srgb, var(--primary) 5%, transparent)', padding: '1.5rem', borderRadius: '16px', border: '1px solid color-mix(in srgb, var(--border-color) 60%, transparent)', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'color-mix(in srgb, var(--primary) 30%, transparent) 0 4px 12px' }}>
            <Sprout size={24} color="white" />
          </div>
          <div>
            <h1 className="font-display tracking-tight text-2xl md:text-3xl font-bold text-foreground">Sembríos</h1>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7, marginTop: '0.2rem' }}>Gestión avanzada de potreros y cultivos</p>
          </div>
        </div>
        {isAdmin && (
          <div className="semb-header-btns" style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setShowPotreroForm(true)} style={btnStyle('var(--primary)')}><Plus size={16} /> Nuevo Potrero</button>
            <button onClick={() => setShowSembrioForm(true)} disabled={potreros.length === 0} style={btnStyle('#a78bfa')}><Leaf size={16} /> Registrar Sembrío</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="semb-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Potreros',   value: potreros.length,                                           icon: <MapPin size={20} />,  color: '#38bdf8',         bg: 'rgba(56,189,248,0.1)' },
          { label: 'Área Total',        value: `${fmt(totalArea)} m²`,                                   icon: <Ruler size={20} />,   color: 'var(--primary)',  bg: 'color-mix(in srgb, var(--primary) 10%, transparent)' },
          { label: 'Área Ocupada',      value: `${fmt(totalOcupado)} m²`,                                icon: <Sprout size={20} />,  color: 'var(--warning)',  bg: 'color-mix(in srgb, var(--warning) 10%, transparent)' },
          { label: 'Sembríos Activos',  value: sembrios.filter(s => s.estado === 'en_crecimiento' || s.estado === 'en_preparacion').length, icon: <Leaf size={20} />,    color: '#a78bfa',         bg: 'rgba(167,139,250,0.1)' },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, marginTop: '0.1rem' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="semb-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'color-mix(in srgb, currentColor 4%, transparent)', borderRadius: 12, padding: '0.35rem', width: 'fit-content', border: '1px solid color-mix(in srgb, currentColor 5%, transparent)', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.02)' }}>
        {(['mapa', 'potreros', 'sembrios', 'detalle'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: tab === t ? 700 : 500, background: tab === t ? 'var(--surface)' : 'transparent', color: tab === t ? 'var(--foreground)' : 'var(--muted)', textTransform: 'capitalize', fontSize: '0.9rem', boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all .3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            {t === 'mapa' ? 'Mapa' : t === 'potreros' ? 'Potreros' : t === 'sembrios' ? 'Sembríos' : 'Detalle'}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="spinner" style={{ width: 32, height: 32, border: 'color-mix(in srgb, var(--primary) 20%, transparent) 3px solid', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ opacity: 0.6, fontWeight: 500 }}>Cargando datos del terreno...</span>
        </div>
      )}

      {/* TAB: MAPA */}
      {!loading && tab === 'mapa' && (
        <div style={{ ...cardStyle, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.4rem', background: 'color-mix(in srgb, var(--primary) 10%, transparent)', borderRadius: 8, color: 'var(--primary)' }}>
              <TreePine size={20} />
            </div>
            <div>
              <strong style={{ fontSize: '1.1rem', display: 'block' }}>Mapa Referencial de Finca Tigrillo</strong>
              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Vía Chone – Colorado</span>
            </div>
          </div>
          <div
            onClick={() => setShowMapModal(true)}
            style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: 'var(--surface)', border: '1px solid color-mix(in srgb, currentColor 8%, transparent)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)', cursor: 'zoom-in' }}
          >
            <Image src="/mapa_finca.png" alt="Mapa Finca Tigrillo" width={1400} height={900} style={{ width: '100%', height: 'auto', display: 'block', transition: 'transform 0.5s' }} className="hover-zoom" priority />
            <style>{`.hover-zoom:hover { transform: scale(1.02); }`}</style>
            <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', color: '#fff', fontSize: '0.7rem', fontWeight: 600, padding: '0.3rem 0.65rem', borderRadius: 99, pointerEvents: 'none', letterSpacing: '0.03em' }}>
              Clic para ampliar
            </div>
          </div>
          {potreros.length > 0 && (
            <div className="semb-potrero-grid" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {potreros.map(p => (
                <div key={p.id} style={{ ...cardStyle, cursor: 'pointer', borderLeft: '4px solid var(--primary)', padding: '1rem', transition: 'transform 0.2s, box-shadow 0.2s' }} onClick={() => { setSelectedPotrero(p); setTab('potreros') }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.nombre}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.2rem' }}>{fmt(p.area_total_m2)} m² · {p.total_sembrios} sembríos</div>
                  <div style={{ marginTop: '0.75rem', height: 6, borderRadius: 6, background: 'color-mix(in srgb, currentColor 8%, transparent)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 6, background: 'linear-gradient(90deg, var(--primary-light), var(--primary-dark))', width: `${Math.min(100, (p.area_ocupada_m2 / p.area_total_m2) * 100)}%`, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  </div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: '0.35rem', fontWeight: 500 }}>{fmt(p.area_disponible_m2)} m² disponibles</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: POTREROS */}
      {!loading && tab === 'potreros' && (
        <div>
          {potreros.length === 0 && <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>{isAdmin ? 'No hay potreros. Crea el primero.' : 'No hay potreros registrados actualmente.'}</div>}
          <div className="semb-potrero-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {potreros.map(p => {
              const pct = Math.min(100, (p.area_ocupada_m2 / p.area_total_m2) * 100)
              const isSelected = selectedPotrero?.id === p.id
              return (
                <div key={p.id} style={{ ...cardStyle, cursor: 'pointer', border: isSelected ? '2px solid var(--primary)' : '1px solid color-mix(in srgb, currentColor 8%, transparent)', transition: 'all 0.3s', padding: '1.25rem' }} onClick={() => setSelectedPotrero(isSelected ? null : p)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{p.nombre}</div>
                      {p.tipo_suelo && <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={12} /> {p.tipo_suelo}</div>}
                    </div>
                    {isAdmin && (
                      <button onClick={e => { e.stopPropagation(); deletePotrero(p.id) }} style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.4rem', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 20%, transparent)'} onMouseLeave={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 10%, transparent)'} title="Eliminar Potrero">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div style={{ margin: '1rem 0 0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: 'color-mix(in srgb, currentColor 3%, transparent)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    <span><strong style={{ fontSize: '0.9rem' }}>{fmt(p.area_total_m2)}</strong> m² total</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{fmt(p.area_disponible_m2)} m² libres</span>
                  </div>

                  <div style={{ height: 8, borderRadius: 8, background: 'color-mix(in srgb, currentColor 6%, transparent)', overflow: 'hidden', marginBottom: '1rem' }}>
                    <div style={{ height: '100%', borderRadius: 8, background: pct > 80 ? 'linear-gradient(90deg, var(--warning), var(--danger))' : 'linear-gradient(90deg, var(--primary-light), var(--primary-dark))', width: `${pct}%`, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'color-mix(in srgb, currentColor 70%, transparent)' }}>{p.total_sembrios} sembríos activos</span>
                    <ChevronRight size={18} style={{ opacity: isSelected ? 1 : 0.4, transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'all 0.3s' }} color={isSelected ? 'var(--primary)' : 'currentColor'} />
                  </div>

                  {isSelected && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed color-mix(in srgb, currentColor 15%, transparent)', animation: 'fadeIn 0.3s ease-out' }}>
                      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                      {sembrios.filter(s => s.potrero_id === p.id).length === 0
                        ? <div style={{ fontSize: '0.8rem', opacity: 0.5, textAlign: 'center', padding: '1rem' }}>Sin sembríos registrados en este potrero</div>
                        : sembrios.filter(s => s.potrero_id === p.id).map(s => {
                            const es = ESTADO_STYLE[s.estado] ?? ESTADO_STYLE.en_crecimiento
                            const stageLabel = s.current_stage ? (getStageByKey(DEFAULT_STAGES, s.current_stage)?.label || s.current_stage) : null
                            return (
                              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', margin: '0 -0.5rem', borderRadius: '8px', transition: 'background 0.2s', flexWrap: 'wrap', gap: '0.5rem' }} onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, currentColor 3%, transparent)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{s.tipo_cultivo}{s.variedad ? <span style={{ opacity: 0.6, fontWeight: 500 }}> ({s.variedad})</span> : ''}</div>
                                  <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.1rem' }}>{fmt(s.area_sembrada_m2)} m² · {new Date(s.fecha_siembra).toLocaleDateString('es-EC')}</div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                  {stageLabel && (
                                    <span style={{ fontSize: '0.6rem', padding: '2px 6px', borderRadius: 99, background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)', fontWeight: 700, letterSpacing: '0.02em' }}>{stageLabel}</span>
                                  )}
                                  <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 99, background: es.bg, color: es.color, border: `1px solid ${es.border}`, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{ESTADO_LABEL[s.estado]}</span>
                                  {isAdmin && (
                                    <button onClick={() => deleteSembrio(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.2rem', opacity: 0.5, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.5'} title="Eliminar Sembrío"><X size={16} /></button>
                                  )}
                                </div>
                              </div>
                            )
                          })
                      }
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB: SEMBRIOS */}
      {!loading && tab === 'sembrios' && (
        <div>
          {sembrios.length === 0 && <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>{isAdmin ? 'No hay sembríos. Registra el primero.' : 'No hay sembríos registrados actualmente.'}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sembrios.map(s => {
              const es = ESTADO_STYLE[s.estado] ?? ESTADO_STYLE.en_crecimiento
              const stageLabel = s.current_stage ? (getStageByKey(DEFAULT_STAGES, s.current_stage)?.label || s.current_stage) : null
              return (
                <div key={s.id} className="semb-card" style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', padding: '1.25rem', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: es.color, flexShrink: 0, boxShadow: `0 0 8px ${es.glow}` }} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{s.tipo_cultivo}{s.variedad ? <span style={{ opacity: 0.6, fontWeight: 500 }}> · {s.variedad}</span> : ''}</div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <MapPin size={12} /> {s.potreros?.nombre || '—'} <span style={{ opacity: 0.3 }}>|</span> <Ruler size={12} /> {fmt(s.area_sembrada_m2)} m²
                    </div>
                    {s.observaciones && (
                      <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.35rem', display: 'flex', alignItems: 'flex-start', gap: '0.3rem', lineHeight: 1.4 }}>
                        <FileText size={11} style={{ flexShrink: 0, marginTop: 2 }} /> {s.observaciones}
                      </div>
                    )}
                  </div>
                  <div className="semb-card-row" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 500, background: 'color-mix(in srgb, currentColor 4%, transparent)', padding: '0.4rem 0.75rem', borderRadius: '6px' }}>
                      {new Date(s.fecha_siembra).toLocaleDateString('es-EC')}
                    </div>
                    {stageLabel && (
                      <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 99, background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)', fontWeight: 700, letterSpacing: '0.02em' }}>
                        {stageLabel}
                      </span>
                    )}
                    <span style={{ fontSize: '0.75rem', padding: '4px 12px', borderRadius: 99, background: es.bg, color: es.color, border: `1px solid ${es.border}`, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase' }}>{ESTADO_LABEL[s.estado]}</span>
                    {isAdmin && (
                      <button onClick={() => deleteSembrio(s.id)} style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 20%, transparent)'} onMouseLeave={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 10%, transparent)'} title="Eliminar Sembrío"><Trash2 size={16} /></button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB: DETALLE */}
      {!loading && tab === 'detalle' && (
        <div>
          {sembrios.length === 0 && <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>No hay sembríos registrados.</div>}
          {sembrios.length > 0 && (
            <>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={labelStyle}>Seleccionar Sembrío</label>
                <select style={selectStyle} value={selectedSembrioId} onChange={e => { setSelectedSembrioId(e.target.value); setPendingSuggestion(null); setStageConfig(null); setStageLogs([]) }}>
                  <option value="">Seleccionar un sembrío...</option>
                  {sembrios.map(s => (
                    <option key={s.id} value={s.id}>{s.tipo_cultivo} - {s.potreros?.nombre || 'Sin potrero'} ({fmt(s.area_sembrada_m2)} m²)</option>
                  ))}
                </select>
              </div>

              {selectedSembrio && (
                <>
                  {pendingSuggestion && (
                    <div style={{ ...cardStyle, padding: '1.5rem', marginBottom: '1.5rem', background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.08), rgba(245, 158, 11, 0.05))', border: '2px solid rgba(251, 191, 36, 0.4)', boxShadow: '0 4px 20px rgba(251, 191, 36, 0.15)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(251, 191, 36, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <AlertTriangle size={20} color="#f59e0b" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#92400e' }}>Sugerencia del Sistema: Actualización de Etapa</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.1rem' }}>Basado en el tiempo transcurrido desde la última actualización</div>
                        </div>
                      </div>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 1rem 0', color: '#78350f' }}>
                        {pendingSuggestion.message || `Basado en ${pendingSuggestion.days_in_current} días desde la última actualización, el ${selectedSembrio.tipo_cultivo} (${selectedSembrio.potreros?.nombre}) ha completado teóricamente '${getStageByKey(stageConfig?.stages || DEFAULT_STAGES, pendingSuggestion.current_stage)?.label || pendingSuggestion.current_stage}' (${pendingSuggestion.theoretical_days} días) y debería pasar a '${getStageByKey(stageConfig?.stages || DEFAULT_STAGES, pendingSuggestion.suggested_stage)?.label || pendingSuggestion.suggested_stage}'. Por favor confirme las condiciones reales en campo.`}
                      </p>
                      {stageConfig && (
                        <TimelineView stages={stageConfig.stages} currentStage={pendingSuggestion.suggested_stage} logs={stageLogs} highlightStage={pendingSuggestion.suggested_stage} referenceDate={selectedSembrio.stage_updated_at} fechaSiembra={selectedSembrio.fecha_siembra} />
                      )}
                      {isAdmin && (
                        <div className="semb-suggestion-btns" style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                          <button onClick={acceptSuggestion} disabled={saving} style={{ ...btnStyle('#10b981'), flex: 1, minWidth: 200 }}>
                            <Check size={16} /> {saving ? 'Procesando...' : `Aceptar Cambio a ${getStageByKey(stageConfig?.stages || DEFAULT_STAGES, pendingSuggestion.suggested_stage)?.label || pendingSuggestion.suggested_stage}`}
                          </button>
                          {!showRejectForm ? (
                            <button onClick={() => setShowRejectForm(true)} style={{ ...btnStyle('#f59e0b'), flex: 1, minWidth: 200 }}>
                              <Clock size={16} /> Mantener Etapa Actual (Posponer)
                            </button>
                          ) : (
                            <div style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              <input style={inputStyle} placeholder="Motivo del rechazo (opcional)..." value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} />
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={rejectSuggestion} disabled={saving} style={btnStyle('#ef4444')}>{saving ? 'Confirmando...' : 'Confirmar Rechazo'}</button>
                                <button onClick={() => { setShowRejectForm(false); setRejectionReason('') }} style={{ ...btnStyle('#6b7280'), background: 'color-mix(in srgb, currentColor 10%, transparent)', color: 'inherit' }}>Cancelar</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ ...cardStyle, padding: '1.5rem' }}>
                    <div className="semb-detail-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>{selectedSembrio.tipo_cultivo}{selectedSembrio.variedad ? ` - ${selectedSembrio.variedad}` : ''}</h2>
                        <div style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <MapPin size={14} /> {selectedSembrio.potreros?.nombre || 'Sin potrero'} <span style={{ opacity: 0.4 }}>|</span> <Ruler size={14} /> {fmt(selectedSembrio.area_sembrada_m2)} m²
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="semb-detail-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                          <button onClick={() => setShowManualStageChange(true)} style={btnStyle('#6366f1')} title="Cambiar etapa manualmente">
                            <Edit size={16} /> Cambiar Etapa
                          </button>
                          <button onClick={() => { setShowStageConfig(true); setStageConfigForm(stageConfig?.stages || DEFAULT_STAGES) }} style={{ ...btnStyle('#8b5cf6'), background: 'color-mix(in srgb, #8b5cf6 15%, transparent)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.3)' }} title="Configurar etapas">
                            <Settings size={16} /> Configurar Etapas
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="semb-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', background: 'color-mix(in srgb, currentColor 3%, transparent)', borderRadius: 12 }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.05em' }}>Fecha Siembra</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.2rem' }}>{new Date(selectedSembrio.fecha_siembra).toLocaleDateString('es-EC')}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.05em' }}>Etapa Actual</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                          <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{getStageByKey(stageConfig?.stages || DEFAULT_STAGES, selectedSembrio.current_stage || 'en_preparacion')?.label || selectedSembrio.current_stage || 'Sin configurar'}</span>
                          <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: 99, background: ESTADO_STYLE[selectedSembrio.estado]?.bg || 'transparent', color: ESTADO_STYLE[selectedSembrio.estado]?.color || 'inherit', border: `1px solid ${ESTADO_STYLE[selectedSembrio.estado]?.border || 'transparent'}`, fontWeight: 700, textTransform: 'uppercase' }}>{ESTADO_LABEL[selectedSembrio.estado] || selectedSembrio.estado}</span>
                        </div>
                      </div>
                      {selectedSembrio.fecha_cosecha_estimada && (
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.05em' }}>Cosecha Estimada</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.2rem' }}>{new Date(selectedSembrio.fecha_cosecha_estimada).toLocaleDateString('es-EC')}</div>
                        </div>
                      )}
                      {selectedSembrio.potreros?.tipo_suelo && (
                        <div>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.05em' }}>Tipo de Suelo</div>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '0.2rem' }}>{selectedSembrio.potreros.tipo_suelo}</div>
                        </div>
                      )}
                    </div>

                    {selectedSembrio.observaciones && (
                      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'color-mix(in srgb, currentColor 3%, transparent)', borderRadius: 12, borderLeft: '3px solid var(--primary)' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, letterSpacing: '0.05em', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <FileText size={12} /> Observaciones
                        </div>
                        <div style={{ fontSize: '0.9rem', lineHeight: 1.6, opacity: 0.85 }}>{selectedSembrio.observaciones}</div>
                      </div>
                    )}

                    {stageConfig ? (
                      <>
                        <div style={{ marginBottom: '1rem' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Calendar size={16} /> Línea de Tiempo de Etapas
                          </div>
                          <TimelineView stages={stageConfig.stages} currentStage={selectedSembrio.current_stage || null} logs={stageLogs} referenceDate={selectedSembrio.stage_updated_at} fechaSiembra={selectedSembrio.fecha_siembra} />
                        </div>

                        {!pendingSuggestion && isAdmin && (selectedSembrio.estado === 'en_crecimiento' || selectedSembrio.estado === 'en_preparacion') && (
                          <div style={{ marginTop: '1rem', padding: '1rem', background: 'color-mix(in srgb, var(--primary) 5%, transparent)', borderRadius: 12, border: '1px dashed color-mix(in srgb, var(--primary) 30%, transparent)' }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>Verificar Sugerencia de Etapa</div>
                            <p style={{ fontSize: '0.8rem', opacity: 0.7, margin: '0 0 0.75rem 0' }}>
                              El sistema puede calcular si el cultivo debería avanzar a la siguiente etapa basándose en los días transcurridos.
                            </p>
                            <button onClick={createSuggestionFromClient} disabled={saving} style={btnStyle('var(--primary)')}>
                              {saving ? 'Verificando...' : 'Verificar Ahora'}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ padding: '2rem', textAlign: 'center', background: 'color-mix(in srgb, currentColor 3%, transparent)', borderRadius: 12, border: '1px dashed color-mix(in srgb, currentColor 15%, transparent)' }}>
                        <Settings size={32} style={{ opacity: 0.3, marginBottom: '0.75rem' }} />
                        <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.5rem' }}>Sin configuración de etapas</div>
                        <p style={{ fontSize: '0.8rem', opacity: 0.6, margin: '0 0 1rem 0' }}>
                          Configure las etapas de crecimiento para habilitar sugerencias automáticas y la línea de tiempo.
                        </p>
                        {isAdmin && (
                          <button onClick={() => { setShowStageConfig(true); setStageConfigForm(DEFAULT_STAGES) }} style={btnStyle('#8b5cf6')}>
                            <Settings size={16} /> Configurar Etapas
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* MAP MODAL */}
      {showMapModal && (
        <div
          onClick={() => setShowMapModal(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', padding: '1rem', animation: 'fadeIn 0.2s ease-out', cursor: 'zoom-out' }}
        >
          <div style={{ position: 'relative', maxWidth: '95vw', maxHeight: '95vh', width: '100%' }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowMapModal(false)}
              style={{ position: 'absolute', top: '-2.5rem', right: 0, display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem', fontWeight: 600 }}
            >
              <X size={16} /> Cerrar
            </button>
            <Image
              src="/mapa_finca.png"
              alt="Mapa Finca Tigrillo"
              width={1400}
              height={900}
              style={{ width: '100%', height: 'auto', maxHeight: '90vh', objectFit: 'contain', borderRadius: 12, display: 'block', boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}
              priority
            />
          </div>
        </div>
      )}

      {/* FORM: Potrero */}
      {isAdmin && showPotreroForm && (
        <Modal title="Nuevo Potrero" onClose={() => setShowPotreroForm(false)}>
          {error && <div style={errStyle}>{error}</div>}
          <label style={labelStyle}>Nombre del Potrero *</label>
          <input style={inputStyle} placeholder="Ej: Potrero Norte" value={potreroForm.nombre} onChange={e => setPotreroForm(f => ({ ...f, nombre: e.target.value }))} />
          <label style={labelStyle}>Área Total (m²) *</label>
          <input style={inputStyle} type="number" min="1" placeholder="Ej: 15000" value={potreroForm.area_total_m2} onChange={e => setPotreroForm(f => ({ ...f, area_total_m2: e.target.value }))} />
          <label style={labelStyle}>Tipo de Suelo</label>
          <select style={selectStyle} value={potreroForm.tipo_suelo} onChange={e => setPotreroForm(f => ({ ...f, tipo_suelo: e.target.value }))}>
            <option value="">Seleccionar...</option>
            {['Arcilloso', 'Arenoso', 'Franco', 'Limoso', 'Franco-arcilloso', 'Franco-arenoso'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <label style={labelStyle}>Referencia en el Mapa</label>
          <input style={inputStyle} placeholder="Ej: Lote superior izquierdo" value={potreroForm.ubicacion_referencia} onChange={e => setPotreroForm(f => ({ ...f, ubicacion_referencia: e.target.value }))} />
          <label style={labelStyle}>Descripción</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} placeholder="Notas adicionales sobre este potrero..." value={potreroForm.descripcion} onChange={e => setPotreroForm(f => ({ ...f, descripcion: e.target.value }))} />
          <div style={{ marginTop: '0.5rem' }}>
            <button style={btnStyle('var(--primary)', true)} onClick={savePotrero} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Potrero'}</button>
          </div>
        </Modal>
      )}

      {/* FORM: Sembrío */}
      {isAdmin && showSembrioForm && (
        <Modal title="Registrar Sembrío" onClose={() => setShowSembrioForm(false)}>
          {error && <div style={errStyle}>{error}</div>}
          <label style={labelStyle}>Potrero Destino *</label>
          <select style={selectStyle} value={sembrioForm.potrero_id} onChange={e => setSembrioForm(f => ({ ...f, potrero_id: e.target.value }))}>
            <option value="">Seleccionar potrero...</option>
            {potreros.map(p => <option key={p.id} value={p.id}>{p.nombre} — {fmt(p.area_disponible_m2)} m² disponibles</option>)}
          </select>
          <label style={labelStyle}>Tipo de Cultivo *</label>
          <input style={inputStyle} placeholder="Ej: Maíz, Pasto Saboya, Yuca..." value={sembrioForm.tipo_cultivo} onChange={e => setSembrioForm(f => ({ ...f, tipo_cultivo: e.target.value }))} />
          <label style={labelStyle}>Variedad (Opcional)</label>
          <input style={inputStyle} placeholder="Ej: Híbrido H-551" value={sembrioForm.variedad} onChange={e => setSembrioForm(f => ({ ...f, variedad: e.target.value }))} />
          <label style={labelStyle}>Área Sembrada (m²) *</label>
          <input style={inputStyle} type="number" min="1" placeholder="Ej: 5000" value={sembrioForm.area_sembrada_m2} onChange={e => setSembrioForm(f => ({ ...f, area_sembrada_m2: e.target.value }))} />
          <div className="semb-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Fecha de Siembra *</label>
              <input style={inputStyle} type="date" value={sembrioForm.fecha_siembra} onChange={e => setSembrioForm(f => ({ ...f, fecha_siembra: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Cosecha Estimada</label>
              <input style={inputStyle} type="date" value={sembrioForm.fecha_cosecha_estimada} onChange={e => setSembrioForm(f => ({ ...f, fecha_cosecha_estimada: e.target.value }))} />
            </div>
          </div>
          <label style={labelStyle}>Estado Actual</label>
          <select style={selectStyle} value={sembrioForm.estado} onChange={e => setSembrioForm(f => ({ ...f, estado: e.target.value }))}>
            {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label style={labelStyle}>Observaciones</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} placeholder="Notas adicionales sobre el cultivo..." value={sembrioForm.observaciones} onChange={e => setSembrioForm(f => ({ ...f, observaciones: e.target.value }))} />
          <div style={{ marginTop: '0.5rem' }}>
            <button style={btnStyle('#a78bfa', true)} onClick={saveSembrio} disabled={saving}>{saving ? 'Registrando...' : 'Registrar Sembrío'}</button>
          </div>
        </Modal>
      )}

      {/* FORM: Stage Config */}
      {isAdmin && showStageConfig && (
        <Modal title="Configurar Etapas de Crecimiento" onClose={() => setShowStageConfig(false)}>
          {error && <div style={errStyle}>{error}</div>}
          <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: 0 }}>
            Defina las etapas y su duración teórica en días. El sistema usará esta configuración para sugerir cambios de etapa.
          </p>
          {stageConfigForm.map((stage, idx) => (
            <div key={stage.key} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.75rem', background: 'color-mix(in srgb, currentColor 3%, transparent)', borderRadius: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'color-mix(in srgb, var(--primary) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: 'var(--primary)', flexShrink: 0 }}>{idx + 1}</div>
              <div style={{ flex: 1 }}>
                <input style={{ ...inputStyle, marginBottom: '0.5rem' }} placeholder="Nombre de la etapa" value={stage.label} onChange={e => { const updated = [...stageConfigForm]; updated[idx] = { ...updated[idx], label: e.target.value }; setStageConfigForm(updated) }} />
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input style={{ ...inputStyle, width: '80px' }} type="number" min="0" placeholder="0" value={stage.duration_days || ''} onChange={e => { const val = e.target.value; const updated = [...stageConfigForm]; updated[idx] = { ...updated[idx], duration_days: val === '' ? 0 : Math.max(0, Number(val)) }; setStageConfigForm(updated) }} />
                  <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>días teóricos</span>
                </div>
              </div>
              {stageConfigForm.length > 1 && (
                <button onClick={() => { const updated = stageConfigForm.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i + 1 })); setStageConfigForm(updated) }} style={{ background: 'color-mix(in srgb, var(--danger) 10%, transparent)', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '0.4rem', borderRadius: '8px', transition: 'background 0.2s', flexShrink: 0 }} onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 20%, transparent)'} onMouseLeave={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--danger) 10%, transparent)'} title="Eliminar etapa">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
          <button onClick={() => { const newOrder = stageConfigForm.length + 1; setStageConfigForm([...stageConfigForm, { key: `etapa_${newOrder}`, label: `Etapa ${newOrder}`, order: newOrder, duration_days: 0 }]) }} style={{ ...btnStyle('#6b7280'), background: 'color-mix(in srgb, currentColor 8%, transparent)', color: 'inherit', border: '1px dashed color-mix(in srgb, currentColor 20%, transparent)' }}>
            <Plus size={16} /> Agregar Etapa
          </button>
          <div style={{ marginTop: '0.5rem' }}>
            <button style={btnStyle('#8b5cf6', true)} onClick={saveStageConfig} disabled={saving || stageConfigForm.some(s => !s.label.trim())}>{saving ? 'Guardando...' : 'Guardar Configuración'}</button>
          </div>
        </Modal>
      )}

      {/* FORM: Manual Stage Change */}
      {isAdmin && showManualStageChange && stageConfig && (
        <Modal title="Cambiar Etapa Manualmente" onClose={() => setShowManualStageChange(false)}>
          {error && <div style={errStyle}>{error}</div>}
          <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: 0 }}>
            Cambie la etapa actual del sembrío. Esta acción quedará registrada en el historial.
          </p>
          <label style={labelStyle}>Etapa Destino *</label>
          <select style={selectStyle} value={manualStageTarget} onChange={e => setManualStageTarget(e.target.value)}>
            <option value="">Seleccionar etapa...</option>
            {stageConfig.stages.filter(s => s.key !== selectedSembrio?.current_stage).map(s => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <label style={labelStyle}>Notas (opcional)</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} placeholder="Motivo del cambio manual..." value={manualStageNotes} onChange={e => setManualStageNotes(e.target.value)} />
          <div style={{ marginTop: '0.5rem' }}>
            <button style={btnStyle('#6366f1', true)} onClick={manualStageChange} disabled={saving || !manualStageTarget}>{saving ? 'Cambiando...' : 'Confirmar Cambio'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

/* ─── Helpers ─────────────────────────────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid color-mix(in srgb, currentColor 8%, transparent)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', paddingBottom: '1rem', borderBottom: '1px solid color-mix(in srgb, currentColor 8%, transparent)' }}>
          <strong style={{ fontSize: '1.25rem', fontWeight: 800 }}>{title}</strong>
          <button onClick={onClose} style={{ background: 'color-mix(in srgb, currentColor 5%, transparent)', border: 'none', cursor: 'pointer', color: 'inherit', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, currentColor 10%, transparent)'} onMouseLeave={e => e.currentTarget.style.background = 'color-mix(in srgb, currentColor 5%, transparent)'}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function TimelineView({ stages, currentStage, logs, highlightStage, referenceDate, fechaSiembra }: { stages: StageDefinition[]; currentStage: string | null; logs: SembrioStageLog[]; highlightStage?: string; referenceDate?: string | null; fechaSiembra?: string | null }) {
  const resolvedRef = (() => {
    if (referenceDate) return referenceDate
    if (!fechaSiembra || stages.length === 0) return null
    const sorted = [...stages].sort((a, b) => a.order - b.order)
    const first = sorted[0]
    if (!first) return null
    if (!currentStage || currentStage === first.key) return fechaSiembra
    return null
  })()

  const timeline = buildTimeline(stages, currentStage, logs, resolvedRef)
  const tooltipText = 'El conteo de días inicia cuando se confirma el cambio de etapa. En la primera etapa, si aún no hay cambio, se usa la fecha de siembra como referencia.'

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return null
    try { return new Date(d + 'T00:00:00').toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }) } catch { return null }
  }

  const renderDesktop = () => (
    <div className="semb-timeline-desktop" style={{ display: 'flex', alignItems: 'stretch', gap: '0.4rem', overflowX: 'auto', padding: '0.75rem 0' }}>
      {timeline.map((entry, idx) => {
        const isHighlighted = highlightStage === entry.key
        const isCurrent = entry.status === 'current'
        const isCompleted = entry.status === 'completed'

        const borderColor = isCompleted
          ? 'rgba(16, 185, 129, 0.5)'
          : isHighlighted
          ? 'rgba(251, 191, 36, 0.6)'
          : isCurrent
          ? 'rgba(45, 90, 61, 0.55)'
          : 'color-mix(in srgb, currentColor 12%, transparent)'

        const bg = isCompleted
          ? 'rgba(16, 185, 129, 0.08)'
          : isHighlighted
          ? 'rgba(251, 191, 36, 0.12)'
          : isCurrent
          ? 'linear-gradient(160deg, rgba(45, 90, 61, 0.10), rgba(45, 90, 61, 0.04))'
          : 'color-mix(in srgb, currentColor 4%, transparent)'

        const pct = entry.progress_pct ?? 0
        const isOverdue = !!entry.is_overdue
        const barColor = isOverdue
          ? 'linear-gradient(90deg, #dc2626, #b91c1c)'
          : isCurrent
          ? 'linear-gradient(90deg, #2d5a3d, #5a8a4d)'
          : 'rgba(16, 185, 129, 0.5)'

        return (
          <div key={entry.key} style={{ display: 'flex', alignItems: 'stretch', flex: 1, minWidth: 140 }}>
            <div style={{ flex: 1, padding: '0.75rem', borderRadius: 12, background: bg, border: `2px solid ${borderColor}`, display: 'flex', flexDirection: 'column', gap: '0.4rem', transition: 'all 0.3s', boxShadow: isCurrent ? '0 4px 16px rgba(45, 90, 61, 0.10)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                {isCompleted && <Check size={14} color="#059669" />}
                {isHighlighted && <AlertTriangle size={14} color="#f59e0b" />}
                {isCurrent && !isHighlighted && <Clock size={14} color="#2d5a3d" />}
                <div style={{ fontSize: '0.78rem', fontWeight: 700 }}>{entry.label}</div>
              </div>
              {isCurrent && entry.days_in_current != null && entry.duration_days > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.05rem', fontWeight: 700, color: 'var(--foreground)' }}>
                      Día {entry.days_in_current}
                      <span style={{ fontSize: '0.75rem', opacity: 0.55, fontWeight: 500 }}> de {entry.duration_days}</span>
                    </span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: isOverdue ? '#b91c1c' : 'var(--primary)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 99, background: 'color-mix(in srgb, currentColor 8%, transparent)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.25rem', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.62rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                  {isCompleted ? 'Completado' : isHighlighted ? 'Pendiente' : isCurrent ? 'En curso' : 'Próxima'}
                </div>
                {isOverdue && (
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '2px 6px', borderRadius: 99, background: 'rgba(220, 38, 38, 0.12)', color: '#b91c1c', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
                    +{entry.days_overdue} días vencidos
                  </span>
                )}
                {!isCurrent && entry.duration_days > 0 && (
                  <span style={{ fontSize: '0.6rem', opacity: 0.55 }}>{entry.duration_days} días</span>
                )}
              </div>
            </div>
            {idx < timeline.length - 1 && (
              <div style={{ width: 16, alignSelf: 'center', height: 2, background: isCompleted ? 'rgba(16, 185, 129, 0.4)' : 'color-mix(in srgb, currentColor 12%, transparent)', flexShrink: 0, position: 'relative' }}>
                <ArrowRight size={10} style={{ position: 'absolute', right: -4, top: -4, opacity: isCompleted ? 0.8 : 0.3, color: isCompleted ? '#059669' : 'currentColor' }} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  const renderMobile = () => (
    <div className="semb-timeline-mobile" style={{ display: 'none', position: 'relative', padding: '0.5rem 0 0.5rem 0' }}>
      {timeline.map((entry, idx) => {
        const isHighlighted = highlightStage === entry.key
        const isCurrent = entry.status === 'current'
        const isCompleted = entry.status === 'completed'
        const isFuture = entry.status === 'future'
        const isLast = idx === timeline.length - 1

        const dotBg = isCompleted ? '#059669' : isHighlighted ? '#f59e0b' : isCurrent ? '#2d5a3d' : 'color-mix(in srgb, currentColor 25%, transparent)'
        const dotRing = isCurrent ? '0 0 0 4px rgba(45, 90, 61, 0.18)' : isCompleted ? '0 0 0 3px rgba(16, 185, 129, 0.18)' : 'none'

        const cardBg = isCompleted
          ? 'rgba(16, 185, 129, 0.06)'
          : isHighlighted
          ? 'rgba(251, 191, 36, 0.10)'
          : isCurrent
          ? 'linear-gradient(160deg, var(--surface), color-mix(in srgb, var(--primary) 5%, var(--surface)))'
          : 'color-mix(in srgb, currentColor 3%, transparent)'

        const cardBorder = isCompleted
          ? 'rgba(16, 185, 129, 0.35)'
          : isHighlighted
          ? 'rgba(251, 191, 36, 0.5)'
          : isCurrent
          ? 'rgba(45, 90, 61, 0.4)'
          : 'color-mix(in srgb, currentColor 10%, transparent)'

        const pct = entry.progress_pct ?? 0
        const isOverdue = !!entry.is_overdue
        const barColor = isOverdue
          ? 'linear-gradient(90deg, #dc2626, #b91c1c)'
          : isCurrent
          ? 'linear-gradient(90deg, #2d5a3d, #5a8a4d)'
          : 'rgba(16, 185, 129, 0.4)'

        const refLabel = entry.reference_date ? fmtDate(entry.reference_date) : null
        const projLabel = fmtDate(entry.projected_end_date)
        const enteredLabel = fmtDate(entry.entered_at)

        return (
          <div key={entry.key} style={{ position: 'relative', display: 'flex', gap: '0.85rem', alignItems: 'stretch', paddingBottom: isLast ? 0 : '1rem' }}>
            {!isLast && (
              <div style={{ position: 'absolute', left: 11, top: 26, bottom: 4, width: 2, background: isCompleted ? 'rgba(16, 185, 129, 0.35)' : 'color-mix(in srgb, currentColor 10%, transparent)' }} />
            )}
            <div style={{ position: 'relative', flexShrink: 0, paddingTop: isCurrent ? 14 : 18, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: dotBg, boxShadow: dotRing, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                {isCompleted ? <Check size={12} /> : isCurrent ? <Clock size={12} /> : isHighlighted ? <AlertTriangle size={12} /> : <div style={{ width: 6, height: 6, borderRadius: '50%', background: isFuture ? 'currentColor' : 'transparent', opacity: 0.4 }} />}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, padding: isCurrent ? '0.85rem' : '0.65rem 0.85rem', borderRadius: 14, background: cardBg, border: `1.5px solid ${cardBorder}`, boxShadow: isCurrent ? '0 6px 20px rgba(45, 90, 61, 0.10)' : 'none', transition: 'all 0.3s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: isCurrent ? '0.6rem' : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0 }}>
                  <div style={{ fontSize: isCurrent ? '0.95rem' : '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.label}</div>
                </div>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '3px 8px', borderRadius: 99, background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : isHighlighted ? 'rgba(251, 191, 36, 0.18)' : isCurrent ? 'rgba(45, 90, 61, 0.15)' : 'color-mix(in srgb, currentColor 6%, transparent)', color: isCompleted ? '#059669' : isHighlighted ? '#92400e' : isCurrent ? '#2d5a3d' : 'inherit', opacity: isFuture ? 0.6 : 1, flexShrink: 0 }}>
                  {isCompleted ? 'Listo' : isHighlighted ? 'Atención' : isCurrent ? 'En curso' : 'Próxima'}
                </div>
              </div>
              {isCurrent && entry.days_in_current != null && entry.duration_days > 0 && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <span style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: '1.5rem', fontWeight: 700, lineHeight: 1, color: 'var(--foreground)' }}>
                      Día {entry.days_in_current}
                      <span style={{ fontSize: '0.95rem', opacity: 0.5, fontWeight: 500 }}> de {entry.duration_days}</span>
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: isOverdue ? '#b91c1c' : 'var(--primary)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 99, background: 'color-mix(in srgb, currentColor 8%, transparent)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 99, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  </div>
                  {isOverdue && (
                    <div style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: 'rgba(220, 38, 38, 0.12)', color: '#b91c1c', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
                      <AlertTriangle size={11} /> +{entry.days_overdue} días vencidos
                    </div>
                  )}
                  <div style={{ marginTop: '0.6rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.7rem' }}>
                    {refLabel && (
                      <div>
                        <div style={{ opacity: 0.55, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.6rem' }}>Inicio</div>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>{refLabel}</div>
                      </div>
                    )}
                    {projLabel && (
                      <div>
                        <div style={{ opacity: 0.55, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.6rem' }}>Fin est.</div>
                        <div style={{ fontWeight: 600, marginTop: 2 }}>{projLabel}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!isCurrent && (enteredLabel || entry.duration_days > 0) && (
                <div style={{ fontSize: '0.7rem', opacity: 0.6, marginTop: 2 }}>
                  {enteredLabel ? <>Inició {enteredLabel}</> : null}
                  {enteredLabel && entry.duration_days > 0 ? ' · ' : null}
                  {entry.duration_days > 0 ? <>{entry.duration_days} días</> : null}
                </div>
              )}
            </div>
          </div>
        )
      })}
      <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', opacity: 0.55, padding: '0.5rem 0.85rem', background: 'color-mix(in srgb, currentColor 3%, transparent)', borderRadius: 10 }}>
        <Info size={12} />
        <span>{tooltipText}</span>
      </div>
    </div>
  )

  return (
    <div>
      {renderMobile()}
      {renderDesktop()}
    </div>
  )
}

const cardStyle: React.CSSProperties = { background: 'var(--surface)', border: '1px solid color-mix(in srgb, currentColor 8%, transparent)', borderRadius: 16, padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem 1rem', borderRadius: 12, border: '1px solid color-mix(in srgb, currentColor 15%, transparent)', background: 'color-mix(in srgb, currentColor 3%, transparent)', color: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none', WebkitAppearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', paddingRight: '2.5rem' }
const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 700, opacity: 0.8, marginBottom: '-0.5rem', color: 'inherit' }
const errStyle: React.CSSProperties = { background: 'color-mix(in srgb, var(--danger) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--danger) 33%, transparent)', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 500 }

function btnStyle(cssColor: string, full = false): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    background: `linear-gradient(135deg, ${cssColor}, color-mix(in srgb, ${cssColor} 80%, #000))`,
    color: 'white',
    fontWeight: 700,
    fontSize: '0.9rem',
    transition: 'all .2s cubic-bezier(0.4, 0, 0.2, 1)',
    width: full ? '100%' : undefined,
    justifyContent: full ? 'center' : undefined,
    boxShadow: `0 4px 12px color-mix(in srgb, ${cssColor} 27%, transparent)`,
    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
  }
}
