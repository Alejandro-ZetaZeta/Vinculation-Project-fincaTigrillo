import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

// FUNCIÓN GET: Para obtener los datos que alimentan los gráficos e informes
export async function GET() {
  try {
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value

    // Si no hay token, podrías denegar el acceso o usar un cliente anónimo
    // Para reportes internos, generalmente requerimos el token
    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const insforge = createInsForgeServerClient(accessToken)
    
    // Consultamos la base de datos de Insforge
    const { data, error } = await insforge.database
      .from('animals')
      .select('*')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
    
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