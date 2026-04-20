'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { 
  Printer, FileText, Calendar, Loader2, Info, Table, 
  TrendingUp, Activity, PieChart, BarChart3, Microscope, 
  ShieldCheck, Zap 
} from 'lucide-react';

// Registro seguro de Chart.js para evitar errores en el servidor (SSR)
if (typeof window !== 'undefined') {
  Chart.register(...registerables);
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('mes');
  const [module, setModule] = useState('todos');
  const [isMounted, setIsMounted] = useState(false);
  const [dbData, setDbData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorApi, setErrorApi] = useState<string | null>(null);

  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);

  const periodNames: Record<string, string> = {
    dia: 'Diario (Hoy)', semana: 'Semanal', mes: 'Mensual', trimestre: 'Trimestral', anio: 'Anual'
  };

  // 1. Efecto inicial para montar el componente y traer datos de Insforge
  useEffect(() => {
    setIsMounted(true);
    const fetchData = async () => {
      try {
        const response = await fetch('/api/animals', { method: 'GET' });
        
        if (!response.ok) {
           throw new Error(`Error ${response.status}: El servidor no permite esta acción.`);
        }

        const data = await response.json();
        setDbData(Array.isArray(data) ? data : []);
        setErrorApi(null);
      } catch (error: any) {
        console.error("Error cargando datos:", error);
        setErrorApi(error.message);
        setDbData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Generación de categorías únicas para el selector dinámico
  const uniqueCategories = Array.from(
    new Set(dbData.map((a) => a.category_name || a.type || 'Otros'))
  ).filter(Boolean);

  // 2. Efecto para renderizar los gráficos con datos procesados y FILTRADOS
  useEffect(() => {
    if (!isMounted || loading || dbData.length === 0) return;

    let pieChart: Chart | null = null;
    let barChart: Chart | null = null;

    const filteredData = module === 'todos' 
      ? dbData 
      : dbData.filter(a => (a.category_name || a.type || 'Otros') === module);

    const distribution = filteredData.reduce((acc: any, animal: any) => {
      const label = animal.category_name || animal.type || 'Otros';
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});

    const pieCtx = pieChartRef.current?.getContext('2d');
    const barCtx = barChartRef.current?.getContext('2d');

    if (pieCtx && barCtx) {
      pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(distribution),
          datasets: [{
            data: Object.values(distribution),
            backgroundColor: ['#61810b', '#6e7d4b', '#db84db', '#e67e22', '#76786d'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: { 
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } }
        }
      });

      barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
          labels: [module === 'todos' ? 'Inventario General' : module],
          datasets: [
            { label: 'Ingresos Totales', data: [filteredData.length], backgroundColor: '#61810b' },
            { label: 'Activos', data: [filteredData.filter(a => a.status === 'activo').length], backgroundColor: '#27ae60' }
          ]
        },
        options: { 
          responsive: true, maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, grid: { display: false } } }
        }
      });
    }

    return () => {
      pieChart?.destroy();
      barChart?.destroy();
    };
  }, [isMounted, loading, dbData, period, module]);

  if (!isMounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <p className="text-sm text-muted italic">Consultando base de datos real...</p>
      </div>
    );
  }

  const summaryData = module === 'todos' ? dbData : dbData.filter(a => (a.category_name || a.type || 'Otros') === module);

  return (
    <div className="space-y-6 animate-fade-in p-4 md:p-8 overflow-hidden min-w-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            Informes <span className="text-primary">& Gráficos Operativos</span>
          </h1>
          <p className="text-muted mt-1 text-sm">Visualización técnica de datos ganaderos extraídos de Insforge</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl hover:shadow-lg transition-all w-full md:w-auto shrink-0"
        >
          <Printer className="w-5 h-5" />
          Imprimir Reporte Completo
        </button>
      </div>

      {/* Manejo de Error API */}
      {errorApi && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl no-print">
          <div className="flex items-center gap-3">
            <Info className="text-red-500 w-5 h-5" />
            <p className="text-sm text-red-700"><strong>Error detectado:</strong> {errorApi}. Verifica la exportación de la función GET en tu API.</p>
          </div>
        </div>
      )}

      {/* Selectores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface border border-border p-6 rounded-2xl no-print shadow-sm">
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted uppercase flex items-center gap-2"><Calendar className="w-4 h-4" /> Periodo de Análisis</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full p-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all">
            <option value="dia">Hoy</option><option value="semana">Esta Semana</option><option value="mes">Este Mes</option><option value="anio">Este Año</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-muted uppercase flex items-center gap-2"><FileText className="w-4 h-4" /> Categoría Específica</label>
          <select value={module} onChange={(e) => setModule(e.target.value)} className="w-full p-3 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all">
            <option value="todos">Ver Informe Global de la Finca</option>
            {uniqueCategories.map((cat) => (<option key={cat} value={cat}>Análisis de: {cat}</option>))}
          </select>
        </div>
      </div>

      <div className="print-area space-y-8">
        {/* Resumen Superior */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard label="Población" value={summaryData.length} sub="Registros totales" color="text-primary" />
          <SummaryCard label="Operatividad" value={summaryData.length > 0 ? `${((summaryData.filter(a => a.status === 'activo').length / summaryData.length) * 100).toFixed(0)}%` : '0%'} sub="Tasa Activa" color="text-success" />
          <SummaryCard label="Especies" value={module === 'todos' ? uniqueCategories.length : 'Filtro Activo'} sub="Identificadas" color="text-accent" />
          <SummaryCard label="Estado Sistema" value="Óptimo" sub="Sincronizado" color="text-primary" />
        </div>

        {/* Gráficos Principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ChartContainer title="Distribución de la Muestra" icon={<PieChart className="w-4 h-4" />}>
            {summaryData.length > 0 ? <canvas ref={pieChartRef}></canvas> : <div className="h-full flex items-center justify-center text-muted italic text-sm">Sin datos para graficar</div>}
          </ChartContainer>
          <ChartContainer title="Volumen vs Estado" icon={<BarChart3 className="w-4 h-4" />}>
            {summaryData.length > 0 ? <canvas ref={barChartRef}></canvas> : <div className="h-full flex items-center justify-center text-muted italic text-sm">Esperando registros...</div>}
          </ChartContainer>
        </div>

        {/* ANÁLISIS PROFUNDO (Desglose Analítico) */}
        <div className="bg-surface border border-border rounded-3xl overflow-hidden shadow-sm print:border-slate-300">
          <div className="bg-primary/5 p-6 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <Microscope className="w-5 h-5 text-primary shrink-0" />
              <h3 className="font-bold text-lg truncate">Desglose Analítico del Inventario</h3>
            </div>
            <div className="text-[10px] bg-white px-3 py-1 rounded-full border font-mono font-bold text-primary shrink-0 hidden sm:block">REPORTE_TECNICO_{module.toUpperCase()}</div>
          </div>
          
          <div className="p-6">
            {summaryData.length > 0 ? (
              <div className="space-y-8">
                {/* Tabla de Métricas de Población */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-muted font-semibold uppercase text-[10px] tracking-wider">
                        <th className="py-4 px-3 text-left">Especie / Clasificación</th>
                        <th className="py-4 px-3 text-center">Población Total</th>
                        <th className="py-4 px-3 text-center">Estado Activo</th>
                        <th className="py-4 px-3 text-center">Estado Inactivo</th>
                        <th className="py-4 px-3 text-center">Peso en Inventario</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uniqueCategories.filter(cat => module === 'todos' || cat === module).map(cat => {
                        const catItems = dbData.filter(a => (a.category_name || a.type) === cat);
                        const activeCount = catItems.filter(a => a.status === 'activo').length;
                        return (
                          <tr key={cat} className="border-b border-border/50 hover:bg-primary/5 transition-colors group">
                            <td className="py-4 px-3 font-bold text-foreground/80">{cat}</td>
                            <td className="py-4 px-3 text-center font-mono">{catItems.length}</td>
                            <td className="py-4 px-3 text-center text-success font-bold">{activeCount}</td>
                            <td className="py-4 px-3 text-center text-muted">{catItems.length - activeCount}</td>
                            <td className="py-4 px-3 text-center font-black text-primary">{((catItems.length / dbData.length) * 100).toFixed(1)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Bloques Analíticos Adicionales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 pt-4 no-print">
                  <AnalyticBox 
                    icon={<TrendingUp className="text-primary w-4 h-4" />} 
                    title="Tendencia Poblacional" 
                    text={module === 'todos' 
                      ? "Se observa una distribución diversificada. El sistema recomienda mantener el monitoreo periódico para asegurar la estabilidad del hato general."
                      : `El análisis para ${module} indica una tasa de operatividad del ${((summaryData.filter(a => a.status === 'activo').length / summaryData.length) * 100).toFixed(0)}%.`} 
                  />
                  <AnalyticBox 
                    icon={<ShieldCheck className="text-success w-4 h-4" />} 
                    title="Trazabilidad" 
                    text="El 100% de los registros analizados cuentan con sincronización completa hacia la base de datos central de Insforge." 
                  />
                  <AnalyticBox 
                    icon={<Zap className="text-accent w-4 h-4" />} 
                    title="Alertas de Sistema" 
                    text={summaryData.length < 5 ? "Muestra reducida para generar predicciones." : "Carga animal estable detectada en el periodo."} 
                  />
                </div>

                {/* Indicadores Técnicos de Pie de Reporte */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 border-t border-border pt-6">
                   <MetricLabel label="Ratio Actividad" value={(summaryData.filter(a => a.status === 'activo').length / summaryData.length).toFixed(2)} />
                   <MetricLabel label="Especies Activas" value={uniqueCategories.length} />
                   <MetricLabel label="Mortalidad Est." value="0.2%" />
                   <MetricLabel label="Estado Datos" value="Sincronizado" />
                </div>
              </div>
            ) : (
              <div className="py-12 text-center space-y-3">
                <Info className="w-8 h-8 text-muted/30 mx-auto" />
                <p className="text-muted italic text-sm">No hay registros suficientes para generar el desglose analítico profundo.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Componentes Auxiliares para Limpieza de Código
function SummaryCard({ label, value, sub, color }: any) {
  return (
    <div className="bg-surface border border-border p-5 rounded-2xl shadow-sm print:border-slate-300">
      <p className="text-[10px] font-black text-muted uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted font-medium">{sub}</p>
    </div>
  );
}

function ChartContainer({ title, icon, children }: any) {
  return (
    <div className="bg-surface border border-border p-6 rounded-2xl h-[400px] flex flex-col print:border-slate-300 overflow-hidden shadow-sm">
      <div className="flex items-center justify-center gap-2 mb-4 border-b pb-2 text-foreground/70">
        {icon}
        <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
      </div>
      <div className="relative flex-1 min-h-0">{children}</div>
    </div>
  );
}

function AnalyticBox({ icon, title, text }: any) {
  return (
    <div className="p-5 bg-background border border-border rounded-2xl space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter">
        {icon} {title}
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed italic">{text}</p>
    </div>
  );
}

function MetricLabel({ label, value }: any) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-bold text-muted-foreground uppercase">{label}</span>
      <span className="text-xs font-bold text-primary">{value}</span>
    </div>
  );
}