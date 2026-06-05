'use client'

import { useEffect, useRef } from 'react'
import { signOut } from '@/lib/auth/actions'

const THROTTLE_MS = 4 * 60 * 1000
const INACTIVITY_LIMIT_MS = 30 * 60 * 1000

export function SessionKeepAlive() {
  const lastRefreshRef = useRef(0)
  const lastActivityRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function scheduleInactivityCheck() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const idle = Date.now() - lastActivityRef.current
        if (idle >= INACTIVITY_LIMIT_MS) {
          signOut()
        } else {
          // Activity happened after timer was set — reschedule for remaining time
          timerRef.current = setTimeout(() => signOut(), INACTIVITY_LIMIT_MS - idle)
        }
      }, INACTIVITY_LIMIT_MS)
    }

    function handleActivity() {
      lastActivityRef.current = Date.now()
      scheduleInactivityCheck()

      const now = Date.now()
      if (now - lastRefreshRef.current < THROTTLE_MS) return
      lastRefreshRef.current = now
      fetch('/api/auth/refresh', { method: 'POST' }).catch(() => {})
    }

    scheduleInactivityCheck()

    const events = ['click', 'scroll', 'keydown', 'mousemove', 'touchstart'] as const
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))
    return () => {
      events.forEach(e => window.removeEventListener(e, handleActivity))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return null
}
