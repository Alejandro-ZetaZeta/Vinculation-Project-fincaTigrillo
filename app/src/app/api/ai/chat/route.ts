import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { aiChat } from '@/lib/ai/factory'

export const maxDuration = 300

// ─── System prompt para chat conversacional ─────────────────────────────────
const CHAT_SYSTEM_PROMPT = `Eres un asistente veterinario y ganadero experto para la Finca Tigrillo, ubicada en Colombia.
Tu función es responder preguntas específicas sobre animales individuales y sobre el manejo general de la finca.

REGLAS:
1. Responde siempre en español, de forma clara, conversacional y profesional.
2. Identifica la especie del animal basándote EXACTAMENTE en el campo "especie" del contexto proporcionado:
   - Si la especie es "Bovino", el animal es una vaca, toro o ternero.
   - Si la especie es "Porcino", el animal es un cerdo, puerco o lechón.
   - Si la especie es "Caprino", el animal es una cabra.
   - Si la especie es "Equino", el animal es un caballo o yegua.
   - Si la especie es "Aves de Corral", el animal es una gallina, pollo o pato.
   NUNCA digas que un animal es una cabra si su especie es Bovino o Porcino. No te dejes influenciar por el animal anterior de la conversación.
3. Si el usuario pregunta sobre un animal específico (por nombre, código o especie), utiliza EXCLUSIVAMENTE los datos que te proporciono en el contexto del animal. No inventes datos.
4. Si te dan datos de vacunación de un animal, responde con precisión: qué vacunas tiene, cuántas dosis lleva, cuándo fue la última aplicación, cuándo es la próxima dosis, y si está al día o no.
5. Si te dan datos reproductivos, analiza el historial del animal: montas, partos, abortos, estado actual.
6. Si NO hay datos del animal en el contexto, dilo claramente: "No encontré información registrada sobre ese animal en la base de datos."
7. Si te dan estadísticas de la finca (conteos por especie), úsalas EXACTAMENTE para responder. NUNCA inventes ni estimes cantidades.
8. Si la pregunta es general (no sobre un animal específico ni estadísticas), responde con información práctica basada en buenas prácticas ganaderas colombianas.
9. Sé conciso pero completo. Usa listas cuando sea útil.
10. NUNCA respondas con JSON. Responde en texto plano conversacional, usando markdown ligero (negritas, listas) para estructura.
11. Si el animal tiene vacunas pendientes o atrasadas, alerta al usuario con urgencia.
12. Puedes sugerir acciones concretas basadas en los datos reales del animal.`

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequestBody {
  messages: ChatMessage[]
}

// ─── Detección de intención ──────────────────────────────────────────────────

type Intent = 'stats' | 'animal' | 'general'

const STATS_KEYWORDS = [
  'cuántos', 'cuántas', 'cuantos', 'cuantas',
  'total', 'hay en la finca', 'tenemos', 'tienen',
  'cantidad', 'número de', 'numero de',
  'todos los', 'todas las',
  'resumen', 'inventario', 'hato',
]

const SPECIES_KEYWORDS = [
  'vaca', 'vacas', 'toro', 'toros', 'ternero', 'terneros', 'bovino', 'bovinos',
  'cerdo', 'cerdos', 'puerco', 'puercos', 'lechón', 'porcino', 'porcinos',
  'cabra', 'cabras', 'caprino', 'caprinos',
  'caballo', 'caballos', 'yegua', 'yeguas', 'equino', 'equinos',
  'gallina', 'gallinas', 'pollo', 'pollos', 'pato', 'patos', 'aves',
  'animal', 'animales',
]

function detectIntent(question: string): Intent {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const hasStatsKeyword = STATS_KEYWORDS.some(k => q.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))
  const hasSpeciesKeyword = SPECIES_KEYWORDS.some(k => q.includes(k.normalize('NFD').replace(/[\u0300-\u036f]/g, '')))

  if (hasStatsKeyword && hasSpeciesKeyword) return 'stats'
  if (hasStatsKeyword) return 'stats'
  return 'animal' // will fall back to 'general' if no match found in DB
}

// ─── Estadísticas generales de la finca ─────────────────────────────────────

