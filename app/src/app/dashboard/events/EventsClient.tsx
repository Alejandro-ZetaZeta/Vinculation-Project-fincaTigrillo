'use client'

import React, { useState, useEffect } from 'react'
import {
  CalendarDays, HeartPulse, AlertTriangle, Droplets,
  Plus, Trash2, Calendar, Loader2, ChevronUp, Lock,
  Receipt, Paperclip, X, Eye, Download,
} from 'lucide-react'
import {
  calcFechaParto,
  GESTATION_DAYS,
  REPRODUCTIVE_EVENT_TYPES,
} from '@/lib/formulas'

/* ──────────── helpers ──────────── */
function fmtDate(d: Date | null | string) {
  if (!d) return '—'
  // Normalize bare ISO date strings (YYYY-MM-DD) to local noon to avoid UTC-offset day shifts
  const normalized = typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
    ? d + 'T12:00:00'
    : d
  const date = typeof normalized === 'string' ? new Date(normalized) : normalized
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function toIso(d: Date) { return d.toISOString().split('T')[0] }

/* ──────────── tipos ──────────── */
interface AnimalOption {
  id: string
  name: string | null
  identification_code: string | null
  sex?: string
  animal_types: { name: string; slug: string; animal_categories?: { slug: string } }
}

interface ReproEvent {
  id: string
  animal_id: string
  event_type: string
  event_date: string
  expected_due_date: string | null
  notes: string | null
  created_at: string
  sire_id?: string | null
  sire_name?: string | null
  quantity?: number | null
  animals?: { name: string | null; identification_code: string | null; animal_types: { name: string; slug: string } }
}

interface MilkEvent {
  id: string
  animal_id: string
  recorded_date: string
  liters_am: number
  liters_pm: number
  total_liters: number
  notes: string | null
  created_at: string
  animals?: { name: string | null; identification_code: string | null; animal_types: { name: string; slug: string } | null }
}

type EventTab = 'reproductivos' | 'mortalidad' | 'produccion' | 'facturas'

interface Invoice {
  id: string
  event_id: string | null
  file_url: string
  title: string
  notes: string | null
  created_at: string
}

/* ════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ════════════════════════════════════════ */
export default function EventsClient({ isAdmin }: { isAdmin: boolean }) {
  const [activeTab, setActiveTab] = useState<EventTab>('reproductivos')
  const [animals, setAnimals] = useState<AnimalOption[]>([])
  const [loadingAnimals, setLoadingAnimals] = useState(true)

  useEffect(() => {
    fetch('/api/animals')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAnimals(d) })
      .catch(() => { })
      .finally(() => setLoadingAnimals(false))
  }, [])

  const allTabs: { key: EventTab; label: string; shortLabel: string; icon: React.ElementType; adminOnly?: boolean }[] = [
    { key: 'reproductivos', label: 'Reproductivos',       shortLabel: 'Repro',      icon: HeartPulse    },
    { key: 'mortalidad',    label: 'Mortalidad',           shortLabel: 'Bajas',      icon: AlertTriangle },
    { key: 'produccion',    label: 'Producción de Leche',  shortLabel: 'Leche',      icon: Droplets      },
    { key: 'facturas',      label: 'Facturas',             shortLabel: 'Facturas',   icon: Receipt,      adminOnly: true },
  ]
  const tabs = allTabs.filter(t => !t.adminOnly || isAdmin)

  return (
    <div className="space-y-6 overflow-hidden min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <CalendarDays className="w-7 h-7 text-primary" />
          Eventos
        </h1>
        <p className="text-muted mt-1 text-sm">
          Registro de eventos reproductivos, bajas y producción de leche
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 sm:gap-2 border-b border-border overflow-x-auto no-scrollbar">
        {tabs.map(t => {
          const Icon = t.icon
          const isActive = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={[
                'flex items-center gap-2 px-3 sm:px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all whitespace-nowrap shrink-0',
                isActive
                  ? 'bg-surface border border-b-0 border-border text-primary'
                  : 'text-muted hover:text-foreground',
              ].join(' ')}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.shortLabel}</span>
            </button>
          )
        })}
      </div>


      {activeTab === 'reproductivos' && (
        <ReproductivosTab animals={animals} loadingAnimals={loadingAnimals} isAdmin={isAdmin} />
      )}
      {activeTab === 'mortalidad' && (
        <MortalidadTab animals={animals} loadingAnimals={loadingAnimals} isAdmin={isAdmin} />
      )}
      {activeTab === 'produccion' && (
        <ProduccionLecheTab animals={animals} loadingAnimals={loadingAnimals} isAdmin={isAdmin} />
      )}
      {activeTab === 'facturas' && isAdmin && (
        <InvoicesTab isAdmin={isAdmin} />
      )}
    </div>
  )
}

