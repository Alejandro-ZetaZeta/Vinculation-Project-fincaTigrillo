'use client'

/**
 * Shared, reusable per-type forms + read-only renderer for the requests module.
 *
 * Used by:
 *  - NewRequestClient  (teacher submission)
 *  - RequestDetailModal (admin friendly edit — replaces the old raw-JSON textarea)
 *
 * AnimalRecordForm mirrors the admin AnimalForm.tsx field-for-field (type-specific
 * metadata, reproductive status, sire selector, teat count, aves etapa/proposito,
 * weight unit conversion, porcino litter mode with madre/padre) so a teacher's
 * request carries exactly the same data an admin would enter directly.
 *
 * VaccineAssignmentForm uses the group/eligible-filter pattern from
 * AssignVaccineModal — "Filtrar elegibles" against /api/animals/eligible —
 * instead of listing every animal on the farm.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Loader2, CheckCircle2, XCircle, User, Users, Filter, HeartPulse,
} from 'lucide-react'
import {
  ACQ_TYPES, REPRO_EVENT_TYPES, SPECIES_SLUGS,
} from '@/lib/requests/validatePayload'

/* ────────────────────────────────────────────────────────────────────── */
/*  Primitive field components                                            */
/* ────────────────────────────────────────────────────────────────────── */

export function FormField({
  label, required, children, hint,
}: {
  label: string; required?: boolean; children: React.ReactNode; hint?: string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted">{hint}</p>}
    </div>
  )
}

