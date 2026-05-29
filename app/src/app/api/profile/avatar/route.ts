import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const MAX_SIZE      = 2 * 1024 * 1024            // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const BUCKET        = 'avatars'

async function getVerifiedUser(accessToken: string) {
  const client = createInsForgeServerClient(accessToken)
  const { data, error } = await client.auth.getCurrentUser()
  if (error || !data?.user) return null
  return data.user
}

/* ─── GET /api/profile/avatar ────────────────────────────────────────────────
   Returns current avatar URL, whether the user can change it today, and how
   many days remain until the next allowed change.
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
      .select('avatar_url, avatar_updated_at')
      .eq('user_id', authUser.id)
      .maybeSingle()

    const lastChange  = profile?.avatar_updated_at ? new Date(profile.avatar_updated_at).getTime() : 0
    const elapsed     = Date.now() - lastChange
    const canChange   = elapsed >= SEVEN_DAYS_MS
    const daysLeft    = canChange ? 0 : Math.ceil((SEVEN_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000))

    return NextResponse.json({
      avatar_url:         profile?.avatar_url ?? null,
      can_change:         canChange,
      days_until_change:  daysLeft,
    })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

/* ─── POST /api/profile/avatar ───────────────────────────────────────────────
   Accepts multipart/form-data with a "file" field (JPEG / PNG / WebP, ≤ 2 MB).
   Enforces a 7-day cooldown per user. Only viewers (students) may upload.
──────────────────────────────────────────────────────────────────────────── */
export async function POST(request: NextRequest) {
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
      .select('role, avatar_updated_at')
      .eq('user_id', authUser.id)
      .maybeSingle()

    if (!profile || profile.role !== 'viewer') {
      return NextResponse.json(
        { error: 'Solo los estudiantes pueden cambiar su foto de perfil.' },
        { status: 403 }
      )
    }

    if (profile.avatar_updated_at) {
      const elapsed = Date.now() - new Date(profile.avatar_updated_at).getTime()
      if (elapsed < SEVEN_DAYS_MS) {
        const daysLeft = Math.ceil((SEVEN_DAYS_MS - elapsed) / (24 * 60 * 60 * 1000))
        return NextResponse.json(
          {
            error: `Debes esperar ${daysLeft} día${daysLeft !== 1 ? 's' : ''} más para cambiar tu foto.`,
            days_until_change: daysLeft,
          },
          { status: 429 }
        )
      }
    }

    /* 2. Parse and validate file */
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo.' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Solo se aceptan imágenes JPEG, PNG o WebP.' },
        { status: 400 }
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'La imagen no puede superar los 2 MB.' },
        { status: 400 }
      )
    }

    /* 3. Upload to storage  (path = user_id, content-type set per object) */
    const path = authUser.id   // no extension; content-type stored per object

    // Pass the File/Blob directly so the SDK can read .size automatically
    const { error: uploadError } = await client.storage
      .from(BUCKET)
      .upload(path, file)

    if (uploadError) {
      console.error('[avatar] Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Error al subir la imagen.' }, { status: 500 })
    }

    /* 4. Build public URL — InsForge getPublicUrl returns a string directly */
    const publicUrl = client.storage.from(BUCKET).getPublicUrl(path) as unknown as string
    const avatarUrl = `${publicUrl}?v=${Date.now()}`

    /* 5. Persist URL + timestamp in profile */
    const { error: updateError } = await client.database
      .from('user_profiles')
      .update({ avatar_url: avatarUrl, avatar_updated_at: new Date().toISOString() })
      .eq('user_id', authUser.id)

    if (updateError) {
      console.error('[avatar] DB update error:', updateError)
      return NextResponse.json({ error: 'Error al guardar la imagen.' }, { status: 500 })
    }

    return NextResponse.json({ avatar_url: avatarUrl })
  } catch (err) {
    console.error('[avatar] Unexpected error:', err)
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }
}
