'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PawPrint, CalendarDays, AlertTriangle, Syringe, Droplets,
  ClipboardList, ArrowLeft, Loader2, CheckCircle2,
} from 'lucide-react'
import { REQUEST_TYPE_LABELS, VALID_REQUEST_TYPES, type RequestType } from '@/lib/requests/validatePayload'
import {
  FORM_COMPONENTS, clientSideValidate,
} from '@/components/requests/RequestForms'

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

/** Drop UI-only keys before sending to the API. _typeSlug is kept because the
 *  server uses it for aves-de-corral required-metadata validation (it is not
 *  included in the sanitized output so it never persists). */
function stripInternal(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (k === '_codeStatus') continue
    out[k] = v
  }
  return out
}

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
    setError(null)

    // Client-side gating: required fields + identification-code check state.
    const clientErr = clientSideValidate(selectedType, formData)
    if (clientErr) { setError(clientErr); return }

    setLoading(true)
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_type: selectedType, payload: stripInternal(formData) }),
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
              onClick={() => { setSelectedType(type); setFormData({}); setStep('form'); setError(null) }}
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
            onClick={() => { setStep('select'); setError(null) }}
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
