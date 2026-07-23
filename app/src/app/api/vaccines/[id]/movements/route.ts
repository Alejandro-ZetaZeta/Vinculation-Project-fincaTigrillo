import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

type InsForgeClient = ReturnType<typeof createInsForgeServerClient>

async function getAdminClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken)
    return { client: null as InsForgeClient | null, error: 'No autenticado', status: 401 }

  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user)
    return { client: null as InsForgeClient | null, error: 'Sesión inválida', status: 401 }

  const { data: profile } = await insforge.database
    .from('user_profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin')
    return { client: null as InsForgeClient | null, error: 'Sin permisos', status: 403 }

  return { client: insforge, error: null as string | null, status: 200 }
}

// ────────────────────────────────────────────────────────────────────────────
// GET /api/vaccines/[id]/movements?limit=50&before=<iso>
// Returns the most recent stock_movements rows for a vaccine, newest first.
// Admin-only.
// ────────────────────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const { searchParams } = new URL(request.url)
    const limitParam = searchParams.get('limit')
    const before = searchParams.get('before')

    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 50
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0 && parsedLimit <= 200
        ? parsedLimit
        : 50

    let query = client.database
      .from('vaccine_stock_movements')
      .select('*')
      .eq('vaccine_id', id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (before) {
      // ISO timestamp — only return rows strictly older than this
      query = query.lt('created_at', before)
    }

    const { data, error: dbError } = await query
    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

    return NextResponse.json({ data: data || [] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
