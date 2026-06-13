'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PlusCircle, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { REQUEST_TYPE_LABELS } from '@/lib/requests/validatePayload'

interface Request {
  id: string
  request_type: string
  status: 'pending' | 'approved' | 'rejected'
  payload: Record<string, unknown>
  admin_notes: string | null
  created_at: string
  reviewed_at: string | null
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'pending')  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/20"><Clock className="w-3 h-3" />Pendiente</span>
  if (status === 'approved') return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><CheckCircle2 className="w-3 h-3" />Aprobada</span>
  return <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-600 border border-red-500/20"><XCircle className="w-3 h-3" />Rechazada</span>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function MyRequestsClient({ requests }: { requests: Request[] }) {
  const [dismissedNotes, setDismissedNotes] = useState<Set<string>>(new Set())

  const rejectedWithNotes = requests.filter(
    r => r.status === 'rejected' && r.admin_notes && !dismissedNotes.has(r.id)
  )

  return (
    <div className="space-y-6">
      {rejectedWithNotes.length > 0 && (
        <div className="space-y-3">
          {rejectedWithNotes.map(r => (
            <div key={r.id} className="flex items-start gap-3 p-4 bg-red-500/8 border border-red-500/20 rounded-2xl">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  Solicitud rechazada — {REQUEST_TYPE_LABELS[r.request_type] ?? r.request_type}
                </p>
                <p className="text-sm text-muted mt-0.5">{r.admin_notes}</p>
              </div>
              <button
                onClick={() => setDismissedNotes(prev => new Set([...prev, r.id]))}
                className="text-muted hover:text-foreground text-xs shrink-0"
              >
                Descartar
              </button>
            </div>
          ))}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <PlusCircle className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Sin solicitudes enviadas</p>
            <p className="text-sm text-muted mt-1">Crea tu primera solicitud para registrar datos en el sistema.</p>
          </div>
          <Link
            href="/dashboard/requests/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Nueva Solicitud
          </Link>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Historial de Solicitudes</h2>
            <Link
              href="/dashboard/requests/new"
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Nueva
            </Link>
          </div>

          <div className="divide-y divide-border">
            {requests.map(r => (
              <div key={r.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground">
                    {REQUEST_TYPE_LABELS[r.request_type] ?? r.request_type}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    Enviada el {formatDate(r.created_at)}
                    {r.reviewed_at ? ` · Revisada el ${formatDate(r.reviewed_at)}` : ''}
                  </p>
                  {r.status === 'rejected' && r.admin_notes && (
                    <p className="text-xs text-red-500 mt-1.5 italic">"{r.admin_notes}"</p>
                  )}
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
