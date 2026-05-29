'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sprout, Plus, MapPin, Ruler, Trash2, X, ChevronRight, Leaf, TreePine } from 'lucide-react'
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

interface SembriosClientProps {
  userRole?: string
}

const ESTADO_COLORS: Record<string, string> = {
  en_crecimiento: '#22c55e',
  cosechado: '#a78bfa',
  en_descanso: '#f59e0b',
  fallido: '#ef4444',
  en_preparacion: '#38bdf8',
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
    <div style={{ fontFamily: 'var(--font-sans, system-ui)', color: 'var(--color-foreground)', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem', background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05), rgba(167, 139, 250, 0.05))', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #22c55e, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)' }}>
            <Sprout size={24} color="white" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Sembríos</h1>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7, marginTop: '0.2rem' }}>Gestión avanzada de potreros y cultivos</p>
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => setShowPotreroForm(true)} style={btnStyle('#22c55e')}><Plus size={16} /> Nuevo Potrero</button>
            <button onClick={() => setShowSembrioForm(true)} disabled={potreros.length === 0} style={btnStyle('#a78bfa')}><Leaf size={16} /> Registrar Sembrío</button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Potreros', value: potreros.length, icon: <MapPin size={20} />, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)' },
          { label: 'Área Total', value: `${fmt(totalArea)} m²`, icon: <Ruler size={20} />, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
          { label: 'Área Ocupada', value: `${fmt(totalOcupado)} m²`, icon: <Sprout size={20} />, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' },
          { label: 'Sembríos Activos', value: sembrios.filter(s => s.estado === 'en_crecimiento').length, icon: <Leaf size={20} />, color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)' },
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
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.04)', borderRadius: 12, padding: '0.35rem', width: 'fit-content', border: '1px solid rgba(0,0,0,0.05)', boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.02)' }}>
        {(['mapa', 'potreros', 'sembrios'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: tab === t ? 700 : 500, background: tab === t ? '#ffffff' : 'transparent', color: tab === t ? '#000000' : 'rgba(0,0,0,0.6)', textTransform: 'capitalize', fontSize: '0.9rem', boxShadow: tab === t ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', transition: 'all .3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
            {t === 'mapa' ? 'Mapa' : t === 'potreros' ? 'Potreros' : 'Sembríos'}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div className="spinner" style={{ width: 32, height: 32, border: '3px solid rgba(34, 197, 94, 0.2)', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <span style={{ opacity: 0.6, fontWeight: 500 }}>Cargando datos del terreno...</span>
        </div>
      )}

      {/* TAB: MAPA */}
      {!loading && tab === 'mapa' && (
        <div style={{ ...cardStyle, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.4rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8 }}>
              <TreePine size={20} color="#22c55e" />
            </div>
            <div>
              <strong style={{ fontSize: '1.1rem', display: 'block' }}>Mapa Referencial de Finca Tigrillo</strong>
              <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>Vía Chone – Colorado</span>
            </div>
          </div>
          <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#f8fafc', border: '1px solid color-mix(in srgb, currentColor 8%, transparent)', boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.02)' }}>
            <Image src="/mapa_finca.png" alt="Mapa Finca Tigrillo" width={1400} height={900} style={{ width: '100%', height: 'auto', display: 'block', transition: 'transform 0.5s' }} className="hover-zoom" priority />
            <style>{`.hover-zoom:hover { transform: scale(1.02); }`}</style>
          </div>
          {potreros.length > 0 && (
            <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
              {potreros.map(p => (
                <div key={p.id} style={{ ...cardStyle, cursor: 'pointer', borderLeft: '4px solid #22c55e', padding: '1rem', transition: 'transform 0.2s, box-shadow 0.2s' }} onClick={() => { setSelectedPotrero(p); setTab('potreros') }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.08)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{p.nombre}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.2rem' }}>{fmt(p.area_total_m2)} m² · {p.total_sembrios} sembríos</div>
                  <div style={{ marginTop: '0.75rem', height: 6, borderRadius: 6, background: 'color-mix(in srgb, currentColor 8%, transparent)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 6, background: 'linear-gradient(90deg, #22c55e, #10b981)', width: `${Math.min(100, (p.area_ocupada_m2 / p.area_total_m2) * 100)}%`, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {potreros.map(p => {
              const pct = Math.min(100, (p.area_ocupada_m2 / p.area_total_m2) * 100)
              const isSelected = selectedPotrero?.id === p.id
              return (
                <div key={p.id} style={{ ...cardStyle, cursor: 'pointer', border: isSelected ? '2px solid #22c55e' : '1px solid color-mix(in srgb, currentColor 8%, transparent)', transition: 'all 0.3s', padding: '1.25rem' }} onClick={() => setSelectedPotrero(isSelected ? null : p)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{p.nombre}</div>
                      {p.tipo_suelo && <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={12} /> {p.tipo_suelo}</div>}
                    </div>
                    {isAdmin && (
                      <button onClick={e => { e.stopPropagation(); deletePotrero(p.id) }} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.4rem', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'} title="Eliminar Potrero">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div style={{ margin: '1rem 0 0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', background: 'rgba(0,0,0,0.03)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    <span><strong style={{ fontSize: '0.9rem' }}>{fmt(p.area_total_m2)}</strong> m² total</span>
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>{fmt(p.area_disponible_m2)} m² libres</span>
                  </div>
                  
                  <div style={{ height: 8, borderRadius: 8, background: 'rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: '1rem' }}>
                    <div style={{ height: '100%', borderRadius: 8, background: pct > 80 ? 'linear-gradient(90deg, #f59e0b, #ef4444)' : 'linear-gradient(90deg, #22c55e, #10b981)', width: `${pct}%`, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'color-mix(in srgb, currentColor 70%, transparent)' }}>{p.total_sembrios} sembríos activos</span>
                    <ChevronRight size={18} style={{ opacity: isSelected ? 1 : 0.4, transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'all 0.3s' }} color={isSelected ? '#22c55e' : 'currentColor'} />
                  </div>
                  
                  {isSelected && (
                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed color-mix(in srgb, currentColor 15%, transparent)', animation: 'fadeIn 0.3s ease-out' }}>
                      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                      {sembrios.filter(s => s.potrero_id === p.id).length === 0
                        ? <div style={{ fontSize: '0.8rem', opacity: 0.5, textAlign: 'center', padding: '1rem' }}>Sin sembríos registrados en este potrero</div>
                        : sembrios.filter(s => s.potrero_id === p.id).map(s => (
                          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', margin: '0 -0.5rem', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{s.tipo_cultivo}{s.variedad ? <span style={{ opacity: 0.6, fontWeight: 500 }}> ({s.variedad})</span> : ''}</div>
                              <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.1rem' }}>{fmt(s.area_sembrada_m2)} m² · {new Date(s.fecha_siembra).toLocaleDateString('es-EC')}</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.65rem', padding: '3px 8px', borderRadius: 99, background: `${ESTADO_COLORS[s.estado]}22`, color: ESTADO_COLORS[s.estado], border: `1px solid ${ESTADO_COLORS[s.estado]}44`, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{ESTADO_LABEL[s.estado]}</span>
                              {isAdmin && (
                                <button onClick={() => deleteSembrio(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.2rem', opacity: 0.5, transition: 'opacity 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.5'} title="Eliminar Sembrío"><X size={16} /></button>
                              )}
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
          {sembrios.length === 0 && <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>{isAdmin ? 'No hay sembríos. Registra el primero.' : 'No hay sembríos registrados actualmente.'}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {sembrios.map(s => (
              <div key={s.id} style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', padding: '1.25rem', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)' }} onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: ESTADO_COLORS[s.estado], flexShrink: 0, boxShadow: `0 0 8px ${ESTADO_COLORS[s.estado]}88` }} />
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{s.tipo_cultivo}{s.variedad ? <span style={{ opacity: 0.6, fontWeight: 500 }}> · {s.variedad}</span> : ''}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <MapPin size={12} /> {s.potreros?.nombre || '—'} <span style={{ opacity: 0.3 }}>|</span> <Ruler size={12} /> {fmt(s.area_sembrada_m2)} m²
                  </div>
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.7, fontWeight: 500, background: 'rgba(0,0,0,0.04)', padding: '0.4rem 0.75rem', borderRadius: '6px' }}>
                  {new Date(s.fecha_siembra).toLocaleDateString('es-EC')}
                </div>
                <span style={{ fontSize: '0.75rem', padding: '4px 12px', borderRadius: 99, background: `${ESTADO_COLORS[s.estado]}22`, color: ESTADO_COLORS[s.estado], border: `1px solid ${ESTADO_COLORS[s.estado]}44`, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase' }}>{ESTADO_LABEL[s.estado]}</span>
                {isAdmin && (
                  <button onClick={() => deleteSembrio(s.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'} title="Eliminar Sembrío"><Trash2 size={16} /></button>
                )}
              </div>
            ))}
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
          <select style={inputStyle} value={potreroForm.tipo_suelo} onChange={e => setPotreroForm(f => ({ ...f, tipo_suelo: e.target.value }))}>
            <option value="">Seleccionar...</option>
            {['Arcilloso', 'Arenoso', 'Franco', 'Limoso', 'Franco-arcilloso', 'Franco-arenoso'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <label style={labelStyle}>Referencia en el Mapa</label>
          <input style={inputStyle} placeholder="Ej: Lote superior izquierdo" value={potreroForm.ubicacion_referencia} onChange={e => setPotreroForm(f => ({ ...f, ubicacion_referencia: e.target.value }))} />
          <label style={labelStyle}>Descripción</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} placeholder="Notas adicionales sobre este potrero..." value={potreroForm.descripcion} onChange={e => setPotreroForm(f => ({ ...f, descripcion: e.target.value }))} />
          <div style={{ marginTop: '0.5rem' }}>
            <button style={btnStyle('#22c55e', true)} onClick={savePotrero} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Potrero'}</button>
          </div>
        </Modal>
      )}

      {/* FORM: Sembrío */}
      {isAdmin && showSembrioForm && (
        <Modal title="Registrar Sembrío" onClose={() => setShowSembrioForm(false)}>
          {error && <div style={errStyle}>{error}</div>}
          <label style={labelStyle}>Potrero Destino *</label>
          <select style={inputStyle} value={sembrioForm.potrero_id} onChange={e => setSembrioForm(f => ({ ...f, potrero_id: e.target.value }))}>
            <option value="">Seleccionar potrero...</option>
            {potreros.map(p => <option key={p.id} value={p.id}>{p.nombre} — {fmt(p.area_disponible_m2)} m² disponibles</option>)}
          </select>
          <label style={labelStyle}>Tipo de Cultivo *</label>
          <input style={inputStyle} placeholder="Ej: Maíz, Pasto Saboya, Yuca..." value={sembrioForm.tipo_cultivo} onChange={e => setSembrioForm(f => ({ ...f, tipo_cultivo: e.target.value }))} />
          <label style={labelStyle}>Variedad (Opcional)</label>
          <input style={inputStyle} placeholder="Ej: Híbrido H-551" value={sembrioForm.variedad} onChange={e => setSembrioForm(f => ({ ...f, variedad: e.target.value }))} />
          <label style={labelStyle}>Área Sembrada (m²) *</label>
          <input style={inputStyle} type="number" min="1" placeholder="Ej: 5000" value={sembrioForm.area_sembrada_m2} onChange={e => setSembrioForm(f => ({ ...f, area_sembrada_m2: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
          <select style={inputStyle} value={sembrioForm.estado} onChange={e => setSembrioForm(f => ({ ...f, estado: e.target.value }))}>
            {Object.entries(ESTADO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label style={labelStyle}>Observaciones</label>
          <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} placeholder="Notas adicionales sobre el cultivo..." value={sembrioForm.observaciones} onChange={e => setSembrioForm(f => ({ ...f, observaciones: e.target.value }))} />
          <div style={{ marginTop: '0.5rem' }}>
            <button style={btnStyle('#a78bfa', true)} onClick={saveSembrio} disabled={saving}>{saving ? 'Registrando...' : 'Registrar Sembrío'}</button>
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
      <div style={{ background: 'var(--color-surface, white)', borderRadius: 24, padding: '2rem', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', paddingBottom: '1rem', borderBottom: '1px solid color-mix(in srgb, currentColor 8%, transparent)' }}>
          <strong style={{ fontSize: '1.25rem', fontWeight: 800 }}>{title}</strong>
          <button onClick={onClose} style={{ background: 'color-mix(in srgb, currentColor 5%, transparent)', border: 'none', cursor: 'pointer', color: 'inherit', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, currentColor 10%, transparent)'} onMouseLeave={e => e.currentTarget.style.background = 'color-mix(in srgb, currentColor 5%, transparent)'}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = { background: 'var(--color-surface, white)', border: '1px solid color-mix(in srgb, currentColor 8%, transparent)', borderRadius: 16, padding: '1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }
const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem 1rem', borderRadius: 12, border: '1px solid color-mix(in srgb, currentColor 15%, transparent)', background: 'color-mix(in srgb, currentColor 3%, transparent)', color: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none', transition: 'all 0.2s', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)' }
const labelStyle: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 700, opacity: 0.8, marginBottom: '-0.5rem', color: 'inherit' }
const errStyle: React.CSSProperties = { background: '#ef444415', border: '1px solid #ef444455', borderRadius: 12, padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#ef4444', fontWeight: 500 }

function btnStyle(color: string, full = false): React.CSSProperties {
  return { 
    display: 'inline-flex', 
    alignItems: 'center', 
    gap: '0.5rem', 
    padding: '0.6rem 1.2rem', 
    borderRadius: 12, 
    border: 'none', 
    cursor: 'pointer', 
    background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 80%, black))`, 
    color: 'white', 
    fontWeight: 700, 
    fontSize: '0.9rem', 
    transition: 'all .2s cubic-bezier(0.4, 0, 0.2, 1)', 
    width: full ? '100%' : undefined, 
    justifyContent: full ? 'center' : undefined,
    boxShadow: `0 4px 12px ${color}44`,
    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
  }
}
