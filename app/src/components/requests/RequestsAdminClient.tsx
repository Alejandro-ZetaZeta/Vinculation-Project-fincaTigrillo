'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Clock, XCircle, Eye, Search } from 'lucide-react'
import { REQUEST_TYPE_LABELS } from '@/lib/requests/validatePayload'
import { RequestDetailModal } from './RequestDetailModal'

interface Request {
  id: string
  teacher_id: string
  teacher_name: string | null
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

const TABS = ['pending', 'approved', 'rejected'] as const
const TAB_LABELS: Record<string, string> = { pending: 'Pendientes', approved: 'Aprobadas', rejected: 'Rechazadas' }

export function RequestsAdminClient({ requests, userRole }: { requests: Request[]; userRole: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null)
  const [teacherSearch, setTeacherSearch] = useState('')

  const filtered = requests
    .filter(r => r.status === activeTab)
    .filter(r => teacherSearch === '' || r.teacher_name?.toLowerCase().includes(teacherSearch.toLowerCase()))

  const tabCount = (tab: string) => requests.filter(r => r.status === tab).length

  return (
    <>
      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              placeholder="Buscar por docente..."
              value={teacherSearch}
              onChange={e => setTeacherSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex border-b border-border">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'flex-1 px-4 py-3.5 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-muted hover:text-foreground',
              ].join(' ')}
            >
              {TAB_LABELS[tab]}
              {tabCount(tab) > 0 && (
                <span className={[
                  'ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-bold',
                  tab === 'pending' ? 'bg-amber-500/15 text-amber-600' : 'bg-muted/20 text-muted',
                ].join(' ')}>
                  {tabCount(tab)}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-muted text-sm">
            {teacherSearch ? 'Sin solicitudes para ese docente' : `No hay solicitudes ${TAB_LABELS[activeTab].toLowerCase()}`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Docente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(r => (
                  <tr key={r.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-muted">{formatDate(r.created_at)}</td>
                    <td className="px-6 py-4 font-medium text-foreground">
                      {REQUEST_TYPE_LABELS[r.request_type] ?? r.request_type}
                    </td>
                    <td className="px-6 py-4 text-muted">{r.teacher_name ?? '—'}</td>
                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedRequest(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-xl text-xs font-medium hover:bg-primary/20 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          userRole={userRole}
          onClose={() => setSelectedRequest(null)}
          onActionDone={() => {
            setSelectedRequest(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}
