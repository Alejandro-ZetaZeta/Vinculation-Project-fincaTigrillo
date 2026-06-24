'use client'

/**
 * usePrintWidth — Solución definitiva para recharts en impresión.
 *
 * Problema: ResponsiveContainer usa ResizeObserver que no dispara
 * en el proceso de print del navegador, devolviendo width=-1.
 *
 * Solución: Capturamos el ancho real del DOM con un ref, y al
 * evento 'beforeprint' forzamos un re-render con ese ancho fijo.
 * 'afterprint' restaura el modo responsivo normal.
 */

import { useRef, useState, useEffect, useCallback } from 'react'

export function usePrintWidth(fallback = 600) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartWidth, setChartWidth] = useState<number>(fallback)
  const [isPrinting, setIsPrinting] = useState<boolean>(false)

  const captureWidth = useCallback(() => {
    if (containerRef.current) {
      const w = containerRef.current.getBoundingClientRect().width
      if (w > 0) setChartWidth(Math.floor(w))
    }
  }, [])

  useEffect(() => {
    // Captura inicial
    captureWidth()

    // ResizeObserver para cambios de pantalla
    const ro = new ResizeObserver(() => captureWidth())
    if (containerRef.current) ro.observe(containerRef.current)

    const handleBeforePrint = () => {
      setIsPrinting(true)
      captureWidth()
    }

    const handleAfterPrint = () => {
      setIsPrinting(false)
      captureWidth()
    }

    // Antes de imprimir y después de imprimir: captura el ancho actual y cambia el estado
    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      ro.disconnect()
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)
    }
  }, [captureWidth])

  return { containerRef, chartWidth, isPrinting }
}
