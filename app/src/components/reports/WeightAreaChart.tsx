'use client'

import React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import type { WeightPoint } from '@/hooks/useChartData'

interface WeightAreaChartProps {
  data: WeightPoint[]
}

export function WeightAreaChart({ data }: WeightAreaChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted italic text-sm gap-1">
        <span>Sin datos de peso</span>
        <span className="text-[10px]">Registre pesos para ver tendencias</span>
      </div>
    )
  }

  return (
    <div className="w-full h-full" style={{ minHeight: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="biomassGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.4} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--muted)' }}
            axisLine={{ stroke: 'var(--border-color)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: 'var(--muted)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            label={{ value: 'Kg', position: 'insideTopLeft', offset: 10, style: { fontSize: 9, fill: 'var(--muted)' } }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: 'var(--muted)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            label={{ value: 'Biomasa', position: 'insideTopRight', offset: 10, style: { fontSize: 9, fill: 'var(--muted)' } }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div className="bg-surface border border-border rounded-xl px-3 py-2 shadow-lg text-xs space-y-1">
                  <p className="font-bold text-foreground">{label}</p>
                  {payload.map(p => (
                    <p key={p.name} className="text-muted">
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
                      {p.name === 'avgWeight' ? 'Peso Prom.' : 'Biomasa Total'}:{' '}
                      <span className="font-bold text-foreground">{p.value} kg</span>
                    </p>
                  ))}
                </div>
              )
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
            formatter={(value: string) => value === 'avgWeight' ? 'Peso Promedio' : 'Biomasa Total'}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="avgWeight"
            stroke="#14b8a6"
            strokeWidth={2}
            fill="url(#weightGradient)"
            dot={{ r: 3, fill: '#14b8a6', strokeWidth: 2, stroke: 'var(--surface)' }}
            activeDot={{ r: 5 }}
            animationBegin={0}
            animationDuration={1000}
            animationEasing="ease-out"
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="totalBiomass"
            stroke="#8b5cf6"
            strokeWidth={2}
            fill="url(#biomassGradient)"
            dot={{ r: 3, fill: '#8b5cf6', strokeWidth: 2, stroke: 'var(--surface)' }}
            activeDot={{ r: 5 }}
            animationBegin={200}
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
