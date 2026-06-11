'use client'

import React, { useEffect, useState } from 'react'

interface OperationalGaugeProps {
  value: number // 0-100
}

export function OperationalGauge({ value }: OperationalGaugeProps) {
  const [animatedValue, setAnimatedValue] = useState(0)

  useEffect(() => {
    // Animate the needle
    const timer = setTimeout(() => setAnimatedValue(value), 100)
    return () => clearTimeout(timer)
  }, [value])

  const cx = 150
  const cy = 140
  const r = 100
  const strokeW = 18

  // Arc helpers
  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    }
  }

  const describeArc = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(endAngle)
    const end = polarToCartesian(startAngle)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`
  }

  // Gauge spans from 180° to 360° (left to right semicircle)
  const startAngle = 180
  const endAngle = 360

  // Color zones
  const zones = [
    { start: 180, end: 252, color: '#dc2626' },   // 0-40% red
    { start: 252, end: 306, color: '#d97706' },    // 40-70% yellow
    { start: 306, end: 360, color: '#16a34a' },    // 70-100% green
  ]

  // Needle angle
  const needleAngle = startAngle + (animatedValue / 100) * (endAngle - startAngle)
  const needleEnd = polarToCartesian(needleAngle)
  const needleLen = r - 20

  const needleTip = {
    x: cx + needleLen * Math.cos((needleAngle * Math.PI) / 180),
    y: cy + needleLen * Math.sin((needleAngle * Math.PI) / 180),
  }

  // Color based on value
  const valueColor = value >= 70 ? '#16a34a' : value >= 40 ? '#d97706' : '#dc2626'
  const statusLabel = value >= 70 ? 'Óptimo' : value >= 40 ? 'Moderado' : 'Crítico'

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      <svg viewBox="0 0 300 180" className="w-full max-w-[280px]" preserveAspectRatio="xMidYMid meet">
        {/* Background track */}
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* Color zones */}
        {zones.map((zone, i) => (
          <path
            key={i}
            d={describeArc(zone.start, zone.end)}
            fill="none"
            stroke={zone.color}
            strokeWidth={strokeW}
            strokeLinecap="round"
            opacity={0.2}
          />
        ))}

        {/* Active arc (filled up to current value) */}
        {animatedValue > 0 && (
          <path
            d={describeArc(startAngle, needleAngle)}
            fill="none"
            stroke={valueColor}
            strokeWidth={strokeW}
            strokeLinecap="round"
            className="gauge-arc-animate"
            style={{
              filter: `drop-shadow(0 0 6px ${valueColor}40)`,
            }}
          />
        )}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="var(--foreground)"
          strokeWidth={2.5}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{
            transformOrigin: `${cx}px ${cy}px`,
          }}
        />

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={6} fill="var(--foreground)" />
        <circle cx={cx} cy={cy} r={3} fill="var(--surface)" />

        {/* Scale labels */}
        <text x={50} y={165} textAnchor="middle" fill="var(--muted)" fontSize={10} fontWeight="600">0%</text>
        <text x={cx} y={30} textAnchor="middle" fill="var(--muted)" fontSize={10} fontWeight="600">50%</text>
        <text x={250} y={165} textAnchor="middle" fill="var(--muted)" fontSize={10} fontWeight="600">100%</text>

        {/* Tick marks */}
        {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(tick => {
          const tickAngle = startAngle + (tick / 100) * (endAngle - startAngle)
          const outerR = r + strokeW / 2 + 3
          const innerR = r + strokeW / 2 - 1
          const outer = {
            x: cx + outerR * Math.cos((tickAngle * Math.PI) / 180),
            y: cy + outerR * Math.sin((tickAngle * Math.PI) / 180),
          }
          const inner = {
            x: cx + innerR * Math.cos((tickAngle * Math.PI) / 180),
            y: cy + innerR * Math.sin((tickAngle * Math.PI) / 180),
          }
          return (
            <line
              key={tick}
              x1={outer.x} y1={outer.y}
              x2={inner.x} y2={inner.y}
              stroke="var(--muted)"
              strokeWidth={tick % 50 === 0 ? 2 : 1}
              opacity={0.4}
            />
          )
        })}
      </svg>

      {/* Value display */}
      <div className="flex flex-col items-center -mt-4">
        <span
          className="text-3xl sm:text-4xl font-bold tabular-nums transition-colors duration-500"
          style={{ color: valueColor }}
        >
          {animatedValue}%
        </span>
        <span
          className="text-xs font-bold uppercase tracking-wider mt-0.5 transition-colors duration-500"
          style={{ color: valueColor }}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  )
}
