'use client'

import { useState, useMemo } from 'react'
import { Search, Filter, CheckSquare, Square, Trash2, Pencil, ListTodo, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Student {
  id: string
  user_id: string
  full_name: string
  role: string
  semester: string | null
  career: string | null
  created_at: string
}

const CAREERS = ['Agropecuaria', 'Agronegocios', 'Alimentos']
const SEMESTERS = ['1','2','3','4','5','6','7','8','9','10']

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function StudentsClient({ students: initialStudents }: { students: Student[] }) {
  const [students, setStudents] = useState(initialStudents)
  const [search, setSearch] = useState('')
  const [filterCareer, setFilterCareer] = useState('')
  const [filterSemester, setFilterSemester] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCareer, setEditCareer] = useState('')
  const [editSemester, setEditSemester] = useState('')
  const [confirmDeleteIds, setConfirmDeleteIds] = useState<string[] | null>(null)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [bulkCareer, setBulkCareer] = useState('')
  const [bulkSemester, setBulkSemester] = useState('')
  const router = useRouter()

  const filtered = useMemo(() => {
    return students.filter(s => {
      if (search && !s.full_name.toLowerCase().includes(search.toLowerCase())) return false
      if (filterCareer && s.career !== filterCareer) return false
      if (filterSemester && s.semester !== filterSemester) return false
      return true
    })
  }, [students, search, filterCareer, filterSemester])

  const selectedStudents = filtered.filter(s => selected.has(s.id))
  const allSameCareer = selectedStudents.length > 0 && selectedStudents.every(s => s.career === selectedStudents[0].career)
  const allSameSemester = selectedStudents.length > 0 && selectedStudents.every(s => s.semester === selectedStudents[0].semester)
  const canBulkEdit = selectedStudents.length > 1 && allSameCareer && allSameSemester

  function toggleSelect(id: string) {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelected(next)
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(s => s.id)))
    }
  }

  function startEdit(student: Student) {
    setEditingId(student.id)
    setEditCareer(student.career || '')
    setEditSemester(student.semester || '')
    setSelected(new Set())
  }

  async function saveEdit() {
    if (!editingId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/students/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ career: editCareer || null, semester: editSemester || null })
      })
      if (res.ok) {
        setStudents(prev => prev.map(s => s.id === editingId
          ? { ...s, career: editCareer || null, semester: editSemester || null }
          : s
        ))
        setEditingId(null)
      }
    } finally { setLoading(false) }
  }

  async function handleDelete(ids: string[]) {
    setLoading(true)
    try {
      if (ids.length === 1) {
        await fetch(`/api/students/${ids[0]}`, { method: 'DELETE' })
      } else {
        await fetch('/api/students/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids })
        })
      }
      setStudents(prev => prev.filter(s => !ids.includes(s.id)))
      setSelected(new Set())
      setConfirmDeleteIds(null)
      router.refresh()
    } finally { setLoading(false) }
  }

  async function handleBulkEdit() {
    if (!canBulkEdit) return
    setLoading(true)
    const ids = selectedStudents.map(s => s.id)
    try {
      const res = await fetch('/api/students/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, career: bulkCareer || undefined, semester: bulkSemester || undefined })
      })
      if (res.ok) {
        setStudents(prev => prev.map(s => ids.includes(s.id)
          ? { ...s, career: bulkCareer || s.career, semester: bulkSemester || s.semester }
          : s
        ))
        setSelected(new Set())
        setBulkEditOpen(false)
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4 overflow-hidden min-w-0" id="students-client">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center" id="students-filters">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted hidden sm:block" />
          <select value={filterCareer} onChange={e => setFilterCareer(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Todas las carreras</option>
            {CAREERS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="">Todos los semestres</option>
            {SEMESTERS.map(s => <option key={s} value={s}>{s}° Sem</option>)}
          </select>
        </div>
      </div>

      {/* Actions bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl" id="students-actions-bar">
          <span className="text-sm font-medium text-primary">{selected.size} seleccionado{selected.size > 1 ? 's' : ''}</span>
          <div className="flex-1" />
          {selected.size === 1 && (
            <button onClick={() => startEdit(filtered.find(s => selected.has(s.id))!)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20">
              <Pencil className="w-3.5 h-3.5" /> Editar
            </button>
          )}
          {canBulkEdit && (
            <button onClick={() => { setBulkEditOpen(true); setBulkCareer(selectedStudents[0].career || ''); setBulkSemester(selectedStudents[0].semester || '') }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary hover:bg-primary/20">
              <Pencil className="w-3.5 h-3.5" /> Editar en masa
            </button>
          )}
          <button onClick={() => setConfirmDeleteIds(Array.from(selected))}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-danger/10 text-danger hover:bg-danger/20">
            <Trash2 className="w-3.5 h-3.5" /> Eliminar
          </button>
          <button onClick={() => setSelected(new Set())}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteIds && (
        <div className="p-4 bg-danger/5 border border-danger/20 rounded-xl" id="confirm-delete">
          <p className="text-sm text-foreground mb-3">
            ¿Estás seguro de eliminar <strong>{confirmDeleteIds.length}</strong> estudiante{confirmDeleteIds.length > 1 ? 's' : ''}? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2">
            <button onClick={() => handleDelete(confirmDeleteIds)} disabled={loading}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-danger text-white hover:bg-danger/80 disabled:opacity-50">
              {loading ? 'Eliminando...' : 'Sí, eliminar'}
            </button>
            <button onClick={() => setConfirmDeleteIds(null)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-surface border border-border hover:bg-surface-hover">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Bulk edit modal */}
      {bulkEditOpen && (
        <div className="p-4 bg-surface border border-border rounded-xl space-y-3" id="bulk-edit-form">
          <p className="text-sm font-medium text-foreground">Editar {selectedStudents.length} estudiantes</p>
          <div className="flex gap-3">
            <select value={bulkCareer} onChange={e => setBulkCareer(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm">
              <option value="">Sin cambiar carrera</option>
              {CAREERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={bulkSemester} onChange={e => setBulkSemester(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-background border border-border text-sm">
              <option value="">Sin cambiar semestre</option>
              {SEMESTERS.map(s => <option key={s} value={s}>{s}° Sem</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleBulkEdit} disabled={loading || (!bulkCareer && !bulkSemester)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50">
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button onClick={() => setBulkEditOpen(false)}
              className="px-4 py-2 text-xs font-medium rounded-lg bg-surface border border-border hover:bg-surface-hover">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden" id="students-table">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-hover">
                  <th className="w-10 px-3 py-3">
                    <button onClick={toggleAll} className="text-muted hover:text-foreground">
                      {selected.size === filtered.length && filtered.length > 0
                        ? <CheckSquare className="w-4 h-4 text-primary" />
                        : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="text-left px-5 py-3 font-semibold text-muted">Nombre</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted">Carrera</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted">Semestre</th>
                  <th className="text-left px-5 py-3 font-semibold text-muted">Registrado</th>
                  <th className="w-20 px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(student => (
                  <tr key={student.id} className={`border-b border-border last:border-0 ${selected.has(student.id) ? 'bg-primary/5' : 'hover:bg-surface-hover'}`}>
                    <td className="px-3 py-3 text-center">
                      <button onClick={() => toggleSelect(student.id)} className="text-muted hover:text-foreground">
                        {selected.has(student.id)
                          ? <CheckSquare className="w-4 h-4 text-primary" />
                          : <Square className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {getInitials(student.full_name || '?')}
                        </div>
                        <p className="font-medium text-foreground">{student.full_name || 'Sin nombre'}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      {editingId === student.id ? (
                        <select value={editCareer} onChange={e => setEditCareer(e.target.value)}
                          className="px-2 py-1 rounded-lg bg-background border border-border text-xs">
                          <option value="">—</option>
                          {CAREERS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      ) : student.career ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">{student.career}</span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {editingId === student.id ? (
                        <select value={editSemester} onChange={e => setEditSemester(e.target.value)}
                          className="px-2 py-1 rounded-lg bg-background border border-border text-xs">
                          <option value="">—</option>
                          {SEMESTERS.map(s => <option key={s} value={s}>{s}°</option>)}
                        </select>
                      ) : student.semester ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{student.semester}° Sem</span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-5 py-3 text-muted">{formatDate(student.created_at)}</td>
                    <td className="px-3 py-3">
                      {editingId === student.id ? (
                        <div className="flex gap-1">
                          <button onClick={saveEdit} disabled={loading}
                            className="px-2 py-1 text-xs rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50">
                            {loading ? '...' : 'OK'}
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="px-2 py-1 text-xs rounded-lg border border-border hover:bg-surface-hover">
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(student)}
                          className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary/10">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <ListTodo className="w-12 h-12 text-muted/30 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Sin resultados</h3>
          <p className="text-sm text-muted">No se encontraron estudiantes con los filtros seleccionados</p>
        </div>
      )}
    </div>
  )
}
