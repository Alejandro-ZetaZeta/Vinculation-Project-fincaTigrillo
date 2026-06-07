'use client'

import { useEffect, useRef } from 'react'
import { derivePoultryStage } from '@/lib/formulas'

interface PoultryBatch {
  id: string
  acquisition_date: string | null
  birth_date: string | null
  metadata: Record<string, unknown> | null
  animal_types?: { slug?: string } | null
}

function computeDays(batch: PoultryBatch): number | null {
  const baseline = batch.acquisition_date || batch.birth_date
  if (!baseline) return null
  const base = new Date(baseline + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - base.getTime()) / 86_400_000)
}

export function usePoultryStageSync(onSynced?: () => void) {
  const checkedRef = useRef(false)
  const onSyncedRef = useRef(onSynced)
  onSyncedRef.current = onSynced

  useEffect(() => {
    if (checkedRef.current) return
    checkedRef.current = true

    async function sync() {
      try {
        const res = await fetch('/api/animals?type_slug=aves-de-corral&status=activo')
        if (!res.ok) return
        const batches: PoultryBatch[] = await res.json()

        let anyUpdated = false

        for (const batch of batches) {
          const days = computeDays(batch)
          if (days === null) continue

          const derivedStage = derivePoultryStage(days)
          if (!derivedStage) continue

          const storedStage = batch.metadata?.etapa as string | undefined
          if (storedStage === derivedStage) continue

          const updatedMetadata = { ...(batch.metadata || {}), etapa: derivedStage }
          await fetch(`/api/animals/${batch.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metadata: updatedMetadata }),
          })
          anyUpdated = true
        }

        if (anyUpdated) onSyncedRef.current?.()
      } catch {
        // non-critical background sync
      }
    }

    sync()
  }, [])
}
