'use client'

import { useEffect, useRef } from 'react'
import { useNotifications } from '@/contexts/NotificationsContext'

interface PendingSuggestion {
  id: string
  sembrio_id: string
  current_stage: string
  suggested_stage: string
  sembrios?: {
    id: string
    tipo_cultivo: string
    potrero_id: string
    potreros?: { nombre: string } | { nombre: string }[] | null
  }
}

function getPotreroName(s: PendingSuggestion): string {
  const p = s.sembrios?.potreros
  if (!p) return ''
  return Array.isArray(p) ? p[0]?.nombre || '' : p.nombre
}

export function useCropStageCheck() {
  const { addNotification } = useNotifications()
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true

    async function check() {
      try {
        const res = await fetch('/api/sembrios/suggestions?status=pending')
        if (!res.ok) return
        const { data } = await res.json()
        if (!data || data.length === 0) return

        const _d = new Date()
        const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`

        for (const suggestion of data as PendingSuggestion[]) {
          const storageKey = `crop_stage_notified_${suggestion.id}_${todayStr}`
          if (sessionStorage.getItem(storageKey)) continue
          sessionStorage.setItem(storageKey, '1')

          const cropName = suggestion.sembrios?.tipo_cultivo || 'Cultivo'
          const potreroName = getPotreroName(suggestion)
          const label = potreroName ? `${cropName} - ${potreroName}` : cropName

          addNotification({
            type: 'warning',
            title: `Sugerencia de Etapa: ${label}`,
            message: suggestion.suggested_stage
              ? `El cultivo debería cambiar de etapa. Revise en el módulo de Sembríos.`
              : 'Revise el detalle del sembrío.',
            actionLabel: 'Ver Sembríos',
            actionHref: '/dashboard/sembrios',
          })
        }
      } catch {
        // silently ignore — non-critical background check
      }
    }

    check()
  }, [addNotification])
}
