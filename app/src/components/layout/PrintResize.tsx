'use client'

/**
 * PrintResize — forces Recharts charts to re-measure their containers
 * when the browser's print dialog opens.
 *
 * Problem: Recharts uses ResizeObserver to measure its container and renders
 * SVGs with hard-coded pixel widths. When @media print kicks in and the
 * layout changes, Recharts does NOT re-render — so charts appear empty or
 * wrongly sized in the print preview.
 *
 * Solution: On `beforeprint` we:
 *  1. Set an explicit pixel height on every .chart-card inner wrapper so
 *     the absolute-positioned child has a resolved height.
 *  2. Dispatch a synthetic ResizeObserver-compatible "resize" event so
 *     Recharts recomputes its dimensions.
 *  3. On `afterprint` we restore the original inline styles.
 */

import { useEffect } from 'react'

const CHART_INNER_SELECTOR = '.chart-card > div:last-child'
const RECHARTS_CONTAINER_SELECTOR = '.recharts-responsive-container'
const PRINT_HEIGHT = 220  // px — matches the CSS rule in globals.css

export function PrintResize() {
  useEffect(() => {
    let originals: { el: HTMLElement; h: string }[] = []

    function beforePrint() {
      // 1. Give every chart inner wrapper an explicit pixel height
      const wrappers = document.querySelectorAll<HTMLElement>(CHART_INNER_SELECTOR)
      originals = Array.from(wrappers).map(el => ({ el, h: el.style.height }))
      wrappers.forEach(el => {
        el.style.height = `${PRINT_HEIGHT}px`
        el.style.minHeight = `${PRINT_HEIGHT}px`
      })

      // 2. Force Recharts to re-measure by firing a window resize event.
      //    We do this slightly after setting heights so the DOM has settled.
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'))
      })
    }

    function afterPrint() {
      // Restore original inline heights so screen layout is unchanged
      originals.forEach(({ el, h }) => {
        el.style.height = h
        el.style.minHeight = ''
      })
      originals = []
      // Re-fire resize so Recharts readjusts for screen size
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event('resize'))
      })
    }

    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)

    return () => {
      window.removeEventListener('beforeprint', beforePrint)
      window.removeEventListener('afterprint', afterPrint)
    }
  }, [])

  return null
}
