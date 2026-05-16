'use client'

import React, { useState, useEffect, useRef } from 'react'
import {
  Calculator, Baby, Wheat, Egg, HeartPulse, Scale, Info,
} from 'lucide-react'

// ─── Sistema de unidades de peso ───────────────────────────────
export type WeightUnit = 'gr' | 'kg' | 'lb'

export const WEIGHT_UNITS: { value: WeightUnit; label: string; symbol: string; fromKg: (v: number) => number; toKg: (v: number) => number }[] = [
  { value: 'gr',     label: 'Gramos',      symbol: 'g',   fromKg: v => v * 1000,    toKg: v => v / 1000 },
  { value: 'kg',     label: 'Kilogramos',  symbol: 'kg',  fromKg: v => v,            toKg: v => v },
  { value: 'lb',     label: 'Libras',      symbol: 'lb',  fromKg: v => v * 2.20462,  toKg: v => v / 2.20462 },
]

import {
  calcFechaParto, calcConsumoDiario, calcSacosSemanales,
  calcProduccionHuevosSemanal, calcIntervaloEntreParto,
  calcTasaPrenez, calcFCR,
  GESTATION_DAYS, DEFAULT_SACK_WEIGHT_KG, DEFAULT_EGG_PRODUCTION_PER_DAY,
  SPECIES_LABELS,
} from '@/lib/formulas'

