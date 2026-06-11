'use client'

import React, { useState } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts'
import type { VaccinationSlice } from '@/hooks/useChartData'

interface VaccinationDonutProps {
  data: VaccinationSlice[]
}

export function VaccinationDonut({ data }: VaccinationDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted italic text-sm">
        Sin datos de vacunación
      </div>
    )
  }

  const dominant = activeIndex !== null ? data[activeIndex] : data.reduce((a, b) => a.value > b.value ? a : b)
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div className="w-full h-full flex flex-col gap-2">
      {/* Donut chart with center label overlay */}
      <div className="relative flex-1" style={{ minHeight: 160 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="78%"
              dataKey="value"
              nameKey="name"
              paddingAngle={2}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={entry.color}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                  className="transition-opacity duration-200 cursor-pointer"
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null
                const item = payload[0].payload as VaccinationSlice
                return (
                  <div className="bg-surface border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
                    <p className="font-bold text-foreground">{item.name}</p>
                    <p className="text-muted">
                      {item.value} animales ·{' '}
                      <span className="font-bold" style={{ color: item.color }}>{item.percentage}%</span>
                    </p>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="text-2xl sm:text-3xl font-bold tabular-nums transition-all duration-300"
            style={{ color: dominant.color }}
          >
            {dominant.percentage}%
          </span>
          <span className="text-[10px] sm:text-xs text-muted font-medium max-w-[80px] text-center leading-tight">
            {dominant.name}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pb-1">
        {data.map((item, i) => (
          <button
            key={item.name}
            className={`flex items-center gap-1.5 text-[10px] font-medium transition-opacity duration-200 ${
              activeIndex !== null && activeIndex !== i ? 'opacity-40' : 'opacity-100'
            }`}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-muted">{item.name}</span>
            <span className="font-bold text-foreground">{total > 0 ? item.value : 0}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