/* ════════════════════════════════════════
   TAB 1 — EVENTOS REPRODUCTIVOS
   ════════════════════════════════════════ */
function ReproductivosTab({
  animals, loadingAnimals, isAdmin,
}: { animals: AnimalOption[]; loadingAnimals: boolean; isAdmin: boolean }) {
  const [events, setEvents] = useState<ReproEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [animalId, setAnimalId] = useState('')
  const [eventType, setEventType] = useState('monta_natural')
  const [eventDate, setEventDate] = useState(toIso(new Date()))
  const [notes, setNotes] = useState('')
  const [sireId, setSireId] = useState('')
  const [sires, setSires] = useState<AnimalOption[]>([])
  const [loadingSires, setLoadingSires] = useState(false)

  const reproEventTypes = REPRODUCTIVE_EVENT_TYPES.filter(t => t.value !== 'muerte')

  useEffect(() => {
    fetch('/api/reproductive-events')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setEvents(d.filter((e: ReproEvent) => e.event_type !== 'muerte'))
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (eventType !== 'monta_natural' || !animalId) { setSires([]); setSireId(''); return }
    const slug = animals.find(a => a.id === animalId)?.animal_types?.slug
    if (!slug) return
    setLoadingSires(true)
    fetch(`/api/animals?sex=macho&type_slug=${slug}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSires(d) })
      .catch(() => { })
      .finally(() => setLoadingSires(false))
  }, [eventType, animalId, animals])

  function getSpeciesSlug(aid: string) {
    return animals.find(a => a.id === aid)?.animal_types?.slug || ''
  }

  const allFemales = animals.filter(a => {
    if (a.animal_types?.slug === 'aves-de-corral') return false
    return a.sex?.toLowerCase() === 'hembra'
  })

  // ── unique species present in the female list ──────────────────────
  const speciesInFemales = Array.from(
    new Set(allFemales.map(a => a.animal_types?.slug).filter(Boolean) as string[])
  )

  // label map for species slugs
  const SPECIES_NAME: Record<string, string> = {
    bovino: 'Bovino', equino: 'Equino', porcino: 'Porcino',
    caprino: 'Caprino', patos: 'Patos',
  }
  const eventTypeLabel = Object.fromEntries(
    REPRODUCTIVE_EVENT_TYPES.map(t => [t.value, t.label])
  )

  // ── form: species filter ──────────────────────────────────────────
  const [formSpecies, setFormSpecies] = useState('')   // '' = all
  const femaleAnimals = formSpecies
    ? allFemales.filter(a => a.animal_types?.slug === formSpecies)
    : allFemales

  // ── log: filter state ─────────────────────────────────────────────
  const [filterSpecies, setFilterSpecies] = useState('')    // '' = all
  const [filterEventType, setFilterEventType] = useState('') // '' = all

  // derive unique species & event types from loaded events
  const logSpecies = Array.from(
    new Set(
      events
        .map(ev => ev.animals?.animal_types?.slug)
        .filter(Boolean) as string[]
    )
  )
  const logEventTypes = Array.from(new Set(events.map(ev => ev.event_type)))

  const filteredEvents = events.filter(ev => {
    if (filterSpecies && ev.animals?.animal_types?.slug !== filterSpecies) return false
    if (filterEventType && ev.event_type !== filterEventType) return false
    return true
  })

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
        }),
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Error al guardar'); return }
      const refreshed = await fetch('/api/reproductive-events').then(r => r.json())
      if (Array.isArray(refreshed)) setEvents(refreshed.filter((ev: ReproEvent) => ev.event_type !== 'muerte'))
      setShowForm(false); setNotes(''); setSireId(''); setAnimalId(''); setFormSpecies('')
    } catch { setError('Error de conexión') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/reproductive-events/${id}`, { method: 'DELETE' })
    setEvents(prev => prev.filter(e => e.id !== id))
    setDeleteId(null)
  }

  const previewDue = animalId && (eventType === 'monta_natural' || eventType === 'inseminacion')
    ? calcFechaParto(new Date(eventDate + 'T12:00:00'), getSpeciesSlug(animalId))
    : null

  if (loading || loadingAnimals) return <TabSpinner />

  return (
    <div className="space-y-4">
      <TabHeader
        count={filteredEvents.length}
        noun="evento reproductivo"
        isAdmin={isAdmin}
        showForm={showForm}
        onToggle={() => setShowForm(v => !v)}
      />

      {isAdmin && showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          {error && <ErrorBanner message={error} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* ── Livestock type selector (form) ── */}
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Tipo de Ganado</label>
              <select
                value={formSpecies}
                onChange={e => { setFormSpecies(e.target.value); setAnimalId(''); setSireId('') }}
                className="input-calc"
              >
                <option value="">Todos los tipos…</option>
                {speciesInFemales.map(slug => (
                  <option key={slug} value={slug}>{SPECIES_NAME[slug] ?? slug}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Animal (hembra)</label>
              <select
                value={animalId}
                onChange={e => { setAnimalId(e.target.value); setSireId('') }}
                className="input-calc"
                required
              >
                <option value="">Seleccionar…</option>
                {femaleAnimals.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.identification_code || 'Sin nombre'} — {a.animal_types?.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Tipo de Evento</label>
              <select
                value={eventType}
                onChange={e => { setEventType(e.target.value); setSireId('') }}
                className="input-calc"
              >
                {reproEventTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {eventType === 'monta_natural' && animalId && (
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  {loadingSires ? 'Cargando sementales…' : `Semental (${animals.find(a => a.id === animalId)?.animal_types?.name || ''})`}
                </label>
                <select
                  value={sireId}
                  onChange={e => setSireId(e.target.value)}
                  className="input-calc"
                  disabled={loadingSires}
                >
                  <option value="">Seleccionar semental (opcional)…</option>
                  {sires.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.identification_code || 'Sin nombre'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <DateField label="Fecha del Evento" value={eventDate} onChange={setEventDate} />

            <div className="col-span-1 sm:col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">Notas (opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observaciones…"
                className="input-calc"
              />
            </div>
          </div>

          {previewDue && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 text-sm text-primary flex items-center gap-2">
              <Calendar className="w-4 h-4 shrink-0" />
              Fecha estimada de parto: <strong>{fmtDate(previewDue)}</strong>
              <span className="text-muted text-xs">({GESTATION_DAYS[getSpeciesSlug(animalId)]} días)</span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all"
          >
            {saving ? 'Guardando…' : 'Guardar Evento'}
          </button>
        </form>
      )}

      {/* ── Log filters ─────────────────────────────────────────────── */}
      {events.length > 0 && (
        <div className="flex flex-col gap-2">
          {/* Species filter row */}
          <div className="flex gap-1.5 flex-wrap items-center">
            <span className="text-xs text-muted font-medium shrink-0">Tipo:</span>
            <button
              onClick={() => setFilterSpecies('')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                filterSpecies === ''
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'text-muted border-border hover:bg-surface-hover'
              }`}
            >
              Todos
            </button>
            {logSpecies.map(slug => (
              <button
                key={slug}
                onClick={() => setFilterSpecies(s => s === slug ? '' : slug)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                  filterSpecies === slug
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'text-muted border-border hover:bg-surface-hover'
                }`}
              >
                {SPECIES_NAME[slug] ?? slug}
              </button>
            ))}
          </div>

          {/* Event-type filter row */}
          {logEventTypes.length > 1 && (
            <div className="flex gap-1.5 flex-wrap items-center">
              <span className="text-xs text-muted font-medium shrink-0">Evento:</span>
              <button
                onClick={() => setFilterEventType('')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                  filterEventType === ''
                    ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                    : 'text-muted border-border hover:bg-surface-hover'
                }`}
              >
                Todos
              </button>
              {logEventTypes.map(et => (
                <button
                  key={et}
                  onClick={() => setFilterEventType(f => f === et ? '' : et)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all border ${
                    filterEventType === et
                      ? 'bg-primary/10 text-primary border-primary/30 shadow-sm'
                      : 'text-muted border-border hover:bg-surface-hover'
                  }`}
                >
                  {eventTypeLabel[et] ?? et}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {filteredEvents.length > 0 ? (
        <div className="space-y-2">
          {filteredEvents.map(ev => (
            <div
              key={ev.id}
              className="bg-surface border border-border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <EventTypeBadge type={ev.event_type} />
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
                <DeleteControls
                  id={ev.id}
                  deleteId={deleteId}
                  setDeleteId={setDeleteId}
                  onConfirm={handleDelete}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={<HeartPulse className="w-10 h-10 text-muted/30 mx-auto mb-2" />}
          message={events.length > 0 ? 'Ningún evento coincide con los filtros' : 'No hay eventos reproductivos registrados'}
          hint={events.length === 0 && !isAdmin ? 'El administrador registrará los eventos de monta y partos' : undefined}
        />
      )}
    </div>
  )
}

/* ════════════════════════════════════════
   TAB 2 — MORTALIDAD (lotes avícolas)
   ════════════════════════════════════════ */
function MortalidadTab({
  animals, loadingAnimals, isAdmin,
}: { animals: AnimalOption[]; loadingAnimals: boolean; isAdmin: boolean }) {
  const [events, setEvents] = useState<ReproEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [animalId, setAnimalId] = useState('')
  const [eventDate, setEventDate] = useState(toIso(new Date()))
  const [deathCount, setDeathCount] = useState(1)
  const [notes, setNotes] = useState('')

  const poultryBatches = animals.filter(a => a.animal_types?.slug === 'aves-de-corral')

  useEffect(() => {
    fetch('/api/reproductive-events')
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d)) setEvents(d.filter((e: ReproEvent) => e.event_type === 'muerte'))
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!animalId) { setError('Selecciona un lote'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/reproductive-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animal_id: animalId,
          event_type: 'muerte',
          event_date: eventDate,
          notes: notes || null,
          quantity: deathCount,
          species_slug: 'aves-de-corral',
        }),
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Error al guardar'); return }
      const refreshed = await fetch('/api/reproductive-events').then(r => r.json())
      if (Array.isArray(refreshed)) setEvents(refreshed.filter((ev: ReproEvent) => ev.event_type === 'muerte'))
      setShowForm(false); setNotes(''); setAnimalId(''); setDeathCount(1)
    } catch { setError('Error de conexión') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/reproductive-events/${id}`, { method: 'DELETE' })
    setEvents(prev => prev.filter(e => e.id !== id))
    setDeleteId(null)
  }

  if (loading || loadingAnimals) return <TabSpinner />

  return (
    <div className="space-y-4">
      <TabHeader
        count={events.length}
        noun="registro de baja"
        isAdmin={isAdmin}
        showForm={showForm}
        onToggle={() => setShowForm(v => !v)}
      />

      {isAdmin && showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          {error && <ErrorBanner message={error} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Lote de Aves</label>
              <select value={animalId} onChange={e => setAnimalId(e.target.value)} className="input-calc" required>
                <option value="">Seleccionar lote…</option>
                {poultryBatches.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.identification_code || 'Sin nombre'} — {a.animal_types?.name}
                  </option>
                ))}
              </select>
            </div>

            <DateField label="Fecha de la Baja" value={eventDate} onChange={setEventDate} />

            <NumField label="Cantidad de muertes" value={deathCount} onChange={setDeathCount} min={1} />

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Notas (opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Causa, observaciones…"
                className="input-calc"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all"
          >
            {saving ? 'Guardando…' : 'Registrar Baja'}
          </button>
        </form>
      )}

      {events.length > 0 ? (
        <div className="space-y-2">
          {events.map(ev => (
            <div
              key={ev.id}
              className="bg-surface border border-border rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-danger/10 text-danger">
                    Muerte / Baja
                  </span>
                  <span className="text-sm font-semibold text-foreground truncate">
                    {ev.animals?.name || ev.animals?.identification_code || 'Lote'}
                  </span>
                  <span className="text-xs text-muted">({ev.animals?.animal_types?.name})</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(ev.event_date)}</span>
                  {typeof ev.quantity === 'number' && (
                    <span className="font-semibold text-danger">−{ev.quantity} aves</span>
                  )}
                  {ev.notes && <span className="italic truncate max-w-[200px]">{ev.notes}</span>}
                </div>
              </div>
              {isAdmin && (
                <DeleteControls
                  id={ev.id}
                  deleteId={deleteId}
                  setDeleteId={setDeleteId}
                  onConfirm={handleDelete}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<AlertTriangle className="w-10 h-10 text-muted/30 mx-auto mb-2" />}
          message="No hay registros de bajas"
          hint={!isAdmin ? 'El administrador registrará las bajas por mortalidad' : undefined}
        />
      )}
    </div>
  )
}

/* ════════════════════════════════════════
   TAB 3 — PRODUCCIÓN DE LECHE
   ════════════════════════════════════════ */
function ProduccionLecheTab({
  animals, loadingAnimals, isAdmin,
}: { animals: AnimalOption[]; loadingAnimals: boolean; isAdmin: boolean }) {
  const [events, setEvents] = useState<MilkEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [animalId, setAnimalId] = useState('')
  const [recordedDate, setRecordedDate] = useState(toIso(new Date()))
  const [litersAm, setLitersAm] = useState('')
  const [litersPm, setLitersPm] = useState('')
  const [notes, setNotes] = useState('')

  // ── date filter ───────────────────────────────────────────────────
  const [filterDate, setFilterDate] = useState('')   // ISO date or ''

  const PAGE_SIZE = 7

  const dairyAnimals = animals.filter(a =>
    (a.animal_types?.slug === 'bovino' || a.animal_types?.slug === 'caprino') &&
    a.sex?.toLowerCase() === 'hembra'
  )

  const previewTotal = (parseFloat(litersAm) || 0) + (parseFloat(litersPm) || 0)

  useEffect(() => {
    fetch('/api/events/milk-production')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setEvents(d) })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!animalId) { setError('Selecciona un animal'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/events/milk-production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          animal_id: animalId,
          recorded_date: recordedDate,
          liters_am: litersAm !== '' ? parseFloat(litersAm) : 0,
          liters_pm: litersPm !== '' ? parseFloat(litersPm) : 0,
          notes: notes || null,
        }),
      })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Error al guardar'); return }
      const refreshed = await fetch('/api/events/milk-production').then(r => r.json())
      if (Array.isArray(refreshed)) setEvents(refreshed)
      setShowForm(false); setNotes(''); setAnimalId(''); setLitersAm(''); setLitersPm('')
    } catch { setError('Error de conexión') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/events/milk-production/${id}`, { method: 'DELETE' })
    setEvents(prev => prev.filter(e => e.id !== id))
    setDeleteId(null)
  }

  if (loading || loadingAnimals) return <TabSpinner />

  // Aggregate totals per animal for summary bar (all records, not filtered)
  const totalsByAnimal = events.reduce<Record<string, { name: string; total: number }>>((acc, ev) => {
    const key = ev.animal_id
    const name = ev.animals?.name || ev.animals?.identification_code || 'Animal'
    if (!acc[key]) acc[key] = { name, total: 0 }
    acc[key].total += Number(ev.total_liters) || 0
    return acc
  }, {})

  // Apply date filter then cap at PAGE_SIZE.
  // Parse recorded_date as local noon (same normalization as fmtDate) so the
  // filtered day matches what the user sees displayed on screen.
  const toLocalIso = (iso: string | undefined) =>
    iso ? toIso(new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso + 'T12:00:00' : iso)) : ''
  const filtered = filterDate
    ? events.filter(ev => toLocalIso(ev.recorded_date) === filterDate)
    : events
  const visibleRows = filtered.slice(0, PAGE_SIZE)
  const hasMore = filtered.length > PAGE_SIZE

  return (
    <div className="space-y-4">
      <TabHeader
        count={events.length}
        noun="registro de producción"
        isAdmin={isAdmin}
        showForm={showForm}
        onToggle={() => setShowForm(v => !v)}
      />

      {/* Summary chips */}
      {Object.keys(totalsByAnimal).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.values(totalsByAnimal).map(a => (
            <div
              key={a.name}
              className="flex items-center gap-1.5 bg-primary/5 border border-primary/15 rounded-xl px-3 py-1.5 text-xs"
            >
              <Droplets className="w-3 h-3 text-primary" />
              <span className="font-medium text-foreground">{a.name}</span>
              <span className="text-primary font-semibold">{a.total.toFixed(1)} L</span>
              <span className="text-muted">acum.</span>
            </div>
          ))}
        </div>
      )}

      {isAdmin && showForm && (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          {error && <ErrorBanner message={error} />}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">Vaca / Animal</label>
              <select value={animalId} onChange={e => setAnimalId(e.target.value)} className="input-calc" required>
                <option value="">Seleccionar…</option>
                {dairyAnimals.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name || a.identification_code || 'Sin nombre'} — {a.animal_types?.name}
                  </option>
                ))}
              </select>
            </div>

            <DateField label="Fecha de Registro" value={recordedDate} onChange={setRecordedDate} />

            <LitersField label="Litros ordeño mañana (AM)" value={litersAm} onChange={setLitersAm} />
            <LitersField label="Litros ordeño tarde (PM)" value={litersPm} onChange={setLitersPm} />

            <div className="col-span-1 sm:col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">Notas (opcional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observaciones sobre la producción…"
                className="input-calc"
              />
            </div>
          </div>

          {previewTotal > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2 text-sm text-primary flex items-center gap-2">
              <Droplets className="w-4 h-4 shrink-0" />
              Total del día: <strong>{previewTotal.toFixed(2)} litros</strong>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all"
          >
            {saving ? 'Guardando…' : 'Guardar Producción'}
          </button>
        </form>
      )}

      {events.length > 0 && (
        <>
          {/* ── Date filter bar ───────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-xs font-medium text-muted shrink-0">Filtrar por fecha:</label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="input-calc !py-1 !text-xs w-auto"
              />
              {filterDate && (
                <button
                  onClick={() => setFilterDate('')}
                  className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
                  title="Limpiar filtro"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {(filterDate || hasMore) && (
              <span className="text-xs text-muted ml-auto">
                {visibleRows.length === filtered.length
                  ? `${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`
                  : `${visibleRows.length} de ${filtered.length} registros (más recientes)`
                }
              </span>
            )}
          </div>

          {/* ── Table ─────────────────────────────────────────────────── */}
          {visibleRows.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="border-b border-border bg-background">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">Fecha</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">Animal</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">AM (L)</th>
                    <th className="text-right px-3 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">PM (L)</th>
                    <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider">Total</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">Notas</th>
                    {isAdmin && <th className="px-3 py-2.5" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleRows.map(ev => (
                    <tr key={ev.id} className="bg-surface hover:bg-surface-hover transition-colors">
                      <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">{fmtDate(ev.recorded_date)}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground text-sm">
                          {ev.animals?.name || ev.animals?.identification_code || 'Animal'}
                        </span>
                        <span className="text-xs text-muted ml-1 hidden sm:inline">({ev.animals?.animal_types?.name})</span>
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums text-muted">
                        {Number(ev.liters_am) > 0 ? Number(ev.liters_am).toFixed(2) : '—'}
                      </td>
                      <td className="px-3 py-3 text-right text-sm tabular-nums text-muted">
                        {Number(ev.liters_pm) > 0 ? Number(ev.liters_pm).toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-primary tabular-nums">
                          {Number(ev.total_liters).toFixed(2)} L
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted italic truncate max-w-[160px] hidden sm:table-cell">
                        {ev.notes || '—'}
                      </td>
                      {isAdmin && (
                        <td className="px-3 py-3 text-right">
                          <DeleteControls
                            id={ev.id}
                            deleteId={deleteId}
                            setDeleteId={setDeleteId}
                            onConfirm={handleDelete}
                            compact
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<Droplets className="w-10 h-10 text-muted/30 mx-auto mb-2" />}
              message="Ningún registro para la fecha seleccionada"
            />
          )}
        </>
      )}

      {events.length === 0 && (
        <EmptyState
          icon={<Droplets className="w-10 h-10 text-muted/30 mx-auto mb-2" />}
          message="No hay registros de producción de leche"
          hint={!isAdmin ? 'El administrador registrará la producción diaria de cada vaca' : undefined}
        />
      )}
    </div>
  )
}


/* ════════════════════════════════════════
   TAB 4 — FACTURAS
   ════════════════════════════════════════ */

async function compressToUnder300KB(file: File): Promise<Blob> {
  const TARGET = 300 * 1024
  if (file.size <= TARGET) return file

  return new Promise<Blob>((resolve) => {
    const img = new Image()
    const objUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objUrl)
      const canvas = document.createElement('canvas')
      const MAX = 1920
      let { width, height } = img
      if (width > MAX || height > MAX) {
        const r = Math.min(MAX / width, MAX / height)
        width = Math.round(width * r)
        height = Math.round(height * r)
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)

      let quality = 0.85
      const attempt = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) { resolve(file); return }
            if (blob.size <= TARGET || quality <= 0.3) { resolve(blob); return }
            quality -= 0.1
            attempt()
          },
          'image/jpeg',
          quality
        )
      }
      attempt()
    }
    img.src = objUrl
  })
}

function InvoicesTab({ isAdmin }: { isAdmin: boolean }) {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const fileRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/invoices')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setInvoices(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!title.trim()) { setError('Ingresa un título antes de subir la factura'); return }
    setError('')
    setUploading(true)
    try {
      const optimized = await compressToUnder300KB(file)
      const form = new FormData()
      form.append('file', optimized, file.name)
      form.append('title', title.trim())
      if (notes.trim()) form.append('notes', notes.trim())
      const res = await fetch('/api/invoices', { method: 'POST', body: form })
      const result = await res.json()
      if (!res.ok) { setError(result.error || 'Error al subir'); return }
      setInvoices(prev => [result, ...prev])
      setTitle('')
      setNotes('')
    } catch {
      setError('Error al procesar el archivo')
    } finally {
      setUploading(false)
    }
  }

  async function handlePreview(id: string) {
    setLoadingPreview(true)
    try {
      const res = await fetch(`/api/invoices/${id}`)
      if (!res.ok) { setError('No se pudo cargar la imagen'); return }
      const blob = await res.blob()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch {
      setError('Error al cargar la vista previa')
    } finally {
      setLoadingPreview(false)
    }
  }

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  async function handleDownload(id: string, fileUrl: string, createdAt: string) {
    try {
      const res = await fetch(`/api/invoices/${id}`)
      if (!res.ok) { setError('No se pudo descargar la factura'); return }
      const blob = await res.blob()
      const _dn = new Date()
      const _todayLocal = `${_dn.getFullYear()}-${String(_dn.getMonth() + 1).padStart(2, '0')}-${String(_dn.getDate()).padStart(2, '0')}`
      const date = createdAt ? new Date(createdAt).toISOString().split('T')[0] : _todayLocal
      const ext = fileUrl.endsWith('.png') ? 'png' : 'jpg'
      const filename = `Tigrillo invoice ${date}.${ext}`

      // Capacitor Android: blob downloads are sandboxed inside the WebView and never
      // reach the system Downloads folder. Use the Filesystem plugin bridge directly
      // (injected into every page by the native shell) to write the file natively.
      const cap = (window as any).Capacitor
      if (cap?.isNativePlatform?.()) {
        let base64: string
        try {
          base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve((reader.result as string).split(',')[1])
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } catch {
          setError('Error al leer el archivo descargado'); return
        }
        try {
          // Directory.ExternalStorage = public external storage root on Android.
          // Path 'Download/<file>' writes into the system Downloads folder.
          await cap.Plugins.Filesystem.writeFile({
            path: `Download/${filename}`,
            data: base64,
            directory: 'EXTERNAL_STORAGE',
            recursive: true,
          })
          setError(`✅ Guardada en Descargas: ${filename}`)
          setTimeout(() => setError(''), 4000)
        } catch (fsErr: any) {
          setError(`Error al guardar archivo: ${fsErr?.message ?? 'permiso denegado'}`)
        }
        return
      }

      // Browser fallback: anchor must be appended to DOM so click registers.
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError('Error al descargar la factura (red)')
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' })
    if (res.ok || res.status === 204) {
      setInvoices(prev => prev.filter(inv => inv.id !== id))
    } else {
      setError('Error al eliminar la factura')
    }
    setDeleteId(null)
  }

  if (loading) return <TabSpinner />

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {invoices.length} factura{invoices.length !== 1 ? 's' : ''} registrada{invoices.length !== 1 ? 's' : ''}
        </p>
        {!isAdmin && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-muted">
            <Lock className="w-3 h-3" /> Solo lectura
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">Título <span className="text-danger">*</span></label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Compra de alimento engorde"
                maxLength={150}
                className="input-calc"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ej: Proveedor: Distribuidora Chone, llegó tarde"
                rows={2}
                className="input-calc resize-none"
              />
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-all"
          >
            {uploading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Paperclip className="w-4 h-4" />}
            {uploading ? 'Subiendo…' : 'Adjuntar Factura'}
          </button>
        </div>
      )}

      {error && <ErrorBanner message={error} />}

      {invoices.length > 0 ? (
        <div className="space-y-2">
          {invoices.map(inv => (
            <div
              key={inv.id}
              className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <Receipt className="w-4 h-4 text-muted shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{inv.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted">{fmtDate(inv.created_at)}</span>
                  {inv.notes && (
                    <span className="text-xs text-muted italic truncate max-w-[200px]" title={inv.notes}>
                      — {inv.notes}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handlePreview(inv.id)}
                  disabled={loadingPreview}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border border-border hover:bg-surface-hover transition-colors text-foreground disabled:opacity-50"
                >
                  {loadingPreview
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Eye className="w-3 h-3" />}
                  Vista previa
                </button>
                <button
                  onClick={() => handleDownload(inv.id, inv.file_url, inv.created_at)}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border border-border hover:bg-surface-hover transition-colors text-foreground"
                >
                  <Download className="w-3 h-3" />
                  Descargar
                </button>
                {isAdmin && (
                  deleteId === inv.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="px-3 py-1 text-xs rounded-lg bg-danger text-white hover:bg-danger/80"
                      >
                        Sí, eliminar
                      </button>
                      <button
                        onClick={() => setDeleteId(null)}
                        className="px-3 py-1 text-xs rounded-lg border border-border hover:bg-surface-hover"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteId(inv.id)}
                      className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Receipt className="w-10 h-10 text-muted/30 mx-auto mb-2" />}
          message="No hay facturas adjuntas"
          hint={!isAdmin ? 'El administrador puede adjuntar imágenes de facturas' : undefined}
        />
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={closePreview}
        >
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={closePreview}
              className="absolute -top-9 right-0 flex items-center gap-1.5 text-white/80 hover:text-white text-sm transition-colors"
            >
              <X className="w-4 h-4" /> Cerrar
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Vista previa de factura"
              className="w-full rounded-xl object-contain max-h-[80vh] shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════
   COMPONENTES REUTILIZABLES
   ════════════════════════════════════════ */
function TabHeader({
  count, noun, isAdmin, showForm, onToggle,
}: { count: number; noun: string; isAdmin: boolean; showForm: boolean; onToggle: () => void }) {
  const plural = count !== 1
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted">
        {count} {noun}{plural ? 's' : ''} registrado{plural ? 's' : ''}
      </p>
      {isAdmin ? (
        <button
          onClick={onToggle}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all"
        >
          {showForm ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cerrar' : 'Registrar'}
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-muted">
          <Lock className="w-3 h-3" /> Solo lectura
        </div>
      )}
    </div>
  )
}

function EventTypeBadge({ type }: { type: string }) {
  const cls =
    type === 'parto' ? 'bg-success/10 text-success' :
    type === 'aborto' ? 'bg-danger/10 text-danger' :
    type === 'monta_natural' || type === 'inseminacion' ? 'bg-primary/10 text-primary' :
    'bg-accent/10 text-accent'
  const label = REPRODUCTIVE_EVENT_TYPES.find(r => r.value === type)?.label || type
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
}

function DeleteControls({
  id, deleteId, setDeleteId, onConfirm, compact = false,
}: {
  id: string
  deleteId: string | null
  setDeleteId: (id: string | null) => void
  onConfirm: (id: string) => void
  compact?: boolean
}) {
  if (deleteId === id) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => onConfirm(id)}
          className="px-3 py-1 text-xs rounded-lg bg-danger text-white hover:bg-danger/80"
        >
          Sí, eliminar
        </button>
        <button
          onClick={() => setDeleteId(null)}
          className="px-3 py-1 text-xs rounded-lg border border-border hover:bg-surface-hover"
        >
          Cancelar
        </button>
      </div>
    )
  }
  return (
    <button
      onClick={() => setDeleteId(id)}
      className={`p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors ${compact ? '' : 'shrink-0'}`}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )
}

function EmptyState({ icon, message, hint }: { icon: React.ReactNode; message: string; hint?: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-10 text-center">
      {icon}
      <p className="text-sm text-muted">{message}</p>
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  )
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-2 text-sm">
      {message}
    </div>
  )
}

function TabSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  )
}

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
      <input
        type="number"
        min={min}
        value={value}
        onChange={e => onChange(e.target.value === '' ? 0 : +e.target.value)}
        onFocus={e => e.target.select()}
        className="input-calc"
      />
    </div>
  )
}

function LitersField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1">{label}</label>
      <input
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={e => e.target.select()}
        placeholder="0.0"
        className="input-calc"
      />
    </div>
  )
}
