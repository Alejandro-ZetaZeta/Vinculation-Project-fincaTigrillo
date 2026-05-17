'use client'

import { createContext, useContext, useState, useCallback } from 'react'

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

interface NotificationsContextValue {
  notifications: AppNotification[]
  unreadCount: number
  dismiss: (id: string) => void
  clearAll: () => void
  markAllRead: () => void
  addNotification: (payload: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => void
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: '1',
    type: 'warning',
    title: 'Vacunación pendiente',
    message: '3 bovinos requieren dosis de refuerzo esta semana.',
    timestamp: new Date(Date.now() - 1000 * 60 * 14),
    read: false,
  },
  {
    id: '2',
    type: 'info',
    title: 'Nuevo lote registrado',
    message: 'Lote Gallinas-03 ingresado con 120 aves en etapa pollitos.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: false,
  },
  {
    id: '3',
    type: 'success',
    title: 'Reporte generado',
    message: 'Reporte de inventario de mayo exportado correctamente.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
    read: true,
  },
  {
    id: '4',
    type: 'error',
    title: 'Evento de mortalidad',
    message: 'Se registraron 4 bajas en Lote Pollos-02. Cantidad actual: 96.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23),
    read: false,
  },
  {
    id: '5',
    type: 'info',
    title: 'Peso actualizado',
    message: 'Luna (Bov-007) registró nuevo peso: 412 kg.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 26),
    read: true,
  },
]

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>(MOCK_NOTIFICATIONS)

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const addNotification = useCallback((payload: Omit<AppNotification, 'id' | 'read' | 'timestamp'>) => {
    setNotifications(prev => [{
      ...payload,
      id: crypto.randomUUID(),
      read: false,
      timestamp: new Date(),
    }, ...prev])
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <NotificationsContext.Provider value={{ notifications, unreadCount, dismiss, clearAll, markAllRead, addNotification }}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}
