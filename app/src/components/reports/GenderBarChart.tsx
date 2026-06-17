'use client'

import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import type { GenderSlice } from '@/hooks/useChartData'

interface GenderBarChartProps {
  data: GenderSlice[]
}

export function GenderBarChart({ data }: GenderBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted italic text-sm">
        Sin datos de género
      </div>
    )
  }

  return (
    <div className="w-full h-full" style={{ minHeight: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
          barCategoryGap="25%"
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
            width={85}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const item = payload[0].payload as GenderSlice
              return (
                <div className="bg-surface border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
                  <p className="font-bold text-foreground">{item.name}</p>
                  <p className="text-muted">
                    <span className="font-bold" style={{ color: item.color }}>{item.value}</span> animales ·{' '}
                    <span className="font-bold">{item.percentage}%</span>
                  </p>
                </div>
              )
            }}
            cursor={{ fill: 'var(--surface-hover)', radius: 6 }}
          />
          <Bar
            dataKey="value"
            radius={[0, 8, 8, 0]}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} opacity={0.85} />
            ))}
            <LabelList
              dataKey="percentage"
              position="right"
              formatter={((v: unknown) => `${v ?? 0}%`) as any}
              style={{ fontSize: 11, fontWeight: 700, fill: 'var(--muted)' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
