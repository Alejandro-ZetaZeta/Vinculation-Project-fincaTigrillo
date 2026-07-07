import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createInsForgeServerClient } from '@/lib/insforge/server'
import { aiChat } from '@/lib/ai/factory'

export const maxDuration = 300

// ─── System prompt para chat conversacional ─────────────────────────────────
const CHAT_SYSTEM_PROMPT = `Eres TigriA, el asistente veterinario de la Finca Tigrillo (Chone, Ecuador).
Responde siempre en español.

REGLA 1 - SALUDO: Solo incluye un saludo ("Hola", "Buenos dias", etc.) si es el PRIMER mensaje de la conversacion, es decir, si no hay mensajes anteriores del asistente. Si ya hubo mensajes previos, ve DIRECTO a responder sin saludar.

REGLA 2 - ROL Y TEMAS VALIDOS: Respondes TODO lo relacionado con la Finca Tigrillo. Ejemplos de preguntas VALIDAS que SIEMPRE debes responder:
   - Cuantos ml inyectar a un animal con una vacuna especifica
   - Estado, peso, edad, raza de un animal
   - Historial de vacunacion de un animal
   - Inventario y stock de vacunas
   - Estadisticas del hato (cuantos animales hay, por especie)
   - Buenas practicas ganaderas, alimentacion, reproduccion
   Solo rechaza preguntas CLARAMENTE ajenas al campo y la ganaderia (deportes, politica, entretenimiento, tecnologia general). En ese caso di unicamente: "Solo puedo ayudarte con temas de la Finca Tigrillo."
   NUNCA uses el mensaje de rechazo para preguntas sobre animales, inyecciones, vacunas o dosis. Esas son preguntas validas de la finca.

REGLA 3 - ESPECIE Y RAZA: Cuando tengas contexto del animal de la base de datos, usa SOLO los campos "especie" y "raza" del contexto. Jamas los deduzcas del nombre del animal.
   - especie="Bovino" -> vaca, toro o ternero
   - especie="Porcino" -> cerdo o lechon
   - especie="Caprino" -> cabra
   - especie="Equino" -> caballo o yegua
   - especie="Aves de Corral" -> gallina, pollo o pato
   Si la raza es null o vacia, di "raza no registrada".

REGLA 4 - DATOS DEL ANIMAL: Usa UNICAMENTE los datos del bloque "--- DATOS DEL ANIMAL ---". Nunca inventes datos. Si un campo es null, dilo claramente.

REGLA 5 - DOSIS A INYECTAR (CRITICO): Si el usuario pregunta cuantos ml inyectar a un animal:
   - Lee el campo "peso_kg" en el contexto del animal. Si tiene valor (no es null), usalo DIRECTAMENTE para dar la dosis, sin pedirlo al usuario.
   - NUNCA pidas datos que ya estan en la base de datos (peso, edad, especie, etc.).
   - Usa el peso del contexto + las recomendaciones del fabricante para dar la dosis en ml.
   - Solo pide el peso si aparece como null en el contexto del animal.
   - Si el animal no fue encontrado en la BD, dilo y pregunta como identificarlo.

REGLA 6 - VACUNACION DEL ANIMAL: Con datos de vacunacion del animal, informa: vacunas aplicadas, fechas, dosis completadas vs requeridas, proxima dosis, si esta al dia.

REGLA 7 - INVENTARIO DE VACUNAS (CRITICO - NO INVENTAR): Cuando tengas el bloque "--- INVENTARIO DE VACUNAS ---":
   - Lista UNICAMENTE las vacunas que aparecen en ese bloque, con su nombre EXACTO y el stock EXACTO que dice.
   - NUNCA inventes nombres de vacunas, ni valores de stock, ni tipos de vacunas que no esten en el bloque.
   - Si una vacuna tiene stock=0, di que esta AGOTADA. Si tiene stock bajo (<5), alertalo.
   - Si el bloque de inventario no esta presente en el contexto, NO listes vacunas. Di que no tienes datos del inventario.
   - Para recomendar vacunas a un animal especifico, filtra del inventario las que aplican a su especie.

REGLA 8 - ESTADISTICAS: Con estadisticas de la finca, usalas exactamente. Nunca estimes cantidades.

REGLA 9 - FORMATO (MUY IMPORTANTE): Texto plano y conversacional.
   - Listas con guion simple: "- elemento"
   - Enfasis en MAYUSCULAS, nunca con asteriscos ni guiones bajos
   - NUNCA uses #, ##, **, __, *, _, backticks ni bloques de codigo
   - Parrafos naturales y fluidos

REGLA 10: Se conciso, calido y directo. Habla como un veterinario de confianza.`

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequestBody {
  messages: ChatMessage[]
}

