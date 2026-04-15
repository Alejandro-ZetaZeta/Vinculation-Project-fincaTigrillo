'use client'

import { useState } from 'react'
import { X, Plus, BookOpen, GraduationCap, Calendar } from 'lucide-react'

const CAREERS = ['Agropecuaria', 'Agronegocios', 'Alimentos']
const SEMESTERS = ['1','2','3','4','5','6','7','8','9','10']

interface ActivityFormProps {
  onCreated: () => void
  onClose: () => void
}

export function ActivityForm({ onCreated, onClose }: ActivityFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [career, setCareer] = useState('')
  const [semester, setSemester] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ assignedCount: number } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!title || !career || !semester) {
      setError('Título, carrera y semestre son obligatorios')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || null,
          target_career: career,
          target_semester: semester,
          due_date: dueDate || null
        })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al crear')
        return
      }
      setResult({ assignedCount: data.assignedCount })
      setTimeout(() => {
        onCreated()
        onClose()
      }, 1500)
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 space-y-4" id="activity-form">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Nueva Actividad</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted">
          <X className="w-5 h-5" />
        </button>
      </div>

      {result && (
        <div className="p-3 bg-success/10 border border-success/20 text-success rounded-xl text-sm">
          ✓ Actividad creada y asignada a {result.assignedCount} estudiante{result.assignedCount !== 1 ? 's' : ''}
        </div>
      )}

      {error && (
        <div className="p-3 bg-danger/10 border border-danger/20 text-danger rounded-xl text-sm">{error}</div>
      )}

      {!result && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Título *</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Ej: Revisión de ganado bovino"
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium">Descripción</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)} rows={3}
              placeholder="Detalles de la actividad (opcional)"
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-muted" /> Carrera *
              </label>
              <select value={career} onChange={e => setCareer(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Seleccionar</option>
                {CAREERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-muted" /> Semestre *
              </label>
              <select value={semester} onChange={e => setSemester(e.target.value)} required
                className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Seleccionar</option>
                {SEMESTERS.map(s => <option key={s} value={s}>{s}° Sem</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted" /> Fecha límite (opcional)
            </label>
            <input
              type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" /> Crear y Asignar
              </>
            )}
          </button>
        </form>
      )}
    </div>
  )
}
