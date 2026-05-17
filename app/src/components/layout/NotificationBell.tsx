'use client'

import { useRef, useEffect, useState } from 'react'
import { Bell, BellOff, X, Trash2, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react'
import { useNotifications, type AppNotification, type NotificationType } from '@/contexts/NotificationsContext'

interface NotificationBellProps {
  userRole: string
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  return `hace ${Math.floor(hrs / 24)}d`
}

const typeConfig: Record<NotificationType, { icon: React.ElementType; colorClass: string; bgClass: string }> = {
  info:    { icon: Info,          colorClass: 'text-blue-500',  bgClass: 'bg-blue-500/10' },
  success: { icon: CheckCircle,   colorClass: 'text-success',   bgClass: 'bg-success/10' },
  warning: { icon: AlertTriangle, colorClass: 'text-warning',   bgClass: 'bg-warning/10' },
  error:   { icon: AlertCircle,   colorClass: 'text-danger',    bgClass: 'bg-danger/10' },
}

function NotificationItem({ n, onDismiss }: { n: AppNotification; onDismiss: (id: string) => void }) {
  const { icon: Icon, colorClass, bgClass } = typeConfig[n.type]
  return (
    <div className={`group flex gap-3 px-4 py-3 transition-colors hover:bg-surface-hover/60 ${!n.read ? 'bg-primary/[0.03]' : ''}`}>
      <div className={`mt-0.5 w-7 h-7 rounded-lg ${bgClass} flex items-center justify-center shrink-0`}>
        <Icon className={`w-3.5 h-3.5 ${colorClass}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-xs font-semibold leading-tight ${!n.read ? 'text-foreground' : 'text-muted'}`}>
            {n.title}
            {!n.read && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary ml-1.5 mb-0.5 align-middle" />}
          </p>
          <span className="text-[10px] text-muted shrink-0 mt-0.5">{timeAgo(n.timestamp)}</span>
        </div>
        <p className="text-[11px] text-muted mt-0.5 leading-relaxed">{n.message}</p>
        {n.actionHref && n.actionLabel && (
          <a
            href={n.actionHref}
            className="inline-block mt-1.5 text-[11px] font-semibold text-primary hover:underline"
            onClick={e => e.stopPropagation()}
          >
            {n.actionLabel} →
          </a>
        )}
      </div>
      <button
        onClick={() => onDismiss(n.id)}
        className="opacity-0 group-hover:opacity-100 mt-0.5 w-5 h-5 rounded-md flex items-center justify-center text-muted hover:text-foreground hover:bg-border transition-all shrink-0"
        aria-label="Descartar notificación"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

export function NotificationBell({ userRole }: NotificationBellProps) {
  if (userRole !== 'admin') return null

  const { notifications, unreadCount, dismiss, clearAll, markAllRead } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onOutside)
      document.removeEventListener('keydown', onEsc)
    }
  }, [])

  function handleOpen() {
    setOpen(v => !v)
    if (!open && unreadCount > 0) markAllRead()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        aria-label={`Notificaciones${unreadCount > 0 ? ` (${unreadCount} nuevas)` : ''}`}
        aria-haspopup="true"
        aria-expanded={open}
        className="relative p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        <Bell className="w-4 h-4" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-danger flex items-center justify-center text-[9px] font-bold text-white leading-none pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Panel de notificaciones"
          className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden z-50"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-hover/30">
            <div className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-semibold text-foreground">Notificaciones</span>
              {notifications.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                  {notifications.length}
                </span>
              )}
            </div>
            {notifications.length > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-[11px] text-muted hover:text-danger transition-colors px-2 py-1 rounded-lg hover:bg-danger/10"
                aria-label="Eliminar todas las notificaciones"
              >
                <Trash2 className="w-3 h-3" />
                Limpiar todo
              </button>
            )}
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 gap-3">
              <div className="w-10 h-10 rounded-2xl bg-surface-hover flex items-center justify-center">
                <BellOff className="w-5 h-5 text-muted" />
              </div>
              <p className="text-sm text-muted text-center">Sin notificaciones nuevas</p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-[360px] overflow-y-auto overscroll-contain">
              {notifications.map(n => (
                <NotificationItem key={n.id} n={n} onDismiss={dismiss} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
