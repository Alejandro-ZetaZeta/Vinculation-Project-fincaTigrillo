'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'

export function EntryAnimation() {
  const [stage, setStage] = useState(0)
  const [shouldRun, setShouldRun] = useState(false)

  useEffect(() => {
    // Solo correr una vez por sesión
    if (!sessionStorage.getItem('hasSeenEntryAnimation')) {
      setShouldRun(true)
      sessionStorage.setItem('hasSeenEntryAnimation', 'true')
    } else {
      setStage(2)
    }
  }, [])

  useEffect(() => {
    if (!shouldRun) return
    const t1 = setTimeout(() => setStage(1), 1000)
    const t2 = setTimeout(() => setStage(2), 1700)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [shouldRun])

  if (stage === 2) return null

  return (
    <div
      className={`fixed inset-0 z-[99999] flex items-center justify-center bg-background transition-all duration-700 ease-in-out ${
        stage === 1 ? 'opacity-0 backdrop-blur-xl scale-110 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div
        className={`flex flex-col items-center justify-center transition-all duration-700 ease-out ${
          stage === 0 ? 'scale-100 opacity-100 blur-none' : 'scale-150 blur-md opacity-0'
        }`}
      >
        <div className="w-24 h-24 mb-6 rounded-[2rem] bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden animate-pulse">
          <Image
            src="/eloyAocelote1.png"
            alt="Finca Tigrillo Logo"
            width={72}
            height={72}
            className="object-contain"
            priority
          />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Finca Tigrillo
        </h1>
        <p className="text-muted mt-2 tracking-widest uppercase text-[10px] font-bold">
          Cargando entorno...
        </p>
      </div>
    </div>
  )
}
