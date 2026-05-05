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

    let query = insforge.database
      .from('animals')
      .select('*, animal_types(id, name, slug, animal_categories(id, name, slug))')
      .eq('status', 'activo')

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
    body.created_by = userData.user.id

    const { data, error } = await insforge.database
      .from('animals')
      .insert([body])
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