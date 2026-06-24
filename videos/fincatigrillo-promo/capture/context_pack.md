# Context Pack — Finca Tigrillo

## Product Overview

**Name:** Finca Tigrillo — Sistema de Gestión Ganadera  
**URL:** https://fincatigrillo.vercel.app  
**Type:** Web application (SaaS / academic institutional tool)  
**Language:** Spanish (all UI, narration, and copy must be in Spanish)  
**Tone:** Premium, academic, institutional  
**Audience:** Coordinación de TI + docentes agropecuarios (universidad / finca universitaria, Ecuador)  

**One-line pitch:** Finca Tigrillo es una plataforma digital que centraliza la gestión técnica y educativa de una finca ganadera, integrando el seguimiento de animales, salud, reproducción y las prácticas estudiantiles en un solo sistema.

## Product Description

Finca Tigrillo es un sistema de gestión integral para la Unidad Educativa de Producción (UEP) Finca Tigrillo. Digitaliza y centraliza todos los procesos de la finca: registro de animales (ganado mayor y menor), eventos reproductivos, vacunación, sembríos, actividades estudiantiles, y reportes analíticos. Incluye predicciones de reproducción por inteligencia artificial y notificaciones automáticas de vacunas y proyecciones de alimentación.

## Key Features (for narrative use)

1. **Dashboard Central** — Vista ejecutiva con estadísticas en tiempo real: animales registrados, eventos recientes, actividades estudiantiles y gráficas por categoría.

2. **Gestión de Animales** — Registro y monitoreo de Ganado Mayor (bovinos, equinos) y Ganado Menor (porcinos, aves, caprinos, ovinos). Ficha técnica individual con historial de pesos, eventos y vacunas.

3. **Eventos Reproductivos** — Registro de monta natural, inseminación artificial, partos y lactancia. Sistema de seguimiento de gestación con fechas estimadas de parto.

4. **Sistema de Vacunación** — Catálogo de vacunas, asignación masiva por lote, recordatorios automáticos via cron jobs. Tags y etiquetado por tipo de vacuna.

5. **Actividades Estudiantiles (Kanban)** — Tablero Kanban de tareas para docentes y estudiantes. Los estudiantes actualizan el estado de sus prácticas; los docentes las asignan y monitorean.

6. **Solicitudes de Docentes** — Flujo de aprobación para solicitudes de docentes al administrador. Auditoría completa de estado.

7. **Sembríos** — Gestión de cultivos y plantaciones dentro de la finca.

8. **Predicciones IA** — Motor de predicciones reproductivas basado en GPT-4o-mini. Calcula fechas estimadas de parto y ciclos reproductivos.

9. **Reportes y Analítica** — Exportación a PDF, gráficas de Chart.js, reportes por categoría de animal.

10. **Proyección de Alimentación** — Cron job semanal que calcula sacos de comida para aves (todos los jueves al mediodía).

11. **App Móvil** — PWA + app nativa (Capacitor) para iOS/Android con notificaciones locales.

12. **Multi-rol** — Admin, Docente y Estudiante con permisos diferenciados (RLS en base de datos).

## Brand Identity

- **Primary Color:** #16A34A (emerald green) — representa la naturaleza y el agro
- **Secondary Color:** #1A2414 (deep forest) — solidez, profundidad académica  
- **Background:** #F6F7F2 (warm parchment) — limpieza, académico
- **Accent:** #D1FAE5 (light emerald) — refuerzos visuales suaves
- **Display Font:** Syne (bold, modern, institutional)
- **Body Font:** DM Sans (clean, legible, professional)
- **Visual Identity:** Circular emblem with split face (human + ocelot/tigrillo) — represents the duality of education and nature

## Tech Stack (for credibility signals)

- Next.js 16 (App Router) + React 19 + TypeScript 5
- InsForge (PostgreSQL, auth, storage, RLS)
- Vercel (cloud deployment, cron jobs, edge functions)
- OpenAI GPT-4o-mini (reproductive predictions)
- Capacitor 8 (iOS/Android mobile)
- Chart.js 4 (analytics)

## User Roles

- **Administrador:** Gestión completa de la finca, aprobación de solicitudes, analítica
- **Docente:** Solicitudes, seguimiento de animales, asignación de actividades
- **Estudiante:** Registro de prácticas, actualización de actividades Kanban

## Key Messages for Video

1. "Una plataforma que digitaliza la finca y potencia el aprendizaje"
2. "Gestión ganadera inteligente al alcance de docentes y estudiantes"
3. "Desde el registro de animales hasta las predicciones con inteligencia artificial"
4. "Cada dato de la finca, disponible en tiempo real"

## Asset Inventory

| Path | Description | Use |
|------|-------------|-----|
| `assets/favicon.png` | Circular emblem — ocelot/tigrillo mascot (human + leopard face split) | Logo / hero branding element |
| `assets/svgs/lucide-eye.svg` | Eye icon — minimalist monochrome | UI detail accent |
| `assets/svgs/lucide-lock.svg` | Padlock icon — security, access | Auth/roles visual |
| `assets/svgs/lucide-mail.svg` | Envelope icon — communication | Contact/notification visual |
| `assets/svgs/lucide-log-in.svg` | Login arrow icon | CTA / access visual |
| `assets/svgs/lucide-moon.svg` | Crescent moon — dark mode icon | UI detail |

> Primary asset: `assets/favicon.png` — the Tigrillo mascot logo. Use prominently in opening and closing scenes.
> Font files in `assets/fonts/` are available for brand typography.

## Contact Sheets

- `assets/contact-sheet.jpg` — all downloaded images in labeled grid
- `assets/svgs/contact-sheet.jpg` — SVGs rendered as thumbnails
- `screenshots/contact-sheet.jpg` — viewport screenshots (login page only — app is behind auth)

## Narrative Notes

- The site capture shows only the **login page** (app is behind authentication). The full dashboard, animal management, Kanban board, vaccines, and IA features are all behind login.
- Use the Key Features section above as the narrative source for all dashboard/feature scenes — these are real implemented features, not mockups.
- Narration must be 100% in **Spanish** (registro institucional universitario en Ecuador).
- Tone: formal, academic, pride-inspiring. This is a student project presented to institutional authorities.
- The video will be shown to: (1) the IT area coordinator and (2) agricultural science teachers. Both audiences value technical credibility and educational impact.

## Location

- **Ecuador** — finca universitaria; evita referencias a otros paises.
