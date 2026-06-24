'use client'

import React from 'react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  Area, AreaChart, ReferenceLine,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { usePrintWidth } from '@/hooks/usePrintWidth'
import type { TimePoint } from '@/hooks/useChartData'

interface RegistrationsLineProps {
  data: TimePoint[]
}

export function RegistrationsLine({ data }: RegistrationsLineProps) {
  const { containerRef, chartWidth } = usePrintWidth(560)

  if (data.length === 0) {
    return (
      <div ref={containerRef} style={{ height: 230 }}
        className="flex flex-col items-center justify-center text-muted italic text-sm gap-2">
        <TrendingUp className="w-8 h-8 opacity-20" />
        <span>Sin registros en este período</span>
      </div>
    )
  }

  const maxCount = Math.max(...data.map(d => d.count))
  const avg = data.length > 0
    ? Math.round(data.reduce((s, d) => s + d.count, 0) / data.length)
    : 0

  return (
    <div ref={containerRef} style={{ height: 230 }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
      </svg>
      <AreaChart
        width={chartWidth}
        height={230}
        data={data}
        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.4} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: 'var(--muted)' }}
          axisLine={{ stroke: 'var(--border-color)' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'var(--muted)' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          domain={[0, Math.max(maxCount + 2, 5)]}
          width={28}
        />
        <ReferenceLine
          y={avg}
          stroke="var(--accent)"
          strokeDasharray="4 3"
          strokeWidth={1.5}
          label={{ value: `Prom: ${avg}`, position: 'insideTopRight', fontSize: 9, fill: 'var(--accent)' }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.[0]) return null
            return (
              <div className="bg-surface border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
                <p className="font-bold">{label}</p>
                <p className="text-muted">
                  <span className="font-bold text-primary">{payload[0].value}</span> registros
                </p>
              </div>
            )
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="var(--primary)"
          strokeWidth={2.5}
          fill="url(#regGrad)"
          isAnimationActive={true}
          dot={{ r: 3.5, fill: 'var(--primary)', strokeWidth: 2, stroke: 'var(--surface)' }}
          activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--surface)', strokeWidth: 2 }}
        />
      </AreaChart>
    </div>
  )
}
