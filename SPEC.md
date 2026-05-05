# Technical Specification: Finca Tigrillo Management System

## Project Overview
An educational management platform for "Finca Tigrillo", designed to track livestock, reproductive health, and student internships.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19 + Tailwind CSS 4
- **Backend**: InsForge (SDK v1.2.4)
- **Icons**: Lucide React
- **Charts**: Chart.js

## Data Model (Schema)
### Core Entities
- **User Profiles**: Extends Auth users with roles (`admin`, `student`), `career` (Agropecuaria, Agronegocios, Alimentos), and `semester` (1-10).
- **Animals**: Tracks `id`, `name`, `type_id`, `status` (active, sold, deceased), and `birth_date`.
- **Animal Categories/Types**: Hierarchical classification (e.g., Ganado Mayor -> Bovino).
- **Reproductive Events**: Logs `monta_natural`, `inseminacion`, `parto`, etc. Includes `expected_due_date` calculation.
- **Activities**: Kanban-style tasks assigned to students by admins.

## Business Logic
1. **Security (RLS)**: 
   - Admins have full CRUD on all tables.
   - Students have Read-Only access to animals and reproductive events.
   - Students can update the `status` of their own `activity_assignments`.
2. **Reproductive Calculations**:
   - Bovino gestation: ~283 days.
   - Porcino gestation: ~114 days.
3. **Calculators**: Logic implemented in `src/lib/formulas.ts` for animal health metrics.
