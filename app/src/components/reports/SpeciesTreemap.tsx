'use client'

import React, { useState } from 'react'
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

  // Split into two groups for best aspect ratio
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
}

export function SpeciesTreemap({ data }: SpeciesTreemapProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted italic text-sm">
        Sin datos de especies
      </div>
    )
  }

  const viewW = 400
  const viewH = 260
  const pad = 2

  const rects = layoutTreemap(data, pad, pad, viewW - pad * 2, viewH - pad * 2)

  const selectedNode = selected ? data.find(d => d.name === selected) : null

  return (
    <div className="w-full h-full flex flex-col">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        className="w-full flex-1"
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

      {/* Selected detail */}
      {selectedNode && (
        <div className="mt-2 px-3 py-2 bg-primary/8 border border-primary/20 rounded-xl flex items-center justify-between animate-fade-up">
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
