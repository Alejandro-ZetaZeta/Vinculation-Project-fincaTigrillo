'use client'

import React, { useState, useEffect } from 'react'
import {
  Calculator, Baby, Wheat, Egg, HeartPulse, Scale,
  Plus, Trash2, Calendar, Info, Loader2, ChevronDown, ChevronUp
} from 'lucide-react'
import {
  calcFechaParto, calcConsumoDiario, calcSacosSemanales,
  calcProduccionHuevosSemanal, calcIntervaloEntreParto,
  calcTasaPrenez, calcFCR,
  GESTATION_DAYS, DEFAULT_SACK_WEIGHT_KG, DEFAULT_EGG_PRODUCTION_PER_DAY,
  REPRODUCTIVE_EVENT_TYPES, SPECIES_LABELS
} from '@/lib/formulas'

/* ──────────────── helpers ──────────────── */
function fmtDate(d: Date | null) {
  if (!d) return '—'
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
}
function isoDate(d: Date) { return d.toISOString().split('T')[0] }

/* ──────────────── Tipos ──────────────── */
interface AnimalOption {
  id: string; name: string | null; identification_code: string | null;
  animal_types: { name: string; slug: string; animal_categories: { slug: string } }
}
interface ReproEvent {
  id: string; animal_id: string; event_type: string; event_date: string;
  expected_due_date: string | null; notes: string | null; created_at: string;
  animals?: { name: string | null; identification_code: string | null; animal_types: { name: string; slug: string } }
}

/* ══════════════════════════════════════════
   PÁGINA PRINCIPAL
   ══════════════════════════════════════════ */
export default function CalculatorsPage() {
  const [activeTab, setActiveTab] = useState<'calculadoras' | 'eventos'>('calculadoras')
  const [animals, setAnimals] = useState<AnimalOption[]>([])
  const [loadingAnimals, setLoadingAnimals] = useState(true)

  useEffect(() => {
    fetch('/api/animals')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAnimals(data)
      })
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
          Calculadoras <span className="text-primary">& Reproductivo</span>
        </h1>
        <p className="text-muted mt-1 text-sm">Herramientas de gestión ganadera con fórmulas del sector pecuario</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-0">
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
      {activeTab === 'eventos' && <EventosTab animals={animals} loadingAnimals={loadingAnimals} />}
    </div>
  )
}

