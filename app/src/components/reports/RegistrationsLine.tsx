'use client'

import React from 'react'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts'
import type { TimePoint } from '@/hooks/useChartData'

interface RegistrationsLineProps {
  data: TimePoint[]
}

export function RegistrationsLine({ data }: RegistrationsLineProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted italic text-sm">
        Sin registros en este período
      </div>
    )
  }

  const maxCount = Math.max(...data.map(d => d.count))

  return (
    <div className="w-full h-full" style={{ minHeight: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <defs>
            <linearGradient id="registrationsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
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
            domain={[0, Math.max(maxCount + 1, 5)]}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.[0]) return null
              return (
                <div className="bg-surface border border-border rounded-xl px-3 py-2 shadow-lg text-xs">
                  <p className="font-bold text-foreground">{label}</p>
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
            fill="url(#registrationsGradient)"
            dot={{ r: 4, fill: 'var(--primary)', strokeWidth: 2, stroke: 'var(--surface)' }}
            activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--surface)', strokeWidth: 3 }}
            animationBegin={0}
            animationDuration={1000}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
