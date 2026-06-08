'use client'

import { useState, useEffect, useTransition, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, PawPrint, HeartPulse, CheckCircle, XCircle, Loader, Syringe } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

/* ── Slugs that support reproductive tracking ── */
const REPRO_TYPES = ['bovino', 'equino', 'porcino', 'caprino']

/* ── Label map for sire selector header ── */
const SIRE_LABEL: Record<string, string> = {
  bovino:  'toro (bovino macho)',
  equino:  'semental (equino macho)',
  porcino: 'verraco (porcino macho)',
  caprino: 'macho cabrio (caprino macho)',
}

/* ── Reproductive status options: sex-aware ── */
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

/* ── Propósito options for bovino: sex-aware ── */
const PROPOSITO_BOVINO: Record<string, string[]> = {
  macho:  ['carne', 'doble propósito', 'reproducción'],
  hembra: ['leche', 'carne', 'doble propósito'],
}

/* ── Static field definitions (minus reactive ones) ── */
const typeFields: Record<string, { label: string; name: string; type: string; required?: boolean; options?: string[]; placeholder?: string }[]> = {
  'bovino': [
    { label: 'Nombre', name: 'name', type: 'text', placeholder: 'Ej: Luna' },
    { label: 'Raza', name: 'breed', type: 'text', required: true, placeholder: 'Ej: Brahman, Holstein' },
    { label: 'Sexo', name: 'sex', type: 'select', required: true, options: ['macho', 'hembra'] },
    { label: 'Fecha de nacimiento', name: 'birth_date', type: 'date' },
    { label: 'Código de identificación', name: 'identification_code', type: 'text', required: true, placeholder: 'Chapeta o hierro' },
    { label: 'Color', name: 'color', type: 'text', placeholder: 'Ej: Negro, Pardo' },
    { label: 'Peso (kg)', name: 'weight_kg', type: 'number', placeholder: 'Ej: 450' },
    { label: 'Propósito', name: 'meta_proposito', type: 'select_sex_bovino', options: [] },
    { label: 'Número de partos', name: 'meta_numero_partos', type: 'number_hembra_only', placeholder: '0' },
    { label: 'Tipo de adquisición', name: 'acquisition_type', type: 'select', options: ['nacimiento', 'compra', 'donacion'] },
    { label: 'Notas', name: 'notes', type: 'textarea', placeholder: 'Observaciones adicionales...' },
  ],
  'equino': [
    { label: 'Nombre', name: 'name', type: 'text', placeholder: 'Ej: Relámpago' },
    { label: 'Raza', name: 'breed', type: 'text', required: true, placeholder: 'Ej: Criollo, Paso Fino' },
    { label: 'Sexo', name: 'sex', type: 'select', required: true, options: ['macho', 'hembra'] },
    { label: 'Fecha de nacimiento', name: 'birth_date', type: 'date' },
    { label: 'Código de identificación', name: 'identification_code', type: 'text', required: true, placeholder: 'Hierro o microchip' },
    { label: 'Color / Capa', name: 'color', type: 'text', placeholder: 'Ej: Alazán, Moro' },
    { label: 'Peso (kg)', name: 'weight_kg', type: 'number', placeholder: 'Ej: 400' },
    { label: 'Tipo de uso', name: 'meta_uso', type: 'select', options: ['carga', 'monta', 'reproducción', 'trabajo'] },
    { label: 'Estado de doma', name: 'meta_doma', type: 'select', options: ['domado', 'en proceso', 'sin domar'] },
    { label: 'Alzada (cm)', name: 'meta_alzada_cm', type: 'number', placeholder: 'Ej: 150' },
    { label: 'Tipo de adquisición', name: 'acquisition_type', type: 'select', options: ['nacimiento', 'compra', 'donacion'] },
    { label: 'Notas', name: 'notes', type: 'textarea', placeholder: 'Observaciones adicionales...' },
  ],
  'porcino': [
    { label: 'Nombre / Identificador', name: 'name', type: 'text', placeholder: 'Ej: Cerdo-001' },
    { label: 'Raza', name: 'breed', type: 'text', required: true, placeholder: 'Ej: Landrace, Pietrain' },
    { label: 'Sexo', name: 'sex', type: 'select', required: true, options: ['macho', 'hembra'] },
    { label: 'Fecha de nacimiento', name: 'birth_date', type: 'date' },
    { label: 'Código de identificación', name: 'identification_code', type: 'text', required: true, placeholder: 'Arete o muesca' },
    { label: 'Color', name: 'color', type: 'text', placeholder: 'Ej: Blanco, Rosado' },
    { label: 'Peso (kg)', name: 'weight_kg', type: 'number', placeholder: 'Ej: 90' },
    { label: 'Etapa', name: 'meta_etapa', type: 'select', options: ['lechón', 'levante', 'ceba', 'reproductor'] },
    { label: 'Número de camada', name: 'meta_numero_camada', type: 'number', placeholder: '0' },
    { label: 'Tipo de adquisición', name: 'acquisition_type', type: 'select', options: ['nacimiento', 'compra', 'donacion'] },
    { label: 'Notas', name: 'notes', type: 'textarea', placeholder: 'Observaciones adicionales...' },
  ],
  'aves-de-corral': [
    { label: 'Nombre / Lote', name: 'name', type: 'text', placeholder: 'Ej: Lote-Gallinas-01' },
    { label: 'Especie', name: 'breed', type: 'text', required: true, placeholder: 'Ej: Gallina ponedora, Pollo de engorde' },
    { label: 'Sexo', name: 'sex', type: 'select', required: true, options: ['machos', 'hembras', 'mixto'] },
    { label: 'Fecha de nacimiento / ingreso', name: 'birth_date', type: 'date' },
    { label: 'Código de identificación', name: 'identification_code', type: 'text', required: true, placeholder: 'Anillo o código de lote' },
    { label: 'Color de plumaje', name: 'color', type: 'text', placeholder: 'Ej: Rojo, Blanco' },
    { label: 'Número inicial de aves', name: 'meta_cantidad', type: 'number', required: true, placeholder: 'Ej: 100' },
    { label: 'Etapa productiva', name: 'meta_etapa', type: 'select', required: true, options: ['pollitos', 'levante', 'producción/adultos'] },
    { label: 'Peso promedio', name: 'weight_kg', type: 'number', placeholder: '' },
    { label: 'Propósito', name: 'meta_proposito', type: 'select', options: ['postura', 'engorde', 'doble propósito'] },
    { label: 'Producción huevos/semana', name: 'meta_produccion_huevos', type: 'number', placeholder: 'Ej: 5' },
    { label: 'Tipo de adquisición', name: 'acquisition_type', type: 'select', options: ['nacimiento', 'compra', 'donacion'] },
    { label: 'Notas', name: 'notes', type: 'textarea', placeholder: 'Observaciones adicionales...' },
  ],
  'patos': [
    { label: 'Nombre', name: 'name', type: 'text', placeholder: 'Ej: Pato-01' },
    { label: 'Raza / Tipo', name: 'breed', type: 'text', required: true, placeholder: 'Ej: Pekin, Criollo, Muscovy' },
    { label: 'Sexo', name: 'sex', type: 'select', required: true, options: ['macho', 'hembra'] },
    { label: 'Fecha de nacimiento', name: 'birth_date', type: 'date' },
    { label: 'Código de identificación', name: 'identification_code', type: 'text', required: true, placeholder: 'Anillo o código' },
    { label: 'Color', name: 'color', type: 'text', placeholder: 'Ej: Blanco, Café' },
    { label: 'Peso (kg)', name: 'weight_kg', type: 'number', placeholder: 'Ej: 2.8' },
    { label: 'Tipo de adquisición', name: 'acquisition_type', type: 'select', options: ['nacimiento', 'compra', 'donacion'] },
    { label: 'Notas', name: 'notes', type: 'textarea', placeholder: 'Observaciones adicionales...' },
  ],
  'caprino': [
    { label: 'Nombre', name: 'name', type: 'text', placeholder: 'Ej: Canela' },
    { label: 'Raza', name: 'breed', type: 'text', required: true, placeholder: 'Ej: Boer, Saanen, Alpina' },
    { label: 'Sexo', name: 'sex', type: 'select', required: true, options: ['macho', 'hembra'] },
    { label: 'Fecha de nacimiento', name: 'birth_date', type: 'date' },
    { label: 'Código de identificación', name: 'identification_code', type: 'text', required: true, placeholder: 'Arete o microchip' },
    { label: 'Color', name: 'color', type: 'text', placeholder: 'Ej: Blanco, Negro' },
    { label: 'Peso (kg)', name: 'weight_kg', type: 'number', placeholder: 'Ej: 45' },
    { label: 'Propósito', name: 'meta_proposito', type: 'select', options: ['leche', 'carne', 'doble propósito', 'reproducción'] },
    { label: 'Número de partos', name: 'meta_numero_partos', type: 'number_hembra_only', placeholder: '0' },
    { label: 'Tipo de adquisición', name: 'acquisition_type', type: 'select', options: ['nacimiento', 'compra', 'donacion'] },
    { label: 'Notas', name: 'notes', type: 'textarea', placeholder: 'Observaciones adicionales...' },
  ],
}