/* ══════════════════════════════════════════
   TAB: CALCULADORAS ESTÁTICAS
   ══════════════════════════════════════════ */
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
  const [date, setDate] = useState(isoDate(new Date()))
  const result = calcFechaParto(new Date(date), species)

  return (
    <CalcCard title="Calculadora de Parto" icon={<Baby className="w-5 h-5 text-primary" />}
      hint={`Gestación ${species}: ${GESTATION_DAYS[species]} días`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Especie</label>
          <select value={species} onChange={e => setSpecies(e.target.value)} className="input-calc">
            {Object.entries(SPECIES_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Fecha de Monta</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-calc" />
        </div>
      </div>
      <ResultBox label={species === 'aves-de-corral' ? 'Fecha estimada de eclosión' : 'Fecha estimada de parto'}
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
  const totalWeeklyKg = count * daily * 7

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
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Cantidad animales</label>
          <input type="number" min={1} value={count} onChange={e => setCount(+e.target.value)} className="input-calc" />
        </div>
        {species !== 'aves-de-corral' && (
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Peso promedio (kg)</label>
            <input type="number" min={1} value={weight} onChange={e => setWeight(+e.target.value)} className="input-calc" />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Peso saco (kg)</label>
          <input type="number" min={1} value={sackKg} onChange={e => setSackKg(+e.target.value)} className="input-calc" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <ResultBox label="Consumo/animal/día" value={`${daily.toFixed(2)} kg`} />
        <ResultBox label="Total semanal" value={`${totalWeeklyKg.toFixed(1)} kg`} />
        <ResultBox label="Sacos/semana" value={`${sacks}`} accent />
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
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Gallinas ponedoras</label>
          <input type="number" min={1} value={hens} onChange={e => setHens(+e.target.value)} className="input-calc" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Tasa huevo/día</label>
          <input type="number" step="0.05" min={0} max={1} value={rate} onChange={e => setRate(+e.target.value)} className="input-calc" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ResultBox label="Huevos por semana" value={`${weekly}`} accent />
        <ResultBox label="Huevos por mes (est.)" value={`${Math.round(weekly * 4.33)}`} />
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
  const interval = calcIntervaloEntreParto(new Date(d1), new Date(d2))

  return (
    <CalcCard title="Indicadores Reproductivos" icon={<HeartPulse className="w-5 h-5 text-primary" />}
      hint="Meta bovina: preñez ≥60%, intervalo ≤365 días">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Hembras preñadas</label>
          <input type="number" min={0} value={pregnant} onChange={e => setPregnant(+e.target.value)} className="input-calc" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Hembras expuestas</label>
          <input type="number" min={1} value={exposed} onChange={e => setExposed(+e.target.value)} className="input-calc" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Parto anterior</label>
          <input type="date" value={d1} onChange={e => setD1(e.target.value)} className="input-calc" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Parto actual</label>
          <input type="date" value={d2} onChange={e => setD2(e.target.value)} className="input-calc" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ResultBox label="Tasa de preñez" value={`${rate.toFixed(1)}%`} accent={rate >= 60} warn={rate < 60} />
        <ResultBox label="Intervalo entre partos" value={`${interval} días`} accent={interval <= 365} warn={interval > 365} />
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
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Alimento total (kg)</label>
          <input type="number" min={0} value={feed} onChange={e => setFeed(+e.target.value)} className="input-calc" />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Peso ganado (kg)</label>
          <input type="number" min={0} value={gain} onChange={e => setGain(+e.target.value)} className="input-calc" />
        </div>
      </div>
      <ResultBox label="FCR (menor = más eficiente)" value={fcr > 0 ? fcr.toFixed(2) : '—'} accent />
    </CalcCard>
  )
}

/* ══════════════════════════════════════════
   TAB: EVENTOS REPRODUCTIVOS (BD)
   ══════════════════════════════════════════ */
function EventosTab({ animals, loadingAnimals }: { animals: AnimalOption[]; loadingAnimals: boolean }) {
  const [events, setEvents] = useState<ReproEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  // Form state
  const [animalId, setAnimalId] = useState('')
  const [eventType, setEventType] = useState('monta_natural')
  const [eventDate, setEventDate] = useState(isoDate(new Date()))
  const [notes, setNotes] = useState('')

  // Fetch events
  useEffect(() => {
    fetch('/api/reproductive-events')
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setEvents(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Get species slug for selected animal
  function getSpeciesSlug(aid: string): string {
    const a = animals.find(a => a.id === aid)
    return a?.animal_types?.slug || ''
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
        })
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Error al guardar'); return }

      // Refresh list
      const refreshed = await fetch('/api/reproductive-events').then(r => r.json())
      if (Array.isArray(refreshed)) setEvents(refreshed)
      setShowForm(false)
      setNotes('')
    } catch {
      setError('Error de conexión')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/reproductive-events/${id}`, { method: 'DELETE' })
      setEvents(prev => prev.filter(e => e.id !== id))
      setDeleteId(null)
    } catch { /* ignore */ }
  }

  const eventLabel = (type: string) =>
    REPRODUCTIVE_EVENT_TYPES.find(t => t.value === type)?.label || type

  if (loading || loadingAnimals) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{events.length} evento{events.length !== 1 ? 's' : ''} registrado{events.length !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all">
          {showForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cerrar' : 'Registrar Evento'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          {error && (
            <div className="bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-2 text-sm">{error}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Animal</label>
              <select value={animalId} onChange={e => setAnimalId(e.target.value)} className="input-calc" required>
                <option value="">Seleccionar animal...</option>
                {animals.filter(a => a.animal_types).map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.identification_code || 'Sin nombre'} — {a.animal_types?.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Tipo de Evento</label>
              <select value={eventType} onChange={e => setEventType(e.target.value)} className="input-calc">
                {REPRODUCTIVE_EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Fecha</label>
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="input-calc" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Notas (opcional)</label>
              <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observaciones..."
                className="input-calc" />
            </div>
          </div>

          {/* Preview de fecha de parto si aplica */}
          {animalId && (eventType === 'monta_natural' || eventType === 'inseminacion') && (() => {
            const slug = getSpeciesSlug(animalId)
            const due = calcFechaParto(new Date(eventDate), slug)
            if (!due) return null
            return (
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 text-sm text-primary flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Fecha estimada de parto: <strong>{fmtDate(due)}</strong>
                <span className="text-muted text-xs">({GESTATION_DAYS[slug]} días)</span>
              </div>
            )
          })()}

          <button type="submit" disabled={saving}
            className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all">
            {saving ? 'Guardando...' : 'Guardar Evento'}
          </button>
        </form>
      )}

      {/* Events list */}
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
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(ev.event_date).toLocaleDateString('es-CO')}</span>
                  {ev.expected_due_date && (
                    <span className="text-primary font-medium">Parto estimado: {new Date(ev.expected_due_date).toLocaleDateString('es-CO')}</span>
                  )}
                  {ev.notes && <span className="italic">{ev.notes}</span>}
                </div>
              </div>
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
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center">
          <HeartPulse className="w-10 h-10 text-muted/30 mx-auto mb-2" />
          <p className="text-sm text-muted">No hay eventos reproductivos registrados</p>
          <p className="text-xs text-muted mt-1">Registra montas, inseminaciones y partos para hacer seguimiento</p>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════
   COMPONENTES UI REUTILIZABLES
   ══════════════════════════════════════════ */
function CalcCard({ title, icon, hint, children }: {
  title: string; icon: React.ReactNode; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        {hint && (
          <p className="text-xs text-muted flex items-center gap-1">
            <Info className="w-3 h-3" />{hint}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}

function ResultBox({ label, value, accent, warn }: {
  label: string; value: string; accent?: boolean; warn?: boolean
}) {
  return (
    <div className={`rounded-xl px-3 py-2.5 border ${
      warn ? 'bg-warning/5 border-warning/20' :
      accent ? 'bg-primary/5 border-primary/20' :
      'bg-background border-border'
    }`}>
      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold ${
        warn ? 'text-warning' :
        accent ? 'text-primary' :
        'text-foreground'
      }`}>{value}</p>
    </div>
  )
}
