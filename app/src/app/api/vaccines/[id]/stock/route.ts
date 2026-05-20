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

/**
 * PATCH /api/vaccines/[id]/stock
 * Body: { add_doses: number }   (must be a positive integer)
 * Increments stock_doses for the specified vaccine.
 * Admin-only.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const body = await request.json()
    const addDoses = body?.add_doses

    if (
      typeof addDoses !== 'number' ||
      !Number.isInteger(addDoses) ||
      addDoses <= 0
    ) {
      return NextResponse.json(
        { error: 'add_doses debe ser un entero positivo' },
        { status: 400 }
      )
    }

    // Fetch current stock first
    const { data: current, error: fetchError } = await client.database
      .from('vaccine_catalog')
      .select('stock_doses')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 400 })
    if (!current) return NextResponse.json({ error: 'Vacuna no encontrada' }, { status: 404 })

    const newStock = (current.stock_doses as number) + addDoses

    const { data, error: updateError } = await client.database
      .from('vaccine_catalog')
      .update({ stock_doses: newStock })
      .eq('id', id)
      .select()

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 })
    return NextResponse.json({ data: data?.[0], stock_doses: newStock })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
