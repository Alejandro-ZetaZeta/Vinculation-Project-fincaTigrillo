'use client'

/**
 * PrintResize — makes Recharts charts scale correctly in print without re-rendering.
 *
 * ROOT CAUSE: Recharts renders SVGs with hard-coded pixel `width` and `height`
 * attributes but WITHOUT a `viewBox`. Without viewBox, CSS `width: 100%` only
 * resizes the element box but the chart paths stay at the original coordinates —
 * so the chart appears clipped or empty when the print card is smaller.
 *
 * FIX (beforeprint):
 *   1. Inject `viewBox="0 0 W H"` onto every Recharts SVG so they become
 *      fully scalable (like a normal SVG image).
 *   2. Set explicit heights on chart cards so flex-1 children resolve properly.
 *
 * FIX (afterprint):
 *   1. Remove injected viewBox attributes.
 *   2. Restore card heights.
 *   3. After a short reflow delay, fire `window.resize` so Recharts
 *      re-measures the containers and restores original dimensions.
 */

import { useEffect } from 'react'

const PRINT_CARD_HEIGHT = 300  // px — must match CSS .chart-card height in @media print

interface SavedSVG {
  el: SVGSVGElement
  hadViewBox: boolean
  origViewBox: string | null
}

interface SavedCard {
  el: HTMLElement
  height: string
  minHeight: string
  maxHeight: string
}

export function PrintResize() {
  useEffect(() => {
    let savedSVGs: SavedSVG[] = []
    let savedCards: SavedCard[] = []

    function beforePrint() {
      /* ── Step 1: Inject viewBox into Recharts SVGs ── */
      const svgs = document.querySelectorAll<SVGSVGElement>('.recharts-wrapper > svg')
      savedSVGs = []

      svgs.forEach(svg => {
        const w = svg.getAttribute('width') ?? String(svg.clientWidth)
        const h = svg.getAttribute('height') ?? String(svg.clientHeight)
        savedSVGs.push({
          el: svg,
          hadViewBox: svg.hasAttribute('viewBox'),
          origViewBox: svg.getAttribute('viewBox'),
        })
        // Only add if valid dimensions
        if (!svg.hasAttribute('viewBox') && parseFloat(w) > 0 && parseFloat(h) > 0) {
          svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        }
      })

      /* ── Step 2: Fix card heights so flex-1 inner div resolves ── */
      const cards = document.querySelectorAll<HTMLElement>('.chart-card')
      savedCards = []

      cards.forEach(el => {
        savedCards.push({
          el,
          height: el.style.height,
          minHeight: el.style.minHeight,
          maxHeight: el.style.maxHeight,
        })
        el.style.height = `${PRINT_CARD_HEIGHT}px`
        el.style.minHeight = `${PRINT_CARD_HEIGHT}px`
        el.style.maxHeight = `${PRINT_CARD_HEIGHT}px`
      })
    }

    function afterPrint() {
      /* ── Restore SVG viewBox state ── */
      savedSVGs.forEach(({ el, hadViewBox, origViewBox }) => {
        if (!hadViewBox) {
          el.removeAttribute('viewBox')
          el.removeAttribute('preserveAspectRatio')
        } else if (origViewBox !== null) {
          el.setAttribute('viewBox', origViewBox)
        }
      })
      savedSVGs = []

      /* ── Restore card heights ── */
      savedCards.forEach(({ el, height, minHeight, maxHeight }) => {
        el.style.height = height
        el.style.minHeight = minHeight
        el.style.maxHeight = maxHeight
      })
      savedCards = []

      /* ── Allow DOM to reflow, then let Recharts re-measure ── */
      setTimeout(() => window.dispatchEvent(new Event('resize')), 250)
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