/* ──────────── helpers de fecha ──────────── */
function fmtDate(d: Date | null | string) {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function toIso(d: Date) { return d.toISOString().split('T')[0] }

/* ════════════════════════════════════════
   PÁGINA PRINCIPAL
   ════════════════════════════════════════ */
export default function CalculatorsClient({ isAdmin: _isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="space-y-6 overflow-hidden min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground flex items-center gap-3">
          <Calculator className="w-7 h-7 text-primary" />
          Calculadoras
        </h1>
        <p className="text-muted mt-1 text-sm">Herramientas de gestión ganadera con fórmulas del sector pecuario</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CalcParto />
        <CalcAlimento />
        <CalcHuevos />
        <CalcReproductivo />
        <CalcFCRCard />
      </div>
    </div>
  )
}

/* ─── Calculadora de Parto ─── */
function CalcParto() {
  const [species, setSpecies] = useState('bovino')
  const [date, setDate] = useState(toIso(new Date()))
  const result = calcFechaParto(new Date(date + 'T12:00:00'), species)

  const isOviparous = species === 'aves-de-corral' || species === 'patos'
  const periodLabel = isOviparous ? 'Incubación' : 'Gestación'

  return (
    <CalcCard title="Calculadora de Parto" icon={<Baby className="w-5 h-5 text-primary" />}
      hint={`${periodLabel} ${SPECIES_LABELS[species]}: ${GESTATION_DAYS[species]} días`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Especie</label>
          <select value={species} onChange={e => setSpecies(e.target.value)} className="input-calc">
            {Object.entries(SPECIES_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <DateField label="Fecha de Monta" value={date} onChange={setDate} />
      </div>
      <ResultBox
        label={(species === 'aves-de-corral' || species === 'patos') ? 'Fecha estimada de eclosión' : 'Fecha estimada de parto'}
        value={fmtDate(result)} accent />
    </CalcCard>
  )
}

/* ─── Calculadora de Alimento ─── */
function CalcAlimento() {
  const [weightUnit, setWeightUnit] = useState<WeightUnit>('kg')
  const prevUnitRef = useRef(weightUnit)

  const [species, setSpecies] = useState('bovino')
  const [count, setCount] = useState(10)
  const [weightInUnit, setWeightInUnit] = useState(450)
  const [sackInUnit, setSackInUnit] = useState(DEFAULT_SACK_WEIGHT_KG)

  useEffect(() => {
    if (prevUnitRef.current !== weightUnit) {
      const oldDef = WEIGHT_UNITS.find(u => u.value === prevUnitRef.current)!
      const newDef = WEIGHT_UNITS.find(u => u.value === weightUnit)!

      const wKg = oldDef.toKg(weightInUnit)
      const sKg = oldDef.toKg(sackInUnit)

      setWeightInUnit(Number(newDef.fromKg(wKg).toFixed(2)))
      setSackInUnit(Number(newDef.fromKg(sKg).toFixed(2)))

      prevUnitRef.current = weightUnit
    }
  }, [weightUnit, weightInUnit, sackInUnit])

  const unitDef = WEIGHT_UNITS.find(u => u.value === weightUnit)!
  const weightKg = unitDef.toKg(weightInUnit)
  const sackKg   = unitDef.toKg(sackInUnit)

  const dailyKg  = calcConsumoDiario(weightKg, species)
  const dailyU   = unitDef.fromKg(dailyKg)
  const totalKgW = count * dailyKg * 7
  const totalU   = unitDef.fromKg(totalKgW)
  const sacks    = calcSacosSemanales(count, dailyKg, sackKg)

  const sym = unitDef.symbol

  return (
    <CalcCard title="Consumo de Alimento" icon={<Wheat className="w-5 h-5 text-primary" />}
      hint="Basado en % Materia Seca Ingerida (DMI)">
      <div className="flex gap-2 bg-surface border border-border p-1.5 rounded-xl w-fit mb-1">
        {WEIGHT_UNITS.map(u => (
          <button key={u.value} onClick={() => setWeightUnit(u.value)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              weightUnit === u.value ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-background'
            }`}>
            {u.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted mb-1">Especie</label>
          <select value={species} onChange={e => setSpecies(e.target.value)} className="input-calc">
            {Object.entries(SPECIES_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <NumField label="Cantidad animales" value={count} onChange={setCount} min={1} />
        {species !== 'aves-de-corral' && (
          <NumField label={`Peso promedio (${sym})`} value={weightInUnit} onChange={setWeightInUnit} min={0} />
        )}
        <NumField label={`Peso saco (${sym})`} value={sackInUnit} onChange={setSackInUnit} min={0} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        <ResultBox label={`${sym}/animal/día`} value={`${dailyU.toFixed(2)} ${sym}`} />
        <ResultBox label="Total semanal"        value={`${totalU.toFixed(1)} ${sym}`} />
        <div className="col-span-2 md:col-span-1">
          <ResultBox label="Sacos/semana" value={`${sacks}`} accent />
        </div>
      </div>
    </CalcCard>
  )
}

/* ─── Calculadora de Huevos ─── */
function CalcHuevos() {
  const [hens, setHens] = useState(50)
  const [rate, setRate] = useState(DEFAULT_EGG_PRODUCTION_PER_DAY)
  const weekly = calcProduccionHuevosSemanal(hens, rate)

  return (
    <CalcCard title="Producción de Huevos" icon={<Egg className="w-5 h-5 text-primary" />}
      hint="Gallina ponedora comercial: ~0.75 huevos/día">
      <div className="grid grid-cols-2 gap-3">
        <NumField label="Gallinas ponedoras" value={hens} onChange={setHens} min={1} />
        <NumField label="Tasa huevo/día" value={rate} onChange={setRate} min={0} step="0.05" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ResultBox label="Huevos/semana"     value={`${weekly}`} accent />
        <ResultBox label="Huevos/mes (est.)" value={`${Math.round(weekly * 4.33)}`} />
      </div>
    </CalcCard>
  )
}

/* ─── Indicadores Reproductivos ─── */
function CalcReproductivo() {
  const [pregnant, setPregnant] = useState(18)
  const [exposed, setExposed]   = useState(25)
  const [d1, setD1] = useState('2025-01-15')
  const [d2, setD2] = useState('2026-02-20')

  const rate     = calcTasaPrenez(pregnant, exposed)
  const interval = calcIntervaloEntreParto(new Date(d1 + 'T12:00:00'), new Date(d2 + 'T12:00:00'))

  return (
    <CalcCard title="Indicadores Reproductivos" icon={<HeartPulse className="w-5 h-5 text-primary" />}
      hint="Meta bovina: preñez ≥60%, intervalo ≤365 días">
      <div className="grid grid-cols-2 gap-3">
        <NumField label="Hembras preñadas"  value={pregnant} onChange={setPregnant} min={0} />
        <NumField label="Hembras expuestas" value={exposed}  onChange={setExposed}  min={1} />
        <DateField label="Parto anterior" value={d1} onChange={setD1} />
        <DateField label="Parto actual"   value={d2} onChange={setD2} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <ResultBox label="Tasa de preñez"  value={`${rate.toFixed(1)}%`}     accent={rate >= 60}      warn={rate < 60} />
        <ResultBox label="Intervalo partos" value={`${interval} días`}        accent={interval <= 365}  warn={interval > 365} />
      </div>
    </CalcCard>
  )
}

/* ─── FCR ─── */
function CalcFCRCard() {
  const [feed, setFeed] = useState(1200)
  const [gain, setGain] = useState(350)
  const fcr = calcFCR(feed, gain)

  return (
    <CalcCard title="Conversión Alimenticia (FCR)" icon={<Scale className="w-5 h-5 text-primary" />}
      hint="Ref: Pollo 1.6–2.0 | Porcino 2.5–3.5 | Bovino 6–10">
      <div className="grid grid-cols-2 gap-3">
        <NumField label="Alimento total (kg)" value={feed} onChange={setFeed} min={0} />
        <NumField label="Peso ganado (kg)"    value={gain} onChange={setGain} min={0} />
      </div>
      <ResultBox label="FCR (menor = más eficiente)" value={fcr > 0 ? fcr.toFixed(2) : '—'} accent />
    </CalcCard>
  )
}

/* ════════════════════════════════════════
   COMPONENTES REUTILIZABLES
   ════════════════════════════════════════ */
function CalcCard({ title, icon, hint, children }: {
  title: string; icon: React.ReactNode; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">{icon}<h3 className="font-semibold text-foreground">{title}</h3></div>
        {hint && <p className="text-xs text-muted flex items-center gap-1"><Info className="w-3 h-3" />{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function ResultBox({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className={`rounded-xl px-3 py-2.5 border ${warn ? 'bg-warning/5 border-warning/20' : accent ? 'bg-primary/5 border-primary/20' : 'bg-background border-border'}`}>
      <p className="text-[10px] font-bold text-muted uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold ${warn ? 'text-warning' : accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
    </div>
  )
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1">{label}</label>
      <input type="date" value={value} onChange={e => onChange(e.target.value)} className="input-calc" />
    </div>
  )
}

function NumField({ label, value, onChange, min, step = "1" }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; step?: string
}) {
  const [inputValue, setInputValue] = useState(value.toString())

  useEffect(() => {
    if (parseFloat(inputValue) !== value) {
      setInputValue(value.toString())
    }
  }, [value])

  return (
    <div>
      <label className="block text-xs font-medium text-muted mb-1">{label}</label>
      <input
        type="number"
        min={min}
        step={step}
        value={inputValue}
        onChange={e => {
          let val = e.target.value
          if (inputValue === "0" && val.length > 1 && val.startsWith("0")) {
            val = val.substring(1)
          }
          setInputValue(val)
          onChange(val === '' ? 0 : +val)
        }}
        onBlur={() => {
          if (inputValue === "" || inputValue === "-") {
            setInputValue("0")
            onChange(0)
          }
        }}
        onFocus={e => e.target.select()}
        className="input-calc"
      />
    </div>
  )
}
