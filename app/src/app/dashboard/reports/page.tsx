'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Printer, Bot, ChevronDown, ChevronRight, AlertTriangle,
  CheckCircle, TrendingUp, TrendingDown, Minus,
  PawPrint, Activity, Skull, Scale, Heart, Syringe,
  TreePine, ShieldCheck, Gauge, LineChart as LineChartIcon,
  BarChart3, Sparkles, Loader2, WifiOff, Clock, Info,
  Filter, Calendar, Eye, EyeOff,
} from 'lucide-react'

import { ChartCard } from '@/components/reports/ChartCard'
import { SpeciesTreemap } from '@/components/reports/SpeciesTreemap'
import { VaccinationDonut } from '@/components/reports/VaccinationDonut'
import { OperationalGauge } from '@/components/reports/OperationalGauge'
import { RegistrationsLine } from '@/components/reports/RegistrationsLine'
import { GenderBarChart } from '@/components/reports/GenderBarChart'
import { WeightAreaChart } from '@/components/reports/WeightAreaChart'
import { AIStatusIndicator, type AIStatus } from '@/components/reports/AIStatusIndicator'

import {
  type AnimalData, type TimePeriod,
  useSpeciesData, useVaccinationData, useOperationalRate,
  useRegistrationsData, useGenderData, useWeightData,
} from '@/hooks/useChartData'

/* ─────────────────────────────────────────────
   Tipos
───────────────────────────────────────────── */
interface AIAnalysis {
  summary: string
  insights: { icon: string; title: string; detail: string }[]
  recommendations: { priority: string; action: string; reason: string }[]
  kpis: { label: string; value: string; trend: string; note: string }[]
}

