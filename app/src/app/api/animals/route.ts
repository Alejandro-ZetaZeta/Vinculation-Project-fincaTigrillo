import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

// FUNCIÓN GET: Para obtener los datos que alimentan los gráficos e informes
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const insforge = createInsForgeServerClient(accessToken)

    const { searchParams } = new URL(request.url)
    const sexFilter = searchParams.get('sex')        // e.g. 'macho'
    const typeSlug  = searchParams.get('type_slug')  // e.g. 'bovino'
    const statusFilter = searchParams.get('status')  // e.g. 'all' o 'activo'

    let query = insforge.database
      .from('animals')
      .select('*, animal_types(id, name, slug, animal_categories(id, name, slug))')

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter || 'activo')
    }

    if (sexFilter)  query = query.eq('sex', sexFilter)

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Client-side type_slug filter (join column, not a DB column)
    const filtered = typeSlug
      ? (data || []).filter((a: Record<string, unknown> & { animal_types?: { slug?: string } }) => a.animal_types?.slug === typeSlug)
      : data

    return NextResponse.json(filtered)

  } catch (error) {
    console.error('Error en GET /api/animals:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// FUNCIÓN POST: Para registrar nuevos animales
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const insforge = createInsForgeServerClient(accessToken)

    // Verify user is logged in
    const { data: userData } = await insforge.auth.getCurrentUser()
    if (!userData?.user) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    // Verify user is admin
    const { data: profile } = await insforge.database
      .from('user_profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Sin permisos de administrador' }, { status: 403 })
    }

    const body = await request.json()

    // ── Allowlist of user-editable columns (prevents mass-assignment) ────────
    // created_by / created_at / id are always server-derived; never trust client.
    const {
      name,
      breed,
      sex: rawSex,
      birth_date,
      identification_code,
      color,
      weight_kg,
      acquisition_type,
      acquisition_date,
      notes,
      status,
      type_id,
      metadata,
      is_litter,
      litter_count,
    } = body as Record<string, unknown>

    // Normalize legacy/plural sex values (DB constraint expects 'macho' / 'hembra').
    let sex = typeof rawSex === 'string' ? rawSex.toLowerCase() : rawSex
    if (sex === 'machos') sex = 'macho'
    if (sex === 'hembras') sex = 'hembra'

    // Litter validation
    const isLitter = is_litter === true
    const litterCount = typeof litter_count === 'number' ? litter_count : parseInt(String(litter_count ?? ''), 10)
    if (isLitter && (!Number.isFinite(litterCount) || litterCount <= 0)) {
      return NextResponse.json({ error: 'Una camada debe tener al menos 1 lechón nacido vivo.' }, { status: 400 })
    }

    const identCode = typeof identification_code === 'string' ? identification_code.trim() : null
    if (identCode) {
      const { data: existing, error: checkError } = await insforge.database
        .from('animals')
        .select('id, name, identification_code')
        .eq('identification_code', identCode)
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

    const insertPayload: Record<string, unknown> = {
      name:                name                ?? null,
      breed:               breed               ?? null,
      sex:                 sex                 ?? null,
      birth_date:          birth_date          ?? null,
      identification_code: identCode,
      color:               color               ?? null,
      weight_kg:           weight_kg           ?? null,
      acquisition_type:    acquisition_type    ?? null,
      acquisition_date:    acquisition_date    ?? null,
      notes:               notes               ?? null,
      status:              status              ?? 'activo',
      type_id:             type_id             ?? null,
      metadata:            metadata            ?? null,
      is_litter:           isLitter,
      litter_count:        isLitter ? litterCount : null,
      litter_alive:        isLitter ? litterCount : null,
      created_by:          userData.user.id,
    }

    const { data, error } = await insforge.database
      .from('animals')
      .insert([insertPayload])
      .select()

    if (error) {
      return NextResponse.json({ error: error.message || 'Error al guardar' }, { status: 400 })
    }

    return NextResponse.json({ data: data?.[0] }, { status: 201 })
  } catch (err) {
    console.error('Animal creation error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
} 
