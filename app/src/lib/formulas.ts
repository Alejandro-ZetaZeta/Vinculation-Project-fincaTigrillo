/**
 * ====================================================================
 * FÓRMULAS GANADERAS — Finca Tigrillo
 * ====================================================================
 * Todas las fórmulas llevan el tag "FORMULA:" para búsqueda rápida.
 * Si un stakeholder necesita cambiar un valor, buscar "FORMULA:" en
 * este archivo y ajustar la constante correspondiente.
 * ====================================================================
 */

// ─────────────────────────────────────────────
// CONSTANTES DE GESTACIÓN (días promedio)
// ─────────────────────────────────────────────

// FORMULA: GESTACION_BOVINA — Periodo promedio de gestación para bovinos: 283 días.
// Fuente: Merck Veterinary Manual. Ajustar si la raza difiere significativamente.
// Razas como Brahman pueden llegar a 292 días; Holstein ~279 días.
export const GESTATION_DAYS: Record<string, number> = {
  bovino: 283,
  equino: 340,
  porcino: 114,
  'aves-de-corral': 21, // Incubación, no gestación
}

// ─────────────────────────────────────────────
// CONSTANTES DE CONSUMO (DMI % del peso corporal)
// ─────────────────────────────────────────────

// FORMULA: DMI_PORCENTAJE — Materia Seca Ingerida como porcentaje del peso corporal.
// Fuente: Animal Nutrition guidelines. Valores promedio para mantenimiento.
// Bovino lactante puede subir a 3.5-4.5%; porcino en ceba ~3.5%.
export const DMI_PERCENTAGE: Record<string, number> = {
  bovino: 0.025,    // 2.5% del peso corporal
  equino: 0.020,    // 2.0% del peso corporal
  porcino: 0.030,   // 3.0% del peso corporal
}

// FORMULA: CONSUMO_AVE_DIA_KG — Consumo diario promedio por ave adulta en kg.
// Fuente: Dine a Chook / industria avícola colombiana.
// Gallina ponedora: ~0.12 kg/día. Pollo de engorde: ~0.10 kg/día.
export const POULTRY_DAILY_FEED_KG = 0.12

// FORMULA: PESO_SACO_KG — Peso estándar de un saco de alimento concentrado.
// En Colombia los sacos comerciales son generalmente de 40 kg.
export const DEFAULT_SACK_WEIGHT_KG = 40

// FORMULA: PRODUCCION_HUEVO_DIA — Producción promedio de huevos por gallina por día.
// Gallina ponedora comercial: ~0.75 (es decir, 3 de cada 4 días pone un huevo).
// Razas criollas/libres: ~0.50.
export const DEFAULT_EGG_PRODUCTION_PER_DAY = 0.75

// ─────────────────────────────────────────────
// FUNCIONES
// ─────────────────────────────────────────────

/**
 * Calcula la fecha estimada de parto (o eclosión para aves).
 *
 * FORMULA: FECHA_PARTO — fecha_monta + dias_gestacion_especie = fecha_parto_estimada
 *
 * @param breedingDate - Fecha de monta/inseminación
 * @param speciesSlug  - Slug de la especie ('bovino', 'equino', 'porcino', 'aves-de-corral')
 * @returns Fecha estimada de parto, o null si la especie no está configurada
 */
