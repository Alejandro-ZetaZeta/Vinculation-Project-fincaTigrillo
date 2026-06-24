'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageCircle, X, Send, Sparkles, Bot, User,
  Loader2, AlertTriangle, ChevronDown,
} from 'lucide-react'

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  hasAnimalContext?: boolean
  hasVaccineContext?: boolean
}

/* ─────────────────────────────────────────────
   Quick questions
───────────────────────────────────────────── */

const QUICK_QUESTIONS = [
  '¿Cuál es el estado general del hato?',
  '¿Qué animales necesitan vacunación urgente?',
  '¿Cuál es el plan de vacunación recomendado?',
  '¿Cómo está la eficiencia reproductiva?',
]

/* ─────────────────────────────────────────────
   Unique ID generator
───────────────────────────────────────────── */

let _msgId = 0
function uid() {
  return `msg-${Date.now()}-${++_msgId}`
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isLoading])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // ── Send message ──────────────────────────
  const sendMessage = useCallback(async (text?: string) => {
    const content = (text || input).trim()
    if (!content || isLoading) return

    setInput('')
    setError(null)

    const userMessage: ChatMessage = {
      id: uid(),
      role: 'user',
      content,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      // Build message history for context
      const history = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || `Error ${res.status}`)
        return
      }

      const aiMessage: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        hasAnimalContext: data.meta?.has_animal_context,
        hasVaccineContext: data.meta?.has_vaccine_context,
      }

      setMessages(prev => [...prev, aiMessage])
    } catch {
      setError('Error de conexión. Verifica tu red e intenta de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, messages])

  // ── Format AI text — strips markdown symbols and renders cleanly ──
  function formatText(text: string) {
    // Pre-process: strip code fences and inline code backticks
    const cleaned = text
      .replace(/```[\s\S]*?```/g, '') // remove code blocks
      .replace(/`([^`]+)`/g, '$1')    // remove inline code backticks

    const lines = cleaned.split('\n')
    const elements: React.ReactNode[] = []
    let key = 0

    for (const rawLine of lines) {
      key++
      const trimmed = rawLine.trim()

      if (trimmed === '') {
        elements.push(<br key={key} />)
        continue
      }

      // Strip markdown heading symbols (# ## ###) → treat as bold paragraph
      const headingMatch = trimmed.match(/^#{1,3}\s+(.+)$/)
      if (headingMatch) {
        elements.push(
          <p key={key} className="my-1 font-semibold text-foreground text-[13px]">
            {stripInlineMarkdown(headingMatch[1])}
          </p>
        )
        continue
      }

      // List items (- or •)
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        elements.push(
          <div key={key} className="flex gap-2 pl-1 my-0.5">
            <span className="text-primary shrink-0 mt-0.5">•</span>
            <span>{stripInlineMarkdown(trimmed.replace(/^[-•]\s*/, ''))}</span>
          </div>
        )
        continue
      }

      // Numbered items
      if (/^\d+\.\s/.test(trimmed)) {
        const num = trimmed.match(/^(\d+)\./)?.[1]
        elements.push(
          <div key={key} className="flex gap-2 pl-1 my-0.5">
            <span className="text-primary font-bold shrink-0 mt-0.5 text-[11px]">{num}.</span>
            <span>{stripInlineMarkdown(trimmed.replace(/^\d+\.\s*/, ''))}</span>
          </div>
        )
        continue
      }

      elements.push(<p key={key} className="my-0.5">{stripInlineMarkdown(trimmed)}</p>)
    }

    return elements
  }

  // Converts **bold**, *italic*, __bold__, _italic_ to React nodes
  function stripInlineMarkdown(line: string): React.ReactNode {
    // Split on **text** or *text* or __text__ or _text_
    const parts = line.split(/(\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_)/g)
    if (parts.length === 1) return line // no markdown found
    return parts.map((part, i) => {
      if (/^\*\*(.+)\*\*$/.test(part) || /^__(.+)__$/.test(part)) {
        const inner = part.replace(/^\*\*|^__|__$|\*\*$/g, '')
        return <strong key={i} className="font-semibold text-foreground">{inner}</strong>
      }
      if (/^\*(.+)\*$/.test(part) || /^_(.+)_$/.test(part)) {
        const inner = part.replace(/^\*|^_|_$|\*$/g, '')
        return <em key={i}>{inner}</em>
      }
      return part
    })
  }

  return (
    <>
      {/* ── Floating button ─────────────────── */}
      <button
        id="ai-chatbot-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          fixed bottom-5 right-5 z-[9999]
          w-14 h-14 rounded-2xl
          flex items-center justify-center
          shadow-lg shadow-violet-500/20
          transition-all duration-300 ease-out
          hover:scale-105 hover:shadow-xl hover:shadow-violet-500/30
          active:scale-95
          print:hidden
          ${isOpen
            ? 'bg-surface border border-border rotate-0'
            : 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'
          }
        `}
        aria-label={isOpen ? 'Cerrar chat IA' : 'Abrir chat IA'}
      >
        {isOpen ? (
          <X className="w-5 h-5 text-muted" />
        ) : (
          <>
            <MessageCircle className="w-6 h-6" />
            {/* Pulse ring */}
            <span className="absolute inset-0 rounded-2xl animate-ping bg-violet-500/20 pointer-events-none" style={{ animationDuration: '3s' }} />
          </>
        )}
      </button>

      {/* ── Chat panel ──────────────────────── */}
      <div
        className={`
          fixed z-[9998] print:hidden
          transition-all duration-300 ease-out
          ${isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
          }
          /* Mobile: fullscreen-ish */
          bottom-0 right-0 left-0 top-16
          sm:bottom-24 sm:right-5 sm:left-auto sm:top-auto
          sm:w-[420px] sm:h-[min(600px,calc(100vh-160px))]
          sm:rounded-2xl
          bg-background/95 backdrop-blur-xl
          border border-border/50
          shadow-2xl shadow-black/10
          flex flex-col
          overflow-hidden
          sm:border-violet-200/30 dark:sm:border-violet-800/20
        `}
      >
        {/* ── Header ────────────────────────── */}
        <div className="bg-gradient-to-r from-violet-600/10 via-indigo-600/10 to-purple-600/10 border-b border-border/50 px-4 py-3.5 flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-foreground">TigriA</h3>
            <p className="text-[10px] text-muted font-medium">Finca Tigrillo · Asistente veterinario</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-lg hover:bg-surface-hover flex items-center justify-center transition-colors sm:hidden"
          >
            <ChevronDown className="w-4 h-4 text-muted" />
          </button>
        </div>

        {/* ── Messages area ─────────────────── */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth"
          style={{ minHeight: 0 }}
        >
          {/* Welcome message when empty */}
          {messages.length === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center">
                <Bot className="w-8 h-8 text-violet-500/50" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm mb-1">Hola, soy TigriA</p>
                <p className="text-xs text-muted max-w-xs leading-relaxed">
                  Tu asistente veterinario de la Finca Tigrillo. Preguntame sobre animales, vacunas, dosis, stock o estadisticas del hato.
                </p>
              </div>

              {/* Quick questions */}
              <div className="w-full space-y-2 pt-2">
                <p className="text-[10px] font-bold text-muted uppercase tracking-wider">Preguntas sugeridas</p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      className="text-left text-xs px-3 py-2.5 rounded-xl bg-violet-500/5 text-violet-700 dark:text-violet-300 hover:bg-violet-500/10 transition-colors border border-violet-500/10 hover:border-violet-500/20"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fade-in`}
            >
              {/* Avatar */}
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === 'user'
                    ? 'bg-primary/10'
                    : 'bg-gradient-to-br from-violet-600 to-indigo-600'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-white" />
                )}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-white rounded-tr-md'
                    : 'bg-surface border border-border/50 text-foreground/90 rounded-tl-md shadow-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="space-y-0.5">
                    {msg.hasAnimalContext && (
                      <div className="flex items-center gap-1 text-[10px] text-violet-600 dark:text-violet-400 font-bold uppercase tracking-wider mb-1.5 pb-1.5 border-b border-border/50">
                        <Sparkles className="w-3 h-3" />
                        Datos del animal encontrados
                      </div>
                    )}
                    {msg.hasVaccineContext && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mb-1.5 pb-1.5 border-b border-border/50">
                        <Sparkles className="w-3 h-3" />
                        Inventario de vacunas consultado
                      </div>
                    )}
                    {formatText(msg.content)}
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-2.5 animate-fade-in">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-surface border border-border/50 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-muted">Analizando...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-xl p-3 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">Error</p>
                <p className="text-xs text-red-500 dark:text-red-400/80 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Quick questions (after conversation started) */}
        {messages.length > 0 && !isLoading && (
          <div className="px-3 pb-1.5 shrink-0">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {QUICK_QUESTIONS.slice(0, 3).map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-[10px] px-2.5 py-1.5 rounded-lg bg-violet-500/5 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition-colors border border-violet-500/10 whitespace-nowrap shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input area ────────────────────── */}
        <div className="border-t border-border/50 px-3 py-3 shrink-0 bg-surface/50">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendMessage()
                }
              }}
              placeholder="Pregunta sobre un animal..."
              disabled={isLoading}
              className="flex-1 min-w-0 px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500/30 transition-all disabled:opacity-50 placeholder:text-muted/60"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center hover:shadow-md hover:shadow-violet-500/20 transition-all disabled:opacity-40 disabled:hover:shadow-none active:scale-95 shrink-0"
              aria-label="Enviar mensaje"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
