'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sprout, Plus, MapPin, Ruler, Trash2, X, ChevronRight, Leaf, BarChart3, TreePine } from 'lucide-react'
import Image from 'next/image'

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
  observaciones?: string
  potreros?: { nombre: string; area_total_m2: number }
}

const ESTADO_COLORS: Record<string, string> = {
  en_crecimiento: 'var(--color-success, #22c55e)',
  cosechado: 'var(--color-primary, #a78bfa)',
  en_descanso: 'var(--color-warning, #f59e0b)',
  fallido: 'var(--color-danger, #ef4444)',
  en_preparacion: 'var(--color-info, #38bdf8)',
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
export function SembriosClient() {
  const [potreros, setPotreros] = useState<Potrero[]>([])
  const [sembrios, setSembrios] = useState<Sembrio[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'mapa' | 'potreros' | 'sembrios'>('mapa')
  const [selectedPotrero, setSelectedPotrero] = useState<Potrero | null>(null)
  const [showPotreroForm, setShowPotreroForm] = useState(false)
  const [showSembrioForm, setShowSembrioForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [potreroForm, setPotreroForm] = useState({ nombre: '', descripcion: '', area_total_m2: '', tipo_suelo: '', ubicacion_referencia: '' })
  const [sembrioForm, setSembrioForm] = useState({ potrero_id: '', tipo_cultivo: '', variedad: '', area_sembrada_m2: '', fecha_siembra: '', fecha_cosecha_estimada: '', estado: 'en_crecimiento', observaciones: '' })

  const loadData = useCallback(async () => {
    setLoading(true)
    const [pr, sr] = await Promise.all([fetch('/api/potreros'), fetch('/api/sembrios')])
    const [pd, sd] = await Promise.all([pr.json(), sr.json()])
    setPotreros(pd.data || [])
    setSembrios(sd.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function savePotrero() {
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
    if (!confirm('¿Eliminar este potrero y todos sus sembríos?')) return
    await fetch(`/api/potreros/${id}`, { method: 'DELETE' })
    await loadData()
  }

  async function deleteSembrio(id: string) {
    if (!confirm('¿Eliminar este sembrío?')) return
    await fetch(`/api/sembrios/${id}`, { method: 'DELETE' })
    await loadData()
  }

  const totalArea = potreros.reduce((s, p) => s + p.area_total_m2, 0)
  const totalOcupado = potreros.reduce((s, p) => s + p.area_ocupada_m2, 0)

  return (
    <div style={{ fontFamily: 'var(--font-sans, system-ui)', color: 'var(--color-foreground)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'color-mix(in srgb, #22c55e 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sprout size={20} color="#22c55e" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Sembríos</h1>
            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.6 }}>Gestión de potreros y cultivos</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => setShowPotreroForm(true)} style={btnStyle('#22c55e')}><Plus size={14} /> Nuevo Potrero</button>
          <button onClick={() => setShowSembrioForm(true)} disabled={potreros.length === 0} style={btnStyle('#a78bfa')}><Leaf size={14} /> Registrar Sembrío</button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Potreros', value: potreros.length, icon: <MapPin size={16} />, color: '#38bdf8' },
          { label: 'Área Total', value: `${fmt(totalArea)} m²`, icon: <Ruler size={16} />, color: '#22c55e' },
          { label: 'Área Ocupada', value: `${fmt(totalOcupado)} m²`, icon: <Sprout size={16} />, color: '#f59e0b' },
          { label: 'Sembríos Activos', value: sembrios.filter(s => s.estado === 'en_crecimiento').length, icon: <Leaf size={16} />, color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', color: s.color }}>{s.icon}<span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{s.label}</span></div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'color-mix(in srgb, currentColor 5%, transparent)', borderRadius: 10, padding: '0.25rem', width: 'fit-content' }}>
        {(['mapa', 'potreros', 'sembrios'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '0.4rem 1rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: tab === t ? 600 : 400, background: tab === t ? 'var(--color-surface, white)' : 'transparent', color: 'inherit', textTransform: 'capitalize', fontSize: '0.85rem', boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all .2s' }}>
            {t === 'mapa' ? '🗺️ Mapa' : t === 'potreros' ? '🌿 Potreros' : '🌱 Sembríos'}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>Cargando...</div>}

      {/* TAB: MAPA */}
      {!loading && tab === 'mapa' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <TreePine size={16} color="#22c55e" />
            <strong>Mapa de Finca Tigrillo</strong>
            <span style={{ fontSize: '0.72rem', opacity: 0.55, marginLeft: 'auto' }}>Vía Chone – Colorado</span>
          </div>
          <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#f8fafc', border: '1px solid color-mix(in srgb, currentColor 10%, transparent)' }}>
            <Image src="/mapa_finca.png" alt="Mapa Finca Tigrillo" width={1400} height={900} style={{ width: '100%', height: 'auto', display: 'block' }} priority />
          </div>
          {potreros.length > 0 && (
            <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {potreros.map(p => (
                <div key={p.id} style={{ ...cardStyle, cursor: 'pointer', borderLeft: '3px solid #22c55e' }} onClick={() => { setSelectedPotrero(p); setTab('potreros') }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.nombre}</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.6 }}>{fmt(p.area_total_m2)} m² · {p.total_sembrios} sembríos</div>
                  <div style={{ marginTop: '0.4rem', height: 4, borderRadius: 4, background: 'color-mix(in srgb, currentColor 10%, transparent)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 4, background: '#22c55e', width: `${Math.min(100, (p.area_ocupada_m2 / p.area_total_m2) * 100)}%`, transition: 'width .4s' }} />
                  </div>
                  <div style={{ fontSize: '0.68rem', opacity: 0.5, marginTop: '0.2rem' }}>{fmt(p.area_disponible_m2)} m² disponibles</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: POTREROS */}
      {!loading && tab === 'potreros' && (
        <div>
          {potreros.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>No hay potreros. Crea el primero.</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {potreros.map(p => {
              const pct = Math.min(100, (p.area_ocupada_m2 / p.area_total_m2) * 100)
              return (
                <div key={p.id} style={{ ...cardStyle, cursor: 'pointer', outline: selectedPotrero?.id === p.id ? '2px solid #22c55e' : 'none' }} onClick={() => setSelectedPotrero(selectedPotrero?.id === p.id ? null : p)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.nombre}</div>
                      {p.tipo_suelo && <div style={{ fontSize: '0.72rem', opacity: 0.55 }}>Suelo: {p.tipo_suelo}</div>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); deletePotrero(p.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}><Trash2 size={14} /></button>
                  </div>
                  <div style={{ margin: '0.75rem 0 0.25rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                    <span><strong>{fmt(p.area_total_m2)}</strong> m² total</span>
                    <span style={{ color: '#22c55e' }}>{fmt(p.area_disponible_m2)} m² libres</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 6, background: 'color-mix(in srgb, currentColor 10%, transparent)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 6, background: pct > 80 ? '#f59e0b' : '#22c55e', width: `${pct}%`, transition: 'width .4s' }} />
                  </div>
                  <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>{p.total_sembrios} sembríos</span>
                    <ChevronRight size={14} style={{ opacity: 0.4 }} />
                  </div>
                  {selectedPotrero?.id === p.id && (
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid color-mix(in srgb, currentColor 10%, transparent)' }}>
                      {sembrios.filter(s => s.potrero_id === p.id).length === 0
                        ? <div style={{ fontSize: '0.78rem', opacity: 0.5, textAlign: 'center' }}>Sin sembríos registrados</div>
                        : sembrios.filter(s => s.potrero_id === p.id).map(s => (
                          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid color-mix(in srgb, currentColor 5%, transparent)' }}>
                            <div>
                              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{s.tipo_cultivo}{s.variedad ? ` (${s.variedad})` : ''}</div>
                              <div style={{ fontSize: '0.7rem', opacity: 0.55 }}>{fmt(s.area_sembrada_m2)} m² · {new Date(s.fecha_siembra).toLocaleDateString('es-EC')}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 99, background: `${ESTADO_COLORS[s.estado]}22`, color: ESTADO_COLORS[s.estado], fontWeight: 600 }}>{ESTADO_LABEL[s.estado]}</span>
                              <button onClick={() => deleteSembrio(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}><X size={12} /></button>
                            </div>
                          </div>
                        ))
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
          {sembrios.length === 0 && <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>No hay sembríos. Registra el primero.</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {sembrios.map(s => (
              <div key={s.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: ESTADO_COLORS[s.estado], flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.tipo_cultivo}{s.variedad ? ` · ${s.variedad}` : ''}</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.6 }}>{s.potreros?.nombre || '—'} · {fmt(s.area_sembrada_m2)} m²</div>
                </div>
                <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{new Date(s.fecha_siembra).toLocaleDateString('es-EC')}</div>
                <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 99, background: `${ESTADO_COLORS[s.estado]}22`, color: ESTADO_COLORS[s.estado], fontWeight: 600 }}>{ESTADO_LABEL[s.estado]}</span>
                <button onClick={() => deleteSembrio(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FORM: Potrero */}
      {showPotreroForm && (
        <Modal title="Nuevo Potrero" onClose={() => setShowPotreroForm(false)}>
          {error && <div style={errStyle}>{error}</div>}
          <label style={labelStyle}>Nombre del Potrero *</label>
          <input style={inputStyle} placeholder="Ej: Potrero Norte" value={potreroForm.nombre} onChange={e => setPotreroForm(f => ({ ...f, nombre: e.target.value }))} />
          <label style={labelStyle}>Área Total (m²) *</label>
          <input style={inputStyle} type="number" min="1" placeholder="Ej: 15000" value={potreroForm.area_total_m2} onChange={e => setPotreroForm(f => ({ ...f, area_total_m2: e.target.value }))} />
          <label style={labelStyle}>Tipo de Suelo</label>
          <select style={inputStyle} value={potreroForm.tipo_suelo} onChange={e => setPotreroForm(f => ({ ...f, tipo_suelo: e.target.value }))}>
            <option value="">Seleccionar...</option>
            {['Arcilloso', 'Arenoso', 'Franco', 'Limoso', 'Franco-arcilloso', 'Franco-arenoso'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <label style={labelStyle}>Referencia en el Mapa</label>
          <input style={inputStyle} placeholder="Ej: Lote superior izquierdo" value={potreroForm.ubicacion_referencia} onChange={e => setPotreroForm(f => ({ ...f, ubicacion_referencia: e.target.value }))} />
          <label style={labelStyle}>Descripción</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} placeholder="Notas adicionales..." value={potreroForm.descripcion} onChange={e => setPotreroForm(f => ({ ...f, descripcion: e.target.value }))} />
          <button style={btnStyle('#22c55e', true)} onClick={savePotrero} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Potrero'}</button>
        </Modal>
      )}

      {/* FORM: Sembrío */}
      {showSembrioForm && (
        <Modal title="Registrar Sembrío" onClose={() => setShowSembrioForm(false)}>
          {error && <div style={errStyle}>{error}</div>}
          <label style={labelStyle}>Potrero *</label>
          <select style={inputStyle} value={sembrioForm.potrero_id} onChange={e => setSembrioForm(f => ({ ...f, potrero_id: e.target.value }))}>
            <option value="">Seleccionar potrero...</option>
            {potreros.map(p => <option key={p.id} value={p.id}>{p.nombre} — {fmt(p.area_disponible_m2)} m² disponibles</option>)}
          </select>
          <label style={labelStyle}>Tipo de Cultivo *</label>
          <input style={inputStyle} placeholder="Ej: Maíz, Pasto Saboya, Yuca..." value={sembrioForm.tipo_cultivo} onChange={e => setSembrioForm(f => ({ ...f, tipo_cultivo: e.target.value }))} />
          <label style={labelStyle}>Variedad</label>
          <input style={inputStyle} placeholder="Ej: Híbrido H-551" value={sembrioForm.variedad} onChange={e => setSembrioForm(f => ({ ...f, variedad: e.target.value }))} />
          <label style={labelStyle}>Área Sembrada (m²) *</label>
          <input style={inputStyle} type="number" min="1" placeholder="Ej: 5000" value={sembrioForm.area_sembrada_m2} onChange={e => setSembrioForm(f => ({ ...f, area_sembrada_m2: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <label style={labelStyle}>Fecha de Siembra *</label>
              <input style={inputStyle} type="date" value={sembrioForm.fecha_siembra} onChange={e => setSembrioForm(f => ({ ...f, fecha_siembra: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Cosecha Estimada</label>
              <input style={inputStyle} type="date" value={sembrioForm.fecha_cosecha_estimada} onChange={e => setSembrioForm(f => ({ ...f, fecha_cosecha_estimada: e.target.value }))} />
            </div>
          </div>
          <label style={labelStyle}>Estado</label>
          <select style={inputStyle} value={sembrioForm.estado} onChange={e => setSembrioForm(f => ({ ...f, estado: e.target.value }))}>
            {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label style={labelStyle}>Observaciones</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} placeholder="Notas..." value={sembrioForm.observaciones} onChange={e => setSembrioForm(f => ({ ...f, observaciones: e.target.value }))} />
          <button style={btnStyle('#a78bfa', true)} onClick={saveSembrio} disabled={saving}>{saving ? 'Guardando...' : 'Registrar Sembrío'}</button>
        </Modal>
      )}
    </div>
  )
}

/* ─── Helpers ─────────────────────────────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', padding: '1rem' }}>
      <div style={{ background: 'var(--color-surface, white)', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <strong style={{ fontSize: '1rem' }}>{title}</strong>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.6 }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = { background: 'var(--color-surface, white)', border: '1px solid color-mix(in srgb, currentColor 10%, transparent)', borderRadius: 12, padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid color-mix(in srgb, currentColor 15%, transparent)', background: 'color-mix(in srgb, currentColor 4%, transparent)', color: 'inherit', fontSize: '0.875rem', boxSizing: 'border-box', outline: 'none' }
const labelStyle: React.CSSProperties = { fontSize: '0.75rem', fontWeight: 600, opacity: 0.7, marginBottom: '-0.3rem' }
const errStyle: React.CSSProperties = { background: '#ef444422', border: '1px solid #ef4444', borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: '#ef4444' }

function btnStyle(color: string, full = false): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.9rem', borderRadius: 8, border: 'none', cursor: 'pointer', background: `${color}22`, color, fontWeight: 600, fontSize: '0.82rem', transition: 'background .2s', width: full ? '100%' : undefined, justifyContent: full ? 'center' : undefined }
}
