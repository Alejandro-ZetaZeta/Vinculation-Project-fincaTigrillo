import { NextRequest, NextResponse } from 'next/server'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { cookies } from 'next/headers'

async function getAuthClient() {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('insforge_access_token')?.value
  if (!accessToken) return { client: null, role: null, userId: null }
  const insforge = createInsForgeServerClient(accessToken)
  const { data: userData } = await insforge.auth.getCurrentUser()
  if (!userData?.user) return { client: null, role: null, userId: null }
  const { data: profile } = await insforge.database
    .from('user_profiles').select('role').eq('user_id', userData.user.id).maybeSingle()
  return { client: insforge, role: profile?.role || 'viewer', userId: userData.user.id }
}

// GET /api/potreros — lista todos los potreros con agregados de sembrios
export async function GET() {
  try {
    const { client } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Dos queries separados para evitar el error PGRST200 de caché de esquema
    const { data: potrerosRaw, error: pErr } = await client.database
      .from('potreros')
      .select('*')
      .order('created_at', { ascending: false })

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 })

    const { data: sembriosRaw } = await client.database
      .from('sembrios')
      .select('id, potrero_id, tipo_cultivo, area_sembrada_m2, estado, fecha_siembra')

    const sembrios = sembriosRaw || []

    const enriched = (potrerosRaw || []).map((p: Record<string, unknown>) => {
      const mine = sembrios.filter((s: Record<string, unknown>) => s.potrero_id === p.id) as { area_sembrada_m2: number; estado: string }[]
      const area_ocupada = mine
        .filter(s => s.estado === 'en_crecimiento' || s.estado === 'en_preparacion')
        .reduce((sum, s) => sum + Number(s.area_sembrada_m2 || 0), 0)
      return {
        ...p,
        sembrios: mine,
        area_ocupada_m2: area_ocupada,
        area_disponible_m2: Math.max(0, Number(p.area_total_m2) - area_ocupada),
        total_sembrios: mine.length,
      }
    })

    return NextResponse.json({ data: enriched })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}


// POST /api/potreros — crear un potrero
export async function POST(request: NextRequest) {
  try {
    const { client, role, userId } = await getAuthClient()
    if (!client) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    if (role !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

    const body = await request.json()
    const { nombre, descripcion, area_total_m2, tipo_suelo, ubicacion_referencia } = body

    if (!nombre || !area_total_m2) {
      return NextResponse.json({ error: 'Nombre y área total son obligatorios' }, { status: 400 })
    }
    if (Number(area_total_m2) <= 0) {
      return NextResponse.json({ error: 'El área debe ser mayor a 0' }, { status: 400 })
    }

    const { data, error } = await client.database
      .from('potreros')
      .insert([{ nombre, descripcion, area_total_m2: Number(area_total_m2), tipo_suelo, ubicacion_referencia, created_by: userId }])
      .select()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0] }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
