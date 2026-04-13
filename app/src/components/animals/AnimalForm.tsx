'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, ArrowLeft, PawPrint } from 'lucide-react'
import Link from 'next/link'

// Field definitions per animal type
const typeFields: Record<string, { label: string; name: string; type: string; required?: boolean; options?: string[]; placeholder?: string }[]> = {
  'bovino': [
    { label: 'Nombre', name: 'name', type: 'text', placeholder: 'Ej: Luna' },
    { label: 'Raza', name: 'breed', type: 'text', required: true, placeholder: 'Ej: Brahman, Holstein' },
    { label: 'Sexo', name: 'sex', type: 'select', required: true, options: ['macho', 'hembra'] },
    { label: 'Fecha de nacimiento', name: 'birth_date', type: 'date' },
    { label: 'Código de identificación', name: 'identification_code', type: 'text', placeholder: 'Chapeta o hierro' },
    { label: 'Color', name: 'color', type: 'text', placeholder: 'Ej: Negro, Pardo' },
    { label: 'Peso (kg)', name: 'weight_kg', type: 'number', placeholder: 'Ej: 450' },
    { label: 'Propósito', name: 'meta_proposito', type: 'select', options: ['leche', 'carne', 'doble propósito'] },
    { label: 'Estado reproductivo', name: 'meta_estado_reproductivo', type: 'select', options: ['preñada', 'vacía', 'lactando', 'seca', 'no aplica'] },
    { label: 'Número de partos', name: 'meta_numero_partos', type: 'number', placeholder: '0' },
    { label: 'Tipo de adquisición', name: 'acquisition_type', type: 'select', options: ['nacimiento', 'compra', 'donacion'] },
    { label: 'Fecha de adquisición', name: 'acquisition_date', type: 'date' },
    { label: 'Notas', name: 'notes', type: 'textarea', placeholder: 'Observaciones adicionales...' },
  ],
  'equino': [
    { label: 'Nombre', name: 'name', type: 'text', placeholder: 'Ej: Relámpago' },
    { label: 'Raza', name: 'breed', type: 'text', required: true, placeholder: 'Ej: Criollo, Paso Fino' },
    { label: 'Sexo', name: 'sex', type: 'select', required: true, options: ['macho', 'hembra'] },
    { label: 'Fecha de nacimiento', name: 'birth_date', type: 'date' },
    { label: 'Código de identificación', name: 'identification_code', type: 'text', placeholder: 'Hierro o microchip' },
    { label: 'Color / Capa', name: 'color', type: 'text', placeholder: 'Ej: Alazán, Moro' },
    { label: 'Peso (kg)', name: 'weight_kg', type: 'number', placeholder: 'Ej: 400' },
    { label: 'Tipo de uso', name: 'meta_uso', type: 'select', options: ['carga', 'monta', 'reproducción', 'trabajo'] },
    { label: 'Estado de doma', name: 'meta_doma', type: 'select', options: ['domado', 'en proceso', 'sin domar'] },
    { label: 'Alzada (cm)', name: 'meta_alzada_cm', type: 'number', placeholder: 'Ej: 150' },
    { label: 'Tipo de adquisición', name: 'acquisition_type', type: 'select', options: ['nacimiento', 'compra', 'donacion'] },
    { label: 'Fecha de adquisición', name: 'acquisition_date', type: 'date' },
    { label: 'Notas', name: 'notes', type: 'textarea', placeholder: 'Observaciones adicionales...' },
  ],
  'porcino': [
    { label: 'Nombre / Identificador', name: 'name', type: 'text', placeholder: 'Ej: Cerdo-001' },
    { label: 'Raza', name: 'breed', type: 'text', required: true, placeholder: 'Ej: Landrace, Pietrain' },
    { label: 'Sexo', name: 'sex', type: 'select', required: true, options: ['macho', 'hembra'] },
    { label: 'Fecha de nacimiento', name: 'birth_date', type: 'date' },
    { label: 'Código de identificación', name: 'identification_code', type: 'text', placeholder: 'Arete o muesca' },
    { label: 'Color', name: 'color', type: 'text', placeholder: 'Ej: Blanco, Rosado' },
    { label: 'Peso (kg)', name: 'weight_kg', type: 'number', placeholder: 'Ej: 90' },
    { label: 'Etapa', name: 'meta_etapa', type: 'select', options: ['lechón', 'levante', 'ceba', 'reproductor'] },
    { label: 'Número de camada', name: 'meta_numero_camada', type: 'number', placeholder: '0' },
    { label: 'Tipo de adquisición', name: 'acquisition_type', type: 'select', options: ['nacimiento', 'compra', 'donacion'] },
    { label: 'Fecha de adquisición', name: 'acquisition_date', type: 'date' },
    { label: 'Notas', name: 'notes', type: 'textarea', placeholder: 'Observaciones adicionales...' },
  ],
  'aves-de-corral': [
    { label: 'Nombre / Lote', name: 'name', type: 'text', placeholder: 'Ej: Lote-Gallinas-01' },
    { label: 'Especie', name: 'breed', type: 'text', required: true, placeholder: 'Ej: Gallina ponedora, Pollo de engorde' },
    { label: 'Sexo', name: 'sex', type: 'select', required: true, options: ['macho', 'hembra'] },
    { label: 'Fecha de nacimiento / ingreso', name: 'birth_date', type: 'date' },
    { label: 'Código de identificación', name: 'identification_code', type: 'text', placeholder: 'Anillo o código de lote' },
    { label: 'Color de plumaje', name: 'color', type: 'text', placeholder: 'Ej: Rojo, Blanco' },
    { label: 'Peso (kg)', name: 'weight_kg', type: 'number', placeholder: 'Ej: 2.5' },
    { label: 'Propósito', name: 'meta_proposito', type: 'select', options: ['postura', 'engorde', 'doble propósito', 'ornamental'] },
    { label: 'Producción huevos/semana', name: 'meta_produccion_huevos', type: 'number', placeholder: 'Ej: 5' },
    { label: 'Tipo de adquisición', name: 'acquisition_type', type: 'select', options: ['nacimiento', 'compra', 'donacion'] },
    { label: 'Fecha de adquisición', name: 'acquisition_date', type: 'date' },
    { label: 'Notas', name: 'notes', type: 'textarea', placeholder: 'Observaciones adicionales...' },
  ],
}

