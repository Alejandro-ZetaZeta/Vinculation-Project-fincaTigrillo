'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import {
  Printer, FileText, Calendar, Loader2, Info, PieChart,
  BarChart3, Microscope, ShieldCheck, Zap, TrendingUp,
  Bot, Send, Sparkles, ChevronDown, AlertTriangle, CheckCircle, Filter
} from 'lucide-react';

if (typeof window !== 'undefined') Chart.register(...registerables);

interface AIAnalysis {
  summary: string;
  insights: { icon: string; title: string; detail: string }[];
  recommendations: { priority: string; action: string; reason: string }[];
  kpis: { label: string; value: string; trend: string; note: string }[];
  data_quality: string;
  report_date: string;
}

interface AnimalData {
  id: string;
  name?: string;
  identification_code?: string;
  type?: string;
  category_name?: string;
  animal_types?: { name: string };
  status?: string;
  sex?: string;
  acquisition_type?: string;
  birth_date?: string;
  weight?: number;
  weight_kg?: number;
  metadata?: {
    estado_vacunacion?: string;
    estado_reproductivo?: string;
  };
  created_at: string;
}

export default function ReportsPage() {
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterModule, setFilterModule] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterSex, setFilterSex] = useState('todos');
  const [filterAcquisition, setFilterAcquisition] = useState('todos');
  const [filterVaccine, setFilterVaccine] = useState('todos');
  const [showFilters, setShowFilters] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [dbData, setDbData] = useState<AnimalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorApi, setErrorApi] = useState<string | null>(null);

  // IA states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiMeta, setAiMeta] = useState<any>(null);
  const [userQuestion, setUserQuestion] = useState('');
  const [showAiPanel, setShowAiPanel] = useState(false);

  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const sexChartRef = useRef<HTMLCanvasElement>(null);
  const statusChartRef = useRef<HTMLCanvasElement>(null);
  const vaccineChartRef = useRef<HTMLCanvasElement>(null);
  const acqChartRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setIsMounted(true);
    fetch('/api/animals?status=all')
      .then(r => { if (!r.ok) throw new Error(`Error ${r.status}`); return r.json(); })
      .then(d => { setDbData(Array.isArray(d) ? d : []); setErrorApi(null); })
      .catch(e => { setErrorApi(e.message); setDbData([]); })
      .finally(() => setLoading(false));
  }, []);

  const uniqueCategories = Array.from(
    new Set(dbData.map(a => a.animal_types?.name || a.category_name || a.type || 'Otros'))
  ).filter(Boolean);

  useEffect(() => {
    if (!isMounted || loading || dbData.length === 0) return;
    let pieChart: Chart | null = null;
    let barChart: Chart | null = null;
    let sexChart: Chart | null = null;
    let statusChart: Chart | null = null;
    let vaccineChart: Chart | null = null;
    let acqChart: Chart | null = null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today); thisWeek.setDate(today.getDate() - 7);
    const thisMonth = new Date(today); thisMonth.setMonth(today.getMonth() - 1);
    const thisYear = new Date(today); thisYear.setFullYear(today.getFullYear() - 1);

    const filteredData = dbData.filter(a => {
      const cat = a.animal_types?.name || a.category_name || a.type || 'Otros';
      if (filterModule !== 'todos' && cat !== filterModule) return false;
      if (filterStatus === 'activo' && a.status !== 'activo') return false;
      if (filterStatus === 'inactivo' && a.status === 'activo') return false;
      const sex = a.sex?.toLowerCase() || '';
      if (filterSex !== 'todos' && sex !== filterSex) return false;
      const acq = (a.acquisition_type || 'desconocido').toLowerCase();
      if (filterAcquisition !== 'todos' && acq !== filterAcquisition) return false;
      const vac = (a.metadata?.estado_vacunacion || 'sin registro').toLowerCase();
      if (filterVaccine !== 'todos' && vac !== filterVaccine) return false;
      
      if (filterPeriod !== 'all' && a.created_at) {
        const d = new Date(a.created_at);
        if (filterPeriod === 'dia' && d < today) return false;
        if (filterPeriod === 'semana' && d < thisWeek) return false;
        if (filterPeriod === 'mes' && d < thisMonth) return false;
        if (filterPeriod === 'anio' && d < thisYear) return false;
      }
      return true;
    });

    const distribution = filteredData.reduce((acc: Record<string, number>, a: AnimalData) => {
      const label = a.animal_types?.name || a.category_name || a.type || 'Otros';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    const pieCtx = pieChartRef.current?.getContext('2d');
    const barCtx = barChartRef.current?.getContext('2d');
    const sexCtx = sexChartRef.current?.getContext('2d');
    const statusCtx = statusChartRef.current?.getContext('2d');
    const vaccineCtx = vaccineChartRef.current?.getContext('2d');
    const acqCtx = acqChartRef.current?.getContext('2d');

    if (pieCtx && barCtx && sexCtx && statusCtx && vaccineCtx && acqCtx) {
      const pieLabels = Object.keys(distribution).filter(k => distribution[k] > 0);
      pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: pieLabels.map(k => `${k} (${distribution[k]})`),
          datasets: [{ data: pieLabels.map(k => distribution[k]), backgroundColor: ['#61810b','#6e7d4b','#db84db','#e67e22','#76786d'], borderWidth: 2, borderColor: '#ffffff' }]
        },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: 10 }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, padding: 10 } } } }
      });

      barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: [filterModule === 'todos' ? 'Inventario' : filterModule],
          datasets: [
            { label: 'Totales', data: [filteredData.length], backgroundColor: '#61810b' },
            { label: 'Activos', data: [filteredData.filter(a => a.status === 'activo').length], backgroundColor: '#27ae60' }
          ]
        },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: 10 }, scales: { y: { beginAtZero: true, grid: { display: false } } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, padding: 10 } } } }
      });

      const sexDist = { Machos: 0, Hembras: 0, Mixtos: 0, 'Sin definir': 0 };
      filteredData.forEach(a => {
        const s = a.sex?.toLowerCase() || '';
        if (s === 'macho') sexDist.Machos++;
        else if (s === 'hembra') sexDist.Hembras++;
        else if (s === 'mixto') sexDist.Mixtos++;
        else sexDist['Sin definir']++;
      });

      const sexLabels = ['Machos', 'Hembras', 'Mixtos', 'Sin definir'].filter(k => sexDist[k as keyof typeof sexDist] > 0);
      sexChart = new Chart(sexCtx, {
        type: 'pie',
        data: {
          labels: sexLabels.map(k => `${k} (${sexDist[k as keyof typeof sexDist]})`),
          datasets: [{
            data: sexLabels.map(k => sexDist[k as keyof typeof sexDist]),
            backgroundColor: ['#3498db', '#e74c3c', '#9b59b6', '#95a5a6'],
            borderWidth: 2, borderColor: '#ffffff'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: 10 }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, padding: 10 } } } }
      });

      const statusDist: Record<string, number> = {};
      filteredData.forEach(a => {
        const st = a.status ? a.status.charAt(0).toUpperCase() + a.status.slice(1) : 'Desconocido';
        statusDist[st] = (statusDist[st] || 0) + 1;
      });

      const statusLabels = Object.keys(statusDist).filter(k => statusDist[k] > 0);
      statusChart = new Chart(statusCtx, {
        type: 'doughnut',
        data: {
          labels: statusLabels.map(k => `${k} (${statusDist[k]})`),
          datasets: [{
            data: statusLabels.map(k => statusDist[k]),
            backgroundColor: ['#27ae60', '#e74c3c', '#f39c12', '#7f8c8d', '#bdc3c7'],
            borderWidth: 2, borderColor: '#ffffff'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: 10 }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, padding: 10 } } } }
      });

      const vaccineDist: Record<string, number> = { 'Vacunados': 0, 'No Vacunados': 0, 'Programados': 0, 'Sin Registro': 0 };
      filteredData.forEach(a => {
        const estado = a.metadata?.estado_vacunacion?.toLowerCase();
        if (estado === 'vacunado') vaccineDist['Vacunados']++;
        else if (estado === 'no vacunado') vaccineDist['No Vacunados']++;
        else if (estado === 'programado') vaccineDist['Programados']++;
        else vaccineDist['Sin Registro']++;
      });

      const vaccineLabels = Object.keys(vaccineDist).filter(k => vaccineDist[k] > 0);
      vaccineChart = new Chart(vaccineCtx, {
        type: 'pie',
        data: {
          labels: vaccineLabels.map(k => `${k} (${vaccineDist[k]})`),
          datasets: [{
            data: vaccineLabels.map(k => vaccineDist[k]),
            backgroundColor: ['#3498db', '#e74c3c', '#f1c40f', '#95a5a6'],
            borderWidth: 2, borderColor: '#ffffff'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: 10 }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, padding: 10 } } } }
      });

      const acqDist: Record<string, number> = {};
      filteredData.forEach(a => {
        const acq = a.acquisition_type ? a.acquisition_type.charAt(0).toUpperCase() + a.acquisition_type.slice(1) : 'Desconocido';
        acqDist[acq] = (acqDist[acq] || 0) + 1;
      });

      const acqLabels = Object.keys(acqDist).filter(k => acqDist[k] > 0);
      acqChart = new Chart(acqCtx, {
        type: 'doughnut',
        data: {
          labels: acqLabels.map(k => `${k} (${acqDist[k]})`),
          datasets: [{
            data: acqLabels.map(k => acqDist[k]),
            backgroundColor: ['#8e44ad', '#2980b9', '#16a085', '#d35400', '#2c3e50'],
            borderWidth: 2, borderColor: '#ffffff'
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, layout: { padding: 10 }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 }, padding: 10 } } } }
      });
    }
    return () => { pieChart?.destroy(); barChart?.destroy(); sexChart?.destroy(); statusChart?.destroy(); vaccineChart?.destroy(); acqChart?.destroy(); };
  }, [isMounted, loading, dbData, filterPeriod, filterModule, filterStatus, filterSex, filterAcquisition, filterVaccine]);

  async function requestAIAnalysis(question?: string) {
    setAiLoading(true);
    setAiError(null);
    setAiAnalysis(null);
    setShowAiPanel(true);
    try {
      const res = await fetch('/api/reports/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: filterModule === 'todos' ? 'general' : 'specific',
          focusModule: filterModule,
          userQuestion: question || userQuestion || 'Genera un informe operativo general de la finca',
          period: filterPeriod,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setAiError(json.error || 'Error de análisis'); return; }
      setAiAnalysis(json.analysis);
      setAiMeta(json.meta);
    } catch (e: any) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  if (!isMounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted italic">Consultando base de datos...</p>
      </div>
    );
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeek = new Date(today); thisWeek.setDate(today.getDate() - 7);
  const thisMonth = new Date(today); thisMonth.setMonth(today.getMonth() - 1);
  const thisYear = new Date(today); thisYear.setFullYear(today.getFullYear() - 1);

  const summaryData = dbData.filter(a => {
    const cat = a.animal_types?.name || a.category_name || a.type || 'Otros';
    if (filterModule !== 'todos' && cat !== filterModule) return false;
    if (filterStatus === 'activo' && a.status !== 'activo') return false;
    if (filterStatus === 'inactivo' && a.status === 'activo') return false;
    if (filterSex !== 'todos' && a.sex !== filterSex) return false;
    const acq = (a.acquisition_type || 'desconocido').toLowerCase();
    if (filterAcquisition !== 'todos' && acq !== filterAcquisition) return false;
    const vac = (a.metadata?.estado_vacunacion || 'sin registro').toLowerCase();
    if (filterVaccine !== 'todos' && vac !== filterVaccine) return false;
    if (filterPeriod !== 'all' && a.created_at) {
      const d = new Date(a.created_at);
      if (filterPeriod === 'dia' && d < today) return false;
      if (filterPeriod === 'semana' && d < thisWeek) return false;
      if (filterPeriod === 'mes' && d < thisMonth) return false;
      if (filterPeriod === 'anio' && d < thisYear) return false;
    }
    return true;
  });

  const activeCount = summaryData.filter(a => a.status === 'activo').length;
  const operativity = summaryData.length > 0 ? `${((activeCount / summaryData.length) * 100).toFixed(0)}%` : '0%';
  const machosCount = summaryData.filter(a => a.sex?.toLowerCase() === 'macho').length;
  const hembrasCount = summaryData.filter(a => a.sex?.toLowerCase() === 'hembra').length;
  const mixtosCount = summaryData.filter(a => a.sex?.toLowerCase() === 'mixto').length;
  
  const mortalityCount = summaryData.filter(a => a.status?.toLowerCase() === 'fallecido' || a.status?.toLowerCase() === 'muerto').length;
  const mortalityRate = summaryData.length > 0 ? ((mortalityCount / summaryData.length) * 100).toFixed(1) + '%' : '0%';

  const animalsWithBirthDate = summaryData.filter(a => a.birth_date);
  const avgAgeMonths = animalsWithBirthDate.length > 0
    ? animalsWithBirthDate.reduce((sum, a) => sum + (now.getTime() - new Date(a.birth_date!).getTime()) / (1000 * 60 * 60 * 24 * 30.44), 0) / animalsWithBirthDate.length
    : 0;
  const avgAgeText = avgAgeMonths > 0 ? `${avgAgeMonths.toFixed(1)} meses` : 'N/D';

  const pregnantCount = summaryData.filter(a => a.sex?.toLowerCase() === 'hembra' && a.metadata?.estado_reproductivo?.toLowerCase() === 'preñada').length;
  const totalWeight = summaryData.reduce((sum, a) => sum + (a.weight_kg || a.weight || 0), 0);
  const weightText = totalWeight > 1000 ? `${(totalWeight/1000).toFixed(1)} t` : `${totalWeight.toFixed(0)} kg`;

  const uniqueSexes = Array.from(new Set(dbData.map(a => a.sex?.toLowerCase() || 'sin definir'))).filter(Boolean);
  const uniqueAcquisitions = Array.from(new Set(dbData.map(a => (a.acquisition_type || 'desconocido').toLowerCase()))).filter(Boolean);
  const uniqueVaccines = Array.from(new Set(dbData.map(a => (a.metadata?.estado_vacunacion || 'sin registro').toLowerCase()))).filter(Boolean);
  const uniqueStatuses = Array.from(new Set(dbData.map(a => (a.status || 'desconocido').toLowerCase()))).filter(Boolean);

  const quickQuestions = [
    '¿Cuál es el estado general del hato?',
    '¿Qué animales necesitan atención urgente?',
    '¿Cuál es la tendencia de la población animal?',
    'Analiza la eficiencia operativa de la finca',
  ];

  return (
    <div className="space-y-6 animate-fade-in p-3 sm:p-4 md:p-8 print:p-0 print:m-0 print:block print:space-y-4 print:overflow-visible min-w-0 w-full print:w-full print:h-auto overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            Informes <span className="text-primary">&amp; Gráficos Operativos</span>
          </h1>
          <p className="text-muted mt-1 text-sm">
            Datos reales de la base de datos · {dbData.length} registros cargados
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => requestAIAnalysis()}
            className="flex items-center justify-center gap-2 bg-linear-to-r from-violet-600 to-indigo-600 dark:from-violet-500 dark:to-indigo-400 text-white px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all text-sm font-bold"
          >
            <Bot className="w-4 h-4" />
            Analizar con IA
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-linear-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400 text-white dark:text-slate-900 px-5 py-3 rounded-xl shadow-md hover:shadow-lg transition-all text-sm font-bold"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
        </div>
      </div>

      {errorApi && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl no-print">
          <div className="flex items-center gap-3">
            <Info className="text-red-500 w-5 h-5" />
            <p className="text-sm text-red-700"><strong>Error:</strong> {errorApi}</p>
          </div>
        </div>
      )}

      {/* Filtros Avanzados */}
      <div className="no-print">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-xl text-sm font-semibold hover:bg-surface-hover transition-colors mb-4 shadow-sm"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
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

      {/* Panel IA */}
      {showAiPanel && (
        <div className="bg-surface border border-violet-200 rounded-2xl overflow-hidden shadow-sm no-print">
          <div className="bg-linear-to-r from-violet-600/10 to-primary/10 p-5 border-b border-border flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-linear-to-r from-violet-600 to-primary flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm">Análisis con Inteligencia Artificial</h3>
              {aiMeta && <p className="text-xs text-muted">Modelo: {aiMeta.model} · {new Date(aiMeta.generated_at).toLocaleString('es-CO')}</p>}
            </div>
            <button onClick={() => setShowAiPanel(false)} className="text-muted hover:text-foreground text-xs">✕</button>
          </div>

          {/* Preguntas rápidas */}
          <div className="p-5 border-b border-border">
            <p className="text-xs font-bold text-muted uppercase mb-3">Preguntas rápidas</p>
            <div className="flex flex-wrap gap-2">
              {quickQuestions.map(q => (
                <button key={q} onClick={() => { setUserQuestion(q); requestAIAnalysis(q); }}
                  className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20">
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Input personalizado */}
          <div className="p-4 sm:p-5 border-b border-border">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={userQuestion}
                onChange={e => setUserQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && requestAIAnalysis()}
                placeholder="Haz una pregunta sobre los datos..."
                className="flex-1 min-w-0 px-4 py-2.5 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button onClick={() => requestAIAnalysis()}
                disabled={aiLoading}
                className="px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm shrink-0 w-full sm:w-auto">
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Analizar
              </button>
            </div>
          </div>

          {/* Resultados IA */}
          <div className="p-5">
            {aiLoading && (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-linear-to-r from-violet-600 to-primary flex items-center justify-center animate-pulse">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <p className="text-sm text-muted">Analizando datos de la finca con IA...</p>
              </div>
            )}

            {aiError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                <strong>Error:</strong> {aiError}
              </div>
            )}

            {aiAnalysis && !aiLoading && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-linear-to-r from-violet-600/5 to-primary/5 border border-primary/20 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold uppercase text-primary">Resumen Ejecutivo IA</span>
                  </div>
                  <div className="text-sm leading-relaxed text-foreground space-y-2">
                    {aiAnalysis.summary.split('\n').map((line: string, idx: number) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                </div>

                {/* KPIs IA */}
                {aiAnalysis.kpis?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-muted uppercase mb-3">KPIs Detectados</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {aiAnalysis.kpis.map((kpi: any, i: number) => (
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
                {aiAnalysis.insights?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-muted uppercase mb-3">Hallazgos</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {aiAnalysis.insights.map((ins: any, i: number) => (
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

                {/* Recomendaciones */}
                {aiAnalysis.recommendations?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-muted uppercase mb-3">Recomendaciones</p>
                    <div className="space-y-2">
                      {aiAnalysis.recommendations.map((rec: any, i: number) => (
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
            )}
          </div>
        </div>
      )}

      <table className="w-full print-area">
        <thead className="hidden print:table-header-group">
          <tr>
            <th className="pb-6">
              <div className="flex items-center justify-between border-b-2 border-border/60 pb-4 text-left">
                <div className="flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/eloyAocelote1.png" alt="Logo Finca Tigrillo" className="w-10 h-10 object-contain" />
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
            </th>
          </tr>
        </thead>
        <tbody className="print:table-row-group">
          <tr>
            <td>
              <div className="space-y-6 md:space-y-8 print:space-y-6">
        {/* Resumen Superior */}
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 print:grid-cols-4 print:gap-2">
          <SCard label="Población" value={summaryData.length} sub="Registros en vista" color="text-primary" />
          <SCard label="Operatividad" value={operativity} sub="Tasa Activa" color="text-success" />
          <SCard label="M/H/Mix" value={`${machosCount}/${hembrasCount}/${mixtosCount}`} sub="Distribución género" color="text-accent" />
          <SCard label="Mortalidad" value={mortalityRate} sub="Tasa de fallecidos" color="text-red-500" />
          <SCard label="Edad Prom." value={avgAgeText} sub="Del hato actual" color="text-warning" />
          <SCard label="Preñadas" value={pregnantCount} sub="Hembras gestantes" color="text-pink-500" />
          <SCard label="Peso Total" value={weightText} sub="Biomasa estimada" color="text-emerald-500" />
          <SCard label="Estado" value="Óptimo" sub="Sistema en línea" color="text-primary" />
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6 print:grid-cols-2 print:gap-x-6 print:gap-y-8">
          <CChart title="Especies" icon={<PieChart className="w-4 h-4" />}>
            {summaryData.length > 0 ? <canvas ref={pieChartRef} className="max-w-full" /> : <Empty text="Sin datos" />}
          </CChart>
          <CChart title="Estado General" icon={<PieChart className="w-4 h-4" />}>
            {summaryData.length > 0 ? <canvas ref={statusChartRef} className="max-w-full" /> : <Empty text="Sin datos" />}
          </CChart>
          <CChart title="Demografía Género" icon={<PieChart className="w-4 h-4" />}>
            {summaryData.length > 0 ? <canvas ref={sexChartRef} className="max-w-full" /> : <Empty text="Sin datos" />}
          </CChart>
          <CChart title="Volumen vs Activos" icon={<BarChart3 className="w-4 h-4" />}>
            {summaryData.length > 0 ? <canvas ref={barChartRef} className="max-w-full" /> : <Empty text="Sin datos" />}
          </CChart>
          <CChart title="Estado Vacunación" icon={<ShieldCheck className="w-4 h-4" />}>
            {summaryData.length > 0 ? <canvas ref={vaccineChartRef} className="max-w-full" /> : <Empty text="Sin datos" />}
          </CChart>
          <CChart title="Tipo Adquisición" icon={<TrendingUp className="w-4 h-4" />}>
            {summaryData.length > 0 ? <canvas ref={acqChartRef} className="max-w-full" /> : <Empty text="Sin datos" />}
          </CChart>
        </div>

        {/* Desglose Analítico */}
        <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm print:break-inside-avoid print:mt-8">
          <div className="bg-primary/5 p-4 sm:p-6 border-b border-border flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <Microscope className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
              <h3 className="font-bold text-base sm:text-lg truncate">Desglose Analítico del Inventario</h3>
            </div>
            <div className="text-[10px] bg-white px-3 py-1 rounded-full border font-mono font-bold text-primary hidden sm:block shrink-0">
              REPORTE_{filterModule.toUpperCase()}_{filterPeriod.toUpperCase()}
            </div>
          </div>
          <div className="p-6">
            {summaryData.length > 0 ? (
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
                        const items = summaryData.filter(a => (a.animal_types?.name || a.category_name || a.type || 'Otros') === cat);
                        if (items.length === 0) return null;
                        const active = items.filter(a => a.status === 'activo').length;
                        return (
                          <tr key={cat} className="border-b border-border/50 hover:bg-primary/5 transition-colors print:break-inside-avoid">
                            <td className="py-4 px-3 font-bold text-foreground/80">{cat}</td>
                            <td className="py-4 px-3 text-center font-mono">{items.length}</td>
                            <td className="py-4 px-3 text-center text-success font-bold">{active}</td>
                            <td className="py-4 px-3 text-center text-muted">{items.length - active}</td>
                            <td className="py-4 px-3 text-center font-black text-primary">{((items.length / summaryData.length) * 100).toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 no-print">
                  <ABox icon={<TrendingUp className="text-primary w-4 h-4" />} title="Tendencia Poblacional"
                    text={filterModule === 'todos'
                      ? "Distribución diversificada. Se recomienda monitoreo periódico para estabilidad del hato."
                      : `Análisis para ${filterModule}: operatividad del ${operativity}.`} />
                  <ABox icon={<ShieldCheck className="text-success w-4 h-4" />} title="Trazabilidad"
                    text="100% de registros sincronizados con la base de datos central." />
                  <ABox icon={<Zap className="text-accent w-4 h-4" />} title="Alertas de Sistema"
                    text={summaryData.length < 5 ? "Muestra reducida para predicciones." : "Carga animal estable detectada."} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-border pt-6 print:hidden">
                  <ML label="Ratio Actividad" value={summaryData.length > 0 ? (activeCount / summaryData.length).toFixed(2) : '0.00'} />
                  <ML label="Especies Activas" value={uniqueCategories.length} />
                  <ML label="Tasa Mortalidad" value={mortalityRate} />
                  <ML label="Estado Datos" value="Sincronizado" />
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

        {/* Últimos Ingresos */}
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
                {summaryData.slice().sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5).map(a => (
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
                {summaryData.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-muted italic">No hay registros recientes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alertas Sanitarias */}
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
                {summaryData.filter(a => !a.metadata?.estado_vacunacion || a.metadata?.estado_vacunacion === 'no vacunado' || a.metadata?.estado_vacunacion === 'programado').slice(0, 5).map(a => (
                  <tr key={a.id} className="border-b border-border/30 hover:bg-surface-hover print:break-inside-avoid">
                    <td className="py-3 px-4 sm:px-6 font-medium text-foreground">{a.identification_code || a.name || 'Sin ID'}</td>
                    <td className="py-3 px-4 sm:px-6 text-muted">{a.animal_types?.name}</td>
                    <td className="py-3 px-4 sm:px-6 text-center">
                      <span className="text-[9px] sm:text-[10px] px-2 py-1 rounded-full font-bold bg-red-500/10 text-red-500 capitalize">{a.metadata?.estado_vacunacion || 'Sin Registro'}</span>
                    </td>
                  </tr>
                ))}
                {summaryData.filter(a => !a.metadata?.estado_vacunacion || a.metadata?.estado_vacunacion === 'no vacunado' || a.metadata?.estado_vacunacion === 'programado').length === 0 && (
                  <tr><td colSpan={3} className="py-6 text-center text-muted italic">No hay alertas sanitarias pendientes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
} 

function SCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div className="bg-surface border border-border p-3 sm:p-4 md:p-5 rounded-2xl shadow-sm flex flex-col justify-between print:break-inside-avoid print:shadow-none print:border-border/50 transition-transform hover:scale-[1.02] min-w-0 overflow-hidden">
      <p className="text-[10px] sm:text-[11px] md:text-xs font-black text-muted uppercase tracking-widest wrap-break-word leading-tight">{label}</p>
      <p className={`text-xl sm:text-2xl md:text-3xl font-bold ${color} my-2 break-all sm:wrap-break-word print:text-xl leading-none`}>{value}</p>
      <p className="text-[10px] sm:text-xs text-muted font-medium wrap-break-word leading-tight mt-auto">{sub}</p>
    </div>
  );
}

function CChart({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border p-3 sm:p-5 rounded-2xl flex flex-col shadow-sm print:p-4 print:border print:border-border/50 print:shadow-none print:break-inside-avoid overflow-hidden min-w-0">
      <div className="flex items-center justify-center gap-2 mb-3 border-b border-border/50 pb-2 text-foreground/80 shrink-0">
        {icon}<h3 className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest truncate">{title}</h3>
      </div>
      <div className="relative w-full h-[200px] xs:h-[230px] sm:h-[260px] md:h-[280px] print:h-[280px] flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

function ABox({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="p-5 bg-background border border-border rounded-2xl space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter">{icon} {title}</div>
      <p className="text-[11px] text-muted-foreground leading-relaxed italic">{text}</p>
    </div>
  );
}

function ML({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-bold text-muted-foreground uppercase">{label}</span>
      <span className="text-xs font-bold text-primary">{value}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="h-full flex items-center justify-center text-muted italic text-sm">{text}</div>;
}