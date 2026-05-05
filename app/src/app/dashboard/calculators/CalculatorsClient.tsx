'use client'

import React, { useState, useEffect } from 'react'
import {
  Calculator, Baby, Wheat, Egg, HeartPulse, Scale,
  Plus, Trash2, Calendar, Info, Loader2, ChevronUp, Lock
} from 'lucide-react'
import {
  calcFechaParto, calcConsumoDiario, calcSacosSemanales,
  calcProduccionHuevosSemanal, calcIntervaloEntreParto,
  calcTasaPrenez, calcFCR,
  GESTATION_DAYS, DEFAULT_SACK_WEIGHT_KG, DEFAULT_EGG_PRODUCTION_PER_DAY,
  REPRODUCTIVE_EVENT_TYPES, SPECIES_LABELS
} from '@/lib/formulas'

/* ──────────── helpers de fecha ──────────── */
// Preferencia global: mostrar fechas en formato dd/mm/yyyy (es-CO)
// Para cambiar el locale o formato, editar SOLO esta función.
function fmtDate(d: Date | null | string) {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// Convierte Date a string ISO yyyy-mm-dd para el value de <input type="date">
function toIso(d: Date) { return d.toISOString().split('T')[0] }

/* ──────────── Tipos ──────────── */
interface AnimalOption {
  id: string; name: string | null; identification_code: string | null; sex?: string
  animal_types: { name: string; slug: string; animal_categories?: { slug: string } }
}
interface ReproEvent {
  id: string; animal_id: string; event_type: string; event_date: string
  expected_due_date: string | null; notes: string | null; created_at: string
  sire_id?: string | null; sire_name?: string | null
  animals?: { name: string | null; identification_code: string | null; animal_types: { name: string; slug: string } }
}

/* ════════════════════════════════════════
   PÁGINA PRINCIPAL
   ════════════════════════════════════════ */
export default function CalculatorsClient({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<'calculadoras' | 'eventos'>('calculadoras')
  const [animals, setAnimals] = useState<AnimalOption[]>([])
  const [loadingAnimals, setLoadingAnimals] = useState(true)

  useEffect(() => {
    fetch('/api/animals?sex=hembra')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAnimals(d) })
      .catch(() => {})
      .finally(() => setLoadingAnimals(false))
  }, [])

  const tabs = [
    { key: 'calculadoras' as const, label: 'Calculadoras', icon: Calculator },
    { key: 'eventos' as const, label: 'Eventos Reproductivos', icon: HeartPulse },
  ]

  return (
    <div className="space-y-6 overflow-hidden min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Calculator className="w-7 h-7 text-primary" />
          Calculadoras <span className="text-primary">&amp; Reproductivo</span>
        </h1>
        <p className="text-muted mt-1 text-sm">Herramientas de gestión ganadera con fórmulas del sector pecuario</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all
                ${activeTab === t.key
                  ? 'bg-surface border border-border border-b-surface text-primary -mb-px'
                  : 'text-muted hover:text-foreground'}`}>
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          )
        })}
      </div>

      {activeTab === 'calculadoras' && <CalculadorasTab />}
      {activeTab === 'eventos' && (
        <EventosTab animals={animals} loadingAnimals={loadingAnimals} isAdmin={isAdmin} />
      )}
    </div>
  )
}

/* ════════════════════════════════════════
   TAB: CALCULADORAS ESTÁTICAS
   ════════════════════════════════════════ */
function CalculadorasTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CalcParto />
      <CalcAlimento />
      <CalcHuevos />
      <CalcReproductivo />
      <CalcFCRCard />
    </div>
  )
}

/* ─── Calculadora de Parto ─── */
function CalcParto() {
  const [species, setSpecies] = useState('bovino')
  const [date, setDate] = useState(toIso(new Date()))
  const result = calcFechaParto(new Date(date + 'T12:00:00'), species)

  return (
    <CalcCard title="Calculadora de Parto" icon={<Baby className="w-5 h-5 text-primary" />}
      hint={`Gestación ${SPECIES_LABELS[species]}: ${GESTATION_DAYS[species]} días`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Especie</label>
          <select value={species} onChange={e => setSpecies(e.target.value)} className="input-calc">
            {Object.entries(SPECIES_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <DateField label="Fecha de Monta" value={date} onChange={setDate} />
      </div>
      <ResultBox
        label={species === 'aves-de-corral' ? 'Fecha estimada de eclosión' : 'Fecha estimada de parto'}
        value={fmtDate(result)} accent />
    </CalcCard>
  )
}

/* ─── Calculadora de Alimento ─── */
function CalcAlimento() {
  const [species, setSpecies] = useState('bovino')
  const [count, setCount] = useState(10)
  const [weight, setWeight] = useState(450)
  const [sackKg, setSackKg] = useState(DEFAULT_SACK_WEIGHT_KG)

  const daily = calcConsumoDiario(weight, species)
  const sacks = calcSacosSemanales(count, daily, sackKg)
  const totalKg = count * daily * 7

  return (
    <CalcCard title="Consumo de Alimento" icon={<Wheat className="w-5 h-5 text-primary" />}
      hint="Basado en % Materia Seca Ingerida (DMI)">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Especie</label>
          <select value={species} onChange={e => setSpecies(e.target.value)} className="input-calc">
            {Object.entries(SPECIES_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <NumField label="Cantidad animales" value={count} onChange={setCount} min={1} />
        {species !== 'aves-de-corral' && <NumField label="Peso promedio (kg)" value={weight} onChange={setWeight} min={1} />}
        <NumField label="Peso saco (kg)" value={sackKg} onChange={setSackKg} min={1} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <ResultBox label="kg/animal/día" value={`${daily.toFixed(2)} kg`} />
        <ResultBox label="Total semanal" value={`${totalKg.toFixed(1)} kg`} />
        <div className="col-span-2 md:col-span-1">
          <ResultBox label="Sacos/semana" value={`${sacks}`} accent />
        </div>
      </div>
    </CalcCard>
  )
}

/* ─── Calculadora de Huevos ─── */
function CalcHuevos() {
  const [hens, setHens] = useState(50)
  const [rate, setRate] = useState(DEFAULT_EGG_PRODUCTION_PER_DAY)
  const weekly = calcProduccionHuevosSemanal(hens, rate)

  return (
    <CalcCard title="Producción de Huevos" icon={<Egg className="w-5 h-5 text-primary" />}
      hint="Gallina ponedora comercial: ~0.75 huevos/día">
      <div className="grid grid-cols-2 gap-3">
        <NumField label="Gallinas ponedoras" value={hens} onChange={setHens} min={1} />
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Tasa huevo/día</label>
          <input type="number" step="0.05" min={0} max={1} value={rate}
            onChange={e => setRate(+e.target.value)} className="input-calc" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ResultBox label="Huevos/semana" value={`${weekly}`} accent />
        <ResultBox label="Huevos/mes (est.)" value={`${Math.round(weekly * 4.33)}`} />
      </div>
    </CalcCard>
  )
}

/* ─── Indicadores Reproductivos ─── */
function CalcReproductivo() {
  const [pregnant, setPregnant] = useState(18)
  const [exposed, setExposed] = useState(25)
  const [d1, setD1] = useState('2025-01-15')
  const [d2, setD2] = useState('2026-02-20')

  const rate = calcTasaPrenez(pregnant, exposed)
  const interval = calcIntervaloEntreParto(new Date(d1 + 'T12:00:00'), new Date(d2 + 'T12:00:00'))

  return (
    <CalcCard title="Indicadores Reproductivos" icon={<HeartPulse className="w-5 h-5 text-primary" />}
      hint="Meta bovina: preñez ≥60%, intervalo ≤365 días">
      <div className="grid grid-cols-2 gap-3">
        <NumField label="Hembras preñadas" value={pregnant} onChange={setPregnant} min={0} />
        <NumField label="Hembras expuestas" value={exposed} onChange={setExposed} min={1} />
        <DateField label="Parto anterior" value={d1} onChange={setD1} />
        <DateField label="Parto actual" value={d2} onChange={setD2} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ResultBox label="Tasa de preñez" value={`${rate.toFixed(1)}%`} accent={rate >= 60} warn={rate < 60} />
        <ResultBox label="Intervalo partos" value={`${interval} días`} accent={interval <= 365} warn={interval > 365} />
      </div>
    </CalcCard>
  )
}

/* ─── FCR ─── */
function CalcFCRCard() {
  const [feed, setFeed] = useState(1200)
  const [gain, setGain] = useState(350)
  const fcr = calcFCR(feed, gain)

  return (
    <CalcCard title="Conversión Alimenticia (FCR)" icon={<Scale className="w-5 h-5 text-primary" />}
      hint="Ref: Pollo 1.6–2.0 | Porcino 2.5–3.5 | Bovino 6–10">
      <div className="grid grid-cols-2 gap-3">
        <NumField label="Alimento total (kg)" value={feed} onChange={setFeed} min={0} />
        <NumField label="Peso ganado (kg)" value={gain} onChange={setGain} min={0} />
      </div>
      <ResultBox label="FCR (menor = más eficiente)" value={fcr > 0 ? fcr.toFixed(2) : '—'} accent />
    </CalcCard>
  )
}

/* ════════════════════════════════════════
   TAB: EVENTOS REPRODUCTIVOS (BD)
   ════════════════════════════════════════ */
function EventosTab({ animals, loadingAnimals, isAdmin }: {
  animals: AnimalOption[]; loadingAnimals: boolean; isAdmin: boolean
}) {
  const [events, setEvents] = useState<ReproEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [animalId, setAnimalId]   = useState('')
  const [eventType, setEventType] = useState('monta_natural')
  const [eventDate, setEventDate] = useState(toIso(new Date()))
  const [notes, setNotes]         = useState('')
  const [sireId, setSireId]       = useState('')
  const [sires, setSires]         = useState<AnimalOption[]>([])
  const [loadingSires, setLoadingSires] = useState(false)

  useEffect(() => {
    fetch('/api/reproductive-events')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setEvents(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Fetch sires when monta_natural + animal selected
  useEffect(() => {
    if (eventType !== 'monta_natural' || !animalId) { setSires([]); setSireId(''); return }
    const slug = animals.find(a => a.id === animalId)?.animal_types?.slug
    if (!slug) return
    setLoadingSires(true)
    fetch(`/api/animals?sex=macho&type_slug=${slug}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSires(d) })
      .catch(() => {})
      .finally(() => setLoadingSires(false))
  }, [eventType, animalId, animals])

  function getSpeciesSlug(aid: string) {
    return animals.find(a => a.id === aid)?.animal_types?.slug || ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!animalId) { setError('Selecciona un animal'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/reproductive-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animal_id: animalId,
          event_type: eventType,
          event_date: eventDate,
          notes: notes || null,
          species_slug: getSpeciesSlug(animalId),
          sire_id: (eventType === 'monta_natural' && sireId) ? sireId : null,
        })
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Error al guardar'); return }
      const refreshed = await fetch('/api/reproductive-events').then(r => r.json())
      if (Array.isArray(refreshed)) setEvents(refreshed)
      setShowForm(false); setNotes(''); setSireId('')
    } catch { setError('Error de conexión') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/reproductive-events/${id}`, { method: 'DELETE' })
    setEvents(prev => prev.filter(e => e.id !== id))
    setDeleteId(null)
  }

  const eventLabel = (t: string) => REPRODUCTIVE_EVENT_TYPES.find(r => r.value === t)?.label || t

  if (loading || loadingAnimals) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
  }

  const previewDue = animalId && (eventType === 'monta_natural' || eventType === 'inseminacion')
    ? calcFechaParto(new Date(eventDate + 'T12:00:00'), getSpeciesSlug(animalId))
    : null

  const showSireSelector = eventType === 'monta_natural' && !!animalId

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{events.length} evento{events.length !== 1 ? 's' : ''} registrado{events.length !== 1 ? 's' : ''}</p>
        {isAdmin ? (
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all">
            {showForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cerrar' : 'Registrar Evento'}
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-muted">
            <Lock className="w-3 h-3" /> Solo lectura
          </div>
        )}
      </div>

      {isAdmin && showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          {error && <div className="bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-2 text-sm">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Hembra selector */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Animal (hembra)</label>
              <select value={animalId} onChange={e => { setAnimalId(e.target.value); setSireId('') }} className="input-calc" required>
                <option value="">Seleccionar hembra...</option>
                {animals.filter(a => a.animal_types).map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.identification_code || 'Sin nombre'} — {a.animal_types?.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo evento */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Tipo de Evento</label>
              <select value={eventType} onChange={e => { setEventType(e.target.value); setSireId('') }} className="input-calc">
                {REPRODUCTIVE_EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Sire selector — monta natural only */}
            {showSireSelector && (
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {loadingSires ? 'Cargando machos...' : `Semental (${animals.find(a => a.id === animalId)?.animal_types?.name || ''})`}
                </label>
                <select value={sireId} onChange={e => setSireId(e.target.value)} className="input-calc" disabled={loadingSires}>
                  <option value="">Seleccionar semental (opcional)...</option>
                  {sires.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.identification_code || 'Sin nombre'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <DateField label="Fecha del Evento" value={eventDate} onChange={setEventDate} />
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Notas (opcional)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Observaciones..." className="input-calc" />
            </div>
          </div>

          {previewDue && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 text-sm text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Fecha estimada de parto: <strong>{fmtDate(previewDue)}</strong>
              <span className="text-muted text-xs">({GESTATION_DAYS[getSpeciesSlug(animalId)]} días)</span>
            </div>
          )}
          <button type="submit" disabled={saving}
            className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all">
            {saving ? 'Guardando...' : 'Guardar Evento'}
          </button>
        </form>
      )}

      {events.length > 0 ? (
        <div className="space-y-2">
          {events.map(ev => (
            <div key={ev.id} className="bg-surface border border-border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    ev.event_type === 'parto' ? 'bg-success/10 text-success' :
                    ev.event_type === 'aborto' ? 'bg-danger/10 text-danger' :
                    ev.event_type === 'monta_natural' || ev.event_type === 'inseminacion' ? 'bg-primary/10 text-primary' :
                    'bg-accent/10 text-accent'
                  }`}>{eventLabel(ev.event_type)}</span>
                  <span className="text-sm font-semibold text-foreground truncate">
                    {ev.animals?.name || ev.animals?.identification_code || 'Animal'}
                  </span>
                  <span className="text-xs text-muted">({ev.animals?.animal_types?.name})</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(ev.event_date)}</span>
                  {ev.expected_due_date && (
                    <span className="text-primary font-medium">Parto est.: {fmtDate(ev.expected_due_date)}</span>
                  )}
                  {ev.sire_name && <span className="font-medium text-foreground">Semental: {ev.sire_name}</span>}
                  {ev.notes && <span className="italic truncate max-w-[200px]">{ev.notes}</span>}
                </div>
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 shrink-0">
                  {deleteId === ev.id ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDelete(ev.id)}
                        className="px-3 py-1 text-xs rounded-lg bg-danger text-white hover:bg-danger/80">Sí, eliminar</button>
                      <button onClick={() => setDeleteId(null)}
                        className="px-3 py-1 text-xs rounded-lg border border-border hover:bg-surface-hover">Cancelar</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteId(ev.id)}
                      className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <HeartPulse className="w-10 h-10 text-muted/30 mx-auto mb-2" />
          <p className="text-sm text-muted">No hay eventos reproductivos registrados</p>
          {!isAdmin && <p className="text-xs text-muted mt-1">El administrador registrará los eventos de monta y partos</p>}
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════
   COMPONENTES REUTILIZABLES
   ════════════════════════════════════════ */
function CalcCard({ title, icon, hint, children }: {
  title: string; icon: React.ReactNode; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">{icon}<h3 className="font-semibold text-foreground">{title}</h3></div>
        {hint && <p className="text-xs text-muted flex items-center gap-1"><Info className="w-3 h-3" />{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function ResultBox({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 border ${
      warn ? 'bg-warning/5 border-warning/20' : accent ? 'bg-primary/5 border-primary/20' : 'bg-background border-border'
    }`}>
      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold ${warn ? 'text-warning' : accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  )
}

// DATE_FORMAT: input nativo del navegador. Muestra dd/mm/yyyy en sistemas con
// idioma español y mm/dd/yyyy en sistemas en inglés — comportamiento del OS.
function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1">{label}</label>
      <input type="date" value={value} onChange={e => onChange(e.target.value)} className="input-calc" />
    </div>
  )
}

function NumField({ label, value, onChange, min }: {
  label: string; value: number; onChange: (v: number) => void; min?: number
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1">{label}</label>
      <input type="number" min={min} value={value} onChange={e => onChange(+e.target.value)} className="input-calc" />
    </div>
  )
}
