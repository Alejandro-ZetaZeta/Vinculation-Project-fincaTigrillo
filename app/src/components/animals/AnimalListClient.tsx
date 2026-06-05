
'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import {
  Search, Filter, X, ChevronDown, ChevronUp, Pencil, Trash2, Save, XCircle,
  Scale, History, TrendingUp, Loader2, Plus, CheckCircle, Loader
} from 'lucide-react'
import { Chart, registerables } from 'chart.js'
import { AnimalVaccinationProfile } from '@/components/vaccines/AnimalVaccinationProfile'
import { AssignVaccineModal } from '@/components/vaccines/AssignVaccineModal'

if (typeof window !== 'undefined') {
  Chart.register(...registerables)
}

interface Animal {
  id: string
  name: string | null
  breed: string | null
  sex: string | null
  birth_date: string | null
  identification_code: string | null
  color: string | null
  weight_kg: number | null
  status: string
  acquisition_type: string | null
  acquisition_date: string | null
  notes: string | null
  metadata: Record<string, unknown>
  created_at: string
  animal_types: {
    id: string
    name: string
    slug: string
    animal_categories: {
      name: string
      slug: string
    }
  }
}

interface Category { id: string; name: string; slug: string }
interface AnimalType { id: string; name: string; slug: string; category_id: string }

interface Props {
  animals: Animal[]
  categories: Category[]
  types: AnimalType[]
  isAdmin: boolean
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

function getSexIconSrc(animal: Pick<Animal, 'sex' | 'animal_types' | 'metadata'>): string | null {
  const sex = (animal.sex || '').toLowerCase()
  const typeSlug = (animal.animal_types?.slug || '').toLowerCase()

  if (typeSlug === 'bovino') {
    if (sex === 'macho') return '/toro.svg'
    if (sex === 'hembra') return '/vaca.svg'
  }

  if (typeSlug === 'porcino') {
    if (sex === 'macho') return '/cerdo.svg'
    if (sex === 'hembra') return '/cerda.svg'
  }

  if (typeSlug === 'aves-de-corral') {
    const etapaRaw = (animal.metadata as Record<string, unknown> | null | undefined)?.etapa
    const etapa = typeof etapaRaw === 'string' ? etapaRaw.toLowerCase() : ''

    if (etapa === 'pollitos') return '/pollito.svg'
    if (etapa === 'levante' || etapa === 'producción/adultos' || etapa === 'produccion/adultos') {
      if (sex === 'macho' || sex === 'machos') return '/gallo.svg'
      if (sex === 'hembra' || sex === 'hembras' || sex === 'mixto') return '/gallina.svg'
    }

    // Fallback when etapa missing
    if (sex === 'macho' || sex === 'machos') return '/gallo.svg'
    if (sex === 'hembra' || sex === 'hembras') return '/gallina.svg'
    if (sex === 'mixto') return '/pollito.svg'
  }

  if (typeSlug === 'patos') {
    if (sex === 'macho') return '/pato.svg'
    if (sex === 'hembra') return '/pata.svg'
  }

  if (typeSlug === 'caprino') {
    if (sex === 'macho') return '/cabro.svg'
    if (sex === 'hembra') return '/cabrita.svg'
  }

  if (typeSlug === 'equino') {
    if (sex === 'macho') return '/caballo.svg'
    if (sex === 'hembra') return '/yegua.svg'
  }

  return null
}

export function AnimalListClient({ animals: initialAnimals, categories, types, isAdmin }: Props) {
  const [animals, setAnimals] = useState(initialAnimals)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterSex, setFilterSex] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Record<string, string | number | null>>({})
  const [editError, setEditError] = useState<string | null>(null)
  const [editCodeStatus, setEditCodeStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [editCodeMsg, setEditCodeMsg] = useState('')
  const editCodeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [poultryCounts, setPoultryCounts] = useState<Record<string, { loading: boolean; initial: number | null; deaths: number | null; remaining: number | null }>>({})
  const router = useRouter()
  const searchParams = useSearchParams()

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignAnimal, setAssignAnimal] = useState<{ id: string; typeId: string | null; typeSlug: string | null } | null>(null)

  useEffect(() => {
    const shouldOpen = searchParams.get('assignVaccine') === '1'
    const targetId = searchParams.get('animalId')
    if (!shouldOpen || !targetId) return
    const exists = animals.find(a => a.id === targetId)
    if (!exists) return

    setExpandedId(targetId)
    setAssignAnimal({ id: targetId, typeId: exists.animal_types?.id ?? null, typeSlug: exists.animal_types?.slug ?? null })
    setAssignOpen(true)
    // Clear params to avoid reopening on refresh.
    router.replace('/dashboard/animals/list')
  }, [searchParams, animals, router])