async function findFarmStats(
  insforge: ReturnType<typeof createInsForgeServerClient>
): Promise<string | null> {
  // Contar animales agrupados por tipo/especie
  const { data: animals, error } = await insforge.database
    .from('animals')
    .select('id, status, animal_types(name, slug)')

  if (error || !animals || animals.length === 0) return null

  type AnimalRow = {
    id: string
    status: string | null
    animal_types: { name: string; slug: string } | { name: string; slug: string }[] | null
  }

  const rows = animals as AnimalRow[]

  // Agrupar por especie y estado
  const bySpecies: Record<string, { total: number; activos: number }> = {}
  let totalAnimals = 0
  let totalActivos = 0

  for (const a of rows) {
    const typeObj = Array.isArray(a.animal_types) ? a.animal_types[0] : a.animal_types
    const speciesName = typeObj?.name ?? 'Sin clasificar'
    const isActive = a.status === 'active' || a.status === 'activo'

    if (!bySpecies[speciesName]) bySpecies[speciesName] = { total: 0, activos: 0 }
    bySpecies[speciesName].total++
    if (isActive) bySpecies[speciesName].activos++

    totalAnimals++
    if (isActive) totalActivos++
  }

  const speciesLines = Object.entries(bySpecies)
    .sort((a, b) => b[1].total - a[1].total)
    .map(([name, counts]) =>
      `  - ${name}: ${counts.total} en total (${counts.activos} activos)`
    )
    .join('\n')

  const context = {
    resumen_finca: {
      total_animales: totalAnimals,
      animales_activos: totalActivos,
      por_especie: bySpecies,
    },
    fecha_consulta: new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10),
  }

  return `\n\n--- ESTADÍSTICAS ACTUALES DE LA FINCA (datos reales de la base de datos) ---\nTotal animales registrados: ${totalAnimals} (${totalActivos} activos)\nDesglose por especie:\n${speciesLines}\n\nDatos completos:\n${JSON.stringify(context, null, 2)}\n--- FIN DE ESTADÍSTICAS ---`
}

// ─── Buscar animal por nombre/código ────────────────────────────────────────
// Ahora busca en el historial completo para mantener contexto entre mensajes

async function findAnimalContext(
  insforge: ReturnType<typeof createInsForgeServerClient>,
  messages: ChatMessage[]
): Promise<string | null> {
  // Obtener todos los animales para buscar coincidencias
  const { data: animals, error: animalsError } = await insforge.database
    .from('animals')
    .select('id, name, identification_code, breed, sex, birth_date, weight_kg, status, notes, acquisition_type, acquisition_date, metadata, animal_types(name, slug)')

  if (animalsError || !animals || animals.length === 0) return null

  type AnimalRow = {
    id: string
    name: string | null
    identification_code: string | null
    breed: string | null
    sex: string | null
    birth_date: string | null
    weight_kg: number | null
    status: string | null
    notes: string | null
    acquisition_type: string | null
    acquisition_date: string | null
    metadata: Record<string, unknown> | null
    animal_types: { name: string; slug: string } | { name: string; slug: string }[] | null
  }

  const allAnimals = animals as AnimalRow[]

  // Buscar en los mensajes recientes (del más reciente al más antiguo) para mantener contexto
  // Tomamos los últimos 6 mensajes para que el contexto no se extienda demasiado atrás
  const recentMessages = messages.slice(-6)

  let matchedAnimal: AnimalRow | null = null

  // Primero intentar con el mensaje más reciente del usuario, luego buscar en el historial
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i]
    if (msg.role !== 'user') continue

    const questionLower = msg.content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    const found = allAnimals.find(a => {
      const nameNorm = (a.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const codeNorm = (a.identification_code || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      return (nameNorm && questionLower.includes(nameNorm)) ||
             (codeNorm && questionLower.includes(codeNorm))
    })

    if (found) {
      matchedAnimal = found
      break // Usar el animal más recientemente mencionado
    }
  }

  if (!matchedAnimal) return null

  // Obtener datos detallados del animal encontrado
  const animalType = Array.isArray(matchedAnimal.animal_types)
    ? matchedAnimal.animal_types[0]
    : matchedAnimal.animal_types

  // Obtener vacunaciones del animal
  const { data: vaccinations } = await insforge.database
    .from('animal_vaccinations')
    .select('*, vaccine_catalog(id, name, target_type_id, default_next_dose_days, total_doses)')
    .eq('animal_id', matchedAnimal.id)
    .order('applied_at', { ascending: true })

  // Obtener eventos reproductivos del animal
  const { data: reproEvents } = await insforge.database
    .from('reproductive_events')
    .select('id, event_type, event_date, expected_due_date, notes')
    .eq('animal_id', matchedAnimal.id)
    .order('event_date', { ascending: false })

  // Calcular edad
  let ageText = 'Desconocida'
  if (matchedAnimal.birth_date) {
    const birth = new Date(matchedAnimal.birth_date)
    const now = new Date()
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    if (months >= 12) {
      const years = Math.floor(months / 12)
      const remainingMonths = months % 12
      ageText = `${years} año${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` y ${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}` : ''}`
    } else {
      ageText = `${months} mes${months > 1 ? 'es' : ''}`
    }
  }

  // Construir contexto enriquecido
  const context: Record<string, unknown> = {
    animal: {
      nombre: matchedAnimal.name || matchedAnimal.identification_code || 'Sin nombre',
      codigo_identificacion: matchedAnimal.identification_code,
      especie: animalType?.name || 'Desconocida',
      especie_slug: animalType?.slug || 'desconocida',
      raza: matchedAnimal.breed,
      sexo: matchedAnimal.sex,
      fecha_nacimiento: matchedAnimal.birth_date,
      edad: ageText,
      peso_kg: matchedAnimal.weight_kg,
      estado: matchedAnimal.status,
      tipo_adquisicion: matchedAnimal.acquisition_type,
      fecha_adquisicion: matchedAnimal.acquisition_date,
      notas: matchedAnimal.notes,
      metadata: matchedAnimal.metadata,
    },
    vacunaciones: (vaccinations || []).map((v: Record<string, unknown>) => {
      const catalog = v.vaccine_catalog as { name?: string; total_doses?: number; default_next_dose_days?: number } | null
      return {
        vacuna: catalog?.name || 'Desconocida',
        fecha_aplicacion: v.applied_at,
        proxima_dosis: v.next_dose_at,
        dosis_numero: v.dose_number,
        total_dosis_requeridas: catalog?.total_doses,
        intervalo_dias: catalog?.default_next_dose_days,
        notas: v.notes,
      }
    }),
    eventos_reproductivos: (reproEvents || []).map((e: Record<string, unknown>) => ({
      tipo: e.event_type,
      fecha: e.event_date,
      fecha_parto_esperada: e.expected_due_date,
      notas: e.notes,
    })),
    fecha_consulta: new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10),
  }

  return `\n\n--- DATOS DEL ANIMAL ENCONTRADO EN LA BASE DE DATOS ---\n${JSON.stringify(context, null, 2)}\n--- FIN DE DATOS ---`
}