export function TextInput({
  value, onChange, placeholder, type = 'text', required, maxLength, min, step,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string
  type?: string; required?: boolean; maxLength?: number; min?: string; step?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      min={min}
      step={step}
      className="w-full text-sm bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  )
}

export function SelectInput({
  value, onChange, children, required,
}: {
  value: string; onChange: (v: string) => void; children: React.ReactNode; required?: boolean
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
      className="w-full text-sm bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {children}
    </select>
  )
}

export function TextArea({
  value, onChange, placeholder, rows = 3, maxLength,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; maxLength?: number
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      className="w-full text-sm bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
    />
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Real-time identification-code duplicate check                         */
/* ────────────────────────────────────────────────────────────────────── */

export type CodeStatus = 'idle' | 'checking' | 'available' | 'taken'

export function useDebouncedCodeCheck(initialCode = '') {
  const [code, setCode]                       = useState(initialCode)
  const [status, setStatus]                   = useState<CodeStatus>('idle')
  const [message, setMessage]                 = useState('')
  const debounceRef                           = useRef<ReturnType<typeof setTimeout> | null>(null)

  const check = useCallback(async (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) { setStatus('idle'); setMessage(''); return }
    setStatus('checking')
    try {
      const res = await fetch(`/api/animals/check-code?code=${encodeURIComponent(trimmed)}`)
      const json = await res.json()
      if (json.taken) {
        setStatus('taken')
        setMessage(json.usedBy ? `Ya está en uso por "${json.usedBy}"` : 'Este código ya está en uso')
      } else {
        setStatus('available')
        setMessage('')
      }
    } catch {
      setStatus('idle')
    }
  }, [])

  function handleChange(value: string) {
    setCode(value)
    setStatus('idle')
    setMessage('')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => check(value), 500)
  }

  useEffect(() => {
    if (initialCode && initialCode.trim()) {
      setCode(initialCode)
      check(initialCode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { code, status, message, handleChange, setStatus, setMessage }
}

function CodeField({
  code, status, message, onChange, placeholder,
}: {
  code: string; status: CodeStatus; message: string
  onChange: (v: string) => void; placeholder?: string
}) {
  const border =
    status === 'taken'     ? 'border-red-500 focus:ring-red-500/30' :
    status === 'available' ? 'border-emerald-500 focus:ring-emerald-500/30' :
    'border-border focus:ring-primary'
  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={code}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={100}
          required
          className={`w-full text-sm bg-surface border rounded-xl px-3 py-2.5 pr-10 text-foreground focus:outline-none focus:ring-1 ${border}`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {status === 'checking'  && <Loader2 className="w-4 h-4 text-muted animate-spin" />}
          {status === 'available' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {status === 'taken'     && <XCircle className="w-4 h-4 text-red-500" />}
        </span>
      </div>
      {status === 'available' && (
        <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" /> Código disponible
        </p>
      )}
      {status === 'taken' && (
        <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> {message}
        </p>
      )}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Shared option labels                                                  */
/* ────────────────────────────────────────────────────────────────────── */

const SEX_LABELS: Record<string, string> = {
  macho: 'Macho', hembra: 'Hembra', mixto: 'Mixto',
}
const ACQ_LABELS: Record<string, string> = {
  nacimiento: 'Nacimiento', compra: 'Compra', donacion: 'Donación',
}
const REPRO_EVENT_LABELS: Record<string, string> = {
  monta_natural: 'Monta Natural', inseminacion: 'Inseminación',
  confirmacion_prenez: 'Confirmación de Preñez', parto: 'Parto',
  aborto: 'Aborto', destete: 'Destete',
}
const SPECIES_LABELS: Record<string, string> = {
  bovino: 'Bovino', equino: 'Equino', porcino: 'Porcino', caprino: 'Caprino',
}
const TARGET_SEX_LABELS: Record<string, string> = {
  any: 'Cualquiera', macho: 'Macho', hembra: 'Hembra', mixto: 'Mixto',
}
export { SEX_LABELS, ACQ_LABELS, REPRO_EVENT_LABELS, SPECIES_LABELS, TARGET_SEX_LABELS }

/* ── Metadata key → human label (for read-only display) ── */
const METADATA_LABELS: Record<string, string> = {
  estado_reproductivo:   'Estado reproductivo',
  proposito:             'Propósito',
  uso:                   'Tipo de uso',
  doma:                  'Estado de doma',
  alzada_cm:             'Alzada (cm)',
  etapa:                 'Etapa',
  numero_partos:         'Número de partos',
  numero_camada:         'Número de camada',
  numero_pezones:        'Número de pezones',
  cantidad:              'Cantidad inicial',
  proposito_aves:        'Propósito',
  produccion_huevos:     'Producción huevos/semana',
  padre_nombre:          'Padre',
  madre_nombre:          'Madre',
  nacidos_muertos:       'Nacidos muertos',
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Type-specific config (mirrors admin AnimalForm.tsx typeFields)        */
/* ────────────────────────────────────────────────────────────────────── */

const REPRO_TYPES = ['bovino', 'equino', 'porcino', 'caprino']

const REPRO_STATUS_HEMBRA: Record<string, string[]> = {
  bovino:  ['preñada', 'vacía', 'lactando', 'seca'],
  equino:  ['preñada', 'vacía', 'lactando'],
  porcino: ['preñada', 'vacía', 'lactando'],
  caprino: ['preñada', 'vacía', 'lactando', 'seca'],
}
const REPRO_STATUS_MACHO: Record<string, string[]> = {
  bovino:  ['activo', 'no aplica'],
  equino:  ['activo', 'no aplica'],
  porcino: ['activo', 'no aplica'],
  caprino: ['activo', 'no aplica'],
}

const PROPOSITO_BOVINO: Record<string, string[]> = {
  macho:  ['carne', 'doble propósito', 'reproducción'],
  hembra: ['leche', 'carne', 'doble propósito'],
}

const SIRE_LABEL: Record<string, string> = {
  bovino: 'toro (bovino macho)', equino: 'semental (equino macho)',
  porcino: 'verraco (porcino macho)', caprino: 'macho cabrio (caprino macho)',
}

type MetaFieldDef = {
  name: string; label: string; type: 'text' | 'number' | 'select'
  options?: string[] | ((ctx: MetaCtx) => string[])
  required?: boolean; placeholder?: string
  show?: (ctx: MetaCtx) => boolean
}

type MetaCtx = {
  slug: string; sex: string; isLitter: boolean
  avesEtapa: string; avesProposito: string
}

const META_FIELDS: Record<string, MetaFieldDef[]> = {
  bovino: [
    { name: 'proposito',     label: 'Propósito',      type: 'select', options: (c) => PROPOSITO_BOVINO[c.sex] ?? PROPOSITO_BOVINO.hembra },
    { name: 'numero_partos', label: 'Número de partos', type: 'number', placeholder: '0', show: (c) => c.sex === 'hembra' && !c.isLitter },
  ],
  equino: [
    { name: 'uso',       label: 'Tipo de uso',     type: 'select', options: ['carga', 'monta', 'reproducción', 'trabajo'] },
    { name: 'doma',      label: 'Estado de doma',  type: 'select', options: ['domado', 'en proceso', 'sin domar'] },
    { name: 'alzada_cm', label: 'Alzada (cm)',     type: 'number', placeholder: 'Ej: 150' },
  ],
  porcino: [
    { name: 'etapa',         label: 'Etapa',           type: 'select', options: ['lechón', 'levante', 'ceba', 'reproductor'], show: (c) => !c.isLitter },
    { name: 'numero_camada', label: 'Número de camada', type: 'number', placeholder: '0', show: (c) => !c.isLitter },
  ],
  'aves-de-corral': [
    { name: 'cantidad',         label: 'Número inicial de aves', type: 'number', required: true, placeholder: 'Ej: 100' },
    { name: 'etapa',            label: 'Etapa productiva',       type: 'select', required: true, options: ['pollitos', 'levante', 'producción/adultos'] },
    { name: 'proposito',        label: 'Propósito',              type: 'select', options: ['postura', 'engorde', 'doble propósito'] },
    { name: 'produccion_huevos', label: 'Producción huevos/semana', type: 'number', placeholder: 'Ej: 5',
      show: (c) => c.avesEtapa === 'producción/adultos' && (c.avesProposito === 'postura' || c.avesProposito === 'doble propósito') },
  ],
  patos: [],
  caprino: [
    { name: 'proposito',     label: 'Propósito',      type: 'select', options: ['leche', 'carne', 'doble propósito', 'reproducción'] },
    { name: 'numero_partos', label: 'Número de partos', type: 'number', placeholder: '0', show: (c) => c.sex === 'hembra' && !c.isLitter },
  ],
}

function sexOptionsFor(slug: string | undefined, isLitter: boolean): { value: string; label: string }[] {
  if (isLitter) return [{ value: 'mixto', label: 'Mixto (camada)' }]
  if (slug === 'aves-de-corral') {
    return [
      { value: 'mixto',  label: 'Mixto' },
    ]
  }
  if (slug === 'porcino') {
    return [
      { value: 'macho',  label: 'Macho' },
      { value: 'hembra', label: 'Hembra' },
    ]
  }
  return [
    { value: 'macho',  label: 'Macho' },
    { value: 'hembra', label: 'Hembra' },
  ]
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Data-fetching helpers                                                */
/* ────────────────────────────────────────────────────────────────────── */

type AnimalType = { id: string; name: string; slug: string }
type AnimalOpt = {
  id: string; name: string | null; identification_code: string | null
  sex?: string | null; is_litter?: boolean | null
  animal_types?: { slug?: string } | { slug?: string }[] | null
}
type VaccineOpt = {
  id: string; name: string; default_next_dose_days: number | null; stock_doses?: number | null
}
type EligibleAnimal = {
  id: string; name: string | null; identification_code: string | null
  sex: string | null; birth_date: string | null
  animal_types?: { id: string; name: string; slug: string } | null
}

async function fetchJson(url: string): Promise<unknown> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data?: unknown }).data
    if (Array.isArray(inner)) return inner
  }
  return []
}

function typeSlugOf(a: AnimalOpt): string | undefined {
  const t = a.animal_types
  if (!t) return undefined
  if (Array.isArray(t)) return t[0]?.slug
  return (t as { slug?: string }).slug
}

function addDaysISO(dateISO: string, days: number): string {
  const base = new Date(`${dateISO}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + days)
  return base.toISOString().slice(0, 10)
}

/* ────────────────────────────────────────────────────────────────────── */
/*  animal_record form  —  mirrors admin AnimalForm.tsx                  */
/* ────────────────────────────────────────────────────────────────────── */

export function AnimalRecordForm({
  value, onChange,
}: {
  value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void
}) {
  const [animalTypes, setAnimalTypes] = useState<AnimalType[]>([])

  useEffect(() => {
    fetchJson('/api/animal-types').then(data => {
      setAnimalTypes(asArray(data).map(t => ({
        id:   (t as { id: string }).id,
        name: (t as { name: string }).name,
        slug: (t as { slug?: string }).slug ?? '',
      })))
    })
  }, [])

  /* ── derived from value ── */
  const meta      = (value.metadata as Record<string, unknown> | null) ?? {}
  const set       = (key: string, v: unknown) => onChange({ ...value, [key]: v })
  const setMeta   = (key: string, v: unknown) => onChange({ ...value, metadata: { ...meta, [key]: v } })
  const delMeta   = (key: string) => {
    const next = { ...meta }; delete next[key]
    onChange({ ...value, metadata: Object.keys(next).length ? next : null })
  }

  const selectedTypeId = String(value.type_id ?? '')
  const selectedType   = animalTypes.find(t => t.id === selectedTypeId)
  const selectedSlug   = selectedType?.slug

  // Keep _typeSlug in the payload in sync with the selected type so the server
  // can run aves-de-corral required-metadata validation (and so edit mode, where
  // the stored payload has no _typeSlug, gets populated once types load).
  useEffect(() => {
    if (selectedSlug && value._typeSlug !== selectedSlug) {
      onChange({ ...value, _typeSlug: selectedSlug })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug])

  const sex        = String(value.sex ?? '')
  const isLitter   = selectedSlug === 'porcino' && value.is_litter === true
  const isRepro    = REPRO_TYPES.includes(selectedSlug ?? '')
  const isAves     = selectedSlug === 'aves-de-corral'

  const avesEtapa     = String(meta.etapa ?? '')
  const avesProposito = String(meta.proposito ?? '')

  const reproStatus = String(meta.estado_reproductivo ?? (sex === 'macho' ? 'no aplica' : 'vacía'))
  const acquisitionType = String(value.acquisition_type ?? '')

  /* ── Porcino: individual vs litter toggle ── */
  function setLitterMode(on: boolean) {
    const next: Record<string, unknown> = {
      ...value,
      is_litter: on,
      sex:       on ? 'mixto' : (sex === 'mixto' ? '' : sex),
      litter_count: on ? (value.litter_count ?? '') : null,
    }
    // Clear litter-only metadata when leaving litter mode.
    if (!on) {
      const m = { ...(next.metadata as Record<string, unknown> | null ?? {}) }
      delete m.nacidos_muertos; delete m.madre_id; delete m.madre_nombre
      delete m.padre_id; delete m.padre_nombre
      next.metadata = Object.keys(m).length ? m : null
    }
    onChange(next)
  }

  /* ── Real-time identification-code check ── */
  const code = useDebouncedCodeCheck(String(value.identification_code ?? ''))
  useEffect(() => {
    if (code.code !== (value.identification_code ?? '')) {
      set('identification_code', code.code)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code.code])
  useEffect(() => {
    onChange({ ...value, _codeStatus: code.status })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code.status])

  /* ── Sex change: reset repro status + sex-dependent metadata ── */
  function handleSexChange(v: string) {
    const next: Record<string, unknown> = { ...value, sex: v }
    const m = { ...meta }
    if (isRepro && !isLitter) {
      m.estado_reproductivo = v === 'macho' ? 'no aplica' : 'vacía'
    }
    // Clear numero_partos for machos.
    if (v !== 'hembra') { delete m.numero_partos }
    next.metadata = Object.keys(m).length ? m : null
    onChange(next)
  }

  /* ── Sire selector (preñada hembra, repro type, not litter) ── */
  const [sires, setSires]         = useState<AnimalOpt[]>([])
  const [loadingSires, setLS]     = useState(false)
  const sireId = String(meta.padre_id ?? '')
  const showSire = isRepro && sex === 'hembra' && reproStatus === 'preñada' && !isLitter

  useEffect(() => {
    if (!showSire) { setSires([]); return }
    setLS(true)
    fetchJson(`/api/animals?sex=macho&type_slug=${encodeURIComponent(selectedSlug ?? '')}`)
      .then(d => { if (Array.isArray(d)) setSires(d as AnimalOpt[]) })
      .finally(() => setLS(false))
  }, [showSire, selectedSlug])

  function handleSireChange(id: string) {
    if (!id) { delMeta('padre_id'); delMeta('padre_nombre'); return }
    const sire = sires.find(s => s.id === id)
    setMeta('padre_id', id)
    if (sire) setMeta('padre_nombre', sire.name || sire.identification_code || 'Sin nombre')
  }

  /* ── Teat count (porcino hembra, not litter) ── */
  const showTeat = selectedSlug === 'porcino' && sex === 'hembra' && !isLitter
  const teatCount = String(meta.numero_pezones ?? '')

  /* ── Litter: madre/padre/nacidos_muertos ── */
  const [madres, setMadres] = useState<AnimalOpt[]>([])
  const [padres, setPadres] = useState<AnimalOpt[]>([])
  const [loadingMP, setLM]  = useState(false)
  const litterMadreId = String(meta.madre_id ?? '')
  const litterPadreId = String(meta.padre_id ?? '')

  useEffect(() => {
    if (!isLitter) { setMadres([]); setPadres([]); return }
    setLM(true)
    Promise.all([
      fetchJson('/api/animals?sex=hembra&type_slug=porcino'),
      fetchJson('/api/animals?sex=macho&type_slug=porcino'),
    ]).then(([md, pd]) => {
      setMadres(Array.isArray(md) ? md as AnimalOpt[] : [])
      setPadres(Array.isArray(pd) ? pd as AnimalOpt[] : [])
    }).finally(() => setLM(false))
  }, [isLitter])

  function handleLitterParent(role: 'madre' | 'padre', id: string) {
    const list = role === 'madre' ? madres : padres
    if (!id) {
      delMeta(`${role}_id`); delMeta(`${role}_nombre`); return
    }
    const found = list.find(x => x.id === id)
    setMeta(`${role}_id`, id)
    if (found) setMeta(`${role}_nombre`, found.name || found.identification_code || 'Sin nombre')
  }

  /* ── Aves weight unit conversion ── */
  // pollitos → grams → kg (/1000); levante/adultos → lbs → kg (/2.20462)
  const [weightInput, setWeightInput] = useState(String(value.weight_kg ?? ''))
  useEffect(() => {
    if (isAves && value.weight_kg != null && value.weight_kg !== '') {
      // Reverse-convert for display only on initial load / external change.
      const kg = Number(value.weight_kg)
      if (avesEtapa === 'pollitos') setWeightInput(String(Math.round(kg * 1000)))
      else if (avesEtapa) setWeightInput(String((kg * 2.20462).toFixed(3)))
      else setWeightInput(String(kg))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  function handleWeightChange(raw: string) {
    setWeightInput(raw)
    if (!raw) { set('weight_kg', null); return }
    const n = parseFloat(raw)
    if (!Number.isFinite(n) || n < 0) { set('weight_kg', null); return }
    const kg = isAves
      ? (avesEtapa === 'pollitos' ? n / 1000 : n / 2.20462)
      : n
    set('weight_kg', kg)
  }

  /* ── Render ── */
  const metaFields = selectedSlug ? (META_FIELDS[selectedSlug] ?? []) : []
  const metaCtx: MetaCtx = { slug: selectedSlug ?? '', sex, isLitter, avesEtapa, avesProposito }
  const sexOptions = sexOptionsFor(selectedSlug, isLitter)
  const reproStatusOptions = sex === 'macho'
    ? (REPRO_STATUS_MACHO[selectedSlug ?? ''] ?? ['activo', 'no aplica'])
    : (REPRO_STATUS_HEMBRA[selectedSlug ?? ''] ?? ['vacía', 'no aplica'])
  const showAcqDate = !isLitter && (acquisitionType === 'compra' || acquisitionType === 'donacion')

  return (
    <div className="space-y-4">
      {/* Porcino mode toggle */}
      {selectedSlug === 'porcino' && (
        <div className="flex gap-2 p-1 bg-background border border-border rounded-xl">
          <button type="button" onClick={() => setLitterMode(false)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              !isLitter ? 'bg-primary text-white' : 'text-muted hover:text-foreground'}`}
          >
            <User className="w-4 h-4" /> Individual
          </button>
          <button type="button" onClick={() => setLitterMode(true)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isLitter ? 'bg-primary text-white' : 'text-muted hover:text-foreground'}`}
          >
            <Users className="w-4 h-4" /> Camada
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Tipo de Animal" required>
          <SelectInput value={selectedTypeId} onChange={v => {
            const slug = animalTypes.find(t => t.id === v)?.slug ?? ''
            onChange({
              ...value,
              type_id: v,
              _typeSlug: slug,
              metadata: null,
              is_litter: false,
              litter_count: null,
              sex: slug === 'aves-de-corral' ? 'mixto' : ''
            });
            setWeightInput('')
          }} required>
            <option value="">Seleccionar tipo...</option>
            {animalTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </SelectInput>
        </FormField>

        <FormField label="Código de Identificación" required>
          <CodeField code={code.code} status={code.status} message={code.message}
            onChange={code.handleChange} placeholder="Arete, placa, anillo, hierro..." />
        </FormField>

        <FormField label={isAves ? 'Especie' : 'Raza'} required>
          <TextInput value={String(value.breed ?? '')} onChange={v => set('breed', v)}
            placeholder={isAves ? 'Ej: Gallina ponedora, Pollo de engorde' : 'Ej: Holstein, Duroc, Paso Fino'}
            required maxLength={120} />
        </FormField>

        <FormField label="Nombre"
          hint={isAves ? 'Ej: Lote-Gallinas-01' : isLitter ? 'Ej: Camada-001' : 'Ej: Luna, Relámpago'}>
          <TextInput value={String(value.name ?? '')} onChange={v => set('name', v || null)}
            placeholder={isAves ? 'Ej: Lote-Gallinas-01' : isLitter ? 'Ej: Camada-001' : 'Ej: Luna, Relámpago'}
            maxLength={120} />
        </FormField>

        <FormField label="Sexo" required>
          <SelectInput value={sex} onChange={handleSexChange} required>
            <option value="">Seleccionar...</option>
            {sexOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </SelectInput>
        </FormField>

        <FormField label={isAves ? 'Fecha de nacimiento / ingreso' : 'Fecha de Nacimiento'} required>
          <TextInput type="date" value={String(value.birth_date ?? '')} onChange={v => set('birth_date', v)} required />
        </FormField>

        <FormField label={isAves ? 'Color de plumaje' : 'Color'}>
          <TextInput value={String(value.color ?? '')} onChange={v => set('color', v)}
            placeholder={isAves ? 'Ej: Rojo, Blanco' : 'Ej: Negro, Pardo, Alazán'} maxLength={80} />
        </FormField>

        {/* Weight — aves unit-aware */}
        {isAves ? (
          <FormField label={avesEtapa === 'pollitos' ? 'Peso promedio (g)' : 'Peso promedio (lbs)'}
            hint={avesEtapa === 'pollitos' ? 'Pollitos: peso en gramos.' : 'Levante / adultos: peso en libras.'}>
            <TextInput type="number" value={weightInput} onChange={handleWeightChange}
              placeholder={avesEtapa === 'pollitos' ? 'Ej: 35' : 'Ej: 1.87'}
              min="0" step={avesEtapa === 'pollitos' ? '1' : '0.001'} />
          </FormField>
        ) : (
          <FormField label="Peso (kg)">
            <TextInput type="number" value={String(value.weight_kg ?? '')} onChange={v => set('weight_kg', v ? parseFloat(v) : null)}
              placeholder="Ej: 450" min="0" step="0.01" />
          </FormField>
        )}

        {/* Acquisition type */}
        <FormField label="Tipo de Adquisición">
          <SelectInput value={acquisitionType} onChange={v => set('acquisition_type', v || null)}>
            <option value="">Seleccionar...</option>
            {ACQ_TYPES.map(a => <option key={a} value={a}>{ACQ_LABELS[a]}</option>)}
          </SelectInput>
        </FormField>

        {showAcqDate && (
          <FormField label="Fecha de Adquisición">
            <TextInput type="date" value={String(value.acquisition_date ?? '')} onChange={v => set('acquisition_date', v || null)} />
          </FormField>
        )}

        {/* Litter-specific: nacidos vivos (already in value.litter_count), nacidos muertos, madre, padre */}
        {isLitter && (
          <>
            <FormField label="Lechones nacidos vivos" required hint="Mínimo 1">
              <TextInput type="number" value={String(value.litter_count ?? '')}
                onChange={v => set('litter_count', v ? parseInt(v, 10) : null)}
                placeholder="Ej: 10" min="1" step="1" required />
            </FormField>
            <FormField label="Lechones nacidos muertos" hint="Mortinatos">
              <TextInput type="number" value={String(meta.nacidos_muertos ?? '')}
                onChange={v => setMeta('nacidos_muertos', v ? parseInt(v, 10) : null)}
                placeholder="0" min="0" step="1" />
            </FormField>
            <FormField label="Madre (cerda)">
              {loadingMP ? (
                <p className="text-xs text-muted py-2">Cargando cerdas...</p>
              ) : (
                <SelectInput value={litterMadreId} onChange={v => handleLitterParent('madre', v)}>
                  <option value="">— Sin especificar —</option>
                  {madres.map(m => <option key={m.id} value={m.id}>{m.name || m.identification_code || 'Sin nombre'}</option>)}
                </SelectInput>
              )}
            </FormField>
            <FormField label="Padre (verraco)">
              {loadingMP ? (
                <p className="text-xs text-muted py-2">Cargando verracos...</p>
              ) : (
                <SelectInput value={litterPadreId} onChange={v => handleLitterParent('padre', v)}>
                  <option value="">— Sin especificar —</option>
                  {padres.map(p => <option key={p.id} value={p.id}>{p.name || p.identification_code || 'Sin nombre'}</option>)}
                </SelectInput>
              )}
            </FormField>
          </>
        )}

        {/* Type-specific metadata fields (bovino proposito/partos, equino uso/doma/alzada, etc.) */}
        {!isLitter && metaFields.filter(f => !f.show || f.show(metaCtx)).map(f => {
          const fieldVal = String(meta[f.name] ?? '')
          const opts = typeof f.options === 'function' ? f.options(metaCtx) : (f.options ?? [])
          return (
            <FormField key={f.name} label={f.label} required={f.required}>
              {f.type === 'select' ? (
                <SelectInput value={fieldVal} onChange={v => setMeta(f.name, v || null)} required={f.required}>
                  <option value="">Seleccionar...</option>
                  {opts.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
                </SelectInput>
              ) : (
                <TextInput type={f.type} value={fieldVal} onChange={v => setMeta(f.name, v ? (f.type === 'number' ? parseInt(v, 10) : v) : null)}
                  placeholder={f.placeholder} required={f.required} min={f.type === 'number' ? '0' : undefined} step={f.type === 'number' ? '1' : undefined} />
              )}
            </FormField>
          )
        })}

        {/* Reproductive status (repro types, sex set, not litter) */}
        {isRepro && sex && !isLitter && (
          <FormField label="Estado reproductivo">
            <SelectInput value={reproStatus} onChange={v => setMeta('estado_reproductivo', v)}>
              {reproStatusOptions.map(o => <option key={o} value={o} className="capitalize">{o}</option>)}
            </SelectInput>
          </FormField>
        )}

        {/* Teat count (porcino hembra, not litter) */}
        {showTeat && (
          <FormField label="Número de pezones" hint="Pezones funcionales de la cerda">
            <TextInput type="number" value={teatCount} onChange={v => setMeta('numero_pezones', v ? parseInt(v, 10) : null)}
              placeholder="Ej: 14" min="0" step="1" />
          </FormField>
        )}

        {/* Sire selector (preñada hembra) */}
        {showSire && (
          <div className="col-span-full sm:col-span-2">
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                <HeartPulse className="w-4 h-4" /> Padre reproductor
              </div>
              <p className="text-xs text-muted">
                Selecciona el {SIRE_LABEL[selectedSlug ?? ''] || 'macho'} que impregnó a esta hembra.
              </p>
              {loadingSires ? (
                <p className="text-xs text-muted py-2">Cargando machos registrados...</p>
              ) : sires.length === 0 ? (
                <p className="text-xs text-amber-600 py-2">
                  No hay machos registrados activos. Puedes registrar el padre más tarde desde el módulo de eventos reproductivos.
                </p>
              ) : (
                <SelectInput value={sireId} onChange={handleSireChange}>
                  <option value="">— Sin especificar —</option>
                  {sires.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name || s.identification_code || 'Sin nombre'}{s.identification_code && s.name ? ` (${s.identification_code})` : ''}
                    </option>
                  ))}
                </SelectInput>
              )}
            </div>
          </div>
        )}

        <div className="col-span-full">
          <FormField label="Notas">
            <TextArea value={String(value.notes ?? '')} onChange={v => set('notes', v || null)}
              placeholder="Observaciones adicionales..." rows={3} maxLength={2000} />
          </FormField>
        </div>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  reproductive_event form                                               */
/* ────────────────────────────────────────────────────────────────────── */

export function ReproductiveEventForm({
  value, onChange,
}: {
  value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void
}) {
  const [animals, setAnimals] = useState<AnimalOpt[]>([])

  useEffect(() => {
    fetchJson('/api/animals?sex=hembra').then(data => {
      const list = asArray(data) as AnimalOpt[]
      setAnimals(list.filter(a => {
        const slug = typeSlugOf(a)
        const isBatch = slug === 'aves-de-corral' || a.is_litter === true
        return !isBatch
      }))
    })
  }, [])

  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label="Animal (hembra)" required>
        <SelectInput value={String(value.animal_id ?? '')} onChange={v => set('animal_id', v)} required>
          <option value="">Seleccionar animal...</option>
          {animals.map(a => (
            <option key={a.id} value={a.id}>{a.name || a.identification_code || a.id}</option>
          ))}
        </SelectInput>
      </FormField>
      <FormField label="Tipo de Evento" required>
        <SelectInput value={String(value.event_type ?? '')} onChange={v => set('event_type', v)} required>
          <option value="">Seleccionar...</option>
          {REPRO_EVENT_TYPES.map(t => <option key={t} value={t}>{REPRO_EVENT_LABELS[t]}</option>)}
        </SelectInput>
      </FormField>
      <FormField label="Fecha del Evento" required>
        <TextInput type="date" value={String(value.event_date ?? '')} onChange={v => set('event_date', v)} required />
      </FormField>
      <FormField label="Especie (para calcular fecha de parto)">
        <SelectInput value={String(value.species_slug ?? '')} onChange={v => set('species_slug', v || null)}>
          <option value="">Seleccionar...</option>
          {SPECIES_SLUGS.map(s => <option key={s} value={s}>{SPECIES_LABELS[s]}</option>)}
        </SelectInput>
      </FormField>
      <div className="col-span-full">
        <FormField label="Notas">
          <TextArea value={String(value.notes ?? '')} onChange={v => set('notes', v || null)} rows={2} maxLength={2000} />
        </FormField>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  mortality_event form  — STRICT: only lots / litters                   */
/* ────────────────────────────────────────────────────────────────────── */

export function MortalityEventForm({
  value, onChange,
}: {
  value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void
}) {
  const [animals, setAnimals] = useState<AnimalOpt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJson('/api/animals').then(data => {
      const list = asArray(data) as AnimalOpt[]
      const eligible = list.filter(a => {
        const slug = typeSlugOf(a)
        return slug === 'aves-de-corral' || (slug === 'porcino' && a.is_litter === true)
      })
      setAnimals(eligible)
      setLoading(false)
    })
  }, [])

  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label="Lote / Camada" required hint="Solo lotes de aves o camadas porcinas">
        <SelectInput value={String(value.animal_id ?? '')} onChange={v => set('animal_id', v)} required>
          <option value="">{loading ? 'Cargando...' : 'Seleccionar lote/camada...'}</option>
          {animals.map(a => <option key={a.id} value={a.id}>{a.name || a.identification_code || a.id}</option>)}
        </SelectInput>
        {!loading && animals.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">No hay lotes ni camadas registrados.</p>
        )}
      </FormField>
      <FormField label="Fecha" required>
        <TextInput type="date" value={String(value.event_date ?? '')} onChange={v => set('event_date', v)} required />
      </FormField>
      <FormField label="Cantidad de Bajas" required>
        <TextInput type="number" value={String(value.quantity ?? '')}
          onChange={v => set('quantity', v ? parseInt(v, 10) : '')} placeholder="1" min="1" step="1" required />
      </FormField>
      <FormField label="Notas">
        <TextInput value={String(value.notes ?? '')} onChange={v => set('notes', v || null)}
          placeholder="Causa de muerte, etc." maxLength={2000} />
      </FormField>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  production_event form                                                 */
/* ────────────────────────────────────────────────────────────────────── */

export function ProductionEventForm({
  value, onChange,
}: {
  value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void
}) {
  const [animals, setAnimals] = useState<AnimalOpt[]>([])

  useEffect(() => {
    fetchJson('/api/animals?sex=hembra').then(data => {
      const list = asArray(data) as AnimalOpt[]
      setAnimals(list.filter(a => {
        const slug = typeSlugOf(a)
        return (slug === 'bovino' || slug === 'caprino') && a.is_litter !== true
      }))
    })
  }, [])

  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label="Animal (bovino / caprino hembra)" required>
        <SelectInput value={String(value.animal_id ?? '')} onChange={v => set('animal_id', v)} required>
          <option value="">Seleccionar animal...</option>
          {animals.map(a => <option key={a.id} value={a.id}>{a.name || a.identification_code || a.id}</option>)}
        </SelectInput>
        {animals.length === 0 && <p className="text-xs text-amber-600 mt-1">No hay hembras bovinas/caprinas registradas.</p>}
      </FormField>
      <FormField label="Fecha de Registro" required>
        <TextInput type="date" value={String(value.recorded_date ?? '')} onChange={v => set('recorded_date', v)} required />
      </FormField>
      <FormField label="Litros AM (mañana)">
        <TextInput type="number" value={String(value.liters_am ?? '')} onChange={v => set('liters_am', v ? parseFloat(v) : 0)}
          placeholder="0.0" min="0" step="0.01" />
      </FormField>
      <FormField label="Litros PM (tarde)">
        <TextInput type="number" value={String(value.liters_pm ?? '')} onChange={v => set('liters_pm', v ? parseFloat(v) : 0)}
          placeholder="0.0" min="0" step="0.01" />
      </FormField>
      <div className="col-span-full">
        <FormField label="Notas">
          <TextArea value={String(value.notes ?? '')} onChange={v => set('notes', v || null)} rows={2} maxLength={2000} />
        </FormField>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  vaccine_profile form                                                  */
/* ────────────────────────────────────────────────────────────────────── */

const REPRO_STATE_OPTS = [
  { value: 'preñada', label: 'Preñada' },
  { value: 'vacía',   label: 'Vacía' },
  { value: 'lactando',label: 'Lactando' },
  { value: 'seca',    label: 'Seca' },
]

const REPRO_TYPE_SLUGS = new Set(['bovino', 'equino', 'porcino', 'caprino'])

export function VaccineProfileForm({
  value, onChange,
}: {
  value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void
}) {
  const [animalTypes, setAnimalTypes] = useState<AnimalType[]>([])

  useEffect(() => {
    fetchJson('/api/animal-types').then(data => {
      setAnimalTypes(asArray(data).map(t => ({
        id: (t as { id: string }).id, name: (t as { name: string }).name, slug: (t as { slug?: string }).slug ?? '',
      })))
    })
  }, [])

  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })

  const targetTypeId = String(value.target_type_id ?? '')
  const targetSex    = String(value.target_sex ?? 'any')
  const selectedSlug = animalTypes.find(t => t.id === targetTypeId)?.slug ?? ''

  const showReproStates =
    !!selectedSlug && REPRO_TYPE_SLUGS.has(selectedSlug) && targetSex === 'hembra'

  // Clear allowed_reproductive_states when condition disappears
  useEffect(() => {
    if (!showReproStates && value.allowed_reproductive_states != null) {
      onChange({ ...value, allowed_reproductive_states: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReproStates])

  const allowedStates: string[] = Array.isArray(value.allowed_reproductive_states)
    ? value.allowed_reproductive_states as string[]
    : []

  function toggleReproState(v: string) {
    const next = allowedStates.includes(v)
      ? allowedStates.filter(s => s !== v)
      : [...allowedStates, v]
    set('allowed_reproductive_states', next.length > 0 ? next : null)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label="Nombre de la Vacuna" required>
        <TextInput value={String(value.name ?? '')} onChange={v => set('name', v)}
          placeholder="Ej: Fiebre Aftosa Bivalente" required maxLength={120} />
      </FormField>
      <FormField label="Tipo de Animal Objetivo" required hint="Habilita filtrado automático por especie">
        <SelectInput value={targetTypeId} onChange={v => {
          const slug = animalTypes.find(t => t.id === v)?.slug ?? ''
          // If non-poultry type selected and sex is 'mixto', reset to 'any'
          const currentSex = String(value.target_sex ?? 'any')
          const nextSex = slug !== 'aves-de-corral' && currentSex === 'mixto' ? 'any' : currentSex
          onChange({ ...value, target_type_id: v || null, target_sex: nextSex })
        }} required>
          <option value="">Seleccionar tipo...</option>
          {animalTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </SelectInput>
      </FormField>
      <FormField label="Sexo Objetivo">
        <SelectInput value={targetSex} onChange={v => set('target_sex', v)}>
          <option value="any">Cualquiera</option>
          <option value="macho">Macho</option>
          <option value="hembra">Hembra</option>
          {selectedSlug === 'aves-de-corral' && <option value="mixto">Mixto</option>}
        </SelectInput>
      </FormField>
      <FormField label="Días hasta siguiente dosis">
        <TextInput type="number" value={String(value.default_next_dose_days ?? '')}
          onChange={v => set('default_next_dose_days', v ? parseInt(v, 10) : null)} placeholder="0 = dosis única" min="0" step="1" />
      </FormField>
      <FormField label="Nº total de dosis" hint={!value.default_next_dose_days ? 'Disponible cuando hay intervalo de dosis' : undefined}>
        <TextInput type="number" value={String(value.total_doses ?? '')}
          onChange={v => set('total_doses', v ? parseInt(v, 10) : null)}
          placeholder="(vacío = ilimitado)" min="1" step="1" />
      </FormField>
      <FormField label="Edad mínima (días)">
        <TextInput type="number" value={String(value.age_min_days ?? '')}
          onChange={v => set('age_min_days', v ? parseInt(v, 10) : null)} placeholder="Sin límite" min="0" step="1" />
      </FormField>
      <FormField label="Edad máxima (días)">
        <TextInput type="number" value={String(value.age_max_days ?? '')}
          onChange={v => set('age_max_days', v ? parseInt(v, 10) : null)} placeholder="Sin límite" min="0" step="1" />
      </FormField>

      {/* Conditional: reproductive states restriction (repro-type hembras only) */}
      {showReproStates && (
        <div className="col-span-full">
          <div className="bg-background border border-border rounded-xl p-4 space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground">Estados reproductivos permitidos</p>
              <p className="text-xs text-muted mt-0.5">Si no seleccionas ninguno, aplica para cualquier estado.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {REPRO_STATE_OPTS.map(opt => (
                <label key={opt.value}
                  className="flex items-center gap-2 text-sm text-foreground px-3 py-2 rounded-xl bg-surface border border-border hover:bg-surface/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowedStates.includes(opt.value)}
                    onChange={() => toggleReproState(opt.value)}
                    className="accent-primary"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="col-span-full">
        <FormField label="Descripción">
          <TextArea value={String(value.description ?? '')} onChange={v => set('description', v || null)} rows={3} maxLength={2000} />
        </FormField>
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  vaccine_assignment form  —  group/eligible-filter pattern             */
/* ────────────────────────────────────────────────────────────────────── */

export function VaccineAssignmentForm({
  value, onChange,
}: {
  value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void
}) {
  const [vaccines, setVaccines] = useState<VaccineOpt[]>([])
  const [eligible, setEligible] = useState<EligibleAnimal[]>([])
  const [loadingEligible, setLE] = useState(false)
  const [filterErr, setFilterErr] = useState('')

  const selectedIds: string[] = Array.isArray(value.animal_ids) ? value.animal_ids as string[] : []
  const vaccineId   = String(value.vaccine_id ?? '')
  const appliedAt   = String(value.applied_at ?? '')
  const nextDoseAt  = String(value.next_dose_at ?? '')

  const selectedVaccine = useMemo(
    () => vaccines.find(v => v.id === vaccineId) ?? null,
    [vaccines, vaccineId]
  )

  useEffect(() => {
    fetchJson('/api/vaccines?active_only=1').then(data => {
      setVaccines(asArray(data).map(v => ({
        id: (v as { id: string }).id,
        name: (v as { name: string }).name,
        default_next_dose_days: (v as { default_next_dose_days?: number | null }).default_next_dose_days ?? null,
        stock_doses: (v as { stock_doses?: number | null }).stock_doses ?? null,
      })))
    })
  }, [])

  // Auto-suggest next dose from catalog interval.
  useEffect(() => {
    if (!selectedVaccine || !appliedAt || nextDoseAt) return
    const interval = selectedVaccine.default_next_dose_days
    if (typeof interval === 'number' && interval > 0) {
      onChange({ ...value, next_dose_at: addDaysISO(appliedAt, interval) })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVaccine, appliedAt])

  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })

  const stockInsufficient =
    selectedVaccine !== null &&
    typeof selectedVaccine.stock_doses === 'number' &&
    selectedIds.length > 0 &&
    selectedVaccine.stock_doses < selectedIds.length

  async function filterEligible() {
    if (!vaccineId) { setFilterErr('Selecciona una vacuna primero'); return }
    setFilterErr(''); setLE(true)
    try {
      const res = await fetch(`/api/animals/eligible?vaccine_id=${encodeURIComponent(vaccineId)}`)
      const json = await res.json()
      if (!res.ok) { setFilterErr(json?.error || 'No se pudo filtrar'); setEligible([]); return }
      const list = Array.isArray(json?.data) ? json.data as EligibleAnimal[] : []
      setEligible(list)
      set('animal_ids', list.map(a => a.id))
    } catch {
      setFilterErr('Error de conexión')
    } finally {
      setLE(false)
    }
  }

  function toggle(id: string) {
    const next = selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
    set('animal_ids', next)
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Vacuna" required>
          <SelectInput value={vaccineId} onChange={v => { onChange({ ...value, vaccine_id: v, animal_ids: [] }); setEligible([]) }} required>
            <option value="">Seleccionar vacuna...</option>
            {vaccines.map(v => (
              <option key={v.id} value={v.id}>
                {v.name}{typeof v.stock_doses === 'number' ? ` (${v.stock_doses} dosis)` : ''}
              </option>
            ))}
          </SelectInput>
        </FormField>
        <FormField label="Fecha de Aplicación" required>
          <TextInput type="date" value={appliedAt} onChange={v => { onChange({ ...value, applied_at: v, next_dose_at: '' }) }} required />
        </FormField>
        <FormField label="Próxima dosis (opcional)" hint={selectedVaccine?.default_next_dose_days != null ? `Sugerida: ${selectedVaccine.default_next_dose_days} días` : undefined}>
          <TextInput type="date" value={nextDoseAt} onChange={v => set('next_dose_at', v || null)} />
        </FormField>
        <FormField label="Notas">
          <TextInput value={String(value.notes ?? '')} onChange={v => set('notes', v || null)}
            placeholder="Ej: lote, marca, observaciones" maxLength={2000} />
        </FormField>
      </div>

      {/* Stock-insufficient early warning (informational — teacher can still submit) */}
      {stockInsufficient && selectedVaccine && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-700 dark:text-yellow-400 rounded-xl text-sm flex items-start gap-2" role="alert">
          <span className="text-base leading-none mt-0.5" aria-hidden="true">⚠️</span>
          <span>
            <strong>Stock insuficiente:</strong> {selectedVaccine.stock_doses} dosis disponible{selectedVaccine.stock_doses !== 1 ? 's' : ''},
            se requieren {selectedIds.length}. El administrador verá esta advertencia al revisar la solicitud.
          </span>
        </div>
      )}

      {/* Eligible-animals group selector */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-foreground">Animales elegibles</p>
            <p className="text-xs text-muted">Filtra por especie, sexo y rango de edad según la vacuna.</p>
          </div>
          <button type="button" onClick={filterEligible} disabled={loadingEligible || !vaccineId}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
            {loadingEligible ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
            Filtrar elegibles
          </button>
        </div>

        {filterErr && <p className="text-xs text-red-600">{filterErr}</p>}

        {eligible.length > 0 ? (
          <div className="border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-surface border-b border-border flex items-center justify-between">
              <p className="text-xs text-muted">Seleccionados: {selectedIds.length} / {eligible.length}</p>
              <button type="button" className="text-xs font-medium text-primary hover:text-primary/80"
                onClick={() => set('animal_ids', eligible.map(a => a.id))}>
                Marcar todos
              </button>
            </div>
            <div className="max-h-56 overflow-y-auto divide-y divide-border">
              {eligible.map(a => {
                const checked = selectedIds.includes(a.id)
                const label = a.name || a.identification_code || a.id
                return (
                  <label key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface/80 cursor-pointer">
                    <input type="checkbox" checked={checked} onChange={() => toggle(a.id)} className="rounded" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{label}</p>
                      <p className="text-xs text-muted truncate">
                        {(a.animal_types?.name || '—') + ' · ' + (a.sex || '—') + (a.birth_date ? ` · Nac: ${a.birth_date}` : '')}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="bg-surface/40 border border-dashed border-border rounded-2xl p-6 text-center">
            <p className="text-sm text-muted">Usa “Filtrar elegibles” para cargar la lista de animales aptos.</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Form registry                                                         */
/* ────────────────────────────────────────────────────────────────────── */

export const FORM_COMPONENTS: Record<
  string,
  React.ComponentType<{ value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }>
> = {
  animal_record:      AnimalRecordForm,
  reproductive_event: ReproductiveEventForm,
  mortality_event:    MortalityEventForm,
  production_event:   ProductionEventForm,
  vaccine_profile:    VaccineProfileForm,
  vaccine_assignment: VaccineAssignmentForm,
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Read-only payload renderer (replaces raw JSON view in the modal)      */
/*  Hides internal DB columns and resolves ids to human names.            */
/* ────────────────────────────────────────────────────────────────────── */

export type ResolverMaps = {
  animalTypes: Record<string, string>
  animals:     Record<string, string>
  vaccines:    Record<string, string>
}

type FieldKind = 'text' | 'date' | 'number' | 'bool' | 'enum' | 'animal' | 'type' | 'vaccine' | 'array_animals' | 'array_text' | 'metadata'
type FieldDef = { key: string; label: string; kind: FieldKind; map?: Record<string, string> }

const DISPLAY_CONFIG: Record<string, FieldDef[]> = {
  animal_record: [
    { key: 'type_id',             label: 'Tipo de animal',           kind: 'type' },
    { key: 'identification_code', label: 'Código de identificación', kind: 'text' },
    { key: 'name',                label: 'Nombre',                   kind: 'text' },
    { key: 'breed',               label: 'Raza / Especie',           kind: 'text' },
    { key: 'sex',                 label: 'Sexo',                     kind: 'enum', map: SEX_LABELS },
    { key: 'birth_date',          label: 'Fecha de nacimiento',      kind: 'date' },
    { key: 'color',               label: 'Color',                    kind: 'text' },
    { key: 'weight_kg',           label: 'Peso (kg)',                kind: 'number' },
    { key: 'acquisition_type',    label: 'Tipo de adquisición',      kind: 'enum', map: ACQ_LABELS },
    { key: 'acquisition_date',    label: 'Fecha de adquisición',     kind: 'date' },
    { key: 'is_litter',           label: '¿Camada?',                 kind: 'bool' },
    { key: 'litter_count',        label: 'Lechones nacidos vivos',   kind: 'number' },
    { key: 'metadata',            label: 'Datos adicionales',        kind: 'metadata' },
    { key: 'notes',               label: 'Notas',                    kind: 'text' },
  ],
  reproductive_event: [
    { key: 'animal_id',    label: 'Animal',      kind: 'animal' },
    { key: 'event_type',   label: 'Tipo evento', kind: 'enum', map: REPRO_EVENT_LABELS },
    { key: 'event_date',   label: 'Fecha',       kind: 'date' },
    { key: 'species_slug', label: 'Especie',     kind: 'enum', map: SPECIES_LABELS },
    { key: 'sire_id',      label: 'Semental',    kind: 'animal' },
    { key: 'notes',        label: 'Notas',       kind: 'text' },
  ],
  mortality_event: [
    { key: 'animal_id',  label: 'Lote / Camada',     kind: 'animal' },
    { key: 'event_date', label: 'Fecha',             kind: 'date' },
    { key: 'quantity',   label: 'Cantidad de bajas', kind: 'number' },
    { key: 'notes',      label: 'Notas',             kind: 'text' },
  ],
  production_event: [
    { key: 'animal_id',     label: 'Animal',    kind: 'animal' },
    { key: 'recorded_date', label: 'Fecha',     kind: 'date' },
    { key: 'liters_am',     label: 'Litros AM', kind: 'number' },
    { key: 'liters_pm',     label: 'Litros PM', kind: 'number' },
    { key: 'notes',         label: 'Notas',     kind: 'text' },
  ],
  vaccine_profile: [
    { key: 'name',                        label: 'Nombre',                kind: 'text' },
    { key: 'description',                 label: 'Descripción',           kind: 'text' },
    { key: 'target_type_id',              label: 'Tipo animal objetivo',  kind: 'type' },
    { key: 'target_sex',                  label: 'Sexo objetivo',         kind: 'enum', map: TARGET_SEX_LABELS },
    { key: 'age_min_days',                label: 'Edad mín. (días)',      kind: 'number' },
    { key: 'age_max_days',                label: 'Edad máx. (días)',      kind: 'number' },
    { key: 'default_next_dose_days',      label: 'Días siguiente dosis',  kind: 'number' },
    { key: 'total_doses',                 label: 'Dosis totales',         kind: 'number' },
    { key: 'allowed_reproductive_states', label: 'Estados reproductivos', kind: 'array_text' },
    { key: 'is_active',                   label: 'Activa',                kind: 'bool' },
  ],
  vaccine_assignment: [
    { key: 'vaccine_id',   label: 'Vacuna',              kind: 'vaccine' },
    { key: 'applied_at',   label: 'Fecha de aplicación', kind: 'date' },
    { key: 'animal_ids',   label: 'Animales',            kind: 'array_animals' },
    { key: 'next_dose_at', label: 'Próxima dosis',       kind: 'date' },
    { key: 'doses_count',  label: 'Cantidad de dosis',   kind: 'number' },
    { key: 'notes',        label: 'Notas',               kind: 'text' },
  ],
}

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function ReadonlyPayload({
  requestType, payload, resolvers,
}: {
  requestType: string; payload: Record<string, unknown>; resolvers: ResolverMaps
}) {
  const fields = DISPLAY_CONFIG[requestType] ?? []

  const rows = fields
    .map(f => {
      const raw = payload[f.key]
      if (raw == null || raw === '') return null
      if (f.kind === 'bool' && raw !== true) return null

      // metadata is rendered as multiple sub-rows.
      if (f.kind === 'metadata') {
        const obj = raw as Record<string, unknown> | null
        if (!obj || typeof obj !== 'object') return null
        const subRows: { label: string; display: string }[] = []
        for (const [k, v] of Object.entries(obj)) {
          if (v == null || v === '') continue
          if (k === 'padre_id' || k === 'madre_id') continue // show *_nombre instead
          const label = METADATA_LABELS[k] ?? k.replace(/_/g, ' ')
          subRows.push({ label, display: String(v) })
        }
        if (subRows.length === 0) return null
        // Return a marker the loop below unpacks.
        return { __meta: true, subRows }
      }

      let display: string
      switch (f.kind) {
        case 'date':   display = formatDate(String(raw)); break
        case 'number': display = String(raw); break
        case 'bool':   display = raw === true ? 'Sí' : 'No'; break
        case 'enum':   display = f.map?.[String(raw)] ?? String(raw); break
        case 'animal': display = resolvers.animals[String(raw)] ?? '(animal no encontrado)'; break
        case 'type':   display = resolvers.animalTypes[String(raw)] ?? '(tipo no encontrado)'; break
        case 'vaccine':display = resolvers.vaccines[String(raw)] ?? '(vacuna no encontrada)'; break
        case 'array_animals': {
          const ids = Array.isArray(raw) ? raw as string[] : []
          display = ids.map(id => resolvers.animals[id] ?? '(no encontrado)').join(', ')
          break
        }
        case 'array_text': display = Array.isArray(raw) ? (raw as string[]).join(', ') : String(raw); break
        default: display = String(raw)
      }
      if (display === '') return null
      return { label: f.label, display }
    })
    .filter(Boolean)

  if (rows.length === 0) {
    return <p className="text-sm text-muted italic">Sin datos para mostrar.</p>
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-4 grid grid-cols-1 gap-3">
      {rows.map((r, i) => {
        if (r && typeof r === 'object' && '__meta' in r) {
          const sub = (r as { subRows: { label: string; display: string }[] }).subRows
          return sub.map((s, j) => (
            <div key={`${i}-${j}`} className="flex flex-col gap-0.5">
              <span className="text-xs text-muted uppercase tracking-wide">{s.label}</span>
              <span className="text-sm text-foreground font-medium break-words">{s.display}</span>
            </div>
          ))
        }
        const row = r as { label: string; display: string }
        return (
          <div key={i} className="flex flex-col gap-0.5">
            <span className="text-xs text-muted uppercase tracking-wide">{row.label}</span>
            <span className="text-sm text-foreground font-medium break-words">{row.display}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Client-side submit gating (mirrors server requireds for UX)          */
/* ────────────────────────────────────────────────────────────────────── */

export function clientSideValidate(
  type: string,
  data: Record<string, unknown>
): string | null {
  switch (type) {
    case 'animal_record': {
      if (!data.type_id)             return 'Selecciona el tipo de animal'
      if (!data.identification_code) return 'Ingresa el código de identificación'
      if (data._codeStatus === 'taken')    return 'El código de identificación ya está en uso'
      if (data._codeStatus === 'checking') return 'Espera mientras se verifica el código...'
      if (!data.breed)              return 'La raza/especie es obligatoria'
      if (!data.sex)                return 'Selecciona el sexo'
      if (!data.birth_date)         return 'La fecha de nacimiento es obligatoria'
      if (data.is_litter === true) {
        const lc = typeof data.litter_count === 'number' ? data.litter_count : parseInt(String(data.litter_count ?? ''), 10)
        if (!Number.isFinite(lc) || lc <= 0) return 'La camada debe tener al menos 1 lechón nacido vivo'
      }
      // aves-de-corral required metadata (cantidad + etapa)
      const meta = (data.metadata as Record<string, unknown> | null) ?? {}
      const slug = String(data._typeSlug ?? '')
      if (slug === 'aves-de-corral') {
        if (!meta.cantidad) return 'El número inicial de aves es obligatorio'
        if (!meta.etapa)    return 'La etapa productiva es obligatoria'
      }
      return null
    }
    case 'reproductive_event':
      if (!data.animal_id)   return 'Selecciona un animal'
      if (!data.event_type)  return 'Selecciona el tipo de evento'
      if (!data.event_date)  return 'La fecha del evento es obligatoria'
      return null
    case 'mortality_event':
      if (!data.animal_id)   return 'Selecciona un lote o camada'
      if (!data.event_date)  return 'La fecha es obligatoria'
      if (!data.quantity)    return 'La cantidad de bajas es obligatoria'
      return null
    case 'production_event': {
      if (!data.animal_id)     return 'Selecciona un animal'
      if (!data.recorded_date) return 'La fecha de registro es obligatoria'
      const am = typeof data.liters_am === 'number' ? data.liters_am : parseFloat(String(data.liters_am ?? '0'))
      const pm = typeof data.liters_pm === 'number' ? data.liters_pm : parseFloat(String(data.liters_pm ?? '0'))
      if ((isNaN(am) || am <= 0) && (isNaN(pm) || pm <= 0)) return 'Ingresa al menos una medición de leche mayor a 0'
      return null
    }
    case 'vaccine_profile':
      if (!data.name || String(data.name).trim() === '') return 'El nombre de la vacuna es obligatorio'
      if (!data.target_type_id) return 'Selecciona el tipo de animal objetivo'
      return null
    case 'vaccine_assignment':
      if (!data.vaccine_id)  return 'Selecciona una vacuna'
      if (!data.applied_at)  return 'La fecha de aplicación es obligatoria'
      if (!Array.isArray(data.animal_ids) || data.animal_ids.length === 0) return 'Selecciona al menos un animal (usa “Filtrar elegibles”)'
      return null
    default:
      return 'Tipo de solicitud inválido'
  }
}
