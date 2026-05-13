export function formatVaccineAgeText(
  ageMinDays: number | null | undefined,
  ageMaxDays: number | null | undefined
): string {
  const min = typeof ageMinDays === 'number' && ageMinDays > 0 ? ageMinDays : null
  const max = typeof ageMaxDays === 'number' && ageMaxDays > 0 ? ageMaxDays : null

  if (min != null && max == null) return `A partir de ${min} días`
  if (min != null && max != null) return `De ${min} a ${max} días`
  if (min == null && max != null) return `Hasta ${max} días`
  return 'Cualquier edad'
}
