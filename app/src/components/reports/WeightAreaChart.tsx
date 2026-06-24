'use client'

import React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { Scale } from 'lucide-react'
import { usePrintWidth } from '@/hooks/usePrintWidth'
import type { WeightPoint } from '@/hooks/useChartData'

interface WeightAreaChartProps {
  data: WeightPoint[]
}

export function WeightAreaChart({ data }: WeightAreaChartProps) {
  const { containerRef, chartWidth } = usePrintWidth(560)

  if (data.length === 0) {
    return (
      <div ref={containerRef} style={{ height: 230 }}
        className="flex flex-col items-center justify-center text-muted italic text-sm gap-2">
        <Scale className="w-8 h-8 opacity-20" />
        <span>Sin datos de peso registrados</span>
        <span className="text-[10px] text-muted/70">Registre pesos para ver tendencias</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ height: 230 }}>
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="bGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
          </linearGradient>
        </defs>
      </svg>
      <AreaChart
        width={chartWidth}
        height={230}
        data={data}
        margin={{ top: 8, right: 8, left: 10, bottom: 0 }}
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
          yAxisId="left"
          tick={{ fontSize: 10, fill: '#14b8a6' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={40}
          tickFormatter={(v) => `${v}kg`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fontSize: 10, fill: '#8b5cf6' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={38}
          tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}t` : `${v}kg`}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            return (
              <div className="bg-surface border border-border rounded-xl px-3 py-2 shadow-lg text-xs space-y-1">
                <p className="font-bold">{label}</p>
                {payload.map(p => (
                  <p key={p.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name === 'avgWeight' ? 'Peso Prom.' : 'Biomasa'}:{' '}
                    <span className="font-bold">
                      {p.name === 'totalBiomass' && (p.value as number) >= 1000
                        ? `${((p.value as number) / 1000).toFixed(2)}t`
                        : `${p.value} kg`}
                    </span>
                  </p>
                ))}
              </div>
            )
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
          formatter={(value: string) => value === 'avgWeight' ? 'Peso Prom.' : 'Biomasa Total'}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="avgWeight"
          stroke="#14b8a6"
          strokeWidth={2.5}
          fill="url(#wGrad)"
          isAnimationActive={true}
          dot={{ r: 3, fill: '#14b8a6', strokeWidth: 2, stroke: 'var(--surface)' }}
          activeDot={{ r: 5 }}
        />
        <Area
          yAxisId="right"
          type="monotone"
          dataKey="totalBiomass"
          stroke="#8b5cf6"
          strokeWidth={2.5}
          fill="url(#bGrad)"
          isAnimationActive={true}
          dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 2, stroke: 'var(--surface)' }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </div>
  )
}
