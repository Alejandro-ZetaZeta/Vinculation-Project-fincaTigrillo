/**
 * ============================================================
 * AI PROMPTS — Construcción de prompts para el módulo de IA
 * ============================================================
 * Separar los prompts del código de negocio facilita:
 * - Ajustar el comportamiento de la IA sin tocar lógica
 * - Probar prompts de forma aislada
 * - Cambiar de modelo sin reescribir el prompt
 * ============================================================
 */

import type { AnimalContext, ReproductiveEventContext } from './provider'
import { GESTATION_DAYS } from '@/lib/formulas'

// ─── Sistema ─────────────────────────────────────────────────

export const REPRODUCTIVE_SYSTEM_PROMPT = `Eres un asistente experto en ganadería tropical colombiana especializado en reproducción animal.
Tu tarea es analizar el historial reproductivo de una finca y generar predicciones y recomendaciones precisas.

REGLAS ESTRICTAS:
1. Responde ÚNICAMENTE con un objeto JSON válido. Sin texto antes ni después del JSON.
2. Usa fechas en formato ISO 8601 (YYYY-MM-DD).
3. El campo "summary" debe ser un párrafo narrativo en español, de 2-4 oraciones, con tono profesional.
4. Si no hay datos suficientes para un animal, pon status "sin_historial" y confidence "baja".
5. Las alertas "urgente" son para animales cuyo parto ya debió ocurrir (days_until_birth < 0) o que llevan más de 18 meses sin evento.
6. Las alertas "atencion" son para partos en los próximos 30 días.
7. Las alertas "info" son para observaciones generales del hato.`

// ─── Prompt de predicción reproductiva ───────────────────────

export function buildReproductivePredictionPrompt(
  animals: AnimalContext[],
  events: ReproductiveEventContext[],
  today: Date = new Date()
): string {
  const todayStr = today.toISOString().split('T')[0]

  // Agrupar eventos por animal
  const eventsByAnimal = events.reduce<Record<string, ReproductiveEventContext[]>>((acc, ev) => {
    if (!acc[ev.animal_id]) acc[ev.animal_id] = []
    acc[ev.animal_id].push(ev)
    return acc
  }, {})

  // Construir contexto por animal
  const animalContexts = animals.map(animal => {
    const animalEvents = (eventsByAnimal[animal.id] || [])
      .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime())

    const gestDays = GESTATION_DAYS[animal.species_slug] ?? null

    return {
      id: animal.id,
      nombre: animal.name || animal.identification_code || animal.id,
      especie: animal.species_name,
      especie_slug: animal.species_slug,
      sexo: animal.sex,
      fecha_nacimiento: animal.birth_date,
      estado: animal.status,
      dias_gestacion_especie: gestDays,
      historial_eventos: animalEvents.slice(0, 10).map(ev => ({
        tipo: ev.event_type,
        fecha: ev.event_date,
        fecha_parto_esperada: ev.expected_due_date,
        notas: ev.notes,
      })),
    }
  })

  const schema = `{
  "predictions": [
    {
      "animal_id": "uuid del animal",
      "animal_name": "nombre del animal",
      "species": "nombre de la especie",
      "last_event_type": "tipo del último evento o null",
      "last_event_date": "YYYY-MM-DD o null",
      "expected_birth_date": "YYYY-MM-DD o null",
      "days_until_birth": 45,
      "status": "en_gestacion | pendiente_monta | recien_pario | sin_historial | alerta_sobretiempo",
      "confidence": "alta | media | baja",
      "recommendation": "Texto de recomendación en español"
    }
  ],
  "alerts": [
    {
      "level": "urgente | atencion | info",
      "message": "Texto de la alerta en español",
      "animal_id": "uuid o null si es alerta global"
    }
  ],
  "summary": "Párrafo narrativo en español sobre el estado reproductivo del hato"
}`

  return `Fecha de análisis: ${todayStr}

Analiza el siguiente inventario de hembras activas de la Finca Tigrillo y genera predicciones reproductivas:

${JSON.stringify(animalContexts, null, 2)}

Responde con este esquema JSON exacto (sin texto adicional):
${schema}`
}
