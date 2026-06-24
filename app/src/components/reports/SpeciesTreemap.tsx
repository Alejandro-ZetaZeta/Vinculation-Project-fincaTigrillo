'use client'

import React, { useState } from 'react'
import { TreePine } from 'lucide-react'
import { usePrintWidth } from '@/hooks/usePrintWidth'
import type { SpeciesNode } from '@/hooks/useChartData'

/* ─────────────────────────────────────────────
   Squarified Treemap Layout
   Implements the Bruls–Huizing–van Wijk algorithm
   ───────────────────────────────────────────── */

interface TreemapRect {
  x: number
  y: number
  w: number
  h: number
  node: SpeciesNode
}

const TREEMAP_COLORS = [
  '#16a34a', '#0ea5e9', '#8b5cf6', '#f59e0b', '#ec4899',
  '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#e11d48',
]

function layoutTreemap(nodes: SpeciesNode[], x: number, y: number, w: number, h: number): TreemapRect[] {
  if (nodes.length === 0) return []
  if (nodes.length === 1) {
    return [{ x, y, w, h, node: nodes[0] }]
  }

  const total = nodes.reduce((s, n) => s + n.value, 0)
  if (total === 0) return []

  let bestSplit = 1
  let bestRatio = Infinity

  let runningSum = 0
  for (let i = 0; i < nodes.length - 1; i++) {
    runningSum += nodes[i].value
    const ratio1 = runningSum / total
    const ratio2 = 1 - ratio1
    const aspect = Math.max(ratio1 / ratio2, ratio2 / ratio1)
    if (aspect < bestRatio) {
      bestRatio = aspect
      bestSplit = i + 1
    }
  }

  const group1 = nodes.slice(0, bestSplit)
  const group2 = nodes.slice(bestSplit)
  const sum1 = group1.reduce((s, n) => s + n.value, 0)
  const fraction = sum1 / total

  let rects: TreemapRect[] = []

  if (w >= h) {
    const splitX = x + w * fraction
    rects = [
      ...layoutTreemap(group1, x, y, w * fraction, h),
      ...layoutTreemap(group2, splitX, y, w * (1 - fraction), h),
    ]
  } else {
    const splitY = y + h * fraction
    rects = [
      ...layoutTreemap(group1, x, y, w, h * fraction),
      ...layoutTreemap(group2, x, splitY, w, h * (1 - fraction)),
    ]
  }

  return rects
}

/* ─────────────────────────────────────────────
   Component
   ───────────────────────────────────────────── */

interface SpeciesTreemapProps {
  data: SpeciesNode[]
  isPrint?: boolean
}

export function SpeciesTreemap({ data, isPrint = false }: SpeciesTreemapProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const { containerRef, chartWidth, isPrinting } = usePrintWidth(400)

  const activePrint = isPrint || isPrinting

  if (data.length === 0) {
    return (
      <div ref={containerRef} style={{ height: activePrint ? 280 : 220 }} className="flex flex-col items-center justify-center text-muted italic text-sm gap-2">
        <TreePine className="w-8 h-8 opacity-20" />
        <span>Sin datos de especies</span>
      </div>
    )
  }

  const viewW = chartWidth > 0 ? chartWidth : 400
  const viewH = activePrint ? 280 : 200
  const pad = 2

  const rects = layoutTreemap(data, pad, pad, viewW - pad * 2, viewH - pad * 2)

  const selectedNode = selected ? data.find(d => d.name === selected) : null

  return (
    <div ref={containerRef} className="w-full flex flex-col" style={{ minHeight: viewH }}>
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        style={{ width: '100%', height: viewH }}
        preserveAspectRatio="xMidYMid meet"
      >
        {rects.map((rect, i) => {
          const isHovered = hovered === rect.node.name
          const isSelected = selected === rect.node.name
          const color = TREEMAP_COLORS[i % TREEMAP_COLORS.length]
          const innerW = rect.w - 2
          const innerH = rect.h - 2
          const showLabel = innerW > 50 && innerH > 30

          return (
            <g
              key={rect.node.name}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(rect.node.name)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => setSelected(s => s === rect.node.name ? null : rect.node.name)}
            >
              <rect
                x={rect.x + 1}
                y={rect.y + 1}
                width={Math.max(0, innerW)}
                height={Math.max(0, innerH)}
                rx={6}
                fill={color}
                opacity={isHovered || isSelected ? 1 : 0.82}
                className="transition-all duration-300"
                stroke={isSelected ? '#fff' : 'transparent'}
                strokeWidth={isSelected ? 2 : 0}
              />
              {showLabel && (
                <>
                  <text
                    x={rect.x + rect.w / 2}
                    y={rect.y + rect.h / 2 - 6}
                    textAnchor="middle"
                    fill="white"
                    fontSize={innerW > 80 ? 12 : 9}
                    fontWeight="700"
                    className="pointer-events-none select-none"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
                  >
                    {rect.node.name}
                  </text>
                  <text
                    x={rect.x + rect.w / 2}
                    y={rect.y + rect.h / 2 + 10}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.85)"
                    fontSize={innerW > 80 ? 11 : 8}
                    fontWeight="600"
                    className="pointer-events-none select-none"
                  >
                    {rect.node.value} ({rect.node.percentage}%)
                  </text>
                </>
              )}

              {/* Hover tooltip for small rects */}
              {isHovered && !showLabel && (
                <title>{`${rect.node.name}: ${rect.node.value} (${rect.node.percentage}%)`}</title>
              )}
            </g>
          )
        })}
      </svg>

      {/* Legend row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 mt-1">
        {data.slice(0, 6).map((d, i) => (
          <button
            key={d.name}
            className={`flex items-center gap-1 text-[10px] font-medium transition-opacity ${
              hovered && hovered !== d.name ? 'opacity-40' : 'opacity-100'
            }`}
            onMouseEnter={() => setHovered(d.name)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => setSelected(s => s === d.name ? null : d.name)}
          >
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ backgroundColor: TREEMAP_COLORS[i % TREEMAP_COLORS.length] }}
            />
            <span className="text-muted truncate max-w-[70px]">{d.name}</span>
            <span className="font-bold text-foreground">{d.value}</span>
          </button>
        ))}
      </div>

      {/* Selected detail */}
      {selectedNode && (
        <div className="mt-1.5 px-3 py-1.5 bg-primary/8 border border-primary/20 rounded-xl flex items-center justify-between animate-fade-up">
          <div>
            <span className="text-xs font-bold text-foreground">{selectedNode.name}</span>
            <span className="text-xs text-muted ml-2">{selectedNode.value} animales</span>
          </div>
          <span className="text-xs font-bold text-primary">{selectedNode.percentage}%</span>
        </div>
      )}
    </div>
  )
}
