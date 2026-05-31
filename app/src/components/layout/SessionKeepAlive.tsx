'use client'

import { useEffect, useRef } from 'react'

// Silently refreshes the access token when the user interacts with the page.
// Throttled to one call per 4 minutes to stay well within the 15-minute expiry.
const THROTTLE_MS = 4 * 60 * 1000

export function SessionKeepAlive() {
  const lastRef = useRef(0)

  useEffect(() => {
    function handleActivity() {
      const now = Date.now()
      if (now - lastRef.current < THROTTLE_MS) return
      lastRef.current = now
      fetch('/api/auth/refresh', { method: 'POST' }).catch(() => {})
    }

    const events = ['click', 'scroll', 'keydown'] as const
    events.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))
    return () => events.forEach(e => window.removeEventListener(e, handleActivity))
  }, [])

  return null
}
