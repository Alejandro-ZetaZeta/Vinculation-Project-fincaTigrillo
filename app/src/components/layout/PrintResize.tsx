'use client'

/**
 * PrintResize
 *
 * Fixes two issues with Recharts charts in print mode:
 *
 * 1. BLANK CHARTS: The inner chart div uses `position:absolute; inset-y:0`.
 *    In print the parent flex-1 div has no resolved height → absolute child
 *    collapses → chart is invisible. We inject `viewBox` on the SVGs so CSS
 *    can scale them, and we patch the inline style of the absolute div to
 *    `position:relative` so it flows normally and takes the height of its
 *    Recharts content.
 *
 * 2. SMALL CHARTS AFTER PRINT: The browser fires `afterprint` and restores
 *    @screen CSS, but Recharts doesn't remeasure its container. We dispatch
 *    a resize event after a brief delay so Recharts remeasures correctly.
 */

import { useEffect } from 'react'

interface SavedSVG {
  el: SVGSVGElement
  origViewBox: string | null
  hadViewBox: boolean
}

interface SavedDiv {
  el: HTMLElement
  origPosition: string
  origInset: string
  origTop: string
  origLeft: string
  origRight: string
  origBottom: string
  origWidth: string
  origHeight: string
}

export function PrintResize() {
  useEffect(() => {
    let savedSVGs: SavedSVG[] = []
    let savedDivs: SavedDiv[] = []

    function beforePrint() {
      /* ── 1. Inject viewBox so CSS width:100% scales proportionally ── */
      const svgs = document.querySelectorAll<SVGSVGElement>(
        '.recharts-wrapper > svg'
      )
      savedSVGs = []
      svgs.forEach(svg => {
        const w = svg.getAttribute('width') || String(Math.round(svg.getBoundingClientRect().width))
        const h = svg.getAttribute('height') || String(Math.round(svg.getBoundingClientRect().height))
        savedSVGs.push({
          el: svg,
          origViewBox: svg.getAttribute('viewBox'),
          hadViewBox: svg.hasAttribute('viewBox'),
        })
        if (!svg.hasAttribute('viewBox') && parseFloat(w) > 0 && parseFloat(h) > 0) {
          svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
          svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')
        }
      })

      /* ── 2. Convert absolute chart divs to relative so they flow normally ──
         .chart-content-transition is `absolute inset-y-0`. In print the flex-1
         parent has no resolved height, so the absolute child collapses to 0px.
         Setting it to relative lets it take its natural content height.         */
      const innerDivs = document.querySelectorAll<HTMLElement>(
        '.chart-content-transition'
      )
      savedDivs = []
      innerDivs.forEach(el => {
        savedDivs.push({
          el,
          origPosition: el.style.position,
          origInset: el.style.inset,
          origTop: el.style.top,
          origLeft: el.style.left,
          origRight: el.style.right,
          origBottom: el.style.bottom,
          origWidth: el.style.width,
          origHeight: el.style.height,
        })
        el.style.position = 'relative'
        el.style.inset = 'auto'
        el.style.top = 'auto'
        el.style.left = 'auto'
        el.style.right = 'auto'
        el.style.bottom = 'auto'
        el.style.width = '100%'
        el.style.height = 'auto'
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

      /* ── Restore inner div positioning ── */
      savedDivs.forEach(({ el, origPosition, origInset, origTop, origLeft, origRight, origBottom, origWidth, origHeight }) => {
        el.style.position = origPosition
        el.style.inset = origInset
        el.style.top = origTop
        el.style.left = origLeft
        el.style.right = origRight
        el.style.bottom = origBottom
        el.style.width = origWidth
        el.style.height = origHeight
      })
      savedDivs = []

      /* ── Let DOM reflow, then ask Recharts to remeasure ── */
      setTimeout(() => window.dispatchEvent(new Event('resize')), 300)
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
