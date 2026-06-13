'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  PawPrint, CalendarDays, AlertTriangle, Syringe, Droplets,
  ClipboardList, ArrowLeft, Loader2, CheckCircle2,
} from 'lucide-react'
import { REQUEST_TYPE_LABELS, VALID_REQUEST_TYPES, type RequestType } from '@/lib/requests/validatePayload'

type Step = 'select' | 'form'

const TYPE_ICONS: Record<string, React.ElementType> = {
  animal_record:      PawPrint,
  reproductive_event: CalendarDays,
  mortality_event:    AlertTriangle,
  production_event:   Droplets,
  vaccine_profile:    Syringe,
  vaccine_assignment: ClipboardList,
}

const TYPE_DESCRIPTIONS: Record<string, string> = {
  animal_record:      'Proponer el registro de un nuevo animal en el inventario',
  reproductive_event: 'Registrar monta, inseminación, parto, aborto o destete',
  mortality_event:    'Reportar bajas en lote de aves o camada porcina',
  production_event:   'Registrar producción de leche de bovino o caprino',
  vaccine_profile:    'Sugerir una nueva vacuna al catálogo del sistema',
  vaccine_assignment: 'Sugerir la aplicación de una vacuna a uno o más animales',
}

// ─── Simple field components ──────────────────────────────────────────────────
function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-sm bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    />
  )
}

function SelectInput({ value, onChange, children }: {
  value: string; onChange: (v: string) => void; children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full text-sm bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
    >
      {children}
    </select>
  )
}

// ─── Per-type forms ───────────────────────────────────────────────────────────

function AnimalRecordForm({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const [animalTypes, setAnimalTypes] = useState<{ id: string; name: string; animal_categories: { name: string } | null }[]>([])

  useEffect(() => {
    fetch('/api/animal-types')
      .then(r => r.json())
      .then(data => setAnimalTypes(Array.isArray(data) ? data : (data.data ?? [])))
      .catch(() => {})
  }, [])

  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label="Tipo de Animal" required>
        <SelectInput value={String(value.type_id ?? '')} onChange={v => set('type_id', v)}>
          <option value="">Seleccionar tipo...</option>
          {animalTypes.map(t => (
            <option key={t.id} value={t.id}>
              {t.animal_categories?.name ? `${t.animal_categories.name} — ` : ''}{t.name}
            </option>
          ))}
        </SelectInput>
      </FormField>
      <FormField label="Nombre (opcional)">
        <TextInput value={String(value.name ?? '')} onChange={v => set('name', v)} placeholder="Nombre del animal" />
      </FormField>
      <FormField label="Raza" required>
        <TextInput value={String(value.breed ?? '')} onChange={v => set('breed', v)} placeholder="Ej: Holstein, Duroc..." />
      </FormField>
      <FormField label="Sexo">
        <SelectInput value={String(value.sex ?? '')} onChange={v => set('sex', v)}>
          <option value="">Seleccionar...</option>
          <option value="macho">Macho</option>
          <option value="hembra">Hembra</option>
          <option value="mixto">Mixto</option>
        </SelectInput>
      </FormField>
      <FormField label="Fecha de Nacimiento">
        <TextInput type="date" value={String(value.birth_date ?? '')} onChange={v => set('birth_date', v)} />
      </FormField>
      <FormField label="Código de Identificación">
        <TextInput value={String(value.identification_code ?? '')} onChange={v => set('identification_code', v)} placeholder="Arete, placa, etc." />
      </FormField>
      <FormField label="Color">
        <TextInput value={String(value.color ?? '')} onChange={v => set('color', v)} placeholder="Ej: Negro, Pardo..." />
      </FormField>
      <FormField label="Peso (kg)">
        <TextInput type="number" value={String(value.weight_kg ?? '')} onChange={v => set('weight_kg', v ? parseFloat(v) : null)} placeholder="0.0" />
      </FormField>
      <div className="col-span-full">
        <FormField label="Notas">
          <textarea
            value={String(value.notes ?? '')}
            onChange={e => set('notes', e.target.value)}
            placeholder="Observaciones adicionales..."
            rows={3}
            className="w-full text-sm bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </FormField>
      </div>
    </div>
  )
}

