'use client'

import React, { useState } from 'react'
import {
  PieChart, Pie, Cell,
} from 'recharts'
import { Syringe } from 'lucide-react'
import type { VaccinationSlice } from '@/hooks/useChartData'

interface VaccinationDonutProps {
  data: VaccinationSlice[]
}

export function VaccinationDonut({ data }: VaccinationDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div style={{ height: 230 }} className="flex flex-col items-center justify-center text-muted italic text-sm gap-2">
        <Syringe className="w-8 h-8 opacity-20" />
        <span>Sin datos de vacunación</span>
      </div>
    )
  }

  const dominant = activeIndex !== null ? data[activeIndex] : data.reduce((a, b) => a.value > b.value ? a : b)

  return (
    <div className="w-full flex flex-col sm:flex-row print:flex-col items-center justify-center gap-6 sm:gap-10 py-2">
      {/* Left side: Donut chart with center label overlay */}
      <div className="relative shrink-0" style={{ width: 230, height: 230 }}>
        <PieChart width={230} height={230}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="85%"
            dataKey="value"
            nameKey="name"
            paddingAngle={3}
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
        </PieChart>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span
            className="text-3xl sm:text-4xl font-extrabold tabular-nums transition-all duration-300"
            style={{ color: dominant.color }}
          >
            {dominant.percentage}%
          </span>
          <span className="text-[10px] sm:text-xs text-muted font-bold max-w-[100px] text-center leading-tight">
            {dominant.name}
          </span>
        </div>
      </div>

      {/* Right side: Detailed Legend Cards */}
      <div className="flex-1 w-full max-w-[280px] flex flex-col gap-2">
        {data.map((item, i) => (
          <div
            key={item.name}
            className={`flex items-center justify-between p-3 rounded-xl border border-border/80 bg-background/40 hover:bg-background/80 transition-all duration-200 cursor-pointer ${
              activeIndex !== null && activeIndex !== i ? 'opacity-40' : 'opacity-100'
            }`}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="font-bold text-xs text-foreground/90 truncate">{item.name}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-black text-foreground tabular-nums">{item.value}</span>
              <span className="text-[10px] text-muted ml-1.5 font-bold">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

