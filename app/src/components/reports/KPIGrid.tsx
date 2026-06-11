'use client'

import React from 'react'
import {
  PawPrint, Activity, Skull, Scale, Heart, Syringe,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react'
import type { AnimalData } from '@/hooks/useChartData'

interface KPICardData {
  label: string
  value: string | number
  sub: string
  icon: React.ReactNode
  color: string
  trend?: 'up' | 'down' | 'neutral'
}

interface KPIGridProps {
  data: AnimalData[]
}

export function KPIGrid({ data }: KPIGridProps) {
  const totalAnimals = data.length
  const activeCount = data.filter(a => a.status === 'activo').length
  const operativity = totalAnimals > 0 ? Math.round((activeCount / totalAnimals) * 100) : 0
  const machosCount = data.filter(a => a.sex?.toLowerCase() === 'macho').length
  const hembrasCount = data.filter(a => a.sex?.toLowerCase() === 'hembra').length
  const mixtosCount = data.filter(a => a.sex?.toLowerCase() === 'mixto').length

  const mortalityCount = data.filter(a =>
    a.status?.toLowerCase() === 'fallecido' || a.status?.toLowerCase() === 'muerto'
  ).length
  const mortalityRate = totalAnimals > 0 ? ((mortalityCount / totalAnimals) * 100).toFixed(1) : '0'

  const pregnantCount = data.filter(a =>
    a.sex?.toLowerCase() === 'hembra' && a.metadata?.estado_reproductivo?.toLowerCase() === 'preñada'
  ).length

  const totalWeight = data.reduce((sum, a) => sum + (a.weight_kg || a.weight || 0), 0)
  const weightText = totalWeight > 1000 ? `${(totalWeight / 1000).toFixed(1)}t` : `${totalWeight.toFixed(0)}kg`

  const vaccinatedCount = data.filter(a => a.metadata?.estado_vacunacion?.toLowerCase() === 'vacunado').length
  const vaccinationRate = totalAnimals > 0 ? Math.round((vaccinatedCount / totalAnimals) * 100) : 0

  const kpis: KPICardData[] = [
    {
      label: 'Población',
      value: totalAnimals,
      sub: 'Animales registrados',
      icon: <PawPrint className="w-4 h-4" />,
      color: '#16a34a',
      trend: 'up',
    },
    {
      label: 'Operatividad',
      value: `${operativity}%`,
      sub: `${activeCount} activos`,
      icon: <Activity className="w-4 h-4" />,
      color: operativity >= 70 ? '#16a34a' : operativity >= 40 ? '#d97706' : '#dc2626',
      trend: operativity >= 70 ? 'up' : operativity >= 40 ? 'neutral' : 'down',
    },
    {
      label: 'Género M/H/Mix',
      value: `${machosCount}/${hembrasCount}/${mixtosCount}`,
      sub: 'Distribución',
      icon: <Scale className="w-4 h-4" />,
      color: '#8b5cf6',
      trend: 'neutral',
    },
    {
      label: 'Mortalidad',
      value: `${mortalityRate}%`,
      sub: `${mortalityCount} fallecidos`,
      icon: <Skull className="w-4 h-4" />,
      color: mortalityCount > 0 ? '#dc2626' : '#16a34a',
      trend: mortalityCount > 0 ? 'down' : 'up',
    },
    {
      label: 'Preñadas',
      value: pregnantCount,
      sub: 'Hembras gestantes',
      icon: <Heart className="w-4 h-4" />,
      color: '#ec4899',
      trend: pregnantCount > 0 ? 'up' : 'neutral',
    },
    {
      label: 'Biomasa',
      value: weightText,
      sub: 'Peso total del hato',
      icon: <Scale className="w-4 h-4" />,
      color: '#14b8a6',
      trend: 'up',
    },
    {
      label: 'Vacunación',
      value: `${vaccinationRate}%`,
      sub: `${vaccinatedCount} vacunados`,
      icon: <Syringe className="w-4 h-4" />,
      color: vaccinationRate >= 70 ? '#16a34a' : vaccinationRate >= 40 ? '#d97706' : '#dc2626',
      trend: vaccinationRate >= 70 ? 'up' : 'down',
    },
  ]

  return (
    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 print:grid-cols-4 print:gap-2">
      {kpis.map((kpi, i) => (
        <KPICard key={kpi.label} kpi={kpi} delay={i * 60} />
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Individual KPI Card with animated counter
───────────────────────────────────────────── */

function KPICard({ kpi, delay }: { kpi: KPICardData; delay: number }) {
  const TrendIcon = kpi.trend === 'up' ? TrendingUp : kpi.trend === 'down' ? TrendingDown : Minus

  return (
    <div
      className="kpi-card bg-surface border border-border rounded-2xl p-3 sm:p-4 flex flex-col justify-between
        shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]
        print:break-inside-avoid print:shadow-none animate-fade-up min-w-0 overflow-hidden"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${kpi.color}15` }}
        >
          <span style={{ color: kpi.color }}>{kpi.icon}</span>
        </div>
        <TrendIcon
          className="w-3 h-3"
          style={{ color: kpi.trend === 'up' ? '#16a34a' : kpi.trend === 'down' ? '#dc2626' : '#6b7280' }}
        />
      </div>
      <div>
        <p
          className="text-lg sm:text-xl font-bold tabular-nums leading-none mb-0.5 break-all"
          style={{ color: kpi.color }}
        >
          {kpi.value}
        </p>
        <p className="text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-wider leading-tight">
          {kpi.label}
        </p>
        <p className="text-[9px] text-muted/70 leading-tight mt-0.5 hidden sm:block">{kpi.sub}</p>
      </div>
    </div>
  )
}