  function parseInitialPoultryCount(a: Animal): number | null {
    const raw = (a.metadata as Record<string, unknown> | null | undefined)?.cantidad
    const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10)
    return Number.isFinite(n) ? n : null
  }

  useEffect(() => {
    if (!expandedId) return
    const a = animals.find(x => x.id === expandedId)
    if (!a) return
    if (a.animal_types?.slug !== 'aves-de-corral') return

    const initial = parseInitialPoultryCount(a)
    setPoultryCounts(prev => ({
      ...prev,
      [expandedId]: {
        loading: true,
        initial,
        deaths: prev[expandedId]?.deaths ?? null,
        remaining: prev[expandedId]?.remaining ?? null,
      }
    }))

    fetch(`/api/reproductive-events?animal_id=${encodeURIComponent(expandedId)}`)
      .then(r => r.json())
      .then((events: unknown) => {
        if (!Array.isArray(events)) return
        const typed = events as Array<{ event_type?: unknown; quantity?: unknown }>
        const deaths = typed.reduce((sum: number, ev) => {
          if (ev?.event_type !== 'muerte') return sum
          const qRaw = ev?.quantity
          const q = typeof qRaw === 'number' ? qRaw : (parseInt(String(qRaw ?? ''), 10) || 0)
          return sum + q
        }, 0)
        const remaining = initial == null ? null : (initial - deaths)
        setPoultryCounts(prev => ({
          ...prev,
          [expandedId]: {
            loading: false,
            initial,
            deaths,
            remaining: remaining == null ? null : Math.max(remaining, 0),
          }
        }))
      })
      .catch(() => {
        setPoultryCounts(prev => ({
          ...prev,
          [expandedId]: {
            loading: false,
            initial,
            deaths: null,
            remaining: null,
          }
        }))
      })
  }, [expandedId, animals])

  const filteredTypes = useMemo(() => {
    if (!filterCategory) return types
    return types.filter(t => t.category_id === filterCategory)
  }, [filterCategory, types])

  const filteredAnimals = useMemo(() => {
    return animals.filter(animal => {
      if (search) {
        const q = search.toLowerCase()
        const matches =
          animal.name?.toLowerCase().includes(q) ||
          animal.breed?.toLowerCase().includes(q) ||
          animal.identification_code?.toLowerCase().includes(q) ||
          animal.color?.toLowerCase().includes(q) ||
          animal.animal_types?.name?.toLowerCase().includes(q) ||
          animal.animal_types?.animal_categories?.name?.toLowerCase().includes(q)
        if (!matches) return false
      }
      if (filterCategory) {
        const catTypes = types.filter(t => t.category_id === filterCategory).map(t => t.slug)
        if (!catTypes.includes(animal.animal_types?.slug)) return false
      }
      if (filterType && animal.animal_types?.slug !== filterType) return false
      if (filterStatus && animal.status !== filterStatus) return false
      if (filterSex && animal.sex !== filterSex) return false
      return true
    }).sort((a, b) => {
      const aActive = a.status === 'activo' ? 0 : 1
      const bActive = b.status === 'activo' ? 0 : 1
      if (aActive !== bActive) return aActive - bActive
      const aDate = a.acquisition_date || a.created_at || ''
      const bDate = b.acquisition_date || b.created_at || ''
      return bDate.localeCompare(aDate)
    })
  }, [animals, search, filterCategory, filterType, filterStatus, filterSex, types])

  const hasActiveFilters = filterCategory || filterType || filterStatus || filterSex

  function clearFilters() {
    setFilterCategory('')
    setFilterType('')
    setFilterStatus('')
    setFilterSex('')
  }

  function handleEditCodeChange(animalId: string, value: string) {
    setEditData(p => ({ ...p, identification_code: value }))
    setEditCodeStatus('idle')
    setEditCodeMsg('')
    if (editCodeDebounceRef.current) clearTimeout(editCodeDebounceRef.current)
    if (!value.trim()) return
    editCodeDebounceRef.current = setTimeout(async () => {
      setEditCodeStatus('checking')
      try {
        const res = await fetch(`/api/animals/check-code?code=${encodeURIComponent(value.trim())}&exclude=${encodeURIComponent(animalId)}`)
        const json = await res.json()
        if (json.taken) {
          setEditCodeStatus('taken')
          setEditCodeMsg(json.usedBy ? `Ya está en uso por "${json.usedBy}"` : 'Este código ya está en uso')
        } else {
          setEditCodeStatus('available')
          setEditCodeMsg('')
        }
      } catch {
        setEditCodeStatus('idle')
      }
    }, 500)
  }

  function startEdit(animal: Animal) {
    const isPoultryBatch = animal.animal_types?.slug === 'aves-de-corral'
    setEditError(null)
    setEditCodeStatus('idle')
    setEditCodeMsg('')
    setEditingId(animal.id)
    setEditData({
      name: animal.name || '',
      breed: animal.breed || '',
      sex: (() => {
        const s = (animal.sex || '').toLowerCase()
        if (s === 'machos') return 'macho'
        if (s === 'hembras') return 'hembra'
        return s
      })(),
      color: animal.color || '',
      // UI for poultry batches is grams-first; DB stores kg.
      weight_kg: isPoultryBatch
        ? (() => {
            if (animal.weight_kg == null) return null
            const etapa = (animal.metadata?.etapa as string) || ''
            return etapa === 'pollitos'
              ? Math.round(animal.weight_kg * 1000)
              : parseFloat((animal.weight_kg * 2.20462).toFixed(4))
          })()
        : animal.weight_kg,
      status: animal.status,
      notes: animal.notes || '',
      identification_code: animal.identification_code || '',
      ...(isPoultryBatch && { meta_etapa: (animal.metadata?.etapa as string) || '' }),
    })
    setExpandedId(animal.id)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditData({})
    setEditError(null)
    setEditCodeStatus('idle')
    setEditCodeMsg('')
  }

  async function saveEdit(animalId: string) {
    if (editCodeStatus === 'taken' || editCodeStatus === 'checking') return
    setLoading(true)
    setEditError(null)
    try {
      const typeSlug = animals.find(a => a.id === animalId)?.animal_types?.slug
      const isPoultry = typeSlug === 'aves-de-corral'
      const payload: Record<string, unknown> = {}
      const metadataUpdates: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(editData)) {
        if (key.startsWith('meta_')) {
          const metaKey = key.replace('meta_', '')
          metadataUpdates[metaKey] = value === '' ? null : value
        } else {
          if (value !== '' && value !== null) {
            if (key === 'weight_kg') {
              const raw = parseFloat(String(value))
              // UI stores poultry weight in grams; DB expects kg
              if (isPoultry) {
                const etapa = (animals.find(a => a.id === animalId)?.metadata?.etapa as string) || ''
                payload[key] = isNaN(raw) ? null : (etapa === 'pollitos' ? raw / 1000 : raw / 2.20462)
              } else {
                payload[key] = isNaN(raw) ? null : raw
              }
            } else {
              payload[key] = value
            }
          } else {
            payload[key] = null
          }
        }
      }

      const animalToEdit = animals.find(a => a.id === animalId)
      if (animalToEdit) {
        payload.metadata = { ...(animalToEdit.metadata || {}), ...metadataUpdates }
      }

      const res = await fetch(`/api/animals/${animalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const result = await res.json().catch(() => ({}))
        setEditError(result.error || `Error al guardar (${res.status})`)
        return
      }

      setEditingId(null)
      setEditData({})
      setEditError(null)
      setEditCodeStatus('idle')
      router.refresh()
      setAnimals(prev => prev.map(a => {
        if (a.id === animalId) {
          return { ...a, ...payload, metadata: payload.metadata as Record<string, unknown> } as Animal
        }
        return a
      }))
    } finally {
      setLoading(false)
    }
  }

  async function deleteAnimal(animalId: string) {
    setLoading(true)
    try {
      const res = await fetch(`/api/animals/${animalId}`, { method: 'DELETE' })
      if (res.ok) {
        setDeleteConfirmId(null)
        setAnimals(prev => prev.filter(a => a.id !== animalId))
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const statusColors: Record<string, string> = {
    activo: 'bg-success/10 text-success',
    vendido: 'bg-accent/10 text-accent',
    muerto: 'bg-danger/10 text-danger',
    transferido: 'bg-primary/10 text-primary',
  }

  return (
    <div className="space-y-4">
      <AssignVaccineModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        defaultAnimalIds={assignAnimal ? [assignAnimal.id] : []}
        defaultTypeId={assignAnimal?.typeId ?? null}
        animalTypeSlug={assignAnimal?.typeSlug ?? null}
        isAdmin={isAdmin}
        title="Programar vacunación"
      />

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre, raza, código, tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            id="search-animals"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground p-1"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2.5 rounded-xl border transition-all flex items-center gap-2 text-sm font-medium ${
            showFilters || hasActiveFilters
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'bg-surface border-border text-muted hover:text-foreground hover:bg-surface-hover'
          }`}
          id="toggle-filters"
        >
          <Filter className="w-4 h-4" />
          Filtros
          {hasActiveFilters && (
            <span className="bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {[filterCategory, filterType, filterStatus, filterSex].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-surface border border-border rounded-2xl p-4 animate-scale-in">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-foreground">Filtros</p>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-primary hover:text-primary-dark transition-colors">Limpiar todo</button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label htmlFor="filter-category" className="block text-xs text-muted mb-1">Categoría</label>
              <select id="filter-category" value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setFilterType('') }}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Todas</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="filter-type" className="block text-xs text-muted mb-1">Tipo</label>
              <select id="filter-type" value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Todos</option>
                {filteredTypes.map(t => <option key={t.id} value={t.slug}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="filter-status" className="block text-xs text-muted mb-1">Estado</label>
              <select id="filter-status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="vendido">Vendido</option>
                <option value="muerto">Muerto</option>
                <option value="transferido">Transferido</option>
              </select>
            </div>
            <div>
              <label htmlFor="filter-sex" className="block text-xs text-muted mb-1">Sexo</label>
              <select id="filter-sex" value={filterSex} onChange={(e) => setFilterSex(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Todos</option>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
                <option value="mixto">Mixto</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-muted">
        Mostrando {filteredAnimals.length} de {animals.length} registro{animals.length !== 1 ? 's' : ''}
      </p>

      {/* Animal Cards */}
      {filteredAnimals.length > 0 ? (
        <div className="space-y-3">
          {filteredAnimals.map((animal) => {
            const isEditing = editingId === animal.id
            const isDeleting = deleteConfirmId === animal.id
            const animalIconSrc = getSexIconSrc(animal)
            const sexOnlyIconSrc = (() => {
              const sex = (animal.sex || '').toLowerCase()
              if (sex === 'macho' || sex === 'machos') return '/simmacho.svg'
              if (sex === 'hembra' || sex === 'hembras') return '/simhembra.svg'
              if (sex === 'mixto') return '/simix.svg'
              return null
            })()

            return (
              <div key={animal.id} className="bg-surface border border-border rounded-xl overflow-hidden hover:shadow-md transition-all">
                {/* Row header */}
                <div className="px-4 py-3 flex items-center gap-4">
                  <button
                    onClick={() => { setExpandedId(expandedId === animal.id ? null : animal.id); cancelEdit() }}
                    className="flex-1 flex items-center gap-4 text-left hover:bg-surface-hover rounded-lg transition-colors -m-1 p-1"
                  >
                    <div className="flex-1 min-w-0">

                      {/* ── Mobile (< md): name full-width, sex + status below ── */}
                      <div className="md:hidden space-y-1.5">
                        <div className="flex items-center gap-3 min-w-0">
                          {animalIconSrc && (
                            <div className="flex items-center justify-center w-7 h-7 shrink-0">
                              <Image
                                src={animalIconSrc}
                                alt={animal.sex ? `Sexo: ${animal.sex}` : 'Sexo'}
                                width={28} height={28}
                                className="w-7 h-7 object-contain invert-0 [html[data-theme='dark']_&]:invert"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate leading-snug">{animal.name || 'Sin nombre'}</p>
                            <p className="text-xs text-muted truncate">{animal.identification_code || '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 pl-1">
                          {sexOnlyIconSrc && (
                            <Image
                              src={sexOnlyIconSrc}
                              alt={animal.sex ? `Sexo: ${animal.sex}` : 'Sexo'}
                              width={18} height={18}
                              className="w-4.5 h-4.5 object-contain invert-0 [html[data-theme='dark']_&]:invert shrink-0"
                            />
                          )}
                          <p className="text-sm capitalize text-foreground">{animal.sex || '—'}</p>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[animal.status] || ''}`}>
                            {animal.status}
                          </span>
                        </div>
                      </div>

                      {/* ── Tablet (md → lg): name | namespace | sex(6rem) | status(7rem) ── */}
                      <div className="hidden md:grid lg:hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_6rem_7rem] gap-3 items-center">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            {animalIconSrc && (
                              <div className="flex items-center justify-center w-7 h-7 shrink-0">
                                <Image
                                  src={animalIconSrc}
                                  alt={animal.sex ? `Sexo: ${animal.sex}` : 'Sexo'}
                                  width={28} height={28}
                                  className="w-7 h-7 object-contain invert-0 [html[data-theme='dark']_&]:invert"
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate leading-snug">{animal.name || 'Sin nombre'}</p>
                              <p className="text-xs text-muted truncate">{animal.identification_code || '—'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center text-center">
                          <p className="text-sm text-foreground">{animal.animal_types?.name}</p>
                          <p className="text-xs text-muted">{animal.animal_types?.animal_categories?.name}</p>
                        </div>
                        <div className="flex justify-center">
                          <div className="flex items-center gap-2">
                            {sexOnlyIconSrc && (
                              <Image
                                src={sexOnlyIconSrc}
                                alt={animal.sex ? `Sexo: ${animal.sex}` : 'Sexo'}
                                width={28} height={28}
                                className="w-7 h-7 object-contain invert-0 [html[data-theme='dark']_&]:invert shrink-0"
                              />
                            )}
                            <p className="text-sm capitalize">{animal.sex || '—'}</p>
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[animal.status] || ''}`}>
                            {animal.status}
                          </span>
                        </div>
                      </div>

                      {/* ── Laptop (lg+): name | namespace | breed | weight | sex(6rem) | status(7rem) ── */}
                      <div className="hidden lg:grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_6rem_7rem] gap-4 items-center">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3 min-w-0">
                            {animalIconSrc && (
                              <div className="flex items-center justify-center w-7 h-7 shrink-0">
                                <Image
                                  src={animalIconSrc}
                                  alt={animal.sex ? `Sexo: ${animal.sex}` : 'Sexo'}
                                  width={28} height={28}
                                  className="w-7 h-7 object-contain invert-0 [html[data-theme='dark']_&]:invert"
                                />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate leading-snug">{animal.name || 'Sin nombre'}</p>
                              <p className="text-xs text-muted truncate">{animal.identification_code || '—'}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-center text-center">
                          <p className="text-base text-foreground">{animal.animal_types?.name}</p>
                          <p className="text-sm text-muted">{animal.animal_types?.animal_categories?.name}</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                          <p className="text-sm text-foreground">{animal.breed || '—'}</p>
                        </div>
                        <div className="flex flex-col items-center text-center">
                          {(() => {
                            const isPoultry = animal.animal_types?.slug === 'aves-de-corral'
                            const weightLabel = isPoultry ? 'Peso Prom.' : 'Peso'
                            const w = animal.weight_kg
                            const weightVal = w != null
                              ? (isPoultry
                                  ? ((animal.metadata?.etapa as string) === 'pollitos'
                                      ? `${Math.round(w * 1000)} g`
                                      : `${(w * 2.20462).toFixed(2)} lbs`)
                                  : `${w} kg`)
                              : '—'
                            return (
                              <>
                                <p className="text-sm text-foreground">{weightVal}</p>
                                <p className="text-xs text-muted">{weightLabel}</p>
                              </>
                            )
                          })()}
                        </div>
                        <div className="flex justify-center">
                          <div className="flex items-center gap-2">
                            {sexOnlyIconSrc && (
                              <Image
                                src={sexOnlyIconSrc}
                                alt={animal.sex ? `Sexo: ${animal.sex}` : 'Sexo'}
                                width={28} height={28}
                                className="w-7 h-7 object-contain invert-0 [html[data-theme='dark']_&]:invert shrink-0"
                              />
                            )}
                            <p className="text-sm capitalize">{animal.sex || '—'}</p>
                          </div>
                        </div>
                        <div className="flex justify-center">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[animal.status] || ''}`}>
                            {animal.status}
                          </span>
                        </div>
                      </div>

                    </div>
                    {expandedId === animal.id ? <ChevronUp className="w-4 h-4 text-muted shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted shrink-0" />}
                  </button>

                  {/* Admin actions */}
                  {isAdmin && !isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => startEdit(animal)}
                        className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                        aria-label={`Editar ${animal.name || 'animal'}`}
                      >
                        <Pencil className="w-4 h-4" aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(animal.id)}
                        className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
                        aria-label={`Eliminar ${animal.name || 'animal'}`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Delete confirmation */}
                {isDeleting && (
                  <div className="px-4 pb-3" role="alert" aria-live="assertive">
                    <div className="bg-danger/5 border border-danger/20 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                      <p className="text-sm text-danger">¿Eliminar <strong>{animal.name || 'este animal'}</strong>? Esta acción no se puede deshacer.</p>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => deleteAnimal(animal.id)}
                          disabled={loading}
                          className="px-3 py-1.5 rounded-lg bg-danger text-white text-xs font-medium hover:bg-danger/90 disabled:opacity-50 transition-colors"
                          aria-busy={loading}
                        >
                          {loading ? 'Eliminando…' : 'Eliminar'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-foreground transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expanded detail / Edit */}
                {expandedId === animal.id && (
                  <div className="px-4 pb-4 border-t border-border pt-3 animate-fade-in">
                    {isEditing ? (
                      /* Edit mode */
                      <div className="space-y-4">
                        {editError && (
                          <div className="bg-danger/10 border border-danger/20 text-danger rounded-xl px-4 py-2 text-sm">
                            {editError}
                          </div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          <EditField label="Nombre" name="name" value={editData.name} onChange={(v) => setEditData(p => ({...p, name: v}))} />
                          <EditField label="Raza *" name="breed" value={editData.breed} onChange={(v) => setEditData(p => ({...p, breed: v}))} />
                          <div>
                            <label className="block text-xs text-muted mb-1">Sexo</label>
                            <select value={String(editData.sex || '')} onChange={(e) => setEditData(p => ({...p, sex: e.target.value}))}
                              className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 capitalize">
                              {animal.animal_types?.slug === 'aves-de-corral' ? (
                                <>
                                  <option value="macho">Macho</option>
                                  <option value="hembra">Hembra</option>
                                  <option value="mixto">Mixto</option>
                                </>
                              ) : (
                                <>
                                  <option value="macho">Macho</option>
                                  <option value="hembra">Hembra</option>
                                </>
                              )}
                            </select>
                          </div>
                          <EditField label="Color" name="color" value={editData.color} onChange={(v) => setEditData(p => ({...p, color: v}))} />
                          <EditField
                            label={animal.animal_types?.slug === 'aves-de-corral'
                              ? ((animal.metadata?.etapa as string) === 'pollitos' ? 'Peso (g)' : 'Peso (lbs)')
                              : 'Peso (kg)'}
                            name="weight_kg"
                            value={editData.weight_kg}
                            onChange={(v) => setEditData(p => ({ ...p, weight_kg: v }))}
                            type="number"
                            step={animal.animal_types?.slug === 'aves-de-corral' && (animal.metadata?.etapa as string) === 'pollitos' ? '1' : '0.001'}
                            min={animal.animal_types?.slug === 'aves-de-corral' ? 0 : undefined}
                          />
                          {/* Identification code with live duplicate check */}
                          <div>
                            <label className="block text-xs text-muted mb-1">Identificación *</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={String(editData.identification_code || '')}
                                onChange={e => handleEditCodeChange(animal.id, e.target.value)}
                                className={`w-full px-3 py-1.5 pr-8 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 transition-all
                                  ${editCodeStatus === 'taken'     ? 'border-danger  focus:ring-danger/30' :
                                    editCodeStatus === 'available' ? 'border-success focus:ring-success/30' :
                                    'border-border focus:ring-primary/30'}`}
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                                {editCodeStatus === 'checking'  && <Loader       className="w-3.5 h-3.5 text-muted animate-spin" />}
                                {editCodeStatus === 'available' && <CheckCircle  className="w-3.5 h-3.5 text-success" />}
                                {editCodeStatus === 'taken'     && <XCircle      className="w-3.5 h-3.5 text-danger" />}
                              </span>
                            </div>
                            {editCodeStatus === 'taken' && (
                              <p className="mt-0.5 text-[10px] text-danger">{editCodeMsg}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-xs text-muted mb-1">Estado</label>
                            <select value={String(editData.status || '')} onChange={(e) => setEditData(p => ({...p, status: e.target.value}))}
                              className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 capitalize">
                              <option value="activo">Activo</option>
                              <option value="vendido">Vendido</option>
                              <option value="muerto">Muerto</option>
                              <option value="transferido">Transferido</option>
                            </select>
                          </div>
                          {animal.animal_types?.slug === 'aves-de-corral' && (
                            <div>
                              <label className="block text-xs text-muted mb-1">Etapa productiva</label>
                              <select value={String(editData.meta_etapa || '')} onChange={(e) => setEditData(p => ({...p, meta_etapa: e.target.value}))}
                                className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 capitalize">
                                <option value="">—</option>
                                <option value="pollitos">Pollitos</option>
                                <option value="levante">Levante</option>
                                <option value="producción/adultos">Producción / Adultos</option>
                              </select>
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Notas</label>
                          <textarea value={String(editData.notes || '')} onChange={(e) => setEditData(p => ({...p, notes: e.target.value}))}
                            rows={2} className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => saveEdit(animal.id)}
                            disabled={loading || editCodeStatus === 'taken' || editCodeStatus === 'checking'}
                            className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center gap-1.5"
                          >
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            {editCodeStatus === 'checking' ? 'Verificando…' : 'Guardar'}
                          </button>
                          <button onClick={cancelEdit} className="px-4 py-1.5 rounded-lg border border-border text-sm text-muted hover:text-foreground transition-colors flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* View mode */
                      <>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                          <Detail label="Tipo" value={animal.animal_types?.name} />
                          <Detail label="Categoría" value={animal.animal_types?.animal_categories?.name} />
                          <Detail label="Raza" value={animal.breed} />
                          <Detail label="Sexo" value={animal.sex} />
                          <Detail label="Color" value={animal.color} />
                          <Detail
                            label="Peso"
                            value={animal.weight_kg != null
                              ? (animal.animal_types?.slug === 'aves-de-corral'
                                ? ((animal.metadata?.etapa as string) === 'pollitos'
                                    ? `${Math.round(animal.weight_kg * 1000)} g`
                                    : `${(animal.weight_kg * 2.20462).toFixed(3)} lbs`)
                                : `${animal.weight_kg} kg`)
                              : null}
                          />
                          {animal.animal_types?.slug === 'aves-de-corral' && (
                            <>
                              <Detail
                                label="Cantidad inicial"
                                value={(() => {
                                  const initial = parseInitialPoultryCount(animal)
                                  return initial == null ? null : String(initial)
                                })()}
                              />
                              <Detail
                                label="Bajas acumuladas"
                                value={(() => {
                                  const c = poultryCounts[animal.id]
                                  if (!c || c.loading) return 'Calculando...'
                                  return c.deaths == null ? null : String(c.deaths)
                                })()}
                              />
                              <Detail
                                label="Cantidad actual"
                                value={(() => {
                                  const c = poultryCounts[animal.id]
                                  if (!c || c.loading) return 'Calculando...'
                                  return c.remaining == null ? null : String(c.remaining)
                                })()}
                              />
                            </>
                          )}
                          <Detail label="Nacimiento" value={formatDate(animal.birth_date)} />
                          <Detail label="Adquisición" value={animal.acquisition_type} />
                          <Detail label="F. Adquisición" value={formatDate(animal.acquisition_date)} />
                          <Detail label="Registrado" value={formatDate(animal.created_at)} />
                          {animal.metadata && Object.entries(animal.metadata)
                            .filter(([key]) => {
                              if (key === 'padre_id' || key === 'peso_promedio_g') return false
                              if (key === 'estado_vacunacion' || key === 'fecha_vacunacion') return false
                              if (animal.animal_types?.slug === 'aves-de-corral' && (key === 'cantidad' || key === 'mortalidad_esperada_pct')) return false
                              return true
                            })  // hide raw UUID + legacy derived weight + poultry initial count (shown explicitly)
                            .map(([key, value]) => (
                              <Detail key={key}
                                label={key === 'padre_nombre' ? 'Padre' : key.replace(/_/g, ' ')}
                                value={String(value)} />
                            ))}
                        </div>
                        {/* Weight History Section — Only for specific types */}
                        {['bovino', 'equino', 'porcino', 'caprino'].includes(animal.animal_types?.slug) && (
                          <div className="mt-6 pt-6 border-t border-border">
                            <WeightHistorySection
                              animalId={animal.id}
                              isAdmin={isAdmin}
                              onWeightUpdated={(newWeight) => {
                                setAnimals(prev => prev.map(a =>
                                  a.id === animal.id ? { ...a, weight_kg: newWeight } : a
                                ))
                              }}
                            />
                          </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-border">
                          <AnimalVaccinationProfile
                            animalId={animal.id}
                            animalTypeId={animal.animal_types?.id ?? null}
                            animalTypeSlug={animal.animal_types?.slug ?? null}
                            isAdmin={isAdmin}
                          />
                        </div>

                        {animal.notes && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted mb-1">Notas</p>
                            <p className="text-sm text-foreground">{animal.notes}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <Search className="w-8 h-8 text-muted/30 mx-auto mb-2" />
          <p className="text-sm text-muted">No se encontraron resultados con los filtros actuales</p>
        </div>
      )}
    </div>
  )
}

function WeightHistorySection({ animalId, isAdmin, onWeightUpdated }: {
  animalId: string; isAdmin: boolean; onWeightUpdated: (w: number) => void
}) {
  const [weights, setWeights] = useState<{ id: string; weight_kg: number; recorded_at: string; notes: string | null }[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newWeight, setNewWeight] = useState('')
  const [newDate, setNewDate] = useState(() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  })
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [newNotes, setNewNotes] = useState('')
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<Chart | null>(null)

  useEffect(() => {
    fetch(`/api/animals/${animalId}/weights`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.data)) setWeights(d.data) })
      .finally(() => setLoading(false))
  }, [animalId])

  useEffect(() => {
    if (!chartRef.current || weights.length === 0) return
    const ctx = chartRef.current.getContext('2d')
    if (!ctx) return

    if (chartInstance.current) chartInstance.current.destroy()

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: weights.map(w => {
          const [y, m, d] = w.recorded_at.slice(0, 10).split('-')
          return new Date(+y, +m - 1, +d).toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
        }),
        datasets: [{
          label: 'Peso (kg)',
          data: weights.map(w => w.weight_kg),
          borderColor: '#61810b',
          backgroundColor: '#61810b22',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#61810b'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: false, grid: { color: '#e2e8f033' } },
          x: { grid: { display: false } }
        }
      }
    })

    return () => chartInstance.current?.destroy()
  }, [weights])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newWeight || !newDate) return
    setSaving(true)
    try {
      const res = await fetch(`/api/animals/${animalId}/weights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight_kg: parseFloat(newWeight),
          recorded_at: newDate,
          notes: newNotes
        })
      })
      if (res.ok) {
        const result = await res.json()
        const updatedWeights = [...weights, result.data].sort((a, b) =>
          new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
        )
        setWeights(updatedWeights)
        onWeightUpdated(parseFloat(newWeight))
        setShowForm(false)
        setNewWeight('')
        setNewNotes('')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(weightId: string) {
    setDeletingId(weightId)
    try {
      const res = await fetch(`/api/animals/${animalId}/weights/${weightId}`, { method: 'DELETE' })
      if (res.ok) {
        const remaining = weights.filter(w => w.id !== weightId)
        setWeights(remaining)
        const latest = [...remaining].sort((a, b) =>
          new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
        )[0]
        if (latest) onWeightUpdated(latest.weight_kg)
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Scale className="w-4 h-4 text-primary" />
          Historial de Peso
        </h4>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs font-medium text-primary hover:text-primary-dark flex items-center gap-1 bg-primary/5 px-2 py-1 rounded-lg transition-colors"
          >
            {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showForm ? 'Cancelar' : 'Registrar Peso'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-background border border-border rounded-xl p-4 animate-scale-in space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-muted uppercase mb-1">Fecha</label>
              <input
                type="date"
                required
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-muted uppercase mb-1">Notas (opcional)</label>
            <input
              type="text"
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-surface border border-border text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Ej: Destete, cambio de lote..."
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar Registro
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6 text-muted"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : weights.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-background border border-border rounded-xl p-3 h-48 relative">
            <canvas ref={chartRef}></canvas>
          </div>
          <div className="bg-background border border-border rounded-xl overflow-hidden flex flex-col h-48">
            <div className="px-3 py-2 border-b border-border bg-surface text-[10px] font-bold uppercase text-muted flex items-center gap-2">
              <History className="w-3 h-3" /> Últimos registros
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {[...weights].reverse().map(w => {
                const [y, m, d] = w.recorded_at.slice(0, 10).split('-')
                const dateLabel = `${d}/${m}/${y.slice(2)}`
                return (
                  <div key={w.id} className="p-2 rounded-lg hover:bg-surface transition-colors group">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-foreground">{w.weight_kg} kg</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] text-muted">{dateLabel}</p>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(w.id)}
                            disabled={deletingId === w.id}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-danger hover:text-red-700 disabled:opacity-30"
                            title="Eliminar registro"
                          >
                            {deletingId === w.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Trash2 className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>
                    {w.notes && (
                      <p className="text-[10px] text-muted mt-0.5 leading-snug">{w.notes}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-surface/50 border border-dashed border-border rounded-xl p-8 text-center">
          <TrendingUp className="w-8 h-8 text-muted/20 mx-auto mb-2" />
          <p className="text-xs text-muted">No hay historial de peso registrado para este animal.</p>
        </div>
      )}
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted capitalize">{label}</p>
      <p className="text-sm font-medium text-foreground capitalize">{value || '—'}</p>
    </div>
  )
}

function EditField({ label, name, value, onChange, type = 'text', step, min }: {
  label: string; name: string; value: string | number | null | undefined
  onChange: (v: string) => void; type?: string; step?: string; min?: string | number
}) {
  const fieldId = `edit-field-${name}`
  return (
    <div>
      <label htmlFor={fieldId} className="block text-xs text-muted mb-1">{label}</label>
      <input
        id={fieldId}
        name={name}
        type={type}
        value={String(value || '')}
        onChange={(e) => onChange(e.target.value)}
        step={type === 'number' ? (step ?? '0.01') : undefined}
        min={min}
        className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  )
}
