import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

type InsForgeClient = ReturnType<typeof createInsForgeServerClient>

const REPRO_STATE_CANONICAL: Record<string, string> = {
  prenada: 'preñada',
  'preñada': 'preñada',
  vacia: 'vacía',
  'vacía': 'vacía',
  lactando: 'lactando',
  seca: 'seca',
}

function normalizeAllowedReproStates(input: unknown): string[] | null {
  if (input == null) return null
  if (!Array.isArray(input)) return null
  const out: string[] = []
  for (const raw of input) {
    if (raw == null) continue
    const key = String(raw).trim().toLowerCase()
    const canon = REPRO_STATE_CANONICAL[key]
    if (!canon) continue
    if (!out.includes(canon)) out.push(canon)
  }
  return out.length > 0 ? out : null
}

async function getAdminClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return { client: null as InsForgeClient | null, error: 'No autenticado', status: 401, userId: null as string | null }

  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user) return { client: null as InsForgeClient | null, error: 'Sesión inválida', status: 401, userId: null }

  const { data: profile } = await insforge.database
    .from('user_profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') return { client: null as InsForgeClient | null, error: 'Sin permisos', status: 403, userId: null }

  return { client: insforge, error: null as string | null, status: 200, userId: userData.user.id }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const body = await request.json()
    delete body.id
    delete body.created_by
    delete body.created_at

    if (typeof body.name === 'string') body.name = body.name.trim()

    if ('allowed_reproductive_states' in body) {
      body.allowed_reproductive_states = normalizeAllowedReproStates(body.allowed_reproductive_states)
    }

    const { data, error: dbError } = await client.database
      .from('vaccine_catalog')
      .update(body)
      .eq('id', id)
      .select()

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0] })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const { error: dbError } = await client.database
      .from('vaccine_catalog')
      .delete()
      .eq('id', id)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
