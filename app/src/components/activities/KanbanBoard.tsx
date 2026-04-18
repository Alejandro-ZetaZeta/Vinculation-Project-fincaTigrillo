'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface KanbanItem {
  id: string
  assignmentId: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  dueDate?: string
  targetCareer: string
  targetSemester: string
  // presence: students who moved this item
  presence?: { name: string; initials: string; status: string }[]
}

interface KanbanBoardProps {
  items: KanbanItem[]
  onStatusChange: (assignmentId: string, newStatus: 'todo' | 'in_progress' | 'done') => Promise<void>
  onCardClick?: (item: KanbanItem) => void
}

const COLUMNS: { key: 'todo' | 'in_progress' | 'done'; label: string; color: string }[] = [
  { key: 'todo', label: 'Por Hacer', color: 'border-t-warning' },
  { key: 'in_progress', label: 'En Proceso', color: 'border-t-primary' },
  { key: 'done', label: 'Finalizado', color: 'border-t-success' },
]

export function KanbanBoard({ items, onStatusChange, onCardClick }: KanbanBoardProps) {
  const [dragItem, setDragItem] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const dragCloneRef = useRef<HTMLDivElement | null>(null)
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const originalElement = useRef<HTMLElement | null>(null)

  const grouped = {
    todo: items.filter(i => i.status === 'todo'),
    in_progress: items.filter(i => i.status === 'in_progress'),
    done: items.filter(i => i.status === 'done'),
  }

  // Detect which column the pointer is over
  const detectColumn = useCallback((x: number, y: number): string | null => {
    for (const col of COLUMNS) {
      const el = document.getElementById(`kanban-col-${col.key}`)
      if (el) {
        const rect = el.getBoundingClientRect()
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          return col.key
        }
      }
    }
    return null
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent, item: KanbanItem) => {
    if (updating) return
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    startPos.current = { x: e.clientX, y: e.clientY }
    originalElement.current = target
    setDragItem(item.assignmentId)

    // Create clone
    const clone = document.createElement('div')
    clone.className = 'fixed pointer-events-none z-50 opacity-80 bg-surface border border-primary rounded-xl p-3 shadow-xl w-[250px]'
    clone.innerHTML = `<p class="text-sm font-medium text-foreground">${item.title}</p>`
    clone.style.left = `${e.clientX - 125}px`
    clone.style.top = `${e.clientY - 20}px`
    document.body.appendChild(clone)
    dragCloneRef.current = clone

    if (originalElement.current) {
      originalElement.current.style.opacity = '0.3'
    }
  }, [updating])

  useEffect(() => {
    function handlePointerMove(e: PointerEvent) {
      if (!dragItem || !dragCloneRef.current) return
      dragCloneRef.current.style.left = `${e.clientX - 125}px`
      dragCloneRef.current.style.top = `${e.clientY - 20}px`
      const col = detectColumn(e.clientX, e.clientY)
      setDragOverCol(col)
    }

    async function handlePointerUp(e: PointerEvent) {
      if (!dragItem) return

      // Cleanup clone
      if (dragCloneRef.current) {
        document.body.removeChild(dragCloneRef.current)
        dragCloneRef.current = null
      }
      if (originalElement.current) {
        originalElement.current.style.opacity = '1'
        originalElement.current = null
      }

      const col = detectColumn(e.clientX, e.clientY) as 'todo' | 'in_progress' | 'done' | null
      const currentItem = items.find(i => i.assignmentId === dragItem)

      if (col && currentItem && col !== currentItem.status) {
        setUpdating(dragItem)
        try {
          await onStatusChange(dragItem, col)
        } finally {
          setUpdating(null)
        }
      }

      setDragItem(null)
      setDragOverCol(null)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    return () => {
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
    }
  }, [dragItem, items, onStatusChange, detectColumn])

  function formatDueDate(dateStr?: string): string {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="kanban-board" style={{ touchAction: 'pan-y' }}>
      {COLUMNS.map(col => (
        <div
          key={col.key}
          id={`kanban-col-${col.key}`}
          className={`bg-surface border border-border rounded-2xl border-t-4 ${col.color} min-h-[300px] flex flex-col ${
            dragOverCol === col.key ? 'ring-2 ring-primary/30' : ''
          }`}
        >
          {/* Column header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted/10 text-muted font-medium">
              {grouped[col.key].length}
            </span>
          </div>

          {/* Cards */}
          <div className="p-3 flex-1 space-y-2">
            {grouped[col.key].map(item => (
              <div
                key={item.assignmentId}
                className={`rounded-xl border border-border p-3 cursor-grab active:cursor-grabbing select-none ${
                  updating === item.assignmentId ? 'opacity-50' : 'bg-background hover:border-primary/30'
                }`}
                style={{ touchAction: 'none' }}
                onPointerDown={e => handlePointerDown(e, item)}
                onClick={() => onCardClick?.(item)}
              >
                <p className="text-sm font-medium text-foreground mb-1">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-muted line-clamp-2 mb-2">{item.description}</p>
                )}
                <div className="flex items-center justify-between">
                  {item.dueDate && (
                    <span className="text-xs text-muted">{formatDueDate(item.dueDate)}</span>
                  )}
                  {/* Presence bubbles */}
                  {item.presence && item.presence.length > 0 && (
                    <div className="flex -space-x-1.5">
                      {item.presence.slice(0, 5).map((p, i) => (
                        <div
                          key={i}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-background ${
                            p.status === 'done' ? 'bg-success/20 text-success' :
                            p.status === 'in_progress' ? 'bg-primary/20 text-primary' :
                            'bg-muted/20 text-muted'
                          }`}
                          title={p.name}
                        >
                          {p.initials}
                        </div>
                      ))}
                      {item.presence.length > 5 && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold border-2 border-background bg-muted/10 text-muted">
                          +{item.presence.length - 5}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {grouped[col.key].length === 0 && (
              <div className="text-center py-8">
                <p className="text-xs text-muted">Sin actividades</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