// ─── Utilidades para tolerancia a errores tipogárficos ─────────────────────

/**
 * Distancia de edición (Levenshtein) entre dos strings.
 * Ligera: O(m*n) pero solo para strings cortos (nombres de animales).
 */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * Devuelve true si el nombre del animal aparece en el texto,
 * aceptando hasta maxDist errores por palabra.
 * Ejemplo: "juan carloss" → encuentra "Juan Carlos"
 */
function fuzzyNameInText(nameNorm: string, textNorm: string): boolean {
  if (!nameNorm) return false
  // Intento exacto primero (más rápido)
  if (textNorm.includes(nameNorm)) return true

  const nameTokens = nameNorm.split(/\s+/).filter(Boolean)
  const textTokens = textNorm.split(/\s+/).filter(Boolean)

  // Cada token del nombre debe tener una coincidencia fuzzy en el texto
  return nameTokens.every(nameToken => {
    const maxDist = nameToken.length <= 4 ? 1 : 2 // más estricto con nombres cortos
    return textTokens.some(textToken => levenshtein(nameToken, textToken) <= maxDist)
  })
}

/**
 * Corrige errores tipográficos comunes en español antes de clasificar la intención.
 * Esto permite que "injectarle" sea tratado igual que "inyectarle".
 */
function normalizeTypos(text: string): string {
  return text
    // Variantes de inyectar con j en vez de y
    .replace(/\binjec/g, 'inyec')
    // Variantes de aplicar como sinónimo de inyectar
    .replace(/\baplicarle\b/g, 'inyectarle')
    .replace(/\baplicar\b/g, 'inyectar')
    // Variantes comunes de vacuna
    .replace(/\bvacunacion\b/g, 'vacuna')
    .replace(/\bvacunar\b/g, 'vacuna')
    // Variantes de dosis
    .replace(/\bdocis\b/g, 'dosis')
    .replace(/\bdociss\b/g, 'dosis')
    // ml con espacio o sin espacio
    .replace(/(\d)\s*ml\b/g, '$1 ml')
}

// ─── Detección de intención ──────────────────────────────────────────────────

type Intent = 'stats' | 'animal' | 'vaccines' | 'general'

const STATS_KEYWORDS = [
  'cuantos', 'cuantas',
  'total', 'hay en la finca', 'tenemos', 'tienen',
  'cantidad', 'numero de',
  'todos los', 'todas las',
  'resumen', 'inventario', 'hato',
]

const SPECIES_KEYWORDS = [
  'vaca', 'vacas', 'toro', 'toros', 'ternero', 'terneros', 'bovino', 'bovinos',
  'cerdo', 'cerdos', 'puerco', 'puercos', 'lechon', 'porcino', 'porcinos',
  'cabra', 'cabras', 'caprino', 'caprinos',
  'caballo', 'caballos', 'yegua', 'yeguas', 'equino', 'equinos',
  'gallina', 'gallinas', 'pollo', 'pollos', 'pato', 'patos', 'aves',
  'animal', 'animales',
]