/* ─────────────────────────────────────────────
   Página Principal
───────────────────────────────────────────── */
export default function ReportsPage() {
  const [animals, setAnimals] = useState<AnimalData[]>([])
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [filterModule, setFilterModule] = useState('todos')
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  const [pdfMsg, setPdfMsg] = useState('')
  const [printPreview, setPrintPreview] = useState(false)
  const [userRole, setUserRole] = useState<string>('viewer')

  // IA
  const [aiStatus, setAiStatus] = useState<AIStatus>('idle')
  const [aiStartTime, setAiStartTime] = useState<number | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showAi, setShowAi] = useState(false)

  // Secciones colapsables
  const [openSections, setOpenSections] = useState({
    inventario: true,
    sanidad: true,
    actividad: true,
    productividad: true,
    alertas: true,
    desglose: true,
  })

  useEffect(() => {
    setIsMounted(true)
    fetch('/api/animals?status=all')
      .then(r => r.ok ? r.json() : [])
      .then(d => setAnimals(Array.isArray(d) ? d : []))
      .catch(() => setAnimals([]))
      .finally(() => setLoading(false))

    // Fetch user role from API
    fetch('/api/auth/role')
      .then(r => r.ok ? r.json() : { role: 'viewer' })
      .then(d => setUserRole(d.role || 'viewer'))
      .catch(() => setUserRole('viewer'))
  }, [])

  /* Filtrado global */
  const filtered = (() => {
    const now = new Date()
    const cutoffs: Record<string, Date> = {
      semana: new Date(now.getTime() - 7 * 86400000),
      mes: new Date(now.getTime() - 30 * 86400000),
      anio: new Date(now.getTime() - 365 * 86400000),
    }
    return animals.filter(a => {
      const cat = a.animal_types?.name || a.category_name || a.type || 'Otros'
      if (filterModule !== 'todos' && cat !== filterModule) return false
      if (filterPeriod !== 'all' && a.created_at) {
        const d = new Date(a.created_at)
        if (d < cutoffs[filterPeriod]) return false
      }
      return true
    })
  })()

  /* KPIs calculados */
  const totalAnimals = filtered.length
  const activeCount = filtered.filter(a => a.status === 'activo').length
  const operativity = totalAnimals > 0 ? Math.round((activeCount / totalAnimals) * 100) : 0
  const vaccinatedCount = filtered.filter(a => a.metadata?.estado_vacunacion?.toLowerCase() === 'vacunado').length
  const vaccinationRate = totalAnimals > 0 ? Math.round((vaccinatedCount / totalAnimals) * 100) : 0
  const pendingVaccine = filtered.filter(a =>
    !a.metadata?.estado_vacunacion || ['no vacunado', 'programado', 'sin registro'].includes(a.metadata.estado_vacunacion.toLowerCase())
  )
  const mortalityCount = filtered.filter(a => ['fallecido', 'muerto'].includes(a.status?.toLowerCase() || '')).length
  const mortalityRate = totalAnimals > 0 ? ((mortalityCount / totalAnimals) * 100).toFixed(1) : '0'
  const pregnantCount = filtered.filter(a =>
    a.sex?.toLowerCase() === 'hembra' && a.metadata?.estado_reproductivo?.toLowerCase() === 'preñada'
  ).length
  const hembrasActive = filtered.filter(a => a.sex?.toLowerCase() === 'hembra' && a.status === 'activo').length
  const pregnancyRate = hembrasActive > 0 ? Math.round((pregnantCount / hembrasActive) * 100) : 0
  const totalBiomass = filtered.reduce((s, a) => s + (a.weight_kg || a.weight || 0), 0)
  const avgWeight = activeCount > 0
    ? Math.round(filtered.filter(a => a.status === 'activo').reduce((s, a) => s + (a.weight_kg || a.weight || 0), 0) / activeCount)
    : 0
  const machos = filtered.filter(a => a.sex?.toLowerCase() === 'macho').length
  const hembras = filtered.filter(a => a.sex?.toLowerCase() === 'hembra').length
  const uniqueSpecies = Array.from(new Set(animals.map(a => a.animal_types?.name || a.category_name || a.type || 'Otros'))).filter(Boolean)

  const toggleSection = (key: keyof typeof openSections) =>
    setOpenSections(s => ({ ...s, [key]: !s[key] }))

  /* IA */
  async function requestAI() {
    setAiStatus('loading')
    setAiStartTime(Date.now())
    setAiError(null)
    setAiAnalysis(null)
    setShowAi(true)
    try {
      const res = await fetch('/api/reports/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportType: 'general', focusModule: filterModule, period: filterPeriod }),
      })
      const json = await res.json()
      if (!res.ok) { setAiError(json.error || 'Error'); setAiStatus('error'); return }
      setAiAnalysis(json.analysis)
      setAiStatus('success')
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : 'Error de red')
      setAiStatus('error')
    } finally {
      setAiStartTime(null)
    }
  }

  /* PDF */
  async function generatePDF() {
    setPdfMsg('Generando PDF…')
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()
      const H = doc.internal.pageSize.getHeight()
      const m = 14
      const date = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
      let y = 0

      // Cabecera
      doc.setFillColor(15, 61, 46)
      doc.rect(0, 0, W, 30, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18); doc.setFont('helvetica', 'bold')
      doc.text('Finca Tigrillo', m, 12)
      doc.setFontSize(9); doc.setFont('helvetica', 'normal')
      doc.text('Informe Operativo Ganadero · Sistema de Gestión Pecuaria', m, 19)
      doc.text(date, W - m, 19, { align: 'right' })
      y = 38

      // Resumen KPIs
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 61, 46)
      doc.text('Resumen Ejecutivo', m, y); y += 3
      autoTable(doc, {
        startY: y,
        head: [['Indicador', 'Valor', 'Indicador', 'Valor']],
        body: [
          ['Total Animales', String(totalAnimals), 'Operatividad', `${operativity}%`],
          ['Activos', String(activeCount), 'Vacunación', `${vaccinationRate}%`],
          ['Mortalidad', `${mortalityRate}%`, 'Biomasa Total', totalBiomass > 1000 ? `${(totalBiomass / 1000).toFixed(1)}t` : `${totalBiomass}kg`],
          ['Gestantes', String(pregnantCount), 'Peso Prom.', `${avgWeight}kg`],
          ['Alertas Sanitarias', String(pendingVaccine.length), 'Machos/Hembras', `${machos}/${hembras}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [15, 61, 46] as [number, number, number], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [240, 253, 244] as [number, number, number], cellWidth: 50 },
          2: { fontStyle: 'bold', fillColor: [240, 253, 244] as [number, number, number], cellWidth: 50 },
        },
        margin: { left: m, right: m },
      })
      y = (doc as any).lastAutoTable.finalY + 10

      // Distribución por especie
      const specDist: Record<string, { total: number; active: number; biomass: number }> = {}
      filtered.forEach(a => {
        const k = a.animal_types?.name || a.category_name || a.type || 'Otros'
        if (!specDist[k]) specDist[k] = { total: 0, active: 0, biomass: 0 }
        specDist[k].total++
        if (a.status === 'activo') specDist[k].active++
        specDist[k].biomass += a.weight_kg || a.weight || 0
      })
      if (Object.keys(specDist).length > 0) {
        if (y > 210) { doc.addPage(); y = 20 }
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 61, 46)
        doc.text('Distribución por Especie', m, y); y += 3
        autoTable(doc, {
          startY: y,
          head: [['Especie', 'Total', 'Activos', '% Inventario', 'Biomasa (kg)']],
          body: Object.entries(specDist).sort((a, b) => b[1].total - a[1].total).map(([k, v]) => [
            k, String(v.total), String(v.active),
            totalAnimals > 0 ? `${((v.total / totalAnimals) * 100).toFixed(1)}%` : '0%',
            v.biomass > 0 ? v.biomass.toFixed(0) : '—',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [15, 61, 46] as [number, number, number], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: m, right: m },
        })
        y = (doc as any).lastAutoTable.finalY + 10
      }

      // Alertas sanitarias
      if (pendingVaccine.length > 0) {
        if (y > 200) { doc.addPage(); y = 20 }
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(220, 38, 38)
        doc.text(`Alertas Sanitarias — ${pendingVaccine.length} Sin Vacunación`, m, y); y += 3
        autoTable(doc, {
          startY: y,
          head: [['Código', 'Nombre', 'Especie', 'Estado Vacuna', 'Estado Animal']],
          body: pendingVaccine.slice(0, 25).map(a => [
            a.identification_code || '—', a.name || '—',
            a.animal_types?.name || '—',
            a.metadata?.estado_vacunacion || 'Sin Registro',
            a.status || '—',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [220, 38, 38] as [number, number, number], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 7.5 },
          margin: { left: m, right: m },
        })
        y = (doc as any).lastAutoTable.finalY + 10
      }

      // Inventario
      if (y > 200) { doc.addPage(); y = 20 }
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 61, 46)
      doc.text(`Inventario (${Math.min(filtered.length, 60)} de ${filtered.length})`, m, y); y += 3
      autoTable(doc, {
        startY: y,
        head: [['Código', 'Nombre', 'Especie', 'Sexo', 'Estado', 'Vacuna', 'Peso (kg)']],
        body: filtered.slice(0, 60).map(a => [
          a.identification_code || '—', a.name || '—',
          a.animal_types?.name || '—', a.sex || '—', a.status || '—',
          a.metadata?.estado_vacunacion || '—',
          (a.weight_kg || a.weight || 0) > 0 ? String(a.weight_kg || a.weight) : '—',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [15, 61, 46] as [number, number, number], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        margin: { left: m, right: m },
      })

      // Pie de página
      const pages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i)
        doc.setFillColor(15, 61, 46)
        doc.rect(0, H - 8, W, 8, 'F')
        doc.setFontSize(6.5); doc.setTextColor(255, 255, 255)
        doc.text(`Finca Tigrillo · ${date} · Pág. ${i} de ${pages}`, W / 2, H - 2.5, { align: 'center' })
      }

      const filename = `Reporte-FincaTigrillo-${new Date().toISOString().split('T')[0]}.pdf`
      if (Capacitor.isNativePlatform()) {
        const b64 = doc.output('datauristring').split(',')[1]
        await Filesystem.writeFile({ path: `Download/${filename}`, data: b64, directory: Directory.ExternalStorage, recursive: true })
        setPdfMsg('✅ Guardado en Descargas')
      } else {
        doc.save(filename)
        setPdfMsg('')
      }
    } catch (e: any) {
      setPdfMsg(`Error: ${e?.message ?? 'desconocido'}`)
    }
    setTimeout(() => setPdfMsg(''), 5000)
  }

  function handlePrint() {
    if (Capacitor.isNativePlatform()) {
      generatePDF()
    } else {
      window.print()
    }
  }

  if (!isMounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted">Cargando datos de la finca…</p>
      </div>
    )
  }

  return (
    <div className={`min-h-screen w-full overflow-x-hidden ${printPreview ? 'bg-white text-gray-900' : ''}`}>
      {printPreview && (
        <div className="no-print bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 flex items-center justify-between text-xs sm:text-sm text-amber-800 dark:text-amber-300 font-medium">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Estás viendo la <strong>Vista Previa de Impresión</strong>. Las secciones colapsadas se muestran abiertas y los gráficos se adaptan al tamaño de impresión.</span>
          </div>
          <button onClick={() => setPrintPreview(false)} className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition-colors shrink-0">
            Salir de Vista Previa
          </button>
        </div>
      )}

      <div className={`max-w-[1400px] mx-auto px-3 sm:px-6 py-6 space-y-8 ${printPreview ? 'px-0 py-0 space-y-6' : 'print:px-0 print:py-0 print:space-y-6'}`}>

        {/* ══════════════════════════════════════════
            ENCABEZADO DEL REPORTE
        ══════════════════════════════════════════ */}
        <header className={`no-print ${printPreview ? 'hidden' : ''}`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                Informes <span className="text-primary">&amp; Analítica</span>
              </h1>
              <p className="text-sm text-muted mt-1">
                Reporte operativo ganadero ·{' '}
                <span className="font-semibold text-foreground">{totalAnimals}</span> animales en base de datos
              </p>
            </div>

            {/* Botones principales */}
            <div className="flex flex-wrap gap-2.5">
              {userRole !== 'viewer' && (
                <button onClick={() => requestAI()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm
                    bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-md
                    hover:shadow-lg hover:scale-[1.02] transition-all">
                  <Bot className="w-4 h-4" />
                  Reporte con IA
                </button>
              )}
              {userRole === 'admin' && (
                <button onClick={() => setPrintPreview(!printPreview)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all hover:scale-[1.02] ${
                    printPreview
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-surface border border-border text-foreground hover:bg-surface-hover'
                  }`}>
                  <Eye className="w-4 h-4" />
                  Vista Previa
                </button>
              )}
              <button onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm
                  bg-foreground text-background shadow-md hover:shadow-lg hover:scale-[1.02] transition-all">
                <Printer className="w-4 h-4" />
                {pdfMsg === 'Generando PDF…' ? 'Generando…' : 'Imprimir / PDF'}
              </button>
            </div>
          </div>

          {pdfMsg && (
            <p className={`text-xs mt-2 font-medium ${pdfMsg.startsWith('✅') ? 'text-primary' : 'text-red-500'}`}>
              {pdfMsg}
            </p>
          )}

          {/* Filtros */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5
                bg-surface border border-border rounded-lg hover:bg-surface-hover transition-colors">
              <Filter className="w-3 h-3" />
              Filtros
              {(filterModule !== 'todos' || filterPeriod !== 'all') && (
                <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">●</span>
              )}
            </button>

            {/* Pills de período */}
            {(['all', 'semana', 'mes', 'anio'] as const).map(p => (
              <button key={p}
                onClick={() => setFilterPeriod(p)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  filterPeriod === p
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface border border-border text-muted hover:text-foreground'
                }`}>
                {p === 'all' ? 'Histórico' : p === 'semana' ? '7 días' : p === 'mes' ? '30 días' : '1 año'}
              </button>
            ))}
          </div>

          {showFilters && (
            <div className="mt-3 p-4 bg-surface border border-border rounded-2xl animate-fade-in">
              <label className="text-[10px] font-bold text-muted uppercase block mb-1.5">Tipo de animal</label>
              <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
                className="w-full sm:w-64 p-2 bg-background border border-border rounded-xl text-sm outline-none">
                <option value="todos">Todas las especies</option>
                {uniqueSpecies.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
        </header>

        {/* Encabezado de impresión */}
        <div className={`hidden ${printPreview ? 'flex border-b-2 border-gray-300 pb-4 mb-6 text-gray-900' : 'print:flex'} items-center justify-between border-b-2 border-border pb-4 mb-6`}>
          <div>
            <h1 className="text-xl font-black">Finca Tigrillo</h1>
            <p className="text-xs text-muted font-bold uppercase tracking-wider">Reporte Operativo Ganadero</p>
          </div>
          <div className="text-right text-xs text-muted">
            <p>{new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            <p className="mt-1">{totalAnimals} animales · {activeCount} activos</p>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            PANEL IA
        ══════════════════════════════════════════ */}
        {showAi && (
          <section className="no-print bg-surface border border-violet-200 dark:border-violet-800/30
            rounded-2xl overflow-hidden shadow-sm animate-fade-in">
            <div className="flex items-center justify-between p-4 border-b border-border
              bg-gradient-to-r from-violet-600/8 to-indigo-500/5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-500
                  flex items-center justify-center">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-bold text-sm">Análisis con Inteligencia Artificial</span>
              </div>
              <button onClick={() => setShowAi(false)}
                className="text-muted hover:text-foreground text-sm px-2 py-1">✕</button>
            </div>
            <div className="p-5">
              <AIStatusIndicator status={aiStatus} error={aiError} startTime={aiStartTime} />
              {aiAnalysis && aiStatus === 'success' && <AIResult analysis={aiAnalysis} />}
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════
            KPI STRIP — RESUMEN EJECUTIVO
        ══════════════════════════════════════════ */}
        <section>
          <SectionTitle icon={<Activity className="w-4 h-4" />} title="Resumen Ejecutivo del Hato" />
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 print:grid-cols-4 print:gap-2 mt-4">
            <KPICard label="Población" value={totalAnimals} sub={`${activeCount} activos`}
              icon={<PawPrint className="w-4 h-4" />} color="#16a34a"
              trend="up" progress={(activeCount / Math.max(totalAnimals, 1)) * 100} />
            <KPICard label="Operatividad" value={`${operativity}%`} sub={`${activeCount} animales`}
              icon={<Activity className="w-4 h-4" />}
              color={operativity >= 70 ? '#16a34a' : operativity >= 40 ? '#d97706' : '#dc2626'}
              trend={operativity >= 70 ? 'up' : 'down'} progress={operativity} />
            <KPICard label="M/H/Mix" value={`${machos}/${hembras}`} sub="Machos / Hembras"
              icon={<Scale className="w-4 h-4" />} color="#8b5cf6" trend="neutral"
              progress={totalAnimals > 0 ? (hembras / totalAnimals) * 100 : 0} />
            <KPICard label="Mortalidad" value={`${mortalityRate}%`} sub={`${mortalityCount} fallecidos`}
              icon={<Skull className="w-4 h-4" />}
              color={mortalityCount > 0 ? '#dc2626' : '#16a34a'}
              trend={mortalityCount > 0 ? 'down' : 'up'}
              progress={parseFloat(mortalityRate)} />
            <KPICard label="Gestación" value={pregnantCount} sub={`${pregnancyRate}% hembras`}
              icon={<Heart className="w-4 h-4" />} color="#ec4899"
              trend={pregnantCount > 0 ? 'up' : 'neutral'} progress={pregnancyRate} />
            <KPICard label="Biomasa"
              value={totalBiomass >= 1000 ? `${(totalBiomass / 1000).toFixed(1)}t` : `${totalBiomass}kg`}
              sub={`~${avgWeight}kg prom.`}
              icon={<Scale className="w-4 h-4" />} color="#14b8a6" trend="up"
              progress={Math.min(100, avgWeight / 5)} />
            <KPICard label="Vacunación" value={`${vaccinationRate}%`} sub={`${vaccinatedCount} vacunados`}
              icon={<Syringe className="w-4 h-4" />}
              color={vaccinationRate >= 70 ? '#16a34a' : vaccinationRate >= 40 ? '#d97706' : '#dc2626'}
              trend={vaccinationRate >= 70 ? 'up' : 'down'} progress={vaccinationRate} />
          </div>
        </section>

        {/* ══════════════════════════════════════════
            SECCIÓN 1 — INVENTARIO Y COMPOSICIÓN
        ══════════════════════════════════════════ */}
        <Section
          id="inventario"
          icon={<TreePine className="w-4 h-4" />}
          title="Inventario y Composición del Hato"
          subtitle="Distribución por especie y género de todos los animales registrados"
          isOpen={openSections.inventario}
          onToggle={() => toggleSection('inventario')}
          printPreview={printPreview}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 print:grid-cols-2 print:gap-4">
            <ChartCard title="Distribución por Especie" icon={<TreePine className="w-4 h-4" />} className="print:col-span-2">
              {(period) => <SpeciesWrapper data={filtered} period={period} isPrint={printPreview} />}
            </ChartCard>
            <ChartCard title="Composición por Género" icon={<BarChart3 className="w-4 h-4" />}>
              {(period) => <GenderWrapper data={filtered} period={period} isPrint={printPreview} />}
            </ChartCard>
            <ChartCard title="Operatividad General" icon={<Gauge className="w-4 h-4" />}>
              {(period) => <GaugeWrapper data={filtered} period={period} />}
            </ChartCard>
          </div>

          {/* Tabla resumen por especie */}
          <div className="mt-5 overflow-x-auto print:overflow-visible print:break-before-page print:mt-6">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-muted uppercase text-[9px] sm:text-[10px] tracking-wider font-bold">
                  <th className="py-2.5 px-3">Especie</th>
                  <th className="py-2.5 px-3 text-center">Total</th>
                  <th className="py-2.5 px-3 text-center">Activos</th>
                  <th className="py-2.5 px-3 text-center">Machos</th>
                  <th className="py-2.5 px-3 text-center">Hembras</th>
                  <th className="py-2.5 px-3 text-center">% Inventario</th>
                  <th className="py-2.5 px-3 text-right hidden sm:table-cell">Biomasa</th>
                </tr>
              </thead>
              <tbody>
                {uniqueSpecies.map(sp => {
                  const items = filtered.filter(a => (a.animal_types?.name || a.category_name || a.type || 'Otros') === sp)
                  if (!items.length) return null
                  const act = items.filter(a => a.status === 'activo').length
                  const m = items.filter(a => a.sex?.toLowerCase() === 'macho').length
                  const h = items.filter(a => a.sex?.toLowerCase() === 'hembra').length
                  const bio = items.reduce((s, a) => s + (a.weight_kg || a.weight || 0), 0)
                  const pct = totalAnimals > 0 ? ((items.length / totalAnimals) * 100).toFixed(1) : '0'
                  return (
                    <tr key={sp} className="border-b border-border/40 hover:bg-surface-hover transition-colors">
                      <td className="py-2.5 px-3 font-semibold">{sp}</td>
                      <td className="py-2.5 px-3 text-center font-bold tabular-nums">{items.length}</td>
                      <td className="py-2.5 px-3 text-center text-green-600 font-bold">{act}</td>
                      <td className="py-2.5 px-3 text-center text-blue-500 font-medium">{m}</td>
                      <td className="py-2.5 px-3 text-center text-pink-500 font-medium">{h}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-black text-primary">{pct}%</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-muted hidden sm:table-cell">
                        {bio > 0 ? (bio >= 1000 ? `${(bio / 1000).toFixed(2)}t` : `${bio.toFixed(0)}kg`) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-primary/5 border-t-2 border-primary/20 font-bold">
                  <td className="py-2.5 px-3 text-primary uppercase text-[10px] tracking-wider">TOTAL</td>
                  <td className="py-2.5 px-3 text-center">{totalAnimals}</td>
                  <td className="py-2.5 px-3 text-center text-green-600">{activeCount}</td>
                  <td className="py-2.5 px-3 text-center text-blue-500">{machos}</td>
                  <td className="py-2.5 px-3 text-center text-pink-500">{hembras}</td>
                  <td className="py-2.5 px-3 text-center text-primary">100%</td>
                  <td className="py-2.5 px-3 text-right font-mono hidden sm:table-cell">
                    {totalBiomass >= 1000 ? `${(totalBiomass / 1000).toFixed(2)}t` : `${totalBiomass.toFixed(0)}kg`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Section>

        {/* ══════════════════════════════════════════
            SECCIÓN 2 — ACTIVIDAD EN EL TIEMPO
        ══════════════════════════════════════════ */}
        <Section
          id="actividad"
          icon={<LineChartIcon className="w-4 h-4" />}
          title="Actividad y Registros en el Tiempo"
          subtitle="Tendencia de ingresos y movimientos del hato por período"
          isOpen={openSections.actividad}
          onToggle={() => toggleSection('actividad')}
          printPreview={printPreview}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 print:grid-cols-1">
            <ChartCard title="Registros en el Tiempo" icon={<LineChartIcon className="w-4 h-4" />}>
              {(period) => <RegistrationsWrapper data={filtered} period={period} />}
            </ChartCard>

            {/* Últimos registros */}
            <div className="bg-background border border-border rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted" />
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground/80">
                  Últimos 8 Ingresos
                </h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-border text-muted uppercase text-[9px] tracking-wider">
                      <th className="py-2 px-3">Código</th>
                      <th className="py-2 px-3 hidden sm:table-cell">Especie</th>
                      <th className="py-2 px-3 text-center">Estado</th>
                      <th className="py-2 px-3 text-right">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered
                      .slice()
                      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                      .slice(0, 8)
                      .map(a => (
                        <tr key={a.id} className="border-b border-border/30 hover:bg-surface-hover">
                          <td className="py-2 px-3 font-medium">{a.identification_code || a.name || 'Sin ID'}</td>
                          <td className="py-2 px-3 text-muted hidden sm:table-cell">{a.animal_types?.name || '—'}</td>
                          <td className="py-2 px-3 text-center">
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                              a.status === 'activo' ? 'bg-green-500/10 text-green-600' : 'bg-muted/10 text-muted'
                            }`}>{a.status}</span>
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-muted text-[10px]">
                            {new Date(a.created_at).toLocaleDateString('es-CO')}
                          </td>
                        </tr>
                      ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={4} className="py-6 text-center text-muted italic">Sin registros</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Section>

        {/* ══════════════════════════════════════════
            SECCIÓN 3 — SANIDAD Y VACUNACIÓN
        ══════════════════════════════════════════ */}
        <Section
          id="sanidad"
          icon={<ShieldCheck className="w-4 h-4" />}
          title="Sanidad y Programa Vacunal"
          subtitle="Estado del plan sanitario y cobertura de vacunación del hato"
          isOpen={openSections.sanidad}
          onToggle={() => toggleSection('sanidad')}
          printPreview={printPreview}
          className="print:break-before-page print:mt-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 print:grid-cols-2">
            <ChartCard title="Cobertura de Vacunación" icon={<Syringe className="w-4 h-4" />}>
              {(period) => <VaccinationWrapper data={filtered} period={period} />}
            </ChartCard>

            {/* Indicadores sanitarios */}
            <div className="space-y-3">
              <SanitaryIndicator
                label="Cobertura Vacunal"
                value={vaccinationRate}
                max={100}
                color={vaccinationRate >= 70 ? '#16a34a' : vaccinationRate >= 40 ? '#d97706' : '#dc2626'}
                note={vaccinationRate >= 70 ? 'Cobertura óptima' : vaccinationRate >= 40 ? 'Cobertura media' : 'Cobertura crítica'}
              />
              <SanitaryIndicator
                label="Operatividad del Hato"
                value={operativity}
                max={100}
                color={operativity >= 70 ? '#16a34a' : '#d97706'}
                note={`${activeCount} animales activos`}
              />
              <SanitaryIndicator
                label="Tasa de Mortalidad"
                value={parseFloat(mortalityRate)}
                max={20}
                color={mortalityCount === 0 ? '#16a34a' : parseFloat(mortalityRate) < 5 ? '#d97706' : '#dc2626'}
                note={mortalityCount === 0 ? 'Sin mortalidad' : `${mortalityCount} fallecido(s)`}
                invert
              />
              <SanitaryIndicator
                label="Tasa de Gestación"
                value={pregnancyRate}
                max={100}
                color={pregnancyRate >= 60 ? '#16a34a' : pregnancyRate >= 30 ? '#d97706' : '#6b7280'}
                note={`${pregnantCount} hembras preñadas`}
              />

              {/* Alerta si hay pendientes */}
              {pendingVaccine.length > 0 && (
                <div className="flex items-start gap-3 p-3.5 bg-amber-500/8 border border-amber-500/20
                  rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-600 dark:text-amber-400">
                      {pendingVaccine.length} animales sin vacunación completa
                    </p>
                    <p className="text-xs text-muted mt-0.5">Ver sección de alertas para el detalle</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ══════════════════════════════════════════
            SECCIÓN 4 — PESO Y PRODUCTIVIDAD
        ══════════════════════════════════════════ */}
        <Section
          id="productividad"
          icon={<TrendingUp className="w-4 h-4" />}
          title="Peso y Productividad del Hato"
          subtitle="Evolución del peso promedio y biomasa total a lo largo del tiempo"
          isOpen={openSections.productividad}
          onToggle={() => toggleSection('productividad')}
          printPreview={printPreview}
          className="print:break-before-page print:mt-6"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 print:grid-cols-1">
            <div className="lg:col-span-2">
              <ChartCard title="Evolución de Peso y Biomasa" icon={<TrendingUp className="w-4 h-4" />}>
                {(period) => <WeightWrapper data={filtered} period={period} />}
              </ChartCard>
            </div>

            {/* Métricas de productividad */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              <ProductivityCard
                label="Biomasa Total"
                value={totalBiomass >= 1000 ? `${(totalBiomass / 1000).toFixed(2)}t` : `${totalBiomass.toFixed(0)}kg`}
                icon={<Scale className="w-5 h-5" />}
                color="#14b8a6"
                note="Peso total del hato activo"
              />
              <ProductivityCard
                label="Peso Promedio"
                value={`${avgWeight} kg`}
                icon={<Scale className="w-5 h-5" />}
                color="#8b5cf6"
                note="Por animal activo"
              />
              <ProductivityCard
                label="Animales Pesados"
                value={filtered.filter(a => (a.weight_kg || a.weight || 0) > 0).length}
                icon={<BarChart3 className="w-5 h-5" />}
                color="#0ea5e9"
                note="Con registro de peso"
              />
              <ProductivityCard
                label="Sin Pesaje"
                value={filtered.filter(a => !(a.weight_kg || a.weight)).length}
                icon={<Info className="w-5 h-5" />}
                color="#6b7280"
                note="Sin datos de peso"
              />
            </div>
          </div>

          {/* Desglose de Biomasa por Especie */}
          <div className="mt-6 border-t border-border/60 pt-5 print:break-inside-avoid">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/80 mb-3 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-teal-600" /> Desglose de Biomasa y Peso por Especie
            </h4>
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-border text-muted uppercase text-[9px] tracking-wider font-bold">
                    <th className="py-2 px-3">Especie</th>
                    <th className="py-2 px-3 text-center">Animales Activos</th>
                    <th className="py-2 px-3 text-center">Con Registro de Peso</th>
                    <th className="py-2 px-3 text-right">Biomasa Total</th>
                    <th className="py-2 px-3 text-right">Peso Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueSpecies.map(sp => {
                    const items = filtered.filter(a => (a.animal_types?.name || a.category_name || a.type || 'Otros') === sp)
                    if (!items.length) return null
                    const activeSp = items.filter(a => a.status === 'activo')
                    const weighedSp = activeSp.filter(a => (a.weight_kg || a.weight || 0) > 0)
                    const spBiomass = activeSp.reduce((s, a) => s + (a.weight_kg || a.weight || 0), 0)
                    const spAvgWeight = weighedSp.length > 0 ? Math.round(spBiomass / weighedSp.length) : 0

                    return (
                      <tr key={sp} className="border-b border-border/30 hover:bg-surface-hover transition-colors">
                        <td className="py-2 px-3 font-semibold">{sp}</td>
                        <td className="py-2 px-3 text-center tabular-nums">{activeSp.length}</td>
                        <td className="py-2 px-3 text-center text-muted tabular-nums">{weighedSp.length}</td>
                        <td className="py-2 px-3 text-right font-bold text-teal-600">
                          {spBiomass > 0 ? (spBiomass >= 1000 ? `${(spBiomass / 1000).toFixed(2)}t` : `${spBiomass.toFixed(0)}kg`) : '—'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-purple-600 font-semibold">
                          {spAvgWeight > 0 ? `${spAvgWeight} kg` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Section>

        {/* ══════════════════════════════════════════
            SECCIÓN 5 — ALERTAS SANITARIAS
        ══════════════════════════════════════════ */}
        {pendingVaccine.length > 0 && (
          <Section
            id="alertas"
            icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
            title={`Alertas Sanitarias — ${pendingVaccine.length} animales`}
            subtitle="Animales que requieren atención de vacunación inmediata"
            isOpen={openSections.alertas}
            onToggle={() => toggleSection('alertas')}
            danger
            printPreview={printPreview}
            className="print:break-before-page print:mt-6"
          >
            <div className="overflow-x-auto print:overflow-visible">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="border-b border-red-200/60 text-red-400 uppercase text-[9px] sm:text-[10px] tracking-wider font-bold">
                    <th className="py-2.5 px-4">Código / Nombre</th>
                    <th className="py-2.5 px-4 hidden sm:table-cell">Especie</th>
                    <th className="py-2.5 px-4 text-center">Estado Vacuna</th>
                    <th className="py-2.5 px-4 text-center">Estado Animal</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingVaccine.slice(0, 10).map(a => (
                    <tr key={a.id} className="border-b border-red-200/20 hover:bg-red-500/5">
                      <td className="py-2.5 px-4 font-medium">{a.identification_code || a.name || 'Sin ID'}</td>
                      <td className="py-2.5 px-4 text-muted hidden sm:table-cell">{a.animal_types?.name || '—'}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="text-[9px] px-2 py-1 rounded-full font-bold bg-red-500/10 text-red-500 capitalize">
                          {a.metadata?.estado_vacunacion || 'Sin Registro'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className={`text-[9px] px-2 py-1 rounded-full font-bold capitalize ${
                          a.status === 'activo' ? 'bg-green-500/10 text-green-600' : 'bg-muted/10 text-muted'
                        }`}>{a.status || '—'}</span>
                      </td>
                    </tr>
                  ))}
                  {pendingVaccine.length > 10 && (
                    <tr>
                      <td colSpan={4} className="py-2 px-4 text-center text-xs text-muted italic">
                        +{pendingVaccine.length - 10} animales más con alertas sanitarias
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        )}

      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Chart Wrappers
───────────────────────────────────────────── */
function SpeciesWrapper({ data, period, isPrint }: { data: AnimalData[]; period: TimePeriod; isPrint?: boolean }) {
  return <SpeciesTreemap data={useSpeciesData(data, period)} isPrint={isPrint} />
}
function VaccinationWrapper({ data, period }: { data: AnimalData[]; period: TimePeriod }) {
  return <VaccinationDonut data={useVaccinationData(data, period)} />
}
function GaugeWrapper({ data, period }: { data: AnimalData[]; period: TimePeriod }) {
  return <OperationalGauge value={useOperationalRate(data, period)} />
}
function RegistrationsWrapper({ data, period }: { data: AnimalData[]; period: TimePeriod }) {
  return <RegistrationsLine data={useRegistrationsData(data, period)} />
}
function GenderWrapper({ data, period, isPrint }: { data: AnimalData[]; period: TimePeriod; isPrint?: boolean }) {
  return <GenderBarChart data={useGenderData(data, period)} isPrint={isPrint} />
}
function WeightWrapper({ data, period }: { data: AnimalData[]; period: TimePeriod }) {
  return <WeightAreaChart data={useWeightData(data, period)} />
}

/* ─────────────────────────────────────────────
   Componentes de UI
───────────────────────────────────────────── */

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-primary">{icon}</span>
      <h2 className="text-base sm:text-lg font-bold text-foreground">{title}</h2>
    </div>
  )
}

function Section({
  id, icon, title, subtitle, children, isOpen, onToggle, danger = false, printPreview = false, className = '',
}: {
  id: string; icon: React.ReactNode; title: string; subtitle: string
  children: React.ReactNode; isOpen: boolean; onToggle: () => void; danger?: boolean; printPreview?: boolean; className?: string
}) {
  return (
    <section id={id} className={`rounded-3xl border overflow-hidden shadow-sm print:shadow-none print:break-inside-avoid
      ${danger
        ? 'border-red-200 dark:border-red-800/30 bg-red-50/30 dark:bg-red-950/10'
        : 'border-border bg-surface'
      } ${printPreview ? 'border-gray-300 bg-white text-gray-900 shadow-none' : ''} ${className}`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 sm:p-6 border-b transition-colors text-left
          no-print ${danger
            ? 'border-red-200/50 hover:bg-red-500/5'
            : 'border-border hover:bg-surface-hover'
          } ${printPreview ? 'hidden' : ''}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={danger ? 'text-red-500' : 'text-primary'}>{icon}</span>
          <div className="min-w-0">
            <h2 className={`font-bold text-base sm:text-lg truncate ${danger ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
              {title}
            </h2>
            <p className="text-xs text-muted hidden sm:block truncate">{subtitle}</p>
          </div>
        </div>
        {isOpen
          ? <ChevronDown className="w-4 h-4 text-muted shrink-0" />
          : <ChevronRight className="w-4 h-4 text-muted shrink-0" />
        }
      </button>

      {/* Print header (always visible in print or printPreview) */}
      <div className={`hidden ${printPreview ? 'block bg-gray-50 border-b border-gray-200 text-gray-900' : 'print:block'} p-4 border-b border-border`}>
        <h2 className="font-bold text-base">{title}</h2>
        <p className="text-xs text-muted">{subtitle}</p>
      </div>

      {(isOpen || true) && (
        <div className={`p-4 sm:p-6 ${(!isOpen && !printPreview) ? 'hidden no-print' : ''}`}>
          {children}
        </div>
      )}
    </section>
  )
}

function KPICard({
  label, value, sub, icon, color, trend, progress,
}: {
  label: string; value: string | number; sub: string
  icon: React.ReactNode; color: string; trend: 'up' | 'down' | 'neutral'; progress: number
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus
  return (
    <div className="kpi-card bg-surface border border-border rounded-2xl p-3 sm:p-4
      flex flex-col gap-2 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]
      print:break-inside-avoid print:shadow-none animate-fade-up overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}18` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <TrendIcon className="w-3 h-3" style={{
          color: trend === 'up' ? '#16a34a' : trend === 'down' ? '#dc2626' : '#6b7280'
        }} />
      </div>
      <div>
        <p className="text-lg sm:text-xl font-black leading-none break-all" style={{ color }}>{value}</p>
        <p className="text-[9px] sm:text-[10px] font-bold text-muted uppercase tracking-wider mt-0.5">{label}</p>
        <p className="text-[9px] text-muted/60 hidden sm:block mt-0.5">{sub}</p>
      </div>
      <div className="h-1 bg-border rounded-full overflow-hidden print:hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color, opacity: 0.7 }} />
      </div>
    </div>
  )
}

function SanitaryIndicator({
  label, value, max, color, note, invert = false,
}: {
  label: string; value: number; max: number; color: string; note: string; invert?: boolean
}) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="p-3 bg-background border border-border rounded-xl">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-foreground">{label}</span>
        <span className="text-sm font-black" style={{ color }}>
          {value.toFixed(value % 1 === 0 ? 0 : 1)}{max === 100 ? '%' : ''}
        </span>
      </div>
      <div className="h-2 bg-border rounded-full overflow-hidden mb-1">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <p className="text-[10px] text-muted">{note}</p>
    </div>
  )
}

function ProductivityCard({
  label, value, icon, color, note,
}: {
  label: string; value: string | number; icon: React.ReactNode; color: string; note: string
}) {
  return (
    <div className="p-4 bg-background border border-border rounded-2xl flex flex-col gap-2">
      <div style={{ color }}>{icon}</div>
      <div>
        <p className="text-lg font-black leading-none" style={{ color }}>{value}</p>
        <p className="text-[10px] font-bold text-muted uppercase tracking-wider mt-1">{label}</p>
        <p className="text-[9px] text-muted/70 mt-0.5">{note}</p>
      </div>
    </div>
  )
}

function AIResult({ analysis }: { analysis: AIAnalysis }) {
  return (
    <div className="space-y-5 animate-fade-up">
      {/* Resumen */}
      <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl">
        <p className="text-xs font-bold text-primary uppercase mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Resumen IA
        </p>
        <div className="text-sm leading-relaxed text-foreground space-y-1.5">
          {analysis.summary.split('\n').map((l, i) => <p key={i}>{l}</p>)}
        </div>
      </div>

      {/* KPIs */}
      {analysis.kpis?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {analysis.kpis.map((k, i) => (
            <div key={i} className="bg-background border border-border rounded-xl p-3">
              <p className="text-[10px] font-bold text-muted uppercase">{k.label}</p>
              <p className={`text-base font-black ${k.trend === 'positivo' ? 'text-green-500' : k.trend === 'negativo' ? 'text-red-500' : 'text-primary'}`}>
                {k.value}
              </p>
              <p className="text-[10px] text-muted">{k.note}</p>
            </div>
          ))}
        </div>
      )}

      {/* Hallazgos */}
      {analysis.insights?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {analysis.insights.map((ins, i) => (
            <div key={i} className="flex gap-3 p-3.5 bg-background border border-border rounded-xl">
              <span className="text-xl shrink-0">{ins.icon}</span>
              <div>
                <p className="text-sm font-bold">{ins.title}</p>
                <p className="text-xs text-muted mt-0.5">{ins.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recomendaciones */}
      {analysis.recommendations?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-muted uppercase">Recomendaciones</p>
          {analysis.recommendations.map((r, i) => (
            <div key={i} className={`flex gap-3 p-3 rounded-xl border ${
              r.priority === 'urgente' ? 'bg-red-500/8 border-red-500/20' :
              r.priority === 'normal' ? 'bg-amber-500/8 border-amber-500/20' :
              'bg-green-500/8 border-green-500/20'
            }`}>
              {r.priority === 'urgente'
                ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                : <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
              }
              <div className="flex-1">
                <p className="text-sm font-semibold">{r.action}</p>
                <p className="text-xs text-muted mt-0.5">{r.reason}</p>
              </div>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full self-start capitalize ${
                r.priority === 'urgente' ? 'bg-red-500/15 text-red-500' :
                r.priority === 'normal' ? 'bg-amber-500/15 text-amber-500' :
                'bg-green-500/15 text-green-500'
              }`}>{r.priority}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
