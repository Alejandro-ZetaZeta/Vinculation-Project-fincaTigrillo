'use client'

import {
  createContext, useContext, useState, useCallback, useEffect
} from 'react'

export type NotificationType = 'info' | 'warning' | 'success' | 'error'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionLabel?: string
  actionHref?: string
}

// Shape returned by /api/notifications
interface DbRow {
  id: string
  title: string
  message: string
  type: NotificationType
  is_read: boolean
  created_at: string
}

function rowToNotification(row: DbRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    timestamp: new Date(row.created_at),
    read: row.is_read,
  }
}

interface NotificationsContextValue {
  notifications: AppNotification[]
  unreadCount: number
  loading: boolean
  dismiss: (id: string) => void
  clearAll: () => void
  markAllRead: () => void
  refresh: () => void
  addNotification: (payload: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) throw new Error(await res.text())
      const rows: DbRow[] = await res.json()
      setNotifications(rows.map(rowToNotification))
    } catch (err) {
      console.error('[NotificationsContext] fetch failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load once on mount
  useEffect(() => { load() }, [load])

  const dismiss = useCallback(async (id: string) => {
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== id))
    try {
      await fetch(`/api/notifications?id=${id}`, { method: 'DELETE' })
    } catch (err) {
      console.error('[NotificationsContext] dismiss failed:', err)
      load() // revert if error
    }
  }, [load])

  const clearAll = useCallback(async () => {
    const ids = notifications.map(n => n.id)
    setNotifications([])
    try {
      await Promise.all(
        ids.map(id => fetch(`/api/notifications?id=${id}`, { method: 'DELETE' }))
      )
    } catch (err) {
      console.error('[NotificationsContext] clearAll failed:', err)
      load()
    }
  }, [notifications, load])

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
    } catch (err) {
      console.error('[NotificationsContext] markAllRead failed:', err)
    }
  }, [])

  const addNotification = useCallback(
    (payload: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => {
      const optimisticId = crypto.randomUUID()
      const optimistic: AppNotification = {
        ...payload,
        id: optimisticId,
        read: false,
        timestamp: new Date(),
      }
      setNotifications(prev => [optimistic, ...prev])
      fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: payload.title, message: payload.message, type: payload.type }),
      })
        .then(async res => {
          if (!res.ok) throw new Error(await res.text())
          const saved: DbRow = await res.json()
          // Replace optimistic entry with real DB record so dismiss uses the correct ID
          setNotifications(prev => prev.map(n =>
            n.id === optimisticId ? rowToNotification(saved) : n
          ))
        })
        .catch(err => {
          console.error('[NotificationsContext] addNotification failed:', err)
          // Revert optimistic entry — notification was not persisted
          setNotifications(prev => prev.filter(n => n.id !== optimisticId))
        })
    },
    []
  )

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, loading, dismiss, clearAll, markAllRead, refresh: load, addNotification }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
