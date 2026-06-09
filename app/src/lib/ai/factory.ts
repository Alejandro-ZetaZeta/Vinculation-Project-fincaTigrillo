/**
 * ============================================================
 * AI FACTORY — Proveedor de IA intercambiable via ENV vars
 * ============================================================
 *
 * CÓMO CAMBIAR DE PROVEEDOR (solo variables de entorno):
 *
 * # OpenAI (actual)
 * AI_PROVIDER=openai
 * AI_API_KEY=sk-...
 * AI_MODEL=gpt-4o-mini
 *
 * # Google Gemini
 * AI_PROVIDER=gemini
 * AI_API_KEY=AIza...
 * AI_MODEL=gemini-2.0-flash
 *
 * # IA Local (Ollama / LM Studio) — cuando llegue la máquina
 * AI_PROVIDER=local
 * AI_BASE_URL=http://192.168.1.X:11434/v1
 * AI_MODEL=llama3.2
 * AI_API_KEY=ollama   ← cualquier string no vacío
 *
 * # Ollama via tunnel (OpenAI-compatible)
 * AI_PROVIDER=ollama
 * OLLAMA_URL=https://xxxx.trycloudflare.com
 * OLLAMA_MODEL=qwen3:8b
 *
 * ✅ Sin cambios en código — solo .env.local
 * ============================================================
 */

import OpenAI from 'openai'
import type { PredictionResult } from './provider'
import { REPRODUCTIVE_SYSTEM_PROMPT } from './prompts'

// ─── Configuración por proveedor ─────────────────────────────

const PROVIDER_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/openai',
  // 'local' usa AI_BASE_URL directamente
  // 'ollama' usa OLLAMA_URL (se normaliza a /v1)
}

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
  local:  'llama3.2',
  ollama: 'qwen3:8b',
}

function ensureV1(base: string): string {
  // OpenAI SDK expects baseURL ending with /v1.
  try {
    const u = new URL(base)
    if (u.pathname.endsWith('/v1')) return u.toString().replace(/\/+$/, '')
    u.pathname = (u.pathname.replace(/\/+$/, '') + '/v1').replace(/\/v1\/v1$/, '/v1')
    return u.toString().replace(/\/+$/, '')
  } catch {
    return base
  }
}

// ─── Factory ─────────────────────────────────────────────────

function createAIClient(): { client: OpenAI; model: string; providerName: string } {
  const provider  = (process.env.AI_PROVIDER ?? 'openai').toLowerCase()
  const apiKey    = process.env.AI_API_KEY ?? (provider === 'ollama' ? 'ollama' : 'no-key')
  const model     =
    (provider === 'ollama'
      ? (process.env.OLLAMA_MODEL ?? process.env.AI_MODEL)
      : process.env.AI_MODEL) ??
    DEFAULT_MODELS[provider] ??
    'gpt-4o-mini'

  let baseURL: string

  if (provider === 'local') {
    const localUrl = process.env.AI_BASE_URL
    if (!localUrl) {
      throw new Error(
        '[AI Factory] AI_PROVIDER=local requiere definir AI_BASE_URL. ' +
        'Ejemplo: AI_BASE_URL=http://192.168.1.100:11434/v1'
      )
    }
    baseURL = localUrl
  } else if (provider === 'ollama') {
    const ollamaUrl = process.env.OLLAMA_URL ?? process.env.AI_BASE_URL
    if (!ollamaUrl) {
      throw new Error(
        '[AI Factory] AI_PROVIDER=ollama requiere definir OLLAMA_URL (o AI_BASE_URL). ' +
        'Ejemplo: OLLAMA_URL=https://xxxx.trycloudflare.com'
      )
    }
    baseURL = ensureV1(ollamaUrl)
  } else {
    baseURL = process.env.AI_BASE_URL ?? PROVIDER_URLS[provider] ?? PROVIDER_URLS['openai']
  }

  const client = new OpenAI({ apiKey, baseURL })

  return { client, model, providerName: provider }
}

// ─── Función principal — chat con el proveedor activo ────────

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export async function aiChat(messages: ChatMessage[]): Promise<{
  content: string
  providerName: string
  model: string
}> {
  const { client, model, providerName } = createAIClient()
  const isLocal = providerName === 'local'
  const completion = await client.chat.completions.create({
    model,
    messages,
    temperature: 0.3,   // baja temperatura = respuestas más deterministas
    max_tokens: isLocal ? 2000 : 4096,
    ...(isLocal ? {} : {response_format: {type: 'json_object'}}),
  })

  const content = completion.choices[0]?.message?.content ?? '{}'
  return { content, providerName, model }
}

// ─── Helper: ejecutar predicción reproductiva ─────────────────

export async function runReproductivePrediction(userPrompt: string): Promise<PredictionResult> {
  const { content, providerName, model } = await aiChat([
    { role: 'system',  content: REPRODUCTIVE_SYSTEM_PROMPT },
    { role: 'user',    content: userPrompt },
  ])

  let parsed: Omit<PredictionResult, 'generated_at' | 'provider' | 'model'>

  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error(`[AI Factory] La IA devolvió un JSON inválido. Respuesta cruda: ${content.slice(0, 200)}`)
  }

  return {
    ...parsed,
    generated_at: new Date().toISOString(),
    provider: providerName,
    model,
  }
}

// ─── Helper: verificar conectividad con el proveedor ─────────

export async function checkAIProviderHealth(): Promise<{
  ok: boolean
  provider: string
  model: string
  error?: string
}> {
  try {
    const { client, model, providerName } = createAIClient()
    await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'Responde solo: OK' }],
      max_tokens: 5,
    })
    return { ok: true, provider: providerName, model }
  } catch (err) {
    return {
      ok: false,
      provider: (process.env.AI_PROVIDER ?? 'openai').toLowerCase(),
      model: process.env.AI_MODEL ?? process.env.OLLAMA_MODEL ?? 'unknown',
      error: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}