// Palabras que indican que la pregunta es sobre un animal específico
const ANIMAL_SPECIFIC_KEYWORDS = [
  // variantes de inyectar (con y/j, con faltas de ortografía comunes)
  'inyect', 'inject', 'inocula',
  // unidades de dosis
  'ml', ' cc ', 'cm3',
  // aplicación
  'aplicar', 'aplicarle', 'poner', 'ponerle',
  // datos del animal
  'peso', 'edad', 'raza', 'especie', 'historial',
  // reproductivo
  'reproduct', 'parto', 'monta', 'gestacion',
]

// Palabras que indican preguntas sobre el inventario/catálogo de vacunas de la finca
const VACCINE_INVENTORY_KEYWORDS = [
  'que vacunas tenemos', 'que vacunas hay',
  'que vacunas tiene la finca',
  'inventario de vacunas', 'catalogo de vacunas',
  'stock de vacunas', 'vacunas disponibles', 'vacunas en stock',
  'cuantas vacunas', 'tenemos vacunas',
  'que vacunas tengo',
  'vacunas registradas', 'vacunas de la finca',
  'mostrar vacunas', 'lista de vacunas', 'listar vacunas',
  'dosis disponibles', 'dosis en inventario',
]

function detectIntent(question: string): Intent {
  // Primero normalizar typos comunes para mejorar la detección
  const normalized = normalizeTypos(question)
  const q = normalized.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  // Primero detectar si es sobre el inventario de vacunas (tiene prioridad)
  if (VACCINE_INVENTORY_KEYWORDS.some(k => q.includes(k))) return 'vaccines'

  const mentionsVaccine = q.includes('vacuna') || q.includes('vaccine') || q.includes('dosis')
  const hasStatsKeyword = STATS_KEYWORDS.some(k => q.includes(k))
  const hasSpeciesKeyword = SPECIES_KEYWORDS.some(k => q.includes(k))
  const hasAnimalSpecificKeyword = ANIMAL_SPECIFIC_KEYWORDS.some(k => q.includes(k))

  if (hasStatsKeyword && hasSpeciesKeyword) return 'stats'
  if (hasStatsKeyword) return 'stats'

  // "vacuna/dosis" sin referencia a animal específico → inventario
  if (mentionsVaccine && !hasAnimalSpecificKeyword) return 'vaccines'

  if (hasAnimalSpecificKeyword) return 'animal'
  return 'animal' // will fall back to general knowledge if no animal found in DB
}

// ─── Inventario de vacunas de la finca ───────────────────────────────────────

async function findVaccineInventory(
  insforge: ReturnType<typeof createInsForgeServerClient>
): Promise<string | null> {
  const { data: vaccines, error } = await insforge.database
    .from('vaccine_catalog')
    .select('id, name, description, stock_doses, is_active, target_sex, total_doses, default_next_dose_days, age_min_days, age_max_days, animal_types(name)')
    .order('name', { ascending: true })

  if (error || !vaccines || vaccines.length === 0) return null

  type VaccineRow = {
    id: string
    name: string
    description: string | null
    stock_doses: number
    is_active: boolean
    target_sex: string
    total_doses: number | null
    default_next_dose_days: number | null
    age_min_days: number | null
    age_max_days: number | null
    animal_types: { name: string } | { name: string }[] | null
  }

  const rows = vaccines as VaccineRow[]

  const totalVaccines = rows.length
  const activeVaccines = rows.filter(v => v.is_active).length
  const outOfStock = rows.filter(v => v.stock_doses === 0)
  const lowStock = rows.filter(v => v.stock_doses > 0 && v.stock_doses < 5)

  const vaccineList = rows.map(v => {
    const typeObj = Array.isArray(v.animal_types) ? v.animal_types[0] : v.animal_types
    const especie = typeObj?.name ?? 'General'
    const sexo = v.target_sex === 'any' ? 'cualquier sexo' : v.target_sex
    const stockStatus = v.stock_doses === 0
      ? 'AGOTADA'
      : v.stock_doses < 5
      ? `STOCK BAJO (${v.stock_doses} dosis)`
      : `${v.stock_doses} dosis disponibles`
    const dosis = v.total_doses != null
      ? `serie de ${v.total_doses} dosis`
      : v.default_next_dose_days != null
      ? `dosis recurrente cada ${v.default_next_dose_days} dias`
      : 'dosis unica'
    return {
      nombre: v.name,
      descripcion: v.description,
      especie,
      sexo,
      stock: stockStatus,
      stock_dosis_numero: v.stock_doses,
      tipo_dosificacion: dosis,
      activa: v.is_active,
    }
  })

  const context = {
    resumen_inventario_vacunas: {
      total_vacunas_registradas: totalVaccines,
      vacunas_activas: activeVaccines,
      vacunas_agotadas: outOfStock.map(v => v.name),
      vacunas_con_stock_bajo: lowStock.map(v => `${v.name} (${v.stock_doses} dosis)`),
    },
    vacunas: vaccineList,
    fecha_consulta: new Date(new Date().getTime() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10),
  }

  return `\n\n--- INVENTARIO DE VACUNAS DE LA FINCA (datos reales de la base de datos) ---\nTotal vacunas registradas: ${totalVaccines} (${activeVaccines} activas)\nVacunas agotadas: ${outOfStock.length > 0 ? outOfStock.map(v => v.name).join(', ') : 'ninguna'}\nStock bajo (<5 dosis): ${lowStock.length > 0 ? lowStock.map(v => `${v.name} (${v.stock_doses})`).join(', ') : 'ninguna'}\n\nDatos completos:\n${JSON.stringify(context, null, 2)}\n--- FIN DE INVENTARIO ---`
}

