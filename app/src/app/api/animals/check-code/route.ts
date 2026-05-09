import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

/**
 * GET /api/animals/check-code?code=<identification_code>[&exclude=<animal_id>]
 *
 * Verifica si un código de identificación ya está en uso por cualquier animal
 * (sin importar especie ni raza).
 *
 * Query params:
 *   code     – código a verificar (requerido)
 *   exclude  – id del animal a excluir de la búsqueda (útil al editar)
 *
 * Response:
 *   { taken: false }
 *   { taken: true, usedBy: "nombre o código del animal que ya lo tiene" }
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value

    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const insforge = createInsForgeServerClient(accessToken)

    const { searchParams } = new URL(request.url)
    const code    = searchParams.get('code')?.trim()
    const exclude = searchParams.get('exclude')?.trim()   // optional: animal id being edited

    if (!code) {
      return NextResponse.json({ taken: false })
    }

    let query = insforge.database
      .from('animals')
      .select('id, name, identification_code')
      .eq('identification_code', code)
      .limit(1)

    if (exclude) {
      query = query.neq('id', exclude)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: 'Error al verificar código' }, { status: 500 })
    }

    if (data && data.length > 0) {
      const dup = data[0] as { id: string; name: string | null; identification_code: string }
      return NextResponse.json({
        taken: true,
        usedBy: dup.name || dup.identification_code,
      })
    }

    return NextResponse.json({ taken: false })
  } catch (err) {
    console.error('check-code error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
