'use client'

import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, LabelList,
} from 'recharts'
import { usePrintWidth } from '@/hooks/usePrintWidth'
import type { GenderSlice } from '@/hooks/useChartData'

interface GenderBarChartProps {
  data: GenderSlice[]
  isPrint?: boolean
}

export function GenderBarChart({ data, isPrint = false }: GenderBarChartProps) {
  const { containerRef, chartWidth, isPrinting } = usePrintWidth(560)
  const activePrint = isPrint || isPrinting
  const chartHeight = activePrint ? 280 : 230

  if (data.length === 0) {
    return (
      <div ref={containerRef} style={{ height: chartHeight }}
        className="flex flex-col items-center justify-center text-muted italic text-sm gap-2">
        <span className="text-3xl opacity-20">⚥</span>
        <span>Sin datos de género</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ height: chartHeight }}>
      <BarChart
        width={chartWidth}
        height={chartHeight}
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 54, left: 8, bottom: 5 }}
        barCategoryGap="24%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.4} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: 'var(--muted)' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: 'var(--foreground)', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          width={70}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null
            const item = payload[0].payload as GenderSlice
            return (
              <div className="bg-surface border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
                <p className="font-bold">{item.name}</p>
                <p className="text-muted">
                  <span className="font-bold" style={{ color: item.color }}>{item.value}</span>{' '}
                  animales · <span className="font-bold">{item.percentage}%</span>
                </p>
              </div>
            )
          }}
          cursor={{ fill: 'var(--surface-hover)' }}
        />
        <Bar dataKey="value" radius={[0, 8, 8, 0]} isAnimationActive={true}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} opacity={0.9} />
          ))}
          <LabelList
            dataKey="percentage"
            position="right"
            formatter={((v: unknown) => `${v ?? 0}%`) as any}
            style={{ fontSize: 11, fontWeight: 700, fill: 'var(--muted)' }}
          />
        </Bar>
      </BarChart>
    </div>
  )
}
