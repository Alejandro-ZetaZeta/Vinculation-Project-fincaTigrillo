import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { runReproductivePrediction } from '@/lib/ai/factory'
import { buildReproductivePredictionPrompt } from '@/lib/ai/prompts'
import type { AnimalContext, ReproductiveEventContext } from '@/lib/ai/provider'


export const maxDuration = 60
/**
 * POST /api/ai/predict-reproductive
 *
 * Solo admins. Bajo demanda.
 * 1. Obtiene hembras activas con su especie
 * 2. Obtiene todos sus eventos reproductivos
 * 3. Construye el prompt y llama al proveedor de IA activo
 * 4. Retorna PredictionResult
 */
export async function POST() {
  try {
    // ── Autenticación ────────────────────────────────────────
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const insforge = createInsForgeServerClient(accessToken)

    // ── Verificar rol admin ──────────────────────────────────
    const { data: userData } = await insforge.auth.getCurrentUser()
    if (!userData?.user) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    const { data: profile } = await insforge.database
      .from('user_profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores pueden ejecutar análisis de IA' }, { status: 403 })
    }

    // ── Obtener hembras activas con especie ──────────────────
    const { data: animalsRaw, error: animalsError } = await insforge.database
      .from('animals')
      .select('id, name, identification_code, sex, birth_date, status, animal_types(name, slug)')
      .eq('status', 'activo')
      .in('sex', ['hembra', 'Hembra', 'HEMBRA'])  // normalizar capitalización

    if (animalsError) {
      console.error('[predict-reproductive] Error fetching animals:', animalsError)
      return NextResponse.json({ error: 'Error al consultar animales' }, { status: 500 })
    }

    const animals: AnimalContext[] = ((animalsRaw || []) as Array<{
      id: string
      name: string | null
      identification_code: string | null
      sex: string | null
      birth_date: string | null
      status: string
      animal_types: { name: string; slug: string } | { name: string; slug: string }[] | null
    }>).map(a => {
      const at = Array.isArray(a.animal_types) ? a.animal_types[0] ?? null : a.animal_types
      return {
        id: a.id,
        name: a.name,
        identification_code: a.identification_code,
        sex: a.sex,
        birth_date: a.birth_date,
        status: a.status,
        species_slug: at?.slug ?? 'desconocida',
        species_name: at?.name ?? 'Desconocida',
      }
    })

    if (animals.length === 0) {
      return NextResponse.json({
        error: 'No hay hembras activas registradas para analizar. Registra animales con sexo "hembra" primero.',
      }, { status: 422 })
    }

    // ── Obtener eventos reproductivos de esas hembras ────────
    const animalIds = animals.map(a => a.id)

    const { data: eventsRaw, error: eventsError } = await insforge.database
      .from('reproductive_events')
      .select('id, animal_id, event_type, event_date, expected_due_date, notes')
      .in('animal_id', animalIds)
      .order('event_date', { ascending: false })

    if (eventsError) {
      console.error('[predict-reproductive] Error fetching events:', eventsError)
      return NextResponse.json({ error: 'Error al consultar eventos reproductivos' }, { status: 500 })
    }

    const events: ReproductiveEventContext[] = (eventsRaw || []) as ReproductiveEventContext[]

    // ── Construir prompt y llamar a la IA ────────────────────
    const prompt = buildReproductivePredictionPrompt(animals, events)

    const result = await runReproductivePrediction(prompt)

    return NextResponse.json(result)

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error interno desconocido'
    console.error('[POST /api/ai/predict-reproductive]', errorMessage)

    // Error específico de API Key inválida
    if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('Incorrect API key')) {
      return NextResponse.json({
        error: 'API Key de IA inválida o no configurada. Verifica AI_API_KEY en .env.local',
      }, { status: 503 })
    }

    // Error de proveedor local no disponible
    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
      return NextResponse.json({
        error: 'No se puede conectar con el proveedor de IA. Verifica AI_BASE_URL y que el servidor esté corriendo.',
      }, { status: 503 })
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}

/**
 * GET /api/ai/predict-reproductive
 * Verifica el estado del proveedor de IA activo (health check)
 */
export async function GET() {
  try {
    const provider = process.env.AI_PROVIDER ?? 'openai'
    const model = process.env.AI_MODEL ?? 'gpt-4o-mini'
    const hasKey = !!(process.env.AI_API_KEY)
    const baseUrl = process.env.AI_BASE_URL ?? null

    return NextResponse.json({
      provider,
      model,
      has_api_key: hasKey,
      base_url: baseUrl,
      status: 'configured',
    })
  } catch {
    return NextResponse.json({ error: 'Error al leer configuración de IA' }, { status: 500 })
  }
}
