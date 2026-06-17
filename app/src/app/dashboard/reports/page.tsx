'use client'

import React, { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  Printer, FileText, Calendar, Loader2, Info, TreePine,
  ShieldCheck, Zap, TrendingUp, Gauge, LineChart as LineChartIcon,
  Bot, Sparkles, AlertTriangle, CheckCircle, Filter,
  Microscope, BarChart3,
} from 'lucide-react'

// Chart components
import { ChartCard } from '@/components/reports/ChartCard'
import { SpeciesTreemap } from '@/components/reports/SpeciesTreemap'
import { VaccinationDonut } from '@/components/reports/VaccinationDonut'
import { OperationalGauge } from '@/components/reports/OperationalGauge'
import { RegistrationsLine } from '@/components/reports/RegistrationsLine'
import { GenderBarChart } from '@/components/reports/GenderBarChart'
import { WeightAreaChart } from '@/components/reports/WeightAreaChart'
import { AIStatusIndicator, type AIStatus } from '@/components/reports/AIStatusIndicator'
import { KPIGrid } from '@/components/reports/KPIGrid'

// Data hooks
import {
  type AnimalData, type TimePeriod,
  useSpeciesData, useVaccinationData, useOperationalRate,
  useRegistrationsData, useGenderData, useWeightData,
} from '@/hooks/useChartData'

/* ─────────────────────────────────────────────
   AI types
───────────────────────────────────────────── */
interface AIAnalysis {
  summary: string
  insights: { icon: string; title: string; detail: string }[]
  recommendations: { priority: string; action: string; reason: string }[]
  kpis: { label: string; value: string; trend: string; note: string }[]
  data_quality: string
  report_date: string
}

type AIMeta = {
  provider?: string
  model?: string
  generated_at?: string
  data_points?: {
    animals?: number
    activities?: number
    repro_events?: number
  }
}

