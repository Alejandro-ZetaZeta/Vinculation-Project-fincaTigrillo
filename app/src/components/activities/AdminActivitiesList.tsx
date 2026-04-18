'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, ListTodo, BookOpen, GraduationCap, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { ActivityForm } from './ActivityForm'

interface Activity {
  id: string
  title: string
  description: string | null
  target_career: string
  target_semester: string
  due_date: string | null
  created_at: string
  total: number
  todo: number
  in_progress: number
  done: number
}

export function AdminActivitiesList() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/activities')
      const data = await res.json()
      setActivities(data.data || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchActivities() }, [fetchActivities])

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      await fetch(`/api/activities/${id}`, { method: 'DELETE' })
      setActivities(prev => prev.filter(a => a.id !== id))
      setConfirmDelete(null)
    } finally {
      setDeleting(false)
    }
  }

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  return (
    <div className="space-y-6" id="admin-activities">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Actividades Creadas</h2>
          <p className="text-sm text-muted">{activities.length} actividad{activities.length !== 1 ? 'es' : ''}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark"
          id="btn-new-activity"
        >
          <Plus className="w-4 h-4" /> Nueva Actividad
        </button>
      </div>

      {showForm && (
        <ActivityForm onCreated={fetchActivities} onClose={() => setShowForm(false)} />
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      ) : activities.length > 0 ? (
        <div className="space-y-3">
          {activities.map(activity => (
            <div key={activity.id} className="bg-surface border border-border rounded-2xl p-5" id={`activity-${activity.id}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground mb-1">{activity.title}</h3>
                  {activity.description && (
                    <p className="text-sm text-muted mb-3 line-clamp-2">{activity.description}</p>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> {activity.target_career}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium flex items-center gap-1">
                      <GraduationCap className="w-3 h-3" /> {activity.target_semester}° Sem
                    </span>
                    {activity.due_date && (
                      <span className="text-xs px-2 py-1 rounded-full bg-warning/10 text-warning font-medium">
                        Fecha límite: {formatDate(activity.due_date)}
                      </span>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-muted">
                      <AlertCircle className="w-3 h-3" /> {activity.todo} por hacer
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      <Clock className="w-3 h-3" /> {activity.in_progress} en proceso
                    </span>
                    <span className="flex items-center gap-1 text-success">
                      <CheckCircle className="w-3 h-3" /> {activity.done} finalizado{activity.done !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Progress bar */}
                  {activity.total > 0 && (
                    <div className="mt-2 h-1.5 rounded-full bg-muted/10 overflow-hidden flex">
                      <div className="bg-success h-full" style={{ width: `${(activity.done / activity.total) * 100}%` }} />
                      <div className="bg-primary h-full" style={{ width: `${(activity.in_progress / activity.total) * 100}%` }} />
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-muted">{formatDate(activity.created_at)}</span>
                  {confirmDelete === activity.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(activity.id)} disabled={deleting}
                        className="px-2 py-1 text-xs rounded-lg bg-danger text-white hover:bg-danger/80 disabled:opacity-50">
                        {deleting ? '...' : 'Sí'}
                      </button>
                      <button onClick={() => setConfirmDelete(null)}
                        className="px-2 py-1 text-xs rounded-lg border border-border hover:bg-surface-hover">
                        No
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(activity.id)}
                      className="p-1.5 rounded-lg text-muted hover:text-danger hover:bg-danger/10">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center">
          <ListTodo className="w-12 h-12 text-muted/30 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground mb-1">Sin actividades</h3>
          <p className="text-sm text-muted">Crea tu primera actividad para asignarla a los estudiantes</p>
        </div>
      )}
    </div>
  )
}