// ─── Endpoint principal ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Autenticación
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

    // Parsear cuerpo
    const body: ChatRequestBody = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un mensaje' }, { status: 400 })
    }

    // Obtener el último mensaje del usuario
    const lastUserMessage = messages[messages.length - 1]
    if (lastUserMessage.role !== 'user') {
      return NextResponse.json({ error: 'El último mensaje debe ser del usuario' }, { status: 400 })
    }

    // ── Detectar intención y buscar contexto apropiado ──────────────────────
    const intent = detectIntent(lastUserMessage.content)

    let contextBlock: string | null = null
    let hasAnimalContext = false
    let hasStatsContext = false

    if (intent === 'stats') {
      // Preguntas de conteo/estadísticas → consultar totales por especie
      contextBlock = await findFarmStats(insforge)
      hasStatsContext = !!contextBlock
    } else {
      // Preguntas sobre animal específico → buscar en historial completo
      contextBlock = await findAnimalContext(insforge, messages)
      hasAnimalContext = !!contextBlock

      // Si no encontró animal pero parece una pregunta de seguimiento, intentar stats como fallback
      if (!contextBlock && intent === 'general') {
        // no extra context — IA responde con conocimiento ganadero
      }
    }

    // ── Construir mensajes para la IA ───────────────────────────────────────
    const aiMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: CHAT_SYSTEM_PROMPT },
    ]

    // Agregar historial de conversación (últimos 10 mensajes para mantener contexto)
    const recentMessages = messages.slice(-10)
    for (const msg of recentMessages) {
      if (msg === lastUserMessage) {
        // Enriquecer el último mensaje del usuario con contexto de BD
        aiMessages.push({
          role: 'user',
          content: contextBlock
            ? `${msg.content}\n${contextBlock}`
            : msg.content,
        })
      } else {
        aiMessages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    }

    // Llamar a la IA (sin JSON mode, queremos texto conversacional)
    const { content, providerName, model } = await aiChat(aiMessages, { jsonMode: false })

    return NextResponse.json({
      message: content,
      meta: {
        provider: providerName,
        model,
        has_animal_context: hasAnimalContext,
        has_stats_context: hasStatsContext,
        intent,
      },
    })

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error interno desconocido'
    console.error('[POST /api/ai/chat]', errorMessage)

    if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('Incorrect API key')) {
      return NextResponse.json({
        error: 'API Key de IA inválida o no configurada. Verifica AI_API_KEY en .env.local',
      }, { status: 503 })
    }

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
      return NextResponse.json({
        error: 'No se puede conectar con el proveedor de IA. Verifica la configuración.',
      }, { status: 503 })
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
