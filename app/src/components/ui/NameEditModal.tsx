'use client'

import { useState, useEffect, useRef } from 'react'
import { X, UserRound, Save, AlertCircle } from 'lucide-react'

interface NameEditModalProps {
  currentName: string
  onClose: () => void
  onSuccess: (newName: string) => void
}

const MIN_LEN = 2
const MAX_LEN = 100

export function NameEditModal({ currentName, onClose, onSuccess }: NameEditModalProps) {
  const [name, setName]         = useState(currentName)
  const [error, setError]       = useState('')
  const [saving, setSaving]     = useState(false)
  const inputRef                = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose])

  const trimmed  = name.trim()
  const unchanged = trimmed === currentName.trim()
  const tooShort = trimmed.length < MIN_LEN
  const tooLong  = trimmed.length > MAX_LEN
  const invalid  = tooShort || tooLong || unchanged

  async function handleSave() {
    if (invalid) return
    setSaving(true)
    setError('')
    try {
      const res  = await fetch('/api/profile/name', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Error al guardar el nombre.')
        return
      }
      onSuccess(data.full_name ?? trimmed)
      onClose()
    } catch {
      setError('Error inesperado. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <UserRound className="w-4 h-4 text-primary" aria-hidden="true" />
            <h2 className="text-base font-semibold text-foreground">
              Cambiar nombre de usuario
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-hover text-muted"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Cooldown warning */}
          <div className="flex items-start gap-3 p-3.5 bg-warning/5 border border-warning/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-xs text-foreground space-y-1.5">
              <p className="font-semibold text-warning">Antes de continuar</p>
              <ul className="text-muted space-y-1 list-disc list-inside leading-relaxed">
                <li>Solo puedes cambiarlo <strong>una vez cada 7 días</strong></li>
                <li>Debe tener entre <strong>{MIN_LEN}</strong> y <strong>{MAX_LEN}</strong> caracteres</li>
                <li>El nuevo nombre se mostrará en toda la plataforma</li>
              </ul>
            </div>
          </div>

          {/* Input */}
          <div className="space-y-1.5">
            <label htmlFor="name-input" className="text-xs font-medium text-muted">
              Nombre completo
            </label>
            <input
              id="name-input"
              ref={inputRef}
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !invalid) handleSave() }}
              maxLength={MAX_LEN}
              disabled={saving}
              className="w-full px-3 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
              placeholder="Tu nombre"
            />
            <div className="flex justify-between text-[11px] text-muted">
              <span>
                {tooShort && trimmed.length > 0 && `Mínimo ${MIN_LEN} caracteres`}
                {tooLong  && `Máximo ${MAX_LEN} caracteres`}
                {unchanged && !tooShort && !tooLong && 'Sin cambios'}
              </span>
              <span className={tooLong ? 'text-danger' : ''}>
                {trimmed.length}/{MAX_LEN}
              </span>
            </div>
          </div>

          {error && <p className="text-xs text-danger">{error}</p>}

          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-surface-hover disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={invalid || saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <><Save className="w-4 h-4" /> Guardar</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
