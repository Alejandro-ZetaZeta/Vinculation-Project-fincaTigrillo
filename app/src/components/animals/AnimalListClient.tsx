'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, X, ChevronDown, ChevronUp, Pencil, Trash2, Save, XCircle } from 'lucide-react'

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
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
    })
  }, [animals, search, filterCategory, filterType, filterStatus, filterSex, types])

  const hasActiveFilters = filterCategory || filterType || filterStatus || filterSex

  function clearFilters() {
    setFilterCategory('')
    setFilterType('')
    setFilterStatus('')
    setFilterSex('')
  }

  function startEdit(animal: Animal) {
    setEditingId(animal.id)
    setEditData({
      name: animal.name || '',
      breed: animal.breed || '',
      sex: animal.sex || '',
      color: animal.color || '',
      weight_kg: animal.weight_kg,
      status: animal.status,
      notes: animal.notes || '',
      identification_code: animal.identification_code || '',
    })
    setExpandedId(animal.id)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditData({})
  }

  async function saveEdit(animalId: string) {
    setLoading(true)
    try {
      const payload: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(editData)) {
        if (value !== '' && value !== null) {
          payload[key] = key === 'weight_kg' ? parseFloat(String(value)) : value
        } else {
          payload[key] = null
        }
      }

      const res = await fetch(`/api/animals/${animalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setEditingId(null)
        setEditData({})
        router.refresh()
        // Optimistic update
        setAnimals(prev => prev.map(a =>
          a.id === animalId ? { ...a, ...payload } as Animal : a
        ))
      }
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
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground">
              <X className="w-4 h-4" />
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
              <label className="block text-xs text-muted mb-1">Categoría</label>
              <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); setFilterType('') }}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Todas</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Tipo</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Todos</option>
                {filteredTypes.map(t => <option key={t.id} value={t.slug}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Estado</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Todos</option>
                <option value="activo">Activo</option>
                <option value="vendido">Vendido</option>
                <option value="muerto">Muerto</option>
                <option value="transferido">Transferido</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Sexo</label>
              <select value={filterSex} onChange={(e) => setFilterSex(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Todos</option>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
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

            return (
              <div key={animal.id} className="bg-surface border border-border rounded-xl overflow-hidden hover:shadow-md transition-all">
                {/* Row header */}
                <div className="px-4 py-3 flex items-center gap-4">
                  <button
                    onClick={() => { setExpandedId(expandedId === animal.id ? null : animal.id); cancelEdit() }}
                    className="flex-1 flex items-center gap-4 text-left hover:bg-surface-hover rounded-lg transition-colors -m-1 p-1"
                  >
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 items-center">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{animal.name || 'Sin nombre'}</p>
                        <p className="text-xs text-muted">{animal.identification_code || '—'}</p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-sm text-foreground">{animal.animal_types?.name}</p>
                        <p className="text-xs text-muted">{animal.animal_types?.animal_categories?.name}</p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-sm">{animal.breed || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm capitalize">{animal.sex || '—'}</p>
                      </div>
                      <div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusColors[animal.status] || ''}`}>
                          {animal.status}
                        </span>
                      </div>
                    </div>
                    {expandedId === animal.id ? <ChevronUp className="w-4 h-4 text-muted flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted flex-shrink-0" />}
                  </button>

                  {/* Admin actions */}
                  {isAdmin && !isEditing && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => startEdit(animal)} className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-colors" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteConfirmId(animal.id)} className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10 transition-colors" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Delete confirmation */}
                {isDeleting && (
                  <div className="px-4 pb-3 animate-scale-in">
                    <div className="bg-danger/5 border border-danger/20 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                      <p className="text-sm text-danger">¿Eliminar <strong>{animal.name || 'este animal'}</strong>? Esta acción no se puede deshacer.</p>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => deleteAnimal(animal.id)}
                          disabled={loading}
                          className="px-3 py-1.5 rounded-lg bg-danger text-white text-xs font-medium hover:bg-danger/90 disabled:opacity-50 transition-colors"
                        >
                          {loading ? '...' : 'Eliminar'}
                        </button>
                        <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted hover:text-foreground transition-colors">
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
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          <EditField label="Nombre" name="name" value={editData.name} onChange={(v) => setEditData(p => ({...p, name: v}))} />
                          <EditField label="Raza" name="breed" value={editData.breed} onChange={(v) => setEditData(p => ({...p, breed: v}))} />
                          <div>
                            <label className="block text-xs text-muted mb-1">Sexo</label>
                            <select value={String(editData.sex || '')} onChange={(e) => setEditData(p => ({...p, sex: e.target.value}))}
                              className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 capitalize">
                              <option value="">—</option>
                              <option value="macho">Macho</option>
                              <option value="hembra">Hembra</option>
                            </select>
                          </div>
                          <EditField label="Color" name="color" value={editData.color} onChange={(v) => setEditData(p => ({...p, color: v}))} />
                          <EditField label="Peso (kg)" name="weight_kg" value={editData.weight_kg} onChange={(v) => setEditData(p => ({...p, weight_kg: v}))} type="number" />
                          <EditField label="Identificación" name="identification_code" value={editData.identification_code} onChange={(v) => setEditData(p => ({...p, identification_code: v}))} />
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
                        </div>
                        <div>
                          <label className="block text-xs text-muted mb-1">Notas</label>
                          <textarea value={String(editData.notes || '')} onChange={(e) => setEditData(p => ({...p, notes: e.target.value}))}
                            rows={2} className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => saveEdit(animal.id)} disabled={loading}
                            className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors flex items-center gap-1.5">
                            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            Guardar
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
                          <Detail label="Peso" value={animal.weight_kg ? `${animal.weight_kg} kg` : null} />
                          <Detail label="Nacimiento" value={formatDate(animal.birth_date)} />
                          <Detail label="Adquisición" value={animal.acquisition_type} />
                          <Detail label="F. Adquisición" value={formatDate(animal.acquisition_date)} />
                          <Detail label="Registrado" value={formatDate(animal.created_at)} />
                          {animal.metadata && Object.entries(animal.metadata).map(([key, value]) => (
                            <Detail key={key} label={key.replace(/_/g, ' ')} value={String(value)} />
                          ))}
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

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted capitalize">{label}</p>
      <p className="text-sm font-medium text-foreground capitalize">{value || '—'}</p>
    </div>
  )
}

function EditField({ label, name, value, onChange, type = 'text' }: {
  label: string; name: string; value: string | number | null | undefined
  onChange: (v: string) => void; type?: string
}) {
  return (
    <div>
      <label className="block text-xs text-muted mb-1">{label}</label>
      <input
        name={name}
        type={type}
        value={String(value || '')}
        onChange={(e) => onChange(e.target.value)}
        step={type === 'number' ? '0.01' : undefined}
        className="w-full px-3 py-1.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  )
}
