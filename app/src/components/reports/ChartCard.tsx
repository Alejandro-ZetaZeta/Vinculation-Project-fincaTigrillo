'use client'

import React, { useState } from 'react'
import type { TimePeriod } from '@/hooks/useChartData'

const TIME_OPTIONS: { value: TimePeriod; label: string }[] = [
  { value: 'semana', label: 'S' },
  { value: 'mes', label: 'M' },
  { value: 'anio', label: 'A' },
  { value: 'todo', label: 'Todo' },
]

interface ChartCardProps {
  title: string
  icon: React.ReactNode
  children: (period: TimePeriod) => React.ReactNode
  className?: string
}

export function ChartCard({ title, icon, children, className = '' }: ChartCardProps) {
  const [period, setPeriod] = useState<TimePeriod>('todo')

  return (
    <div
      className={`chart-card group bg-surface border border-border rounded-2xl flex flex-col shadow-sm
        print:border print:border-border/50 print:shadow-none print:break-inside-avoid
        overflow-hidden min-w-0 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 sm:px-5 sm:pt-5">
        <div className="flex items-center gap-2 text-foreground/80 min-w-0">
          <span className="shrink-0 opacity-70">{icon}</span>
          <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider truncate">
            {title}
          </h3>
        </div>

        {/* Per-chart time filter pills */}
        <div className="flex items-center gap-0.5 bg-background/80 border border-border/60 rounded-lg p-0.5 no-print">
          {TIME_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all duration-200
                ${period === opt.value
                  ? 'bg-primary text-white shadow-sm scale-[1.02]'
                  : 'text-muted hover:text-foreground hover:bg-surface-hover'
                }`}
              title={
                opt.value === 'semana' ? 'Última semana' :
                opt.value === 'mes' ? 'Último mes' :
                opt.value === 'anio' ? 'Último año' : 'Todo el historial'
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart content — uses explicit pixel height wrapper so print gets dimensions */}
      <div className="px-2 pb-3 sm:px-3 sm:pb-4">
        {children(period)}
      </div>
    </div>
  )
}