/* ─────────────────────────────────────────────
   Main Page Component
───────────────────────────────────────────── */
export default function ReportsPage() {
  // ── Global filters ──────────────────────────────
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [filterModule, setFilterModule] = useState('todos')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [filterSex, setFilterSex] = useState('todos')
  const [filterAcquisition, setFilterAcquisition] = useState('todos')
  const [filterVaccine, setFilterVaccine] = useState('todos')
  const [showFilters, setShowFilters] = useState(false)

  // ── Data states ─────────────────────────────────
  const [isMounted, setIsMounted] = useState(false)
  const [dbData, setDbData] = useState<AnimalData[]>([])
  const [loading, setLoading] = useState(true)
  const [errorApi, setErrorApi] = useState<string | null>(null)

  // ── AI states — General Report ──────────────────
  const [reportStatus, setReportStatus] = useState<AIStatus>('idle')
  const [reportStartTime, setReportStartTime] = useState<number | null>(null)
  const [reportAnalysis, setReportAnalysis] = useState<AIAnalysis | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [reportMeta, setReportMeta] = useState<AIMeta | null>(null)



  const [showAiPanel, setShowAiPanel] = useState(false)
  const [pdfMsg, setPdfMsg] = useState('')

  // ── Data fetch ──────────────────────────────────
  useEffect(() => {
    setIsMounted(true)
    fetch('/api/animals?status=all')
      .then(r => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.json() })
      .then(d => { setDbData(Array.isArray(d) ? d : []); setErrorApi(null) })
      .catch(e => { setErrorApi(e.message); setDbData([]) })
      .finally(() => setLoading(false))
  }, [])

  // ── Derived data ────────────────────────────────
  const uniqueCategories = Array.from(
    new Set(dbData.map(a => a.animal_types?.name || a.category_name || a.type || 'Otros'))
  ).filter(Boolean)

  // Apply global filters
  const globalFiltered = (() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thisWeek = new Date(today); thisWeek.setDate(today.getDate() - 7)
    const thisMonth = new Date(today); thisMonth.setMonth(today.getMonth() - 1)
    const thisYear = new Date(today); thisYear.setFullYear(today.getFullYear() - 1)

    return dbData.filter(a => {
      const cat = a.animal_types?.name || a.category_name || a.type || 'Otros'
      if (filterModule !== 'todos' && cat !== filterModule) return false
      if (filterStatus === 'activo' && a.status !== 'activo') return false
      if (filterStatus === 'inactivo' && a.status === 'activo') return false
      const sex = a.sex?.toLowerCase() || ''
      if (filterSex !== 'todos' && sex !== filterSex) return false
      const acq = (a.acquisition_type || 'desconocido').toLowerCase()
      if (filterAcquisition !== 'todos' && acq !== filterAcquisition) return false
      const vac = (a.metadata?.estado_vacunacion || 'sin registro').toLowerCase()
      if (filterVaccine !== 'todos' && vac !== filterVaccine) return false

      if (filterPeriod !== 'all' && a.created_at) {
        const d = new Date(a.created_at)
        if (filterPeriod === 'dia' && d < today) return false
        if (filterPeriod === 'semana' && d < thisWeek) return false
        if (filterPeriod === 'mes' && d < thisMonth) return false
        if (filterPeriod === 'anio' && d < thisYear) return false
      }
      return true
    })
  })()

  // Unique filter values
  const uniqueSexes = Array.from(new Set(dbData.map(a => a.sex?.toLowerCase() || 'sin definir'))).filter(Boolean)
  const uniqueAcquisitions = Array.from(new Set(dbData.map(a => (a.acquisition_type || 'desconocido').toLowerCase()))).filter(Boolean)
  const uniqueVaccines = Array.from(new Set(dbData.map(a => (a.metadata?.estado_vacunacion || 'sin registro').toLowerCase()))).filter(Boolean)
  const uniqueStatuses = Array.from(new Set(dbData.map(a => (a.status || 'desconocido').toLowerCase()))).filter(Boolean)

  // ── AI General Report ────────────────────────────
  async function requestGeneralReport() {
    setReportStatus('loading')
    setReportStartTime(Date.now())
    setReportError(null)
    setReportAnalysis(null)
    setShowAiPanel(true)
    try {
      const res = await fetch('/api/reports/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: filterModule === 'todos' ? 'general' : 'specific',
          focusModule: filterModule,
          userQuestion: 'Genera un informe operativo general de la finca',
          period: filterPeriod,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setReportError(json.error || 'Error de análisis')
        setReportStatus('error')
        return
      }
      setReportAnalysis(json.analysis)
      setReportMeta(json.meta)
      setReportStatus('success')
    } catch (e: unknown) {
      setReportError(e instanceof Error ? e.message : 'Error al procesar la solicitud')
      setReportStatus('error')
    } finally {
      setReportStartTime(null)
    }
  }


  // ── PDF Generation ──────────────────────────────
  async function generateAndDownloadPDF() {
    setPdfMsg('Generando PDF...')
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const margin = 14
      const dateStr = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
      let y = 0

      // Header
      doc.setFillColor(15, 61, 46)
      doc.rect(0, 0, pageW, 28, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text('Finca Tigrillo', margin, 12)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Informe Operativo Ganadero', margin, 20)
      doc.text(dateStr, pageW - margin, 20, { align: 'right' })
      y = 36

      const activeFilters: string[] = []
      if (filterModule !== 'todos') activeFilters.push(`Módulo: ${filterModule}`)
      if (filterStatus !== 'todos') activeFilters.push(`Estado: ${filterStatus}`)
      if (filterSex !== 'todos') activeFilters.push(`Sexo: ${filterSex}`)
      if (filterPeriod !== 'all') activeFilters.push(`Período: ${filterPeriod}`)
      if (activeFilters.length > 0) {
        doc.setFontSize(8)
        doc.setTextColor(100, 100, 100)
        doc.text(`Filtros activos: ${activeFilters.join(' · ')}`, margin, y)
        y += 6
      }

      // Summary
      const summaryData = globalFiltered
      const activeCount = summaryData.filter(a => a.status === 'activo').length
      const operativity = summaryData.length > 0 ? `${((activeCount / summaryData.length) * 100).toFixed(0)}%` : '0%'
      const machosCount = summaryData.filter(a => a.sex?.toLowerCase() === 'macho').length
      const hembrasCount = summaryData.filter(a => a.sex?.toLowerCase() === 'hembra').length
      const mixtosCount = summaryData.filter(a => a.sex?.toLowerCase() === 'mixto').length
      const mortalityCount = summaryData.filter(a => a.status?.toLowerCase() === 'fallecido' || a.status?.toLowerCase() === 'muerto').length
      const mortalityRate = summaryData.length > 0 ? ((mortalityCount / summaryData.length) * 100).toFixed(1) + '%' : '0%'
      const pregnantCount = summaryData.filter(a => a.sex?.toLowerCase() === 'hembra' && a.metadata?.estado_reproductivo?.toLowerCase() === 'preñada').length
      const now = new Date()
      const animalsWithBirthDate = summaryData.filter(a => a.birth_date)
      const avgAgeMonths = animalsWithBirthDate.length > 0
        ? animalsWithBirthDate.reduce((sum, a) => sum + (now.getTime() - new Date(a.birth_date!).getTime()) / (1000 * 60 * 60 * 24 * 30.44), 0) / animalsWithBirthDate.length
        : 0
      const avgAgeText = avgAgeMonths > 0 ? `${avgAgeMonths.toFixed(1)} meses` : 'N/D'
      const totalWeight = summaryData.reduce((sum, a) => sum + (a.weight_kg || a.weight || 0), 0)
      const weightText = totalWeight > 1000 ? `${(totalWeight / 1000).toFixed(1)} t` : `${totalWeight.toFixed(0)} kg`

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 61, 46)
      doc.text('Resumen General', margin, y)
      y += 2

      autoTable(doc, {
        startY: y,
        head: [['Métrica', 'Valor']],
        body: [
          ['Total de animales registrados', summaryData.length.toString()],
          ['Animales activos', `${activeCount} (${operativity})`],
          ['Machos / Hembras / Mixtos', `${machosCount} / ${hembrasCount} / ${mixtosCount}`],
          ['Tasa de mortalidad', mortalityRate],
          ['Hembras preñadas', pregnantCount.toString()],
          ['Edad promedio', avgAgeText],
          ['Peso total del hato', weightText],
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 61, 46] as [number, number, number], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 } },
        margin: { left: margin, right: margin },
      })
      y = (doc as any).lastAutoTable.finalY + 8

      // Distribution
      const distribution: Record<string, number> = {}
      summaryData.forEach(a => {
        const label = a.animal_types?.name || a.category_name || a.type || 'Otros'
        distribution[label] = (distribution[label] || 0) + 1
      })

      if (Object.keys(distribution).length > 0) {
        if (y > 230) { doc.addPage(); y = 20 }
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 61, 46)
        doc.text('Distribución por Categoría Animal', margin, y)
        y += 2
        autoTable(doc, {
          startY: y,
          head: [['Categoría', 'Cantidad', '% del total']],
          body: Object.entries(distribution).sort((a, b) => b[1] - a[1]).map(([k, v]) => [
            k, v.toString(), summaryData.length > 0 ? `${((v / summaryData.length) * 100).toFixed(1)}%` : '0%',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [15, 61, 46] as [number, number, number], textColor: 255, fontStyle: 'bold', fontSize: 9 },
          bodyStyles: { fontSize: 9 },
          margin: { left: margin, right: margin },
        })
        y = (doc as any).lastAutoTable.finalY + 8
      }

      // Inventory table
      if (summaryData.length > 0) {
        if (y > 200) { doc.addPage(); y = 20 }
        const limit = 80
        doc.setFontSize(11)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(15, 61, 46)
        doc.text(
          summaryData.length > limit
            ? `Inventario de Animales — primeros ${limit} de ${summaryData.length}`
            : `Inventario de Animales (${summaryData.length})`,
          margin, y
        )
        y += 2
        autoTable(doc, {
          startY: y,
          head: [['Código', 'Nombre', 'Categoría', 'Sexo', 'Estado', 'Kg']],
          body: summaryData.slice(0, limit).map(a => [
            a.identification_code || '-',
            a.name || '-',
            a.animal_types?.name || a.category_name || a.type || 'Otros',
            a.sex || '-',
            a.status || '-',
            (a.weight_kg || a.weight || 0) > 0 ? String(a.weight_kg || a.weight) : '-',
          ]),
          theme: 'striped',
          headStyles: { fillColor: [15, 61, 46] as [number, number, number], textColor: 255, fontStyle: 'bold', fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          margin: { left: margin, right: margin },
        })
      }

      // Footer
      const totalPages = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(150, 150, 150)
        doc.text(
          `Finca Tigrillo · Informe generado el ${dateStr} · Página ${i} de ${totalPages}`,
          pageW / 2, doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        )
      }

      const filename = `Reporte-FincaTigrillo-${new Date().toISOString().split('T')[0]}.pdf`
      if (Capacitor.isNativePlatform()) {
        const base64 = doc.output('datauristring').split(',')[1]
        try {
          await Filesystem.writeFile({ path: `Download/${filename}`, data: base64, directory: Directory.ExternalStorage, recursive: true })
          setPdfMsg(`✅ Guardado en Descargas: ${filename}`)
        } catch {
          await Filesystem.writeFile({ path: filename, data: base64, directory: Directory.External, recursive: true })
          setPdfMsg('✅ Guardado en almacenamiento de la app')
        }
      } else {
        doc.save(filename)
        setPdfMsg('')
      }
    } catch (err: any) {
      setPdfMsg(`Error al generar PDF: ${err?.message ?? 'desconocido'}`)
    }
    setTimeout(() => setPdfMsg(''), 5000)
  }

  // ── Loading state ───────────────────────────────
  if (!isMounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted italic">Consultando base de datos...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in p-3 sm:p-4 md:p-8 print:p-0 print:m-0 print:block print:space-y-4 print:overflow-visible min-w-0 w-full print:w-full print:h-auto overflow-x-hidden">

      {/* ── Header ─────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="min-w-0">
          <h1 className="font-display tracking-tight text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            Informes <span className="text-primary">&amp; Analítica Operativa</span>
          </h1>
          <p className="text-muted mt-1 text-sm">
            Dashboard interactivo · {dbData.length} registros · Filtros independientes por gráfico
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => requestGeneralReport()}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-400 text-white px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all text-sm font-bold"
          >
            <Bot className="w-4 h-4" />
            Reporte con IA
          </button>
          <button
            onClick={() => {
              if (Capacitor.isNativePlatform()) {
                generateAndDownloadPDF()
              } else {
                window.print()
              }
            }}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400 text-white dark:text-slate-900 px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all text-sm font-bold"
          >
            <Printer className="w-4 h-4" />
            {pdfMsg === 'Generando PDF...' ? 'Generando...' : 'Imprimir / PDF'}
          </button>
        </div>
        {pdfMsg && (
          <p className={`text-xs mt-1 font-medium ${pdfMsg.startsWith('✅') ? 'text-primary' : 'text-red-500'}`}>
            {pdfMsg}
          </p>
        )}
      </div>

      {errorApi && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl no-print">
          <div className="flex items-center gap-3">
            <Info className="text-red-500 w-5 h-5" />
            <p className="text-sm text-red-700"><strong>Error:</strong> {errorApi}</p>
          </div>
        </div>
      )}

      {/* ── Global Filters ──────────────────────────── */}
      <div className="no-print">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-semibold hover:bg-surface-hover transition-colors mb-4 shadow-sm"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Ocultar Filtros Globales' : 'Filtros Globales'}
        </button>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 bg-surface border border-border p-4 md:p-6 rounded-2xl shadow-sm mb-6 animate-fade-in">
            <div className="space-y-2">
              <label className="text-[10px] sm:text-xs font-bold text-muted uppercase flex items-center gap-2"><Calendar className="w-3 h-3 sm:w-4 sm:h-4" /> Periodo</label>
              <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)} className="w-full p-2.5 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20">
                <option value="all">Histórico Completo</option>
                <option value="dia">Hoy</option>
                <option value="semana">Últimos 7 días</option>
                <option value="mes">Último Mes</option>
                <option value="anio">Último Año</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase flex items-center gap-2"><FileText className="w-4 h-4" /> Tipo de Animal</label>
              <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="w-full p-2.5 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 capitalize">
                <option value="todos">Todas las Especies</option>
                {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase flex items-center gap-2"><Bot className="w-4 h-4" /> Estado</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full p-2.5 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 capitalize">
                <option value="todos">Cualquier Estado</option>
                {uniqueStatuses.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase flex items-center gap-2"><Info className="w-4 h-4" /> Género</label>
              <select value={filterSex} onChange={e => setFilterSex(e.target.value)} className="w-full p-2.5 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 capitalize">
                <option value="todos">Ambos Géneros</option>
                {uniqueSexes.map(sx => <option key={sx} value={sx}>{sx}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Vacunación</label>
              <select value={filterVaccine} onChange={e => setFilterVaccine(e.target.value)} className="w-full p-2.5 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 capitalize">
                <option value="todos">Cualquier Estado</option>
                {uniqueVaccines.map(vc => <option key={vc} value={vc}>{vc}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Adquisición</label>
              <select value={filterAcquisition} onChange={e => setFilterAcquisition(e.target.value)} className="w-full p-2.5 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 capitalize">
                <option value="todos">Cualquier Tipo</option>
                {uniqueAcquisitions.map(ac => <option key={ac} value={ac}>{ac}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── General Report Panel ────────────────────── */}
      {showAiPanel && (
        <div className="bg-surface border border-violet-200 dark:border-violet-800/30 rounded-2xl overflow-hidden shadow-sm no-print">
          <div className="bg-gradient-to-r from-violet-600/10 to-primary/10 p-5 border-b border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-violet-600 to-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm">Informe General con IA</h3>
              {reportMeta && (
                <p className="text-xs text-muted">
                  Modelo: {reportMeta.model ?? '—'} · {reportMeta.generated_at ? new Date(reportMeta.generated_at).toLocaleString('es-CO') : '—'}
                </p>
              )}
            </div>
            <button onClick={() => setShowAiPanel(false)} className="text-muted hover:text-foreground text-xs p-1">✕</button>
          </div>
          <div className="p-5">
            <AIStatusIndicator status={reportStatus} error={reportError} startTime={reportStartTime} />
            {reportAnalysis && reportStatus === 'success' && (
              <AIResultDisplay analysis={reportAnalysis} />
            )}
          </div>
        </div>
      )}




      {/* ── Print Header ───────────────────────────── */}
      <div className="w-full print:table print-area">
        <div className="hidden print:table-header-group">
          <div className="print:table-row">
            <div className="print:table-cell pb-6">
              <div className="flex items-center justify-between border-b-2 border-border/60 pb-4 text-left">
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/faviconOficial.svg" alt="Logo Finca Tigrillo" className="w-10 h-10 object-contain dark:invert" />
                  <div>
                    <h1 className="font-black text-lg text-foreground leading-none mb-1">Finca Tigrillo</h1>
                    <p className="text-[10px] text-muted font-bold uppercase tracking-widest leading-none">Reporte Operativo Ganadero</p>
                  </div>
                </div>
                <div className="text-right text-[10px] text-muted font-normal">
                  <p>Generado: {new Date().toLocaleDateString('es-CO')} {new Date().toLocaleTimeString('es-CO')}</p>
                  <p className="uppercase font-mono font-bold mt-1">REF: {filterModule}_{filterPeriod}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="print:table-row-group">
          <div className="print:table-row">
            <div className="print:table-cell">
              <div className="space-y-6 md:space-y-8 print:space-y-6">

                {/* ── KPI Grid ───────────────────────── */}
                <KPIGrid data={globalFiltered} />

                {/* ── Charts Grid ────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6 print:grid-cols-2 print:gap-x-6 print:gap-y-8">

                  {/* 1. Species Treemap */}
                  <ChartCard title="Población por Especie" icon={<TreePine className="w-4 h-4" />}>
                    {(period) => <SpeciesTreemapWrapper data={globalFiltered} period={period} />}
                  </ChartCard>

                  {/* 2. Vaccination Donut */}
                  <ChartCard title="Estado de Vacunación" icon={<ShieldCheck className="w-4 h-4" />}>
                    {(period) => <VaccinationDonutWrapper data={globalFiltered} period={period} />}
                  </ChartCard>

                  {/* 3. Operational Gauge */}
                  <ChartCard title="Operatividad General" icon={<Gauge className="w-4 h-4" />}>
                    {(period) => <OperationalGaugeWrapper data={globalFiltered} period={period} />}
                  </ChartCard>

                  {/* 4. Registrations Line */}
                  <ChartCard title="Registros en el Tiempo" icon={<LineChartIcon className="w-4 h-4" />}>
                    {(period) => <RegistrationsLineWrapper data={globalFiltered} period={period} />}
                  </ChartCard>

                  {/* 5. Gender Horizontal Bar */}
                  <ChartCard title="Distribución por Género" icon={<BarChart3 className="w-4 h-4" />}>
                    {(period) => <GenderBarWrapper data={globalFiltered} period={period} />}
                  </ChartCard>

                  {/* 6. Weight & Biomass Area */}
                  <ChartCard title="Peso y Biomasa" icon={<TrendingUp className="w-4 h-4" />}>
                    {(period) => <WeightAreaWrapper data={globalFiltered} period={period} />}
                  </ChartCard>

                </div>

                {/* ── Analytical Breakdown ────────────── */}
                <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm print:break-inside-avoid print:mt-8">
                  <div className="bg-primary/5 p-4 sm:p-6 border-b border-border flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <Microscope className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                      <h3 className="font-bold text-base sm:text-lg truncate">Desglose Analítico del Inventario</h3>
                    </div>
                    <div className="text-[10px] bg-white dark:bg-surface-hover px-3 py-1 rounded-full border font-mono font-bold text-primary hidden sm:block shrink-0">
                      REPORTE_{filterModule.toUpperCase()}_{filterPeriod.toUpperCase()}
                    </div>
                  </div>
                  <div className="p-6">
                    {globalFiltered.length > 0 ? (
                      <div className="space-y-8">
                        <div className="overflow-x-auto print:overflow-visible">
                          <table className="w-full text-sm text-left border-collapse print:text-xs">
                            <thead>
                              <tr className="border-b border-border text-muted font-semibold uppercase text-[10px] tracking-wider">
                                <th className="py-4 px-3">Especie / Clasificación</th>
                                <th className="py-4 px-3 text-center">Total</th>
                                <th className="py-4 px-3 text-center">Activos</th>
                                <th className="py-4 px-3 text-center">Inactivos</th>
                                <th className="py-4 px-3 text-center">% Inventario</th>
                              </tr>
                            </thead>
                            <tbody>
                              {uniqueCategories.filter(cat => filterModule === 'todos' || cat === filterModule).map(cat => {
                                const items = globalFiltered.filter(a => (a.animal_types?.name || a.category_name || a.type || 'Otros') === cat)
                                if (items.length === 0) return null
                                const active = items.filter(a => a.status === 'activo').length
                                return (
                                  <tr key={cat} className="border-b border-border/50 hover:bg-primary/5 transition-colors print:break-inside-avoid">
                                    <td className="py-4 px-3 font-bold text-foreground/80">{cat}</td>
                                    <td className="py-4 px-3 text-center font-mono">{items.length}</td>
                                    <td className="py-4 px-3 text-center text-success font-bold">{active}</td>
                                    <td className="py-4 px-3 text-center text-muted">{items.length - active}</td>
                                    <td className="py-4 px-3 text-center font-black text-primary">{((items.length / globalFiltered.length) * 100).toFixed(1)}%</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 no-print">
                          <ABox icon={<TrendingUp className="text-primary w-4 h-4" />} title="Tendencia Poblacional"
                            text={filterModule === 'todos'
                              ? "Distribución diversificada. Se recomienda monitoreo periódico para estabilidad del hato."
                              : `Análisis para ${filterModule}: operatividad del ${globalFiltered.length > 0 ? ((globalFiltered.filter(a => a.status === 'activo').length / globalFiltered.length) * 100).toFixed(0) : 0}%.`} />
                          <ABox icon={<ShieldCheck className="text-success w-4 h-4" />} title="Trazabilidad"
                            text="100% de registros sincronizados con la base de datos central." />
                          <ABox icon={<Zap className="text-accent w-4 h-4" />} title="Alertas de Sistema"
                            text={globalFiltered.length < 5 ? "Muestra reducida para predicciones." : "Carga animal estable detectada."} />
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 text-center space-y-3">
                        <Info className="w-8 h-8 text-muted/30 mx-auto" />
                        <p className="text-muted italic text-sm">No hay registros suficientes para el desglose analítico.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Latest Entries ──────────────────── */}
                <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm print:break-inside-avoid print:mt-8 mt-6">
                  <div className="bg-primary/5 p-4 sm:p-6 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
                      <h3 className="font-bold text-base sm:text-lg">Últimos Ingresos Registrados</h3>
                    </div>
                  </div>
                  <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-xs sm:text-sm text-left border-collapse print:text-xs">
                      <thead>
                        <tr className="bg-background border-b border-border text-muted font-semibold uppercase text-[9px] sm:text-[10px] tracking-wider">
                          <th className="py-3 px-4 sm:px-6">Identificador / Nombre</th>
                          <th className="py-3 px-4 sm:px-6">Especie</th>
                          <th className="py-3 px-4 sm:px-6 text-center">Estado</th>
                          <th className="py-3 px-4 sm:px-6 text-right">Fecha Ingreso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {globalFiltered.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map(a => (
                          <tr key={a.id} className="border-b border-border/30 hover:bg-surface-hover print:break-inside-avoid">
                            <td className="py-3 px-4 sm:px-6 font-medium text-foreground">{a.identification_code || a.name || 'Sin ID'}</td>
                            <td className="py-3 px-4 sm:px-6 text-muted">{a.animal_types?.name}</td>
                            <td className="py-3 px-4 sm:px-6 text-center">
                              <span className={`text-[9px] sm:text-[10px] px-2 py-1 rounded-full font-bold ${a.status === 'activo' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>{a.status}</span>
                            </td>
                            <td className="py-3 px-4 sm:px-6 text-right text-muted font-mono text-[10px] sm:text-xs">
                              {new Date(a.created_at).toLocaleDateString('es-CO')}
                            </td>
                          </tr>
                        ))}
                        {globalFiltered.length === 0 && (
                          <tr><td colSpan={4} className="py-6 text-center text-muted italic">No hay registros recientes</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Health Alerts ───────────────────── */}
                <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm print:break-inside-avoid print:mt-8 mt-6">
                  <div className="bg-red-500/5 p-4 sm:p-6 border-b border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 shrink-0" />
                      <h3 className="font-bold text-base sm:text-lg text-red-500">Alertas Sanitarias (Pendientes de Vacuna)</h3>
                    </div>
                  </div>
                  <div className="overflow-x-auto print:overflow-visible">
                    <table className="w-full text-xs sm:text-sm text-left border-collapse print:text-xs">
                      <thead>
                        <tr className="bg-background border-b border-border text-muted font-semibold uppercase text-[9px] sm:text-[10px] tracking-wider">
                          <th className="py-3 px-4 sm:px-6">Identificador / Nombre</th>
                          <th className="py-3 px-4 sm:px-6">Especie</th>
                          <th className="py-3 px-4 sm:px-6 text-center">Estado Vacuna</th>
                        </tr>
                      </thead>
                      <tbody>
                        {globalFiltered.filter(a => !a.metadata?.estado_vacunacion || a.metadata?.estado_vacunacion === 'no vacunado' || a.metadata?.estado_vacunacion === 'programado').slice(0, 5).map(a => (
                          <tr key={a.id} className="border-b border-border/30 hover:bg-surface-hover print:break-inside-avoid">
                            <td className="py-3 px-4 sm:px-6 font-medium text-foreground">{a.identification_code || a.name || 'Sin ID'}</td>
                            <td className="py-3 px-4 sm:px-6 text-muted">{a.animal_types?.name}</td>
                            <td className="py-3 px-4 sm:px-6 text-center">
                              <span className="text-[9px] sm:text-[10px] px-2 py-1 rounded-full font-bold bg-red-500/10 text-red-500 capitalize">{a.metadata?.estado_vacunacion || 'Sin Registro'}</span>
                            </td>
                          </tr>
                        ))}
                        {globalFiltered.filter(a => !a.metadata?.estado_vacunacion || a.metadata?.estado_vacunacion === 'no vacunado' || a.metadata?.estado_vacunacion === 'programado').length === 0 && (
                          <tr><td colSpan={3} className="py-6 text-center text-muted italic">No hay alertas sanitarias pendientes</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Chart Wrapper Components
   Connect ChartCard's render prop to data hooks
───────────────────────────────────────────── */

function SpeciesTreemapWrapper({ data, period }: { data: AnimalData[]; period: TimePeriod }) {
  const chartData = useSpeciesData(data, period)
  return <SpeciesTreemap data={chartData} />
}

function VaccinationDonutWrapper({ data, period }: { data: AnimalData[]; period: TimePeriod }) {
  const chartData = useVaccinationData(data, period)
  return <VaccinationDonut data={chartData} />
}

function OperationalGaugeWrapper({ data, period }: { data: AnimalData[]; period: TimePeriod }) {
  const rate = useOperationalRate(data, period)
  return <OperationalGauge value={rate} />
}

function RegistrationsLineWrapper({ data, period }: { data: AnimalData[]; period: TimePeriod }) {
  const chartData = useRegistrationsData(data, period)
  return <RegistrationsLine data={chartData} />
}

function GenderBarWrapper({ data, period }: { data: AnimalData[]; period: TimePeriod }) {
  const chartData = useGenderData(data, period)
  return <GenderBarChart data={chartData} />
}

function WeightAreaWrapper({ data, period }: { data: AnimalData[]; period: TimePeriod }) {
  const chartData = useWeightData(data, period)
  return <WeightAreaChart data={chartData} />
}

/* ─────────────────────────────────────────────
   Supporting components
───────────────────────────────────────────── */

function ABox({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="p-5 bg-background border border-border rounded-2xl space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter">{icon} {title}</div>
      <p className="text-[11px] text-muted-foreground leading-relaxed italic">{text}</p>
    </div>
  )
}

function AIResultDisplay({ analysis }: { analysis: AIAnalysis }) {
  return (
    <div className="space-y-6 animate-fade-up">
      {/* Summary */}
      <div className="bg-gradient-to-r from-violet-600/5 to-primary/5 border border-primary/20 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase text-primary">Resumen Ejecutivo IA</span>
        </div>
        <div className="text-sm leading-relaxed text-foreground space-y-2">
          {analysis.summary.split('\n').map((line: string, idx: number) => (
            <p key={idx}>{line}</p>
          ))}
        </div>
      </div>

      {/* KPIs */}
      {analysis.kpis?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted uppercase mb-3">KPIs Detectados</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {analysis.kpis.map((kpi, i) => (
              <div key={i} className="bg-background border border-border rounded-xl p-3 shadow-sm">
                <p className="text-[10px] font-bold text-muted uppercase">{kpi.label}</p>
                <p className={`text-lg font-bold ${kpi.trend === 'positivo' ? 'text-success' : kpi.trend === 'negativo' ? 'text-danger' : 'text-primary'}`}>{kpi.value}</p>
                <p className="text-[10px] text-muted">{kpi.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {analysis.insights?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted uppercase mb-3">Hallazgos</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {analysis.insights.map((ins, i) => (
              <div key={i} className="bg-background border border-border rounded-xl p-4 flex gap-3 shadow-sm hover:shadow-md transition-shadow">
                <span className="text-xl shrink-0">{ins.icon}</span>
                <div>
                  <p className="text-sm font-bold text-foreground">{ins.title}</p>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{ins.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {analysis.recommendations?.length > 0 && (
        <div>
          <p className="text-xs font-bold text-muted uppercase mb-3">Recomendaciones</p>
          <div className="space-y-2">
            {analysis.recommendations.map((rec, i) => (
              <div key={i} className={`flex gap-3 p-3.5 rounded-xl border ${
                rec.priority === 'urgente' ? 'bg-red-500/10 border-red-500/20' :
                rec.priority === 'normal' ? 'bg-yellow-500/10 border-yellow-500/20' :
                'bg-green-500/10 border-green-500/20'
              }`}>
                {rec.priority === 'urgente' ? <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /> : <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />}
                <div>
                  <p className={`text-sm font-semibold ${
                    rec.priority === 'urgente' ? 'text-red-500' :
                    rec.priority === 'normal' ? 'text-yellow-500' :
                    'text-green-500'
                  }`}>{rec.action}</p>
                  <p className="text-xs text-foreground/70 mt-1 leading-relaxed">{rec.reason}</p>
                </div>
                <span className={`ml-auto text-[10px] font-bold px-2.5 py-1 rounded-full self-start capitalize tracking-wide ${
                  rec.priority === 'urgente' ? 'bg-red-500/20 text-red-500' :
                  rec.priority === 'normal' ? 'bg-yellow-500/20 text-yellow-500' :
                  'bg-green-500/20 text-green-500'
                }`}>{rec.priority}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
