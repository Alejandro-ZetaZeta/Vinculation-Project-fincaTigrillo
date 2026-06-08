import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { aiChat } from '@/lib/ai/factory'

// ─── Sistema prompt para informes operativos ─────────────────────────────────
const REPORTS_SYSTEM_PROMPT = `Eres un asesor experto en gestión ganadera para la Finca Tigrillo, ubicada en Colombia.
Tu función es analizar datos operativos del inventario animal, actividades y eventos reproductivos, y generar informes profesionales en español.

REGLAS:
1. Responde ÚNICAMENTE con un objeto JSON válido (sin texto antes ni después).
2. El "summary" DEBE responder directamente a la pregunta del usuario de forma clara, accionable y fácil de leer. Si es útil, usa saltos de línea y viñetas (- ) dentro del string para separar ideas.
3. Las "insights" son hallazgos clave o datos críticos encontrados en el inventario.
4. Las "recommendations" son sugerencias de qué hacer a continuación, clasificadas por urgencia (urgente/normal/baja).
5. Los "kpis" son estadísticas clave (Ej. Tasa de vacunación, Población activa) que respalden tu respuesta.
6. Si preguntan por un animal específico, revisa los datos provistos. Si no hay datos específicos de ese animal, da una recomendación general agropecuaria basada en la especie.
7. Sobre alimentación: Sugiere pautas claras basadas en ciclos de 24 días o según la etapa.
8. Sobre vacunación: Sé estricto con los riesgos sanitarios. Recomienda planes urgentes para animales 'no vacunados' o 'programados'.
9. IMPORTANTE: Todas tus respuestas deben ser concisas pero llenas de valor, sin rodeos, y estrictamente en ESPAÑOL.`

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const cookieStore = await cookies()
    const accessToken = cookieStore.get('insforge_access_token')?.value
    if (!accessToken) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const insforge = createInsForgeServerClient(accessToken)
    const { data: userData } = await insforge.auth.getCurrentUser()
    if (!userData?.user) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }

    // Parsear body: { reportType, focusModule, userQuestion, period }
    const body = await request.json()
    const { focusModule = 'todos', userQuestion = '', period = 'mes' } = body

    // ─── Recolectar datos reales de la BD ────────────────────────────────────

    // 1. Animales
    const { data: animals, error: animalsError } = await insforge.database
      .from('animals')
      .select('*, animal_types(name, slug)')
      
    if (animalsError) console.error('[Reports AI] Error fetching animals:', animalsError)

    // 2. Actividades
    const { data: activities, error: activitiesError } = await insforge.database
      .from('activities')
      .select('*, activity_assignments(status)')
      .order('created_at', { ascending: false })
      .limit(20)
      
    if (activitiesError) console.error('[Reports AI] Error fetching activities:', activitiesError)

    // 3. Eventos Reproductivos
    const { data: reproEvents, error: reproError } = await insforge.database
      .from('reproductive_events')
      .select('*, animals!reproductive_events_animal_id_fkey(name)')
      .order('event_date', { ascending: false })
      .limit(30)
      
    if (reproError) console.error('[Reports AI] Error fetching repro events:', reproError)

    // 4. Estudiantes/perfiles
    const { data: profiles } = await insforge.database
      .from('user_profiles')
      .select('role, career, semester')

    // ─── Procesar datos para el prompt ────────────────────────────────────────
    type AnimalRow = {
      status?: string | null
      animal_types?: { name?: string | null } | null
      metadata?: { estado_vacunacion?: string | null } | null
      weight?: number | null
    }
    const animalList = (animals ?? []) as AnimalRow[]

    const activityList = (activities || []) as Array<{
      id: string; title: string; due_date: string | null; created_at: string;
      activity_assignments: Array<{ status: string }>
    }>

    const reproList = (reproEvents || []) as Array<{
      event_type: string; event_date: string; expected_due_date: string | null; animal_id: string
    }>

    // Métricas procesadas
    const totalAnimals = animalList.length
    const activeAnimals = animalList.filter(a => a.status === 'activo').length
    const bySpecies = animalList.reduce<Record<string, { total: number; active: number }>>((acc, a) => {
      const sp = a.animal_types?.name || 'Sin clasificar'
      if (!acc[sp]) acc[sp] = { total: 0, active: 0 }
      acc[sp].total++
      if (a.status === 'activo') acc[sp].active++
      return acc
    }, {})

    const activitiesMetrics = {
      total: activityList.length,
      completadas: activityList.reduce((n, a) => {
        const done = a.activity_assignments.filter(x => x.status === 'done').length
        const total = a.activity_assignments.length
        return n + (total > 0 && done === total ? 1 : 0)
      }, 0),
    }

    const vacunasStats = {
      no_vacunados: animalList.filter(a => a.metadata?.estado_vacunacion === 'no vacunado' || !a.metadata?.estado_vacunacion).length,
      programados: animalList.filter(a => a.metadata?.estado_vacunacion === 'programado').length,
      vacunados: animalList.filter(a => a.metadata?.estado_vacunacion === 'vacunado').length,
    }

    const reproMetrics = {
      total_eventos: reproList.length,
      montas: reproList.filter(e => e.event_type === 'monta_natural' || e.event_type === 'inseminacion').length,
      partos: reproList.filter(e => e.event_type === 'parto').length,
      abortos: reproList.filter(e => e.event_type === 'aborto').length,
      proximos_partos: reproList.filter(e => {
        if (!e.expected_due_date) return false
        const diff = (new Date(e.expected_due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        return diff >= 0 && diff <= 30
      }).length,
    }

    const studentsCount = (profiles || []).filter((p: { role: string }) => p.role === 'viewer').length

    // Filtrar por módulo si es necesario
    const moduleContext = focusModule === 'todos'
      ? `Análisis GENERAL de toda la finca`
      : `Análisis ESPECÍFICO del módulo: ${focusModule}`

    // ─── Construir prompt dinámico ─────────────────────────────────────────────
    const dataContext = {
      periodo_analisis: period,
      modulo_foco: moduleContext,
      pregunta_usuario: userQuestion || 'Genera un informe operativo completo',
      inventario_animal: {
        total: totalAnimals,
        activos: activeAnimals,
        inactivos: totalAnimals - activeAnimals,
        tasa_actividad: totalAnimals > 0 ? `${((activeAnimals / totalAnimals) * 100).toFixed(1)}%` : '0%',
        distribucion_por_especie: bySpecies,
        animales_con_peso_registrado: animalList.filter(a => a.weight !== null).length,
        peso_promedio_kg: animalList.filter(a => a.weight).length > 0
          ? (animalList.reduce((s, a) => s + (a.weight || 0), 0) / animalList.filter(a => a.weight).length).toFixed(1)
          : 'No disponible',
        estado_vacunacion: vacunasStats,
      },
      actividades: activitiesMetrics,
      reproductivo: reproMetrics,
      estudiantes_activos: studentsCount,
    }

    const userPrompt = `
Analiza los siguientes datos operativos reales de la Finca Tigrillo y responde la solicitud del usuario.

SOLICITUD: "${userQuestion || 'Informe operativo general'}"
PERÍODO: ${period}
FOCO: ${moduleContext}

DATOS REALES DE LA BD:
${JSON.stringify(dataContext, null, 2)}

Responde con este esquema JSON exacto:
{
  "summary": "Párrafo ejecutivo profesional de 3-5 oraciones analizando el estado actual",
  "insights": [
    { "icon": "🐄", "title": "Título del hallazgo", "detail": "Descripción detallada del hallazgo con datos concretos" }
  ],
  "recommendations": [
    { "priority": "urgente|normal|baja", "action": "Acción concreta a tomar", "reason": "Por qué es importante" }
  ],
  "kpis": [
    { "label": "Nombre del KPI", "value": "Valor", "trend": "positivo|negativo|neutro", "note": "Contexto del KPI" }
  ],
  "data_quality": "alta|media|baja",
  "report_date": "${new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10)}"
}`

    // ─── Llamar a la IA ────────────────────────────────────────────────────────
    const { content, providerName, model } = await aiChat([
      { role: 'system', content: REPORTS_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ])

    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json({ error: 'La IA devolvió una respuesta inválida', raw: content.slice(0, 500) }, { status: 500 })
    }

    return NextResponse.json({
      analysis: parsed,
      meta: {
        provider: providerName,
        model,
        generated_at: new Date().toISOString(),
        data_points: { animals: totalAnimals, activities: activityList.length, repro_events: reproList.length },
      }
    })

  } catch (err) {
    console.error('[Reports Analyze API]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