// ─── Estadísticas generales de la finca ─────────────────────────────────────

async function findFarmStats(
  insforge: ReturnType<typeof createInsForgeServerClient>
): Promise<string | null> {
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

  return `\n\n--- ESTADISTICAS ACTUALES DE LA FINCA (datos reales de la base de datos) ---\nTotal animales registrados: ${totalAnimals} (${totalActivos} activos)\nDesglose por especie:\n${speciesLines}\n\nDatos completos:\n${JSON.stringify(context, null, 2)}\n--- FIN DE ESTADISTICAS ---`
}

// ─── Buscar animal por nombre/código ────────────────────────────────────────

async function findAnimalContext(
  insforge: ReturnType<typeof createInsForgeServerClient>,
  messages: ChatMessage[]
): Promise<string | null> {
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

  const recentMessages = messages.slice(-6)
  let matchedAnimal: AnimalRow | null = null

  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i]
    if (msg.role !== 'user') continue

    const questionLower = msg.content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    const found = allAnimals.find(a => {
      const nameNorm = (a.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const codeNorm = (a.identification_code || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      // Fuzzy match: tolera hasta 1-2 errores tipográficos por palabra del nombre
      return fuzzyNameInText(nameNorm, questionLower) ||
             (codeNorm && questionLower.includes(codeNorm))
    })

    if (found) {
      matchedAnimal = found
      break
    }
  }

  if (!matchedAnimal) return null

  const animalType = Array.isArray(matchedAnimal.animal_types)
    ? matchedAnimal.animal_types[0]
    : matchedAnimal.animal_types

  const { data: vaccinations } = await insforge.database
    .from('animal_vaccinations')
    .select('*, vaccine_catalog(id, name, target_type_id, default_next_dose_days, total_doses)')
    .eq('animal_id', matchedAnimal.id)
    .order('applied_at', { ascending: true })

  const { data: reproEvents } = await insforge.database
    .from('reproductive_events')
    .select('id, event_type, event_date, expected_due_date, notes')
    .eq('animal_id', matchedAnimal.id)
    .order('event_date', { ascending: false })

  let ageText = 'Desconocida'
  if (matchedAnimal.birth_date) {
    const birth = new Date(matchedAnimal.birth_date)
    const now = new Date()
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
    if (months >= 12) {
      const years = Math.floor(months / 12)
      const remainingMonths = months % 12
      ageText = `${years} anio${years > 1 ? 's' : ''}${remainingMonths > 0 ? ` y ${remainingMonths} mes${remainingMonths > 1 ? 'es' : ''}` : ''}`
    } else {
      ageText = `${months} mes${months > 1 ? 'es' : ''}`
    }
  }

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
      return NextResponse.json({ error: 'Sesion invalida' }, { status: 401 })
    }

    // Restringir TigriA (chat IA) a docentes y administradores
    const { data: chatProfile } = await insforge.database
      .from('user_profiles')
      .select('role')
      .eq('user_id', userData.user.id)
      .maybeSingle()

    if (chatProfile?.role === 'viewer' || !chatProfile) {
      return NextResponse.json(
        { error: 'TigriA está disponible solo para docentes y administradores.' },
        { status: 403 },
      )
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
      return NextResponse.json({ error: 'El ultimo mensaje debe ser del usuario' }, { status: 400 })
    }

    // ── Detectar intención y buscar contexto apropiado ──────────────────────
    const intent = detectIntent(lastUserMessage.content)

    let contextBlock: string | null = null
    let hasAnimalContext = false
    let hasStatsContext = false
    let hasVaccineContext = false

    if (intent === 'vaccines') {
      // Preguntas sobre inventario de vacunas → consultar vaccine_catalog
      const vaccineContext = await findVaccineInventory(insforge)
      hasVaccineContext = !!vaccineContext

      // Fallback dual: si la pregunta tiene lenguaje de dosis individual (ml, aplicar, poner)
      // también buscar el animal por si el usuario lo mencionó por nombre
      const qv = lastUserMessage.content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const hasDosageLanguage = ['ml', 'inject', 'inyect', 'aplicar', 'poner', 'cuanto', 'cuantos'].some(k => qv.includes(k))

      if (hasDosageLanguage) {
        // Intentar encontrar animal en la pregunta; si lo hay, combinar ambos contextos
        const animalContext = await findAnimalContext(insforge, messages)
        if (animalContext) {
          hasAnimalContext = true
          contextBlock = [animalContext, vaccineContext].filter(Boolean).join('') || null
        } else {
          contextBlock = vaccineContext
        }
      } else {
        contextBlock = vaccineContext
      }
    } else if (intent === 'stats') {
      // Preguntas de conteo/estadísticas → consultar totales por especie
      contextBlock = await findFarmStats(insforge)
      hasStatsContext = !!contextBlock
    } else {
      // Preguntas sobre animal específico → buscar en historial completo
      const animalContext = await findAnimalContext(insforge, messages)
      hasAnimalContext = !!animalContext

      // Contexto dual: si la pregunta menciona una vacuna o dosis específica,
      // también traer el inventario de vacunas para que la IA sepa el stock disponible
      const q = lastUserMessage.content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const mentionsVaccineOrDose = [
        'vacuna', 'vaccine', 'porcilis', 'aftosa', 'brucel', 'clostri',
        'inyect', 'ml', 'dosis', 'jeringa', 'inocul',
      ].some(k => q.includes(k))

      if (mentionsVaccineOrDose) {
        const vaccineContext = await findVaccineInventory(insforge)
        hasVaccineContext = !!vaccineContext
        // Combinar ambos contextos: primero el animal, luego el inventario
        contextBlock = [animalContext, vaccineContext].filter(Boolean).join('') || null
      } else {
        contextBlock = animalContext
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
            ? `${msg.content}\n\n[DATOS REALES DE LA BASE DE DATOS - USA SOLO ESTOS DATOS, NO INVENTES NADA]:${contextBlock}`
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
        has_vaccine_context: hasVaccineContext,
        intent,
      },
    })

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Error interno desconocido'
    console.error('[POST /api/ai/chat]', errorMessage)

    if (errorMessage.includes('API key') || errorMessage.includes('401') || errorMessage.includes('Incorrect API key')) {
      return NextResponse.json({
        error: 'API Key de IA invalida o no configurada. Verifica AI_API_KEY en .env.local',
      }, { status: 503 })
    }

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
      return NextResponse.json({
        error: 'No se puede conectar con el proveedor de IA. Verifica la configuracion.',
      }, { status: 503 })
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
