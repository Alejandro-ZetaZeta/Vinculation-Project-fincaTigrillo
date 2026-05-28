'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Camera, Upload, AlertCircle, ChevronLeft } from 'lucide-react'

interface AvatarUploadModalProps {
  onClose: () => void
  onSuccess: (avatarUrl: string) => void
}

const DISPLAY_SIZE = 240   // circular crop area on screen (px)
const EXPORT_SIZE  = 256   // final canvas export size (px)

export function AvatarUploadModal({ onClose, onSuccess }: AvatarUploadModalProps) {
  const [step, setStep]           = useState<'warn' | 'crop' | 'uploading'>('warn')
  const [imgSrc, setImgSrc]       = useState<string | null>(null)
  const [error, setError]         = useState('')
  const [offset, setOffset]       = useState({ x: 0, y: 0 })
  const [imgDims, setImgDims]     = useState({ w: 0, h: 0 })

  const fileRef    = useRef<HTMLInputElement>(null)
  const imgRef     = useRef<HTMLImageElement>(null)
  const dragRef    = useRef<{ mx: number; my: number; ox: number; oy: number } | null>(null)
  const rawFile    = useRef<File | null>(null)

  /* Revoke object URL on unmount / new image */
  useEffect(() => () => { if (imgSrc) URL.revokeObjectURL(imgSrc) }, [imgSrc])

  /* Close on Escape */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  /* ── file selection ─────────────────────────────────────────────────────── */
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Solo se aceptan JPEG, PNG o WebP.')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('La imagen supera los 2 MB.')
      return
    }

    rawFile.current = file
    setImgSrc(URL.createObjectURL(file))
    setOffset({ x: 0, y: 0 })
    setStep('crop')
    // Reset so same file can be re-picked
    e.target.value = ''
  }

  /* ── image load → compute initial scale so shorter side fills crop area ── */
  function handleImgLoad() {
    const img = imgRef.current
    if (!img) return
    const s = DISPLAY_SIZE / Math.min(img.naturalWidth, img.naturalHeight)
    const w = img.naturalWidth  * s
    const h = img.naturalHeight * s
    setImgDims({ w, h })
    setOffset({ x: (DISPLAY_SIZE - w) / 2, y: (DISPLAY_SIZE - h) / 2 })
  }

  /* ── drag handlers ──────────────────────────────────────────────────────── */
  function handlePointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const dx   = e.clientX - dragRef.current.mx
    const dy   = e.clientY - dragRef.current.my
    const newX = clamp(dragRef.current.ox + dx, DISPLAY_SIZE - imgDims.w, 0)
    const newY = clamp(dragRef.current.oy + dy, DISPLAY_SIZE - imgDims.h, 0)
    setOffset({ x: newX, y: newY })
  }

  function handlePointerUp() { dragRef.current = null }

  /* ── canvas crop + upload ───────────────────────────────────────────────── */
  async function handleUpload() {
    if (!imgRef.current) return
    setStep('uploading')
    setError('')
    try {
      const canvas = document.createElement('canvas')
      canvas.width  = EXPORT_SIZE
      canvas.height = EXPORT_SIZE
      const ctx = canvas.getContext('2d')!
      const ratio = EXPORT_SIZE / DISPLAY_SIZE

      ctx.drawImage(
        imgRef.current,
        -offset.x * ratio,
        -offset.y * ratio,
        imgDims.w * ratio,
        imgDims.h * ratio
      )

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(b => b ? resolve(b) : reject(new Error('canvas failed')), 'image/jpeg', 0.92)
      )

      const form = new FormData()
      form.append('file', blob, 'avatar.jpg')

      const res  = await fetch('/api/profile/avatar', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Error al subir la imagen.')
        setStep('crop')
        return
      }

      onSuccess(data.avatar_url)
      onClose()
    } catch {
      setError('Error inesperado. Intenta de nuevo.')
      setStep('crop')
    }
  }

  /* ── render ─────────────────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            {step === 'crop' && (
              <button
                onClick={() => { setStep('warn'); setImgSrc(null) }}
                className="p-1 rounded-lg hover:bg-surface-hover text-muted -ml-1"
                aria-label="Volver"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-base font-semibold text-foreground">
              {step === 'warn' ? 'Cambiar foto de perfil' : 'Ajustar encuadre'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted" aria-label="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Step 1: warning ─────────────────────────────────────────────── */}
        {step === 'warn' && (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-warning/5 border border-warning/20 rounded-xl">
              <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div className="text-xs text-foreground space-y-1.5">
                <p className="font-semibold text-warning">Antes de continuar</p>
                <ul className="text-muted space-y-1 list-disc list-inside leading-relaxed">
                  <li>La imagen debe pesar menos de <strong>2 MB</strong></li>
                  <li>Formatos aceptados: <strong>JPEG, PNG, WebP</strong></li>
                  <li>Solo puedes cambiarla <strong>una vez cada 7 días</strong></li>
                  <li>La foto se mostrará en el panel del administrador</li>
                </ul>
              </div>
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />

            <button
              onClick={() => { setError(''); fileRef.current?.click() }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
            >
              <Camera className="w-4 h-4" /> Seleccionar foto
            </button>
          </div>
        )}

        {/* ── Step 2: crop ────────────────────────────────────────────────── */}
        {(step === 'crop' || step === 'uploading') && imgSrc && (
          <div className="p-5 space-y-4">
            <p className="text-xs text-muted text-center">
              Arrastra la imagen para ajustar el encuadre
            </p>

            {/* Circular crop frame */}
            <div className="flex justify-center">
              <div
                className="relative overflow-hidden rounded-full border-[3px] border-primary/50 shadow-lg cursor-grab active:cursor-grabbing select-none"
                style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE, touchAction: 'none' }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Vista previa"
                  draggable={false}
                  onLoad={handleImgLoad}
                  style={{
                    position: 'absolute',
                    left: offset.x,
                    top: offset.y,
                    width:  imgDims.w || 'auto',
                    height: imgDims.h || 'auto',
                    userSelect: 'none',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>

            {error && <p className="text-xs text-danger text-center">{error}</p>}

            <div className="flex gap-2.5">
              <button
                onClick={() => { setStep('warn'); setImgSrc(null) }}
                disabled={step === 'uploading'}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-surface-hover disabled:opacity-50 transition-colors"
              >
                Volver
              </button>
              <button
                onClick={handleUpload}
                disabled={step === 'uploading'}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
              >
                {step === 'uploading' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <><Upload className="w-4 h-4" /> Subir foto</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── helpers ──────────────────────────────────────────────────────────────── */
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
