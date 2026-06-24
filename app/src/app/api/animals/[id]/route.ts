import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

async function getAdminClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return { client: null, error: 'No autenticado', status: 401 }

  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user) return { client: null, error: 'Sesión inválida', status: 401 }

  const { data: profile } = await insforge.database
    .from('user_profiles')
    .select('role')
    .eq('user_id', userData.user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') return { client: null, error: 'Sin permisos de administrador', status: 403 }

  return { client: insforge, userId: userData.user.id, error: null, status: 200 }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value
    if (!accessToken) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const insforge = createInsForgeServerClient(accessToken)
    const { data: userData } = await insforge.auth.getCurrentUser()
    if (!userData?.user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    const { data, error } = await insforge.database
      .from('animals')
      .select('id, name, identification_code, metadata, status, weight_kg, is_litter, litter_count, litter_alive')
      .eq('id', id)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ error: 'Animal no encontrado' }, { status: 404 })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
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
    // Don't allow changing id or created_by
    delete body.id
    delete body.created_by
    delete body.created_at

    // ── Verificar código de identificación duplicado (excluyendo el propio animal) ──
    const identCode = (body.identification_code as string | undefined)?.trim()
    if (identCode) {
      const { data: existing, error: checkError } = await client.database
        .from('animals')
        .select('id, name, identification_code')
        .eq('identification_code', identCode)
        .neq('id', id)
        .limit(1)

      if (checkError) {
        return NextResponse.json({ error: 'Error al verificar código de identificación' }, { status: 500 })
      }

      if (existing && existing.length > 0) {
        const dup = existing[0] as { id: string; name: string | null; identification_code: string }
        return NextResponse.json(
          { error: `El código "${identCode}" ya está en uso por el animal "${dup.name || dup.identification_code}". Cada animal debe tener un código único.` },
          { status: 409 }
        )
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

     // Fetch the animal to see if it is aves-de-corral
     const { data: animalObj } = await client.database
       .from('animals')
       .select('type_id, animal_types(slug)')
       .eq('id', id)
       .maybeSingle()
     const animalTypes = (animalObj as any)?.animal_types
     const typeSlug = Array.isArray(animalTypes) ? animalTypes[0]?.slug : animalTypes?.slug

     if (typeSlug === 'aves-de-corral') {
       body.sex = 'mixto'
     } else if (typeof body.sex === 'string') {
       const s = body.sex.toLowerCase().trim()
       if (s === 'machos') body.sex = 'macho'
       if (s === 'hembras') body.sex = 'hembra'
       if (s === '') delete body.sex
     }
     if (body.sex === null) delete body.sex

    const { data, error: dbError } = await client.database
      .from('animals')
      .update(body)
      .eq('id', id)
      .select()

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0] })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const { error: dbError } = await client.database
      .from('animals')
      .delete()
      .eq('id', id)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
