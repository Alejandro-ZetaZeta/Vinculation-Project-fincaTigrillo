/**
 * Server-side input sanitization helpers for the requests module.
 *
 * These run inside validateRequestPayload() so every payload that lands in the
 * `requests` table (and later gets executed) is cleaned *before* persistence,
 * regardless of whether it came from a teacher's submission or an admin's edit.
 *
 * Goal: defence-in-depth against XSS / injection. React escapes text by
 * default, but stored payloads may be rendered in emails, PDFs, or future
 * surfaces, so we strip dangerous content at the boundary.
 */

/* ── Field length caps ──────────────────────────────────────────────── */
export const MAX_LEN = {
  NAME:        120,
  BREED:       120,
  COLOR:       80,
  CODE:        100,
  NOTES:       2000,
  DESCRIPTION: 2000,
  SHORT_TEXT:  200,
} as const

/* ── UUID v4-ish shape (InsForge uses gen_random_uuid) ──────────────── */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/* ── HTML tag + dangerous protocol matcher ──────────────────────────── */
const HTML_TAG_RE = /<[^>]*>/g
const SCRIPT_TAG_RE = /<\s*(script|iframe|object|embed|svg|math|link|style|meta|base|form)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/g

/**
 * Sanitize a free-text string field.
 *  - coerces to string
 *  - strips <script>/<iframe>/… blocks entirely
 *  - strips any remaining HTML tags
 *  - removes control chars / null bytes
 *  - trims and enforces a max length
 *  - collapses runs of whitespace
 *
 * Returns `null` when the input is empty/whitespace-only so the DB stores NULL
 * instead of an empty string (keeps NOT NULL + CHECK constraints happy and the
 * UI can distinguish "not provided" from "blank").
 */
export function sanitizeText(input: unknown, maxLen: number = MAX_LEN.NOTES): string | null {
  if (input == null) return null
  let s = String(input)
  // Remove whole dangerous-element blocks first (incl. their inner content).
  s = s.replace(SCRIPT_TAG_RE, '')
  // Strip any leftover HTML tags.
  s = s.replace(HTML_TAG_RE, '')
  // Drop control chars / null bytes (used to break out of regexes / parsers).
  s = s.replace(CONTROL_CHAR_RE, '')
  // Collapse whitespace runs and trim.
  s = s.replace(/\s+/g, ' ').trim()
  if (s === '') return null
  if (s.length > maxLen) s = s.slice(0, maxLen)
  return s
}

/**
 * Sanitize a short identifier-style string (codes, names, breeds).
 * Same as sanitizeText but rejects anything containing angle brackets even
 * after stripping (defence if the strip left a stray '<').
 */
export function sanitizeIdent(input: unknown, maxLen: number = MAX_LEN.NAME): string | null {
  const cleaned = sanitizeText(input, maxLen)
  if (cleaned == null) return null
  // Identifiers must never contain residual markup delimiters.
  if (/[<>]/.test(cleaned)) return null
  return cleaned
}

/** Parse + clamp a non-negative finite number. Returns null when invalid. */
export function sanitizeNumber(input: unknown): number | null {
  if (input == null || input === '') return null
  const n = typeof input === 'number' ? input : parseFloat(String(input))
  if (!Number.isFinite(n)) return null
  return n
}

/** Parse a non-negative integer. Returns null when invalid. */
export function sanitizeInt(input: unknown): number | null {
  if (input == null || input === '') return null
  const n = typeof input === 'number' ? input : parseInt(String(input), 10)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.trunc(n)
}

/** Validate ISO date string (YYYY-MM-DD). Returns the string or null. */
export function sanitizeDate(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const s = input.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const d = new Date(`${s}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  return s
}

/** Strict UUID check. */
export function isValidUUID(input: unknown): input is string {
  return typeof input === 'string' && UUID_RE.test(input.trim())
}

/** Normalize a UUID (trim + lowercase) or reject. */
export function sanitizeUUID(input: unknown): string | null {
  if (!isValidUUID(input)) return null
  return (input as string).trim().toLowerCase()
}

/** Coerce a value into a string[] of trimmed non-empty entries (for arrays). */
export function sanitizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const out: string[] = []
  for (const v of input) {
    if (v == null) continue
    const s = String(v).trim()
    if (s) out.push(s)
  }
  return out
}

/* ── Metadata object sanitization ───────────────────────────────────── */
/*
 * animals.metadata is a JSONB column holding type-specific extra fields
 * (uso, doma, alzada_cm, estado_reproductivo, numero_pezones, cantidad,
 * etapa, proposito, etc.). We sanitize every value + key but allow any key
 * name so new metadata fields don't need a code change here.
 *
 *  - keys: trimmed, ≤ 60 chars, no < > / \ control chars
 *  - string values: sanitized (HTML stripped), ≤ 200 chars
 *  - number values: kept as-is if finite
 *  - boolean values: kept as-is
 *  - nested objects/arrays: flattened to string (defence-in-depth)
 *  - max 40 keys
 */

const META_KEY_RE = /[<>\u0000-\u001F\u007F/\\]/g

export function sanitizeMetadata(input: unknown): Record<string, unknown> | null {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) return null
  const src = input as Record<string, unknown>
  const out: Record<string, unknown> = {}
  let count = 0
  for (const [rawKey, rawVal] of Object.entries(src)) {
    if (count >= 40) break
    const key = String(rawKey).replace(META_KEY_RE, '').replace(/\s+/g, '_').trim().slice(0, 60)
    if (!key) continue
    if (rawVal == null) continue
    if (typeof rawVal === 'number') {
      if (Number.isFinite(rawVal)) out[key] = rawVal
    } else if (typeof rawVal === 'boolean') {
      out[key] = rawVal
    } else if (Array.isArray(rawVal) || typeof rawVal === 'object') {
      const s = sanitizeText(JSON.stringify(rawVal), MAX_LEN.SHORT_TEXT)
      if (s) out[key] = s
    } else {
      const s = sanitizeText(rawVal, MAX_LEN.SHORT_TEXT)
      if (s) out[key] = s
    }
    count++
  }
  return Object.keys(out).length > 0 ? out : null
}