function ReproductiveEventForm({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const [animals, setAnimals] = useState<{ id: string; name: string | null; identification_code: string | null }[]>([])

  useEffect(() => {
    fetch('/api/animals?sex=hembra')
      .then(r => r.json())
      .then(data => setAnimals(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label="Animal (hembra)" required>
        <SelectInput value={String(value.animal_id ?? '')} onChange={v => set('animal_id', v)}>
          <option value="">Seleccionar animal...</option>
          {animals.map(a => (
            <option key={a.id} value={a.id}>
              {a.name || a.identification_code || a.id}
            </option>
          ))}
        </SelectInput>
      </FormField>
      <FormField label="Tipo de Evento" required>
        <SelectInput value={String(value.event_type ?? '')} onChange={v => set('event_type', v)}>
          <option value="">Seleccionar...</option>
          <option value="monta_natural">Monta Natural</option>
          <option value="inseminacion">Inseminación</option>
          <option value="confirmacion_prenez">Confirmación de Preñez</option>
          <option value="parto">Parto</option>
          <option value="aborto">Aborto</option>
          <option value="destete">Destete</option>
        </SelectInput>
      </FormField>
      <FormField label="Fecha del Evento" required>
        <TextInput type="date" value={String(value.event_date ?? '')} onChange={v => set('event_date', v)} />
      </FormField>
      <FormField label="Especie (para calcular fecha parto)">
        <SelectInput value={String(value.species_slug ?? '')} onChange={v => set('species_slug', v)}>
          <option value="">Seleccionar...</option>
          <option value="bovino">Bovino</option>
          <option value="equino">Equino</option>
          <option value="porcino">Porcino</option>
          <option value="caprino">Caprino</option>
        </SelectInput>
      </FormField>
      <div className="col-span-full">
        <FormField label="Notas">
          <textarea
            value={String(value.notes ?? '')}
            onChange={e => set('notes', e.target.value)}
            rows={2}
            className="w-full text-sm bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </FormField>
      </div>
    </div>
  )
}

function MortalityEventForm({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const [animals, setAnimals] = useState<{ id: string; name: string | null; identification_code: string | null }[]>([])

  useEffect(() => {
    fetch('/api/animals')
      .then(r => r.json())
      .then(data => setAnimals(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label="Lote/Camada" required>
        <SelectInput value={String(value.animal_id ?? '')} onChange={v => set('animal_id', v)}>
          <option value="">Seleccionar lote/camada...</option>
          {animals.map(a => (
            <option key={a.id} value={a.id}>
              {a.name || a.identification_code || a.id}
            </option>
          ))}
        </SelectInput>
      </FormField>
      <FormField label="Fecha" required>
        <TextInput type="date" value={String(value.event_date ?? '')} onChange={v => set('event_date', v)} />
      </FormField>
      <FormField label="Cantidad de Bajas" required>
        <TextInput type="number" value={String(value.quantity ?? '')} onChange={v => set('quantity', v ? parseInt(v) : '')} placeholder="1" />
      </FormField>
      <FormField label="Notas">
        <TextInput value={String(value.notes ?? '')} onChange={v => set('notes', v)} placeholder="Causa de muerte, etc." />
      </FormField>
    </div>
  )
}

function ProductionEventForm({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const [animals, setAnimals] = useState<{ id: string; name: string | null; identification_code: string | null }[]>([])

  useEffect(() => {
    fetch('/api/animals?sex=hembra')
      .then(r => r.json())
      .then(data => setAnimals(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label="Animal (bovino/caprino hembra)" required>
        <SelectInput value={String(value.animal_id ?? '')} onChange={v => set('animal_id', v)}>
          <option value="">Seleccionar animal...</option>
          {animals.map(a => (
            <option key={a.id} value={a.id}>
              {a.name || a.identification_code || a.id}
            </option>
          ))}
        </SelectInput>
      </FormField>
      <FormField label="Fecha de Registro" required>
        <TextInput type="date" value={String(value.recorded_date ?? '')} onChange={v => set('recorded_date', v)} />
      </FormField>
      <FormField label="Litros AM (mañana)">
        <TextInput type="number" value={String(value.liters_am ?? '')} onChange={v => set('liters_am', v ? parseFloat(v) : 0)} placeholder="0.0" />
      </FormField>
      <FormField label="Litros PM (tarde)">
        <TextInput type="number" value={String(value.liters_pm ?? '')} onChange={v => set('liters_pm', v ? parseFloat(v) : 0)} placeholder="0.0" />
      </FormField>
      <div className="col-span-full">
        <FormField label="Notas">
          <TextInput value={String(value.notes ?? '')} onChange={v => set('notes', v)} placeholder="Observaciones..." />
        </FormField>
      </div>
    </div>
  )
}

function VaccineProfileForm({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const [animalTypes, setAnimalTypes] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    fetch('/api/animal-types')
      .then(r => r.json())
      .then(data => setAnimalTypes(Array.isArray(data) ? data : (data.data ?? [])))
      .catch(() => {})
  }, [])

  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <FormField label="Nombre de la Vacuna" required>
        <TextInput value={String(value.name ?? '')} onChange={v => set('name', v)} placeholder="Ej: Fiebre Aftosa Bivalente" />
      </FormField>
      <FormField label="Tipo de Animal Objetivo">
        <SelectInput value={String(value.target_type_id ?? '')} onChange={v => set('target_type_id', v || null)}>
          <option value="">Todos los tipos</option>
          {animalTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </SelectInput>
      </FormField>
      <FormField label="Sexo Objetivo">
        <SelectInput value={String(value.target_sex ?? 'any')} onChange={v => set('target_sex', v)}>
          <option value="any">Cualquiera</option>
          <option value="macho">Macho</option>
          <option value="hembra">Hembra</option>
        </SelectInput>
      </FormField>
      <FormField label="Días hasta siguiente dosis">
        <TextInput type="number" value={String(value.default_next_dose_days ?? '')} onChange={v => set('default_next_dose_days', v ? parseInt(v) : null)} placeholder="0 = dosis única" />
      </FormField>
      <FormField label="Edad mínima (días)">
        <TextInput type="number" value={String(value.age_min_days ?? '')} onChange={v => set('age_min_days', v ? parseInt(v) : null)} placeholder="Sin límite" />
      </FormField>
      <FormField label="Edad máxima (días)">
        <TextInput type="number" value={String(value.age_max_days ?? '')} onChange={v => set('age_max_days', v ? parseInt(v) : null)} placeholder="Sin límite" />
      </FormField>
      <div className="col-span-full">
        <FormField label="Descripción">
          <textarea
            value={String(value.description ?? '')}
            onChange={e => set('description', e.target.value)}
            rows={3}
            className="w-full text-sm bg-surface border border-border rounded-xl px-3 py-2.5 text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </FormField>
      </div>
    </div>
  )
}

function VaccineAssignmentForm({ value, onChange }: { value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }) {
  const [animals, setAnimals] = useState<{ id: string; name: string | null; identification_code: string | null }[]>([])
  const [vaccines, setVaccines] = useState<{ id: string; name: string }[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>(
    Array.isArray(value.animal_ids) ? value.animal_ids as string[] : []
  )

  useEffect(() => {
    fetch('/api/animals').then(r => r.json()).then(data => setAnimals(Array.isArray(data) ? data : [])).catch(() => {})
    fetch('/api/vaccines').then(r => r.json()).then(data => setVaccines(data?.data ?? [])).catch(() => {})
  }, [])

  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v })
  const toggleAnimal = (id: string) => {
    const next = selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
    setSelectedIds(next)
    set('animal_ids', next)
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <FormField label="Vacuna" required>
        <SelectInput value={String(value.vaccine_id ?? '')} onChange={v => set('vaccine_id', v)}>
          <option value="">Seleccionar vacuna...</option>
          {vaccines.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </SelectInput>
      </FormField>
      <FormField label="Fecha de Aplicación" required>
        <TextInput type="date" value={String(value.applied_at ?? '')} onChange={v => set('applied_at', v)} />
      </FormField>
      <FormField label="Animales a Vacunar" required>
        <div className="max-h-40 overflow-y-auto border border-border rounded-xl bg-surface divide-y divide-border">
          {animals.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">Cargando animales...</p>
          ) : animals.map(a => (
            <label key={a.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface/80">
              <input
                type="checkbox"
                checked={selectedIds.includes(a.id)}
                onChange={() => toggleAnimal(a.id)}
                className="rounded"
              />
              <span className="text-sm text-foreground">{a.name || a.identification_code || a.id}</span>
            </label>
          ))}
        </div>
        {selectedIds.length > 0 && (
          <p className="text-xs text-muted mt-1">{selectedIds.length} animal{selectedIds.length !== 1 ? 'es' : ''} seleccionado{selectedIds.length !== 1 ? 's' : ''}</p>
        )}
      </FormField>
      <FormField label="Notas">
        <TextInput value={String(value.notes ?? '')} onChange={v => set('notes', v)} placeholder="Observaciones..." />
      </FormField>
    </div>
  )
}

const FORM_COMPONENTS: Record<string, React.ComponentType<{ value: Record<string, unknown>; onChange: (v: Record<string, unknown>) => void }>> = {
  animal_record:      AnimalRecordForm,
  reproductive_event: ReproductiveEventForm,
  mortality_event:    MortalityEventForm,
  production_event:   ProductionEventForm,
  vaccine_profile:    VaccineProfileForm,
  vaccine_assignment: VaccineAssignmentForm,
}

// ─── Main component ───────────────────────────────────────────────────────────

export function NewRequestClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('select')
  const [selectedType, setSelectedType] = useState<RequestType | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit() {
    if (!selectedType) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_type: selectedType, payload: formData }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Error al enviar solicitud'); setLoading(false); return }
      setSuccess(true)
      setTimeout(() => router.push('/dashboard/requests/my'), 1500)
    } catch {
      setError('Error de red')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <p className="font-semibold text-foreground">¡Solicitud enviada!</p>
        <p className="text-sm text-muted">El administrador revisará tu solicitud pronto. Redirigiendo...</p>
      </div>
    )
  }

  if (step === 'select') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {VALID_REQUEST_TYPES.map(type => {
          const Icon = TYPE_ICONS[type] ?? ClipboardList
          return (
            <button
              key={type}
              onClick={() => { setSelectedType(type); setFormData({}); setStep('form') }}
              className="group bg-surface border border-border rounded-2xl p-6 text-left hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <p className="font-semibold text-sm text-foreground mb-1">
                {REQUEST_TYPE_LABELS[type]}
              </p>
              <p className="text-xs text-muted leading-relaxed">
                {TYPE_DESCRIPTIONS[type]}
              </p>
            </button>
          )
        })}
      </div>
    )
  }

  const FormComponent = selectedType ? FORM_COMPONENTS[selectedType] : null

  return (
    <div className="bg-surface border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
        <button
          onClick={() => { setStep('select'); setError(null) }}
          className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-surface transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h2 className="font-semibold text-foreground">
          {selectedType ? REQUEST_TYPE_LABELS[selectedType] : ''}
        </h2>
      </div>

      <div className="px-6 py-5 space-y-5">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/8 border border-red-500/20 rounded-xl text-sm text-red-600">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {FormComponent && (
          <FormComponent value={formData} onChange={setFormData} />
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Enviar Solicitud
          </button>
          <button
            onClick={() => setStep('select')}
            disabled={loading}
            className="px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium text-foreground hover:bg-surface/80 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
