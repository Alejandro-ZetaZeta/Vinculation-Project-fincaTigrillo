'use client'

import { useState, useEffect, useCallback } from 'react'
import { KanbanBoard, KanbanItem } from './KanbanBoard'
import { ListTodo, X } from 'lucide-react'

interface Assignment {
  id: string
  activity_id: string
  student_id: string
  status: 'todo' | 'in_progress' | 'done'
  started_at: string | null
  completed_at: string | null
}

interface Activity {
  id: string
  title: string
  description: string | null
  target_career: string
  target_semester: string
  due_date: string | null
  activity_assignments: Assignment[]
}

interface StudentProfile {
  user_id: string
  full_name: string
}

interface StudentKanbanProps {
  userId: string
}

export function StudentKanban({ userId }: StudentKanbanProps) {
  const [items, setItems] = useState<KanbanItem[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedItem, setExpandedItem] = useState<KanbanItem | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch activities with all assignments (for presence data)
      const res = await fetch('/api/activities')
      const data = await res.json()
      const activities = (data.data || []) as (Activity & { activity_assignments?: Assignment[] })[]

      // We need student profiles for presence
      const profileRes = await fetch('/api/students/profiles')
      const profileData = await profileRes.json()
      const profiles = (profileData.data || []) as StudentProfile[]
      const profileMap = new Map(profiles.map(p => [p.user_id, p.full_name]))

      // Build kanban items from MY assignments only, but include presence from all assignments
      const kanbanItems: KanbanItem[] = []

      for (const activity of activities) {
        const allAssignments = activity.activity_assignments || []
        const myAssignment = allAssignments.find(a => a.student_id === userId)
        if (!myAssignment) continue

        // Build presence: students who moved this item out of 'todo'
        const presence = allAssignments
          .filter(a => a.status !== 'todo')
          .map(a => {
            const name = profileMap.get(a.student_id) || '?'
            const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
            return { name, initials, status: a.status }
          })

        kanbanItems.push({
          id: activity.id,
          assignmentId: myAssignment.id,
          title: activity.title,
          description: activity.description || undefined,
          status: myAssignment.status,
          dueDate: activity.due_date || undefined,
          targetCareer: activity.target_career,
          targetSemester: activity.target_semester,
          presence
        })
      }

      setItems(kanbanItems)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleStatusChange(assignmentId: string, newStatus: 'todo' | 'in_progress' | 'done') {
    try {
      const res = await fetch(`/api/activities/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      if (res.ok) {
        setItems(prev => prev.map(item =>
          item.assignmentId === assignmentId ? { ...item, status: newStatus } : item
        ))
        // Refresh to get updated presence
        setTimeout(fetchData, 500)
      }
    } catch { /* ignore */ }
  }

  function handleCardClick(item: KanbanItem) {
    setExpandedItem(item)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
        <p className="text-sm text-muted">Cargando actividades...</p>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-12 text-center">
        <ListTodo className="w-12 h-12 text-muted/30 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-foreground mb-1">Sin actividades</h3>
        <p className="text-sm text-muted">No tienes actividades asignadas por el momento</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <KanbanBoard
        items={items}
        onStatusChange={handleStatusChange}
        onCardClick={handleCardClick}
      />

      {/* Expanded card detail */}
      {expandedItem && (
        <div className="bg-surface border border-border rounded-2xl p-6" id="kanban-detail">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{expandedItem.title}</h3>
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-1 rounded-full bg-accent/10 text-accent font-medium">{expandedItem.targetCareer}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">{expandedItem.targetSemester}° Sem</span>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  expandedItem.status === 'done' ? 'bg-success/10 text-success' :
                  expandedItem.status === 'in_progress' ? 'bg-primary/10 text-primary' :
                  'bg-warning/10 text-warning'
                }`}>
                  {expandedItem.status === 'todo' ? 'Por Hacer' : expandedItem.status === 'in_progress' ? 'En Proceso' : 'Finalizado'}
                </span>
              </div>
            </div>
            <button onClick={() => setExpandedItem(null)} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          {expandedItem.description && (
            <p className="text-sm text-muted mb-4">{expandedItem.description}</p>
          )}

          {expandedItem.dueDate && (
            <p className="text-xs text-muted mb-4">
              Fecha límite: {new Date(expandedItem.dueDate).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}
            </p>
          )}

          {/* Presence section */}
          {expandedItem.presence && expandedItem.presence.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Compañeros trabajando ({expandedItem.presence.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {expandedItem.presence.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-background rounded-lg border border-border">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      p.status === 'done' ? 'bg-success/20 text-success' : 'bg-primary/20 text-primary'
                    }`}>
                      {p.initials}
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{p.name}</p>
                      <p className="text-[10px] text-muted">{p.status === 'done' ? 'Finalizado' : 'En proceso'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
