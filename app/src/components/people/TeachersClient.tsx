'use client'

import { useState } from 'react'
import { GraduationCap, Search } from 'lucide-react'

interface Teacher {
  id: string
  user_id: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  pending_requests: number
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-EC', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function TeachersClient({ teachers }: { teachers: Teacher[] }) {
  const [search, setSearch] = useState('')

  const filtered = teachers.filter(t => {
    if (!search) return true
    const q = search.toLowerCase()
    return (t.full_name ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
        <input
          type="text"
          placeholder="Buscar docente..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl py-12 text-center">
          <GraduationCap className="w-10 h-10 text-muted mx-auto mb-3" />
          <p className="text-sm text-muted">
            {search ? 'Sin resultados para esa búsqueda' : 'No hay docentes registrados'}
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Docente</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Registrado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">Solicitudes Pendientes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(t => (
                  <tr key={t.id} className="hover:bg-surface/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {t.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={t.avatar_url}
                            alt={t.full_name ?? 'Avatar'}
                            className="w-8 h-8 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-border flex items-center justify-center shrink-0">
                            <GraduationCap className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <span className="font-medium text-foreground">{t.full_name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted whitespace-nowrap">{formatDate(t.created_at)}</td>
                    <td className="px-6 py-4">
                      {t.pending_requests > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 border border-amber-500/20">
                          {t.pending_requests} pendiente{t.pending_requests !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
