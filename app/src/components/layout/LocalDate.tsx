'use client'

export function LocalDate() {
  return (
    <>
      {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
    </>
  )
}