interface AnimalFormProps {
  typeSlug: string
  typeName: string
  typeId: string
  categorySlug: string
  categoryName: string
}

export function AnimalForm({ typeSlug, typeName, typeId, categorySlug, categoryName }: AnimalFormProps) {
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const fields = typeFields[typeSlug] || typeFields['bovino']

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const formData = new FormData(e.currentTarget)
    const baseFields = ['name', 'breed', 'sex', 'birth_date', 'identification_code', 'color', 'weight_kg', 'acquisition_type', 'acquisition_date', 'notes', 'status']
    
    // Separate base fields from metadata
    const animalData: Record<string, unknown> = { type_id: typeId, status: 'activo' }
    const metadata: Record<string, unknown> = {}

    for (const [key, value] of formData.entries()) {
      if (!value) continue
      if (key.startsWith('meta_')) {
        metadata[key.replace('meta_', '')] = value
      } else if (baseFields.includes(key)) {
        animalData[key] = key === 'weight_kg' ? parseFloat(value as string) : value
      }
    }

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
        setTimeout(() => {
          router.push('/dashboard/animals/list')
        }, 1500)
      } catch {
        setError('Error de conexión. Intenta de nuevo.')
      }
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Registrar {typeName}
        </h1>
        <p className="text-muted mt-1">Completa la información del animal</p>
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

      <Link
        href={`/dashboard/animals/${categorySlug}`}
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a {categoryName}
      </Link>

      {/* Form */}
      <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 max-w-3xl">
        {success && (
          <div className="mb-6 bg-success/10 border border-success/20 text-success rounded-xl px-4 py-3 text-sm animate-scale-in flex items-center gap-2">
            <PawPrint className="w-4 h-4" />
            ¡Animal registrado exitosamente! Redirigiendo...
          </div>
        )}

        {error && (
          <div className="mb-6 bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-3 text-sm animate-scale-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {fields.map((field) => (
              <div key={field.name} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                <label htmlFor={field.name} className="block text-sm font-medium text-foreground mb-1.5">
                  {field.label}
                  {field.required && <span className="text-danger ml-1">*</span>}
                </label>

                {field.type === 'select' ? (
                  <select
                    id={field.name}
                    name={field.name}
                    required={field.required}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all capitalize"
                  >
                    <option value="">Seleccionar...</option>
                    {field.options?.map(opt => (
                      <option key={opt} value={opt} className="capitalize">{opt}</option>
                    ))}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    id={field.name}
                    name={field.name}
                    rows={3}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                  />
                ) : (
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    required={field.required}
                    placeholder={field.placeholder}
                    step={field.type === 'number' ? '0.01' : undefined}
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-border flex gap-3">
            <button
              type="submit"
              disabled={isPending || success}
              className="px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Guardar Animal
                </>
              )}
            </button>
            <Link
              href={`/dashboard/animals/${categorySlug}`}
              className="px-6 py-2.5 rounded-xl border border-border text-muted hover:text-foreground hover:bg-surface-hover font-medium transition-all"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