interface SireOption { id: string; name: string | null; identification_code: string | null }

interface AnimalFormProps {
  typeSlug: string
  typeName: string
  typeId: string
  categorySlug: string
  categoryName: string
}

export function AnimalForm({ typeSlug, typeName, typeId, categorySlug, categoryName }: AnimalFormProps) {
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)
  const [newAnimalId, setNewAnimalId] = useState<string | null>(null)
  const [showBirthVaxPrompt, setShowBirthVaxPrompt] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  /* ── Reactive controlled fields ── */
  const [sex, setSex]                         = useState('')
  const [reproStatus, setReproStatus]         = useState('no aplica')
  const [acquisitionType, setAcquisitionType] = useState('')
  const [acquisitionDate, setAcquisitionDate] = useState('')
  const [sireId, setSireId]                   = useState('')
  const [avesEtapa, setAvesEtapa]             = useState('')
  const [avesProposito, setAvesProposito]     = useState('')

  /* ── Identification code duplicate check ── */
  const [identCode, setIdentCode]                     = useState('')
  const [codeStatus, setCodeStatus]                   = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [codeTakenMsg, setCodeTakenMsg]               = useState('')
  const debounceTimerRef                              = useRef<ReturnType<typeof setTimeout> | null>(null)

  const checkCode = useCallback(async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) { setCodeStatus('idle'); setCodeTakenMsg(''); return }
    setCodeStatus('checking')
    try {
      const res = await fetch(`/api/animals/check-code?code=${encodeURIComponent(trimmed)}`)
      const json = await res.json()
      if (json.taken) {
        setCodeStatus('taken')
        setCodeTakenMsg(json.usedBy ? `Ya está en uso por "${json.usedBy}"` : 'Este código ya está en uso')
      } else {
        setCodeStatus('available')
        setCodeTakenMsg('')
      }
    } catch {
      setCodeStatus('idle')
    }
  }, [])

  function handleIdentCodeChange(value: string) {
    setIdentCode(value)
    setCodeStatus('idle')
    setCodeTakenMsg('')
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => checkCode(value), 500)
  }

  /* ── Sire list (male animals of same type) ── */
  const [sires, setSires]             = useState<SireOption[]>([])
  const [loadingSires, setLoadingSires] = useState(false)

  const isReproType     = REPRO_TYPES.includes(typeSlug)
  const showSireSelector = isReproType && sex === 'hembra' && reproStatus === 'preñada'
  const showAcqDate      = acquisitionType === 'compra' || acquisitionType === 'donacion'

  /* ── Sex-aware derived values ── */
  const reproStatusOptions = sex === 'macho'
    ? (REPRO_STATUS_MACHO[typeSlug] ?? ['activo', 'no aplica'])
    : (REPRO_STATUS_HEMBRA[typeSlug] ?? ['vacía', 'no aplica'])

  const propositoBovino = sex ? (PROPOSITO_BOVINO[sex] ?? PROPOSITO_BOVINO['hembra']) : PROPOSITO_BOVINO['hembra']

  /* Reset reproStatus when sex changes to avoid stale invalid value */
  function handleSexChange(v: string) {
    setSex(v)
    setReproStatus(v === 'macho' ? 'no aplica' : 'vacía')
  }

  /* fetch sires when selector becomes visible */
  useEffect(() => {
    if (!showSireSelector) { setSires([]); setSireId(''); return }
    setLoadingSires(true)
    fetch(`/api/animals?sex=macho&type_slug=${typeSlug}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setSires(d) })
      .catch(() => {})
      .finally(() => setLoadingSires(false))
  }, [showSireSelector, typeSlug])

  const fields = typeFields[typeSlug] || typeFields['bovino']

  const iconSrc: string | null =
    typeSlug === 'bovino'         ? (sex === 'hembra' ? '/vaca.svg'    : '/toro.svg') :
    typeSlug === 'equino'         ? (sex === 'hembra' ? '/yegua.svg'   : '/caballo.svg') :
    typeSlug === 'porcino'        ? (sex === 'hembra' ? '/cerda.svg'   : '/cerdo.svg') :
    typeSlug === 'caprino'        ? (sex === 'hembra' ? '/cabrita.svg' : '/cabro.svg') :
    typeSlug === 'patos'          ? (sex === 'hembra' ? '/pata.svg'    : '/pato.svg') :
    typeSlug === 'aves-de-corral' ? (
      avesEtapa === 'pollitos' || !avesEtapa ? '/pollito.svg' :
      (sex === 'hembra' || sex === 'hembras' || sex === 'mixto') ? '/gallina.svg' : '/gallo.svg'
    ) : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Require identification_code
    if (!identCode.trim()) {
      setError('El código de identificación es obligatorio.')
      return
    }
    // Block if code is taken or still checking
    if (codeStatus === 'taken') {
      setError(codeTakenMsg || 'El código de identificación ya está en uso. Usa un código único.')
      return
    }
    if (codeStatus === 'checking') {
      setError('Espera mientras se verifica el código de identificación...')
      return
    }

    const formData = new FormData(e.currentTarget)
    const baseFields = ['name', 'breed', 'sex', 'birth_date', 'identification_code', 'color', 'weight_kg', 'acquisition_type', 'acquisition_date', 'notes', 'status']

    const animalData: Record<string, unknown> = { type_id: typeId, status: 'activo' }
    const metadata: Record<string, unknown>   = {}

    for (const [key, value] of formData.entries()) {
      if (!value) continue
      if (key.startsWith('meta_')) {
        metadata[key.replace('meta_', '')] = value
      } else if (baseFields.includes(key)) {
        if (key === 'weight_kg') {
          const n = parseFloat(value as string)
          animalData[key] = typeSlug === 'aves-de-corral'
            ? (avesEtapa === 'pollitos' ? n / 1000 : n / 2.20462)
            : n
        } else {
          animalData[key] = value
        }
      }
    }

    /* inject controlled values not in formData */
    animalData.sex = sex || animalData.sex
    if (isReproType) metadata['estado_reproductivo'] = reproStatus
    if (showSireSelector && sireId) {
      metadata['padre_id'] = sireId
      const sireName = sires.find(s => s.id === sireId)?.name || sires.find(s => s.id === sireId)?.identification_code
      if (sireName) metadata['padre_nombre'] = sireName
    }
    if (acquisitionType) animalData['acquisition_type'] = acquisitionType
    if (showAcqDate && acquisitionDate) animalData['acquisition_date'] = acquisitionDate

    animalData.metadata = metadata

    startTransition(async () => {
      try {
        const res = await fetch('/api/animals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(animalData),
        })
        const result = await res.json()

        if (!res.ok) {
          setError(result.error || 'Error al registrar el animal')
          return
        }

        setSuccess(true)
        const createdId = result?.data?.id as string | undefined
        if (createdId) setNewAnimalId(createdId)

        const isBirth = (String(animalData['acquisition_type'] ?? '').toLowerCase() === 'nacimiento')
        const isCalf = typeSlug === 'bovino'

        if (createdId && isBirth && isCalf) {
          setShowBirthVaxPrompt(true)
          return
        }

        setTimeout(() => { router.push('/dashboard/animals/list') }, 1500)
      } catch {
        setError('Error de conexión. Intenta de nuevo.')
      }
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display tracking-tight text-2xl md:text-3xl font-bold text-foreground">Registrar {typeName}</h1>
          <p className="text-muted mt-1">Completa la información del animal</p>
        </div>
        {/* Tablet / mobile: small icon to the right of heading, sticky below header */}
        {iconSrc && (
          <div className="lg:hidden shrink-0 sticky top-16 self-start">
            <Image
              src={iconSrc}
              alt={typeName}
              width={72}
              height={72}
              className="object-contain invert-0 [html[data-theme='dark']_&]:invert"
            />
          </div>
        )}
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-muted flex-wrap">
        <Link href="/dashboard" className="hover:text-primary transition-colors">Inicio</Link>
        <span>/</span>
        <Link href="/dashboard/animals" className="hover:text-primary transition-colors">Categorías</Link>
        <span>/</span>
        <Link href={`/dashboard/animals/${categorySlug}`} className="hover:text-primary transition-colors">{categoryName}</Link>
        <span>/</span>
        <span className="text-foreground font-medium">{typeName}</span>
      </div>

      <Link href={`/dashboard/animals/${categorySlug}`}
        className="group inline-flex items-center gap-2 text-sm text-muted hover:text-primary border border-border hover:border-primary/40 hover:bg-primary/10 transition-all duration-200 px-3 py-1.5 rounded-lg">
        <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
        Volver a {categoryName}
      </Link>

      {/* Form + laptop icon */}
      <div className="flex items-start">
        {/* Form */}
        <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 max-w-3xl flex-1 min-w-0">
        {success && (
          <div className="mb-6 bg-success/10 border border-success/20 text-success rounded-xl px-4 py-3 text-sm animate-scale-in flex items-center gap-2">
            <PawPrint className="w-4 h-4" />
            {showBirthVaxPrompt ? '¡Animal registrado exitosamente!' : '¡Animal registrado exitosamente! Redirigiendo...'}
          </div>
        )}

        {success && showBirthVaxPrompt && newAnimalId && (
          <div className="mb-6 bg-primary/10 border border-primary/20 text-foreground rounded-xl px-4 py-4 text-sm animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Syringe className="w-4 h-4 text-primary" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Un nuevo ternero ha sido registrado.</p>
                <p className="text-muted mt-0.5">¿Quieres programar su esquema inicial de vacunación?</p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => router.push(`/dashboard/animals/list?assignVaccine=1&animalId=${encodeURIComponent(newAnimalId)}`)}
                    className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark"
                  >
                    Sí, programar
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard/animals/list')}
                    className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-surface-hover"
                  >
                    No, ir al inventario
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="mb-6 bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3 text-sm animate-scale-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {fields.map((field) => {
              /* ── Skip reactive fields rendered separately ── */
              if (field.name === 'meta_estado_reproductivo') return null
              if (field.name === 'acquisition_date') return null   // rendered below

              /* ── Sex: controlled ── */
              if (field.name === 'sex') {
                return (
                  <div key="sex">
                    <label htmlFor="sex" className="block text-sm font-medium text-foreground mb-1.5">
                      Sexo <span className="text-danger ml-1">*</span>
                    </label>
                    <select id="sex" name="sex" required value={sex} onChange={e => handleSexChange(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all capitalize">
                      <option value="">Seleccionar...</option>
                      {typeSlug === 'aves-de-corral' ? (
                        <>
                          <option value="macho">machos</option>
                          <option value="hembra">hembras</option>
                          <option value="mixto">mixto</option>
                        </>
                      ) : field.options ? (
                        field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)
                      ) : (
                        <>
                          <option value="macho">macho</option>
                          <option value="hembra">hembra</option>
                        </>
                      )}
                    </select>
                  </div>
                )
              }

              /* ── Aves-de-corral: stage-aware weight input ── */
              if (field.name === 'weight_kg' && typeSlug === 'aves-de-corral') {
                const isChick = avesEtapa === 'pollitos'
                const weightLabel = isChick ? 'Peso promedio (g)' : 'Peso promedio (lbs)'
                const weightPlaceholder = isChick ? 'Ej: 35' : 'Ej: 1.87'
                const weightStep = isChick ? '1' : '0.001'
                return (
                  <div key={field.name}>
                    <label htmlFor={field.name} className="block text-sm font-medium text-foreground mb-1.5">
                      {weightLabel}
                    </label>
                    <input
                      id={field.name} name={field.name} type="number"
                      placeholder={weightPlaceholder} step={weightStep} min="0"
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                    <p className="text-[11px] text-muted mt-1">
                      {isChick ? 'Pollitos: peso en gramos.' : 'Levante / adultos: peso en libras.'}
                    </p>
                  </div>
                )
              }

              /* ── Aves-de-corral: controlled etapa ── */
              if (field.name === 'meta_etapa' && typeSlug === 'aves-de-corral') {
                return (
                  <div key={field.name}>
                    <label htmlFor={field.name} className="block text-sm font-medium text-foreground mb-1.5">
                      {field.label} {field.required && <span className="text-danger ml-1">*</span>}
                    </label>
                    <select id={field.name} name={field.name} required={field.required}
                      value={avesEtapa} onChange={e => setAvesEtapa(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all capitalize">
                      <option value="">Seleccionar...</option>
                      {field.options?.map(opt => <option key={opt} value={opt} className="capitalize">{opt}</option>)}
                    </select>
                  </div>
                )
              }

              /* ── Aves-de-corral: controlled proposito ── */
              if (field.name === 'meta_proposito' && typeSlug === 'aves-de-corral') {
                return (
                  <div key={field.name}>
                    <label htmlFor={field.name} className="block text-sm font-medium text-foreground mb-1.5">
                      {field.label} {field.required && <span className="text-danger ml-1">*</span>}
                    </label>
                    <select id={field.name} name={field.name} required={field.required}
                      value={avesProposito} onChange={e => setAvesProposito(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all capitalize">
                      <option value="">Seleccionar...</option>
                      {field.options?.map(opt => <option key={opt} value={opt} className="capitalize">{opt}</option>)}
                    </select>
                  </div>
                )
              }

              /* ── Producción huevos: conditional ── */
              if (field.name === 'meta_produccion_huevos') {
                if (avesEtapa !== 'producción/adultos' || (avesProposito !== 'postura' && avesProposito !== 'doble propósito')) return null;
              }

              /* ── Propósito bovino: sex-aware ── */
              if (field.type === 'select_sex_bovino') {
                return (
                  <div key={field.name}>
                    <label htmlFor={field.name} className="block text-sm font-medium text-foreground mb-1.5">
                      {field.label}
                    </label>
                    <select id={field.name} name={field.name}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all capitalize">
                      <option value="">Seleccionar...</option>
                      {propositoBovino.map(opt => <option key={opt} value={opt} className="capitalize">{opt}</option>)}
                    </select>
                  </div>
                )
              }

              /* ── Número de partos: only for hembras ── */
              if (field.type === 'number_hembra_only') {
                if (sex !== 'hembra') return null
                return (
                  <div key={field.name}>
                    <label htmlFor={field.name} className="block text-sm font-medium text-foreground mb-1.5">
                      {field.label}
                    </label>
                    <input id={field.name} name={field.name} type="number"
                      placeholder={field.placeholder} step="1" min="0"
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
                  </div>
                )
              }

              /* ── acquisition_type: controlled ── */
              if (field.name === 'acquisition_type') {
                return (
                  <div key="acquisition_type">
                    <label htmlFor="acquisition_type" className="block text-sm font-medium text-foreground mb-1.5">
                      Tipo de adquisición
                    </label>
                    <select id="acquisition_type" name="acquisition_type"
                      value={acquisitionType} onChange={e => setAcquisitionType(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all capitalize">
                      <option value="">Seleccionar...</option>
                      <option value="nacimiento">nacimiento</option>
                      <option value="compra">compra</option>
                      <option value="donacion">donacion</option>
                    </select>
                  </div>
                )
              }

              /* ── identification_code: controlled with live duplicate check ── */
              if (field.name === 'identification_code') {
                const borderColor =
                  codeStatus === 'taken'     ? 'border-danger   focus:border-danger   focus:ring-danger/30' :
                  codeStatus === 'available' ? 'border-success  focus:border-success  focus:ring-success/30' :
                  'border-border focus:border-primary focus:ring-primary/30'

                return (
                  <div key="identification_code">
                    <label htmlFor="identification_code" className="block text-sm font-medium text-foreground mb-1.5">
                      {field.label}
                    </label>
                    <div className="relative">
                      <input
                        id="identification_code"
                        name="identification_code"
                        type="text"
                        required
                        value={identCode}
                        onChange={e => handleIdentCodeChange(e.target.value)}
                        placeholder={field.placeholder}
                        className={`w-full px-4 py-2.5 pr-10 rounded-xl bg-background border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 transition-all ${borderColor}`}
                      />
                      {/* Status icon */}
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        {codeStatus === 'checking'  && <Loader    className="w-4 h-4 text-muted animate-spin" />}
                        {codeStatus === 'available' && <CheckCircle className="w-4 h-4 text-success" />}
                        {codeStatus === 'taken'     && <XCircle    className="w-4 h-4 text-danger" />}
                      </span>
                    </div>
                    {/* Feedback message */}
                    {codeStatus === 'available' && (
                      <p className="mt-1 text-xs text-success flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Código disponible
                      </p>
                    )}
                    {codeStatus === 'taken' && (
                      <p className="mt-1 text-xs text-danger flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> {codeTakenMsg}
                      </p>
                    )}
                  </div>
                )
              }

              /* ── Notes rendered separately after all conditional fields ── */
              if (field.name === 'notes') return null

              /* ── Default render ── */
              const colSpan = field.type === 'textarea' ? 'md:col-span-2' : ''
              return (
                <div key={field.name} className={colSpan}>
                  <label htmlFor={field.name} className="block text-sm font-medium text-foreground mb-1.5">
                    {field.label}
                    {field.required && <span className="text-danger ml-1">*</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select id={field.name} name={field.name} required={field.required}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all capitalize">
                      <option value="">Seleccionar...</option>
                      {field.options?.map(opt => <option key={opt} value={opt} className="capitalize">{opt}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea id={field.name} name={field.name} rows={3} placeholder={field.placeholder}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none" />
                  ) : (
                    <input
                      id={field.name}
                      name={field.name}
                      type={field.type}
                      required={field.required}
                      placeholder={field.placeholder}
                      step={field.type === 'number'
                        ? (typeSlug === 'aves-de-corral' && field.name === 'weight_kg' ? '0.01' : '0.01')
                        : undefined}
                      min={typeSlug === 'aves-de-corral' && field.name === 'weight_kg' ? '0' : undefined}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    />
                  )}
                </div>
              )
            })}

            {/* ── Acquisition date: only for compra / donacion ── */}
            {showAcqDate && (
              <div>
                <label htmlFor="acquisition_date" className="block text-sm font-medium text-foreground mb-1.5">
                  Fecha de adquisición
                </label>
                <input id="acquisition_date" name="acquisition_date" type="date"
                  value={acquisitionDate} onChange={e => setAcquisitionDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all" />
              </div>
            )}

            {/* ── Reproductive status: only for repro types ── */}
            {isReproType && sex && (
              <div>
                <label htmlFor="meta_estado_reproductivo" className="block text-sm font-medium text-foreground mb-1.5">
                  Estado reproductivo
                </label>
                <select id="meta_estado_reproductivo" name="meta_estado_reproductivo"
                  value={reproStatus} onChange={e => setReproStatus(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all capitalize">
                  {reproStatusOptions.map(opt => (
                    <option key={opt} value={opt} className="capitalize">{opt}</option>
                  ))}
                </select>
              </div>
            )}

            {/* ── Sire selector panel ── */}
            {showSireSelector && (
              <div className="md:col-span-2">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3 animate-fade-in">
                  <div className="flex items-center gap-2 text-primary text-sm font-semibold">
                    <HeartPulse className="w-4 h-4" />
                    Padre reproductor
                  </div>
                  <p className="text-xs text-muted">
                    Selecciona el {SIRE_LABEL[typeSlug] || 'macho'} que impregnó a esta hembra.
                  </p>
                  {loadingSires ? (
                    <div className="flex items-center gap-2 text-xs text-muted py-2">
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      Cargando machos registrados...
                    </div>
                  ) : sires.length === 0 ? (
                    <p className="text-xs text-warning py-2">
                      No hay {
                        typeSlug === 'bovino' ? 'toros' :
                        typeSlug === 'equino' ? 'sementales' :
                        typeSlug === 'porcino' ? 'verracos' :
                        typeSlug === 'caprino' ? 'machos cabrios' :
                        'machos'
                      } registrados activos.
                      Puedes registrar el padre más tarde desde el módulo de eventos reproductivos.
                    </p>
                  ) : (
                    <select value={sireId} onChange={e => setSireId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all">
                      <option value="">— Sin especificar —</option>
                      {sires.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.name || s.identification_code || 'Sin nombre'}{s.identification_code && s.name ? ` (${s.identification_code})` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {sireId && <input type="hidden" name="meta_padre_id" value={sireId} />}
                </div>
              </div>
            )}

            {/* ── Notes: always last field ── */}
            {fields.find(f => f.name === 'notes') && (
              <div className="md:col-span-2">
                <label htmlFor="notes" className="block text-sm font-medium text-foreground mb-1.5">
                  {fields.find(f => f.name === 'notes')!.label}
                </label>
                <textarea id="notes" name="notes" rows={3}
                  placeholder={fields.find(f => f.name === 'notes')!.placeholder}
                  className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none" />
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-border flex gap-3">
            <button type="submit" disabled={isPending || success}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
              {isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Animal
                </>
              )}
            </button>
            <Link href={`/dashboard/animals/${categorySlug}`}
              className="group inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border hover:border-primary/40 text-muted hover:text-primary hover:bg-primary/10 font-medium transition-all duration-200">
              <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
              Cancelar
            </Link>
          </div>
        </form>
        </div>

        {/* Laptop: right column icon, sticky so it follows scroll */}
        {iconSrc && (
          <div className="hidden lg:flex w-[538px] shrink-0 sticky top-8 self-start items-center justify-center py-12">
            <Image
              src={iconSrc}
              alt={typeName}
              width={460}
              height={460}
              className="object-contain invert-0 [html[data-theme='dark']_&]:invert"
            />
          </div>
        )}
      </div>
    </div>
  )
}
