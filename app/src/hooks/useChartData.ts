'use client'

import { useMemo } from 'react'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
export interface AnimalData {
  id: string
  name?: string
  identification_code?: string
  type?: string
  category_name?: string
  animal_types?: { name: string }
  status?: string
  sex?: string
  acquisition_type?: string
  birth_date?: string
  weight?: number
  weight_kg?: number
  metadata?: {
    estado_vacunacion?: string
    estado_reproductivo?: string
  }
  created_at: string
}

export type TimePeriod = 'semana' | 'mes' | 'anio' | 'todo'

/* ─────────────────────────────────────────────
   Time filter helper
───────────────────────────────────────────── */
function getTimeThreshold(period: TimePeriod): Date | null {
  if (period === 'todo') return null
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'semana') {
    today.setDate(today.getDate() - 7)
    return today
  }
  if (period === 'mes') {
    today.setMonth(today.getMonth() - 1)
    return today
  }
  // anio
  today.setFullYear(today.getFullYear() - 1)
  return today
}

export function filterByTime(data: AnimalData[], period: TimePeriod): AnimalData[] {
  const threshold = getTimeThreshold(period)
  if (!threshold) return data
  return data.filter(a => {
    if (!a.created_at) return false
    return new Date(a.created_at) >= threshold
  })
}

/* ─────────────────────────────────────────────
   Species distribution (for treemap)
───────────────────────────────────────────── */
export interface SpeciesNode {
  name: string
  value: number
  percentage: number
}

export function useSpeciesData(data: AnimalData[], period: TimePeriod): SpeciesNode[] {
  return useMemo(() => {
    const filtered = filterByTime(data, period)
    const dist: Record<string, number> = {}
    filtered.forEach(a => {
      const label = a.animal_types?.name || a.category_name || a.type || 'Otros'
      dist[label] = (dist[label] || 0) + 1
    })
    const total = filtered.length || 1
    return Object.entries(dist)
      .map(([name, value]) => ({ name, value, percentage: Math.round((value / total) * 100) }))
      .sort((a, b) => b.value - a.value)
  }, [data, period])
}

/* ─────────────────────────────────────────────
   Vaccination distribution (for donut)
───────────────────────────────────────────── */
export interface VaccinationSlice {
  name: string
  value: number
  percentage: number
  color: string
}

const VACCINE_COLORS: Record<string, string> = {
  'Vacunados': '#16a34a',
  'No Vacunados': '#dc2626',
  'Programados': '#d97706',
  'Sin Registro': '#6b7280',
}

export function useVaccinationData(data: AnimalData[], period: TimePeriod): VaccinationSlice[] {
  return useMemo(() => {
    const filtered = filterByTime(data, period)
    const dist: Record<string, number> = { Vacunados: 0, 'No Vacunados': 0, Programados: 0, 'Sin Registro': 0 }
    filtered.forEach(a => {
      const estado = a.metadata?.estado_vacunacion?.toLowerCase()
      if (estado === 'vacunado') dist['Vacunados']++
      else if (estado === 'no vacunado') dist['No Vacunados']++
      else if (estado === 'programado') dist['Programados']++
      else dist['Sin Registro']++
    })
    const total = filtered.length || 1
    return Object.entries(dist)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value,
        percentage: Math.round((value / total) * 100),
        color: VACCINE_COLORS[name] || '#6b7280',
      }))
  }, [data, period])
}

/* ─────────────────────────────────────────────
   Operational gauge (active %)
───────────────────────────────────────────── */
export function useOperationalRate(data: AnimalData[], period: TimePeriod): number {
  return useMemo(() => {
    const filtered = filterByTime(data, period)
    if (filtered.length === 0) return 0
    const active = filtered.filter(a => a.status === 'activo').length
    return Math.round((active / filtered.length) * 100)
  }, [data, period])
}

/* ─────────────────────────────────────────────
   Registrations over time (for line chart)
───────────────────────────────────────────── */
export interface TimePoint {
  label: string
  count: number
  date: string
}

export function useRegistrationsData(data: AnimalData[], period: TimePeriod): TimePoint[] {
  return useMemo(() => {
    const filtered = filterByTime(data, period)
    if (filtered.length === 0) return []

    const sorted = [...filtered].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    // Bucket by appropriate interval
    const buckets: Record<string, { count: number; date: string }> = {}

    sorted.forEach(a => {
      const d = new Date(a.created_at)
      let key: string
      if (period === 'semana') {
        key = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
      } else if (period === 'mes') {
        // Group by week
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        key = weekStart.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
      } else if (period === 'anio') {
        key = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
      } else {
        // 'todo' — group by month
        key = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
      }
      if (!buckets[key]) buckets[key] = { count: 0, date: d.toISOString() }
      buckets[key].count++
    })

    return Object.entries(buckets).map(([label, { count, date }]) => ({ label, count, date }))
  }, [data, period])
}

/* ─────────────────────────────────────────────
   Gender distribution (for horizontal bar)
───────────────────────────────────────────── */
export interface GenderSlice {
  name: string
  value: number
  percentage: number
  color: string
}

const GENDER_COLORS: Record<string, string> = {
  Machos: '#3b82f6',
  Hembras: '#ec4899',
  Mixtos: '#8b5cf6',
  'Sin definir': '#6b7280',
}

export function useGenderData(data: AnimalData[], period: TimePeriod): GenderSlice[] {
  return useMemo(() => {
    const filtered = filterByTime(data, period)
    const dist: Record<string, number> = { Machos: 0, Hembras: 0, Mixtos: 0, 'Sin definir': 0 }
    filtered.forEach(a => {
      const s = a.sex?.toLowerCase() || ''
      if (s === 'macho') dist['Machos']++
      else if (s === 'hembra') dist['Hembras']++
      else if (s === 'mixto') dist['Mixtos']++
      else dist['Sin definir']++
    })
    const total = filtered.length || 1
    return Object.entries(dist)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({
        name,
        value,
        percentage: Math.round((value / total) * 100),
        color: GENDER_COLORS[name] || '#6b7280',
      }))
  }, [data, period])
}

/* ─────────────────────────────────────────────
   Weight / Biomass trends (for area chart)
───────────────────────────────────────────── */
export interface WeightPoint {
  label: string
  avgWeight: number
  totalBiomass: number
  count: number
}

export function useWeightData(data: AnimalData[], period: TimePeriod): WeightPoint[] {
  return useMemo(() => {
    const filtered = filterByTime(data, period).filter(a => (a.weight_kg || a.weight || 0) > 0)
    if (filtered.length === 0) return []

    const sorted = [...filtered].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )

    const buckets: Record<string, { weights: number[]; date: string }> = {}
    sorted.forEach(a => {
      const d = new Date(a.created_at)
      let key: string
      if (period === 'semana') {
        key = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
      } else if (period === 'mes') {
        const weekStart = new Date(d)
        weekStart.setDate(d.getDate() - d.getDay())
        key = weekStart.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
      } else {
        key = d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' })
      }
      if (!buckets[key]) buckets[key] = { weights: [], date: d.toISOString() }
      buckets[key].weights.push(a.weight_kg || a.weight || 0)
    })

    return Object.entries(buckets).map(([label, { weights }]) => ({
      label,
      avgWeight: Math.round(weights.reduce((s, w) => s + w, 0) / weights.length),
      totalBiomass: Math.round(weights.reduce((s, w) => s + w, 0)),
      count: weights.length,
    }))
  }, [data, period])
}