export function calcFechaParto(breedingDate: Date, speciesSlug: string): Date | null {
  const days = GESTATION_DAYS[speciesSlug]
  if (!days) return null
  const result = new Date(breedingDate)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Calcula el consumo diario de alimento en kg para un animal por su peso.
 *
 * FORMULA: CONSUMO_DIARIO — peso_corporal_kg × porcentaje_DMI = kg_alimento_por_dia
 * Para aves se usa la constante fija CONSUMO_AVE_DIA_KG.
 *
 * @param weightKg    - Peso del animal en kg
 * @param speciesSlug - Slug de la especie
 * @returns kg de alimento por día
 */
export function calcConsumoDiario(weightKg: number, speciesSlug: string): number {
  if (speciesSlug === 'aves-de-corral') {
    return POULTRY_DAILY_FEED_KG
  }
  const dmi = DMI_PERCENTAGE[speciesSlug]
  if (!dmi) return 0
  // FORMULA: CONSUMO_DIARIO_CALC — peso × DMI%
  return weightKg * dmi
}

/**
 * Calcula cuántos sacos de alimento comprar por semana para un grupo de animales.
 *
 * FORMULA: SACOS_SEMANALES — (cantidad_animales × consumo_diario_kg × 7) / peso_saco_kg
 * Resultado redondeado hacia arriba (siempre se compra un saco completo).
 *
 * @param animalCount       - Cantidad de animales
 * @param dailyFeedPerAnimal - Consumo diario por animal en kg
 * @param sackWeightKg       - Peso del saco en kg (default: 40)
 * @returns Número de sacos necesarios por semana (redondeado arriba)
 */
export function calcSacosSemanales(
  animalCount: number,
  dailyFeedPerAnimal: number,
  sackWeightKg: number = DEFAULT_SACK_WEIGHT_KG
): number {
  // FORMULA: SACOS_SEMANA_CALC — (N × consumo × 7) / peso_saco → ceil
  const totalWeeklyKg = animalCount * dailyFeedPerAnimal * 7
  return Math.ceil(totalWeeklyKg / sackWeightKg)
}

/**
 * Calcula la producción de huevos semanal estimada.
 *
 * FORMULA: HUEVOS_SEMANA — cantidad_gallinas × produccion_por_dia × 7
 *
 * @param henCount        - Cantidad de gallinas ponedoras
 * @param eggsPerHenPerDay - Promedio de huevos por gallina por día (default: 0.75)
 * @returns Número estimado de huevos por semana
 */
export function calcProduccionHuevosSemanal(
  henCount: number,
  eggsPerHenPerDay: number = DEFAULT_EGG_PRODUCTION_PER_DAY
): number {
  // FORMULA: HUEVOS_SEMANA_CALC — gallinas × tasa_diaria × 7
  return Math.round(henCount * eggsPerHenPerDay * 7)
}

/**
 * Calcula el intervalo entre partos en días.
 *
 * FORMULA: INTERVALO_ENTRE_PARTOS — fecha_parto_actual - fecha_parto_anterior (en días)
 * Meta ideal para bovinos: ≤ 365 días (1 cría por año).
 *
 * @param previousCalving - Fecha del parto anterior
 * @param currentCalving  - Fecha del parto actual
 * @returns Intervalo en días
 */
export function calcIntervaloEntreParto(previousCalving: Date, currentCalving: Date): number {
  // FORMULA: INTERVALO_PARTOS_CALC — diff en ms → convertir a días
  const diffMs = currentCalving.getTime() - previousCalving.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Calcula la tasa de preñez del hato.
 *
 * FORMULA: TASA_PRENEZ — (hembras_preñadas / hembras_expuestas) × 100
 * Un valor ≥ 60% se considera aceptable en ganadería bovina tropical.
 *
 * @param pregnantCount - Número de hembras confirmadas preñadas
 * @param exposedCount  - Número total de hembras expuestas a monta/inseminación
 * @returns Porcentaje de preñez
 */
export function calcTasaPrenez(pregnantCount: number, exposedCount: number): number {
  if (exposedCount === 0) return 0
  // FORMULA: TASA_PRENEZ_CALC — (preñadas / expuestas) × 100
  return (pregnantCount / exposedCount) * 100
}

/**
 * Calcula el índice de conversión alimenticia (FCR).
 *
 * FORMULA: FCR — alimento_total_consumido_kg / peso_ganado_kg
 * Valores de referencia:
 *   - Pollo de engorde: 1.6–2.0
 *   - Porcino: 2.5–3.5
 *   - Bovino: 6.0–10.0
 * Menor FCR = mayor eficiencia.
 *
 * @param totalFeedKg  - Total de alimento consumido en kg
 * @param weightGainKg - Peso ganado en kg
 * @returns Ratio de conversión alimenticia
 */
export function calcFCR(totalFeedKg: number, weightGainKg: number): number {
  if (weightGainKg === 0) return 0
  // FORMULA: FCR_CALC — alimento / ganancia
  return totalFeedKg / weightGainKg
}

// ─────────────────────────────────────────────
// TIPOS DE EVENTOS REPRODUCTIVOS
// ─────────────────────────────────────────────
export const REPRODUCTIVE_EVENT_TYPES = [
  { value: 'monta_natural', label: 'Monta Natural' },
  { value: 'inseminacion', label: 'Inseminación Artificial' },
  { value: 'confirmacion_prenez', label: 'Confirmación de Preñez' },
  { value: 'parto', label: 'Parto' },
  { value: 'aborto', label: 'Aborto' },
  { value: 'destete', label: 'Destete' },
] as const

export type ReproductiveEventType = typeof REPRODUCTIVE_EVENT_TYPES[number]['value']

// Labels para UI
export const SPECIES_LABELS: Record<string, string> = {
  bovino: 'Bovino',
  equino: 'Equino',
  porcino: 'Porcino',
  'aves-de-corral': 'Aves de Corral',
}
