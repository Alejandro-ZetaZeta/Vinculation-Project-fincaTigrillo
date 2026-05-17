'use client'

import { useEffect, useRef } from 'react'
import { useNotifications } from '@/contexts/NotificationsContext'

interface PoultryBatch {
  id: string
  name: string | null
  identification_code: string | null
  sex: string
  acquisition_date: string | null
  birth_date: string | null
}

function computeDaysOfLife(batch: PoultryBatch): number | null {
  const baseline = batch.acquisition_date || batch.birth_date
  if (!baseline) return null
  const base = new Date(baseline + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - base.getTime()) / 86_400_000)
}

export function useDay45Check() {
  const { addNotification } = useNotifications()
  const checkedRef = useRef(false)

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true

    async function check() {
      try {
        const res = await fetch('/api/animals?type_slug=aves-de-corral&status=activo')
        if (!res.ok) return
        const batches: PoultryBatch[] = await res.json()
        const todayStr = new Date().toISOString().split('T')[0]

        for (const batch of batches) {
          if (batch.sex !== 'mixto') continue
          const days = computeDaysOfLife(batch)
          if (days !== 45) continue

          const storageKey = `day45_notified_${batch.id}_${todayStr}`
          if (sessionStorage.getItem(storageKey)) continue
          sessionStorage.setItem(storageKey, '1')

          const label = batch.name || batch.identification_code || 'Lote sin nombre'
          addNotification({
            type: 'warning',
            title: `Día 45 — ${label}`,
            message: `Este lote ha completado su ciclo de engorde. Se recomienda procesar o archivar el lote a la brevedad.`,
            actionLabel: 'Ir al inventario',
            actionHref: '/dashboard/animals/list',
          })
        }
      } catch {
        // silently ignore — non-critical background check
      }
    }

    check()
  }, [addNotification])
}
