import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

type InsForgeClient = ReturnType<typeof createInsForgeServerClient>

// ── Auth helpers ────────────────────────────────────────────────────────────

async function getAuthClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return { client: null as InsForgeClient | null, role: null as string | null, userId: null as string | null }

  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user) return { client: null as InsForgeClient | null, role: null, userId: null }

  const { data: profile } = await insforge.database
    .from('user_profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  return { client: insforge, role: profile?.role || 'viewer', userId: userData.user.id }
}

async function getAdminClient() {
  const result = await getAuthClient()
  if (!result.client || result.role !== 'admin') {
    return { client: null as InsForgeClient | null, userId: null as string | null, error: result.client ? 'Sin permisos' : 'No autenticado', status: result.client ? 403 : 401 }
  }
  return { client: result.client, userId: result.userId, error: null as string | null, status: 200 }
}

// ── Valid categories (mirror the SQL ENUM) ──────────────────────────────────
const VALID_CATEGORIES = [
  'Maquinaria',
  'Herramienta manual',
  'Veterinaria',
  'Riego',
  'Eléctrico',
  'Transporte',
  'Seguridad',
  'Otro',
] as const

type ToolCategory = typeof VALID_CATEGORIES[number]

function isValidCategory(v: unknown): v is ToolCategory {
  return typeof v === 'string' && (VALID_CATEGORIES as readonly string[]).includes(v)
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/tools
// Query params:
//   active_only=1 (default: 1)  — filter inactive tools out
//   category=<name>             — filter by category
// Admin-only (RLS enforced at DB level too)
// ────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') !== '0'
    const category   = searchParams.get('category')

    let query = client.database
      .from('farm_tools')
      .select('*')
      .order('category', { ascending: true })
      .order('name',     { ascending: true })

    if (activeOnly) query = query.eq('is_active', true)
    if (category && isValidCategory(category)) query = query.eq('category', category)

    const { data, error: dbError } = await query
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/tools
// Body: { name, description?, category?, unit?, min_stock?, is_active? }
// Admin-only.
// ────────────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { client, userId, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const body = await request.json()
    const { name, description, category, unit, min_stock, is_active } = body

    if (!name || String(name).trim() === '') {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    const resolvedCategory: ToolCategory = isValidCategory(category) ? category : 'Otro'

    const payload = {
      name:        String(name).trim(),
      description: description  ? String(description).trim() : null,
      category:    resolvedCategory,
      unit:        unit         ? String(unit).trim()        : 'unidad',
      min_stock:   (min_stock !== '' && min_stock != null) ? Number(min_stock) : null,
      is_active:   typeof is_active === 'boolean' ? is_active : true,
      stock:       0,
      created_by:  userId,
    }

    const { data, error: dbError } = await client.database
      .from('farm_tools')
      .insert([payload])
      .select()

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0] }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
