import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const MIN_LEN       = 2
const MAX_LEN       = 100

async function getVerifiedUser(accessToken: string) {
  const client = createInsForgeServerClient(accessToken)
  const { data, error } = await client.auth.getCurrentUser()
  if (error || !data?.user) return null
  return data.user
}

/* ─── GET /api/profile/name ─────────────────────────────────────────────────
   Returns the current full_name, whether the user can change it today, and
   how many days remain until the next allowed change.
──────────────────────────────────────────────────────────────────────────── */
export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const authUser = await getVerifiedUser(accessToken)
    if (!authUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const serviceKey = process.env.INSFORGE_API_KEY
    if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

    const client = createInsForgeServerClient(serviceKey)
    const { data: profile } = await client.database
      .from('user_profiles')
      .select('role, full_name, name_updated_at')
      .eq('user_id', authUser.id)
      .maybeSingle()

    if (!profile || (profile.role !== 'viewer' && profile.role !== 'teacher')) {
      return NextResponse.json(
        { error: 'Solo los estudiantes y docentes pueden gestionar su nombre de usuario.' },
        { status: 403 }
      )
    }

    const lastChange = profile.name_updated_at ? new Date(profile.name_updated_at).getTime() : 0
    const elapsed    = Date.now() - lastChange
    const canChange  = elapsed >= SEVEN_DAYS_MS
    const daysLeft   = canChange ? 0 : Math.ceil((SEVEN_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000))

    return NextResponse.json({
      full_name:          profile.full_name ?? '',
      can_change:         canChange,
      days_until_change:  daysLeft,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/* ─── PUT /api/profile/name ─────────────────────────────────────────────────
   Body: { full_name: string }
   Enforces a 7-day cooldown per user. Only viewers (students) and teachers
   may change their name.
──────────────────────────────────────────────────────────────────────────── */
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const authUser = await getVerifiedUser(accessToken)
    if (!authUser) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const serviceKey = process.env.INSFORGE_API_KEY
    if (!serviceKey) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })

    const client = createInsForgeServerClient(serviceKey)

    /* 1. Verify role and 7-day cooldown */
    const { data: profile } = await client.database
      .from('user_profiles')
      .select('role, name_updated_at')
      .eq('user_id', authUser.id)
      .maybeSingle()

    if (!profile || (profile.role !== 'viewer' && profile.role !== 'teacher')) {
      return NextResponse.json(
        { error: 'Solo los estudiantes y docentes pueden cambiar su nombre de usuario.' },
        { status: 403 }
      )
    }

    if (profile.name_updated_at) {
      const elapsed = Date.now() - new Date(profile.name_updated_at).getTime()
      if (elapsed < SEVEN_DAYS_MS) {
        const daysLeft = Math.ceil((SEVEN_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000))
        return NextResponse.json(
          {
            error: `Debes esperar ${daysLeft} día${daysLeft !== 1 ? 's' : ''} más para cambiar tu nombre.`,
            days_until_change: daysLeft,
          },
          { status: 429 }
        )
      }
    }

    /* 2. Validate body */
    const body = await request.json().catch(() => null) as { full_name?: unknown } | null
    const raw  = typeof body?.full_name === 'string' ? body.full_name.trim() : ''

    if (raw.length < MIN_LEN) {
      return NextResponse.json(
        { error: `El nombre debe tener al menos ${MIN_LEN} caracteres.` },
        { status: 400 }
      )
    }
    if (raw.length > MAX_LEN) {
      return NextResponse.json(
        { error: `El nombre no puede superar los ${MAX_LEN} caracteres.` },
        { status: 400 }
      )
    }

    /* 3. Persist new name + timestamp */
    const { data: updated, error: updateError } = await client.database
      .from('user_profiles')
      .update({ full_name: raw, name_updated_at: new Date().toISOString() })
      .eq('user_id', authUser.id)
      .select('full_name')
      .maybeSingle()

    if (updateError) {
      console.error('[name] DB update error:', updateError)
      return NextResponse.json({ error: 'Error al guardar el nombre.' }, { status: 500 })
    }

    return NextResponse.json({ full_name: updated?.full_name ?? raw })
  } catch (err) {
    console.error('[name] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
