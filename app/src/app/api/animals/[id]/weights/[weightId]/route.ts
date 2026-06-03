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

  return { client: insforge, error: null, status: 200 }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; weightId: string }> }
) {
  try {
    const { id, weightId } = await params
    const { client, error, status } = await getAdminClient()
    if (!client) return NextResponse.json({ error }, { status })

    const { error: dbError } = await client.database
      .from('animal_weights')
      .delete()
      .eq('id', weightId)
      .eq('animal_id', id)

    if (dbError) return NextResponse.json({ error: dbError.message }, { status: 400 })

    // Recalculate current weight from remaining records
    const { data: latestWeight } = await client.database
      .from('animal_weights')
      .select('weight_kg')
      .eq('animal_id', id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    await client.database
      .from('animals')
      .update({ weight_kg: latestWeight?.weight_kg ?? null })
      .eq('id', id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
