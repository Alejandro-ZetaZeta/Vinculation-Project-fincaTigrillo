# Development Guide

## Build & Run
- Dev Server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Project Structure
- `src/app/api`: Edge-compatible route handlers.
- `src/app/dashboard`: Protected routes (Admin/Student).
- `src/proxy.ts`: CORS + Auth guard (Next.js 16 uses `proxy.ts` convention, not `middleware.ts`).
- `src/components`: Divided by domain (animals, activities, layout).
- `src/lib`: Core logic, formulas, and InsForge clients.
- `../migrations/`: All PostgreSQL migration scripts (run manually in InsForge SQL editor). Never place `.sql` files in the project root or `app/` directory.
  - `setup/setup.sql` — base schema (run once on a fresh project).
  - `incremental/migration_*.sql` — additive migrations applied in order after setup.

## Conventions
- **Naming**: Kebab-case for directories, PascalCase for Components, camelCase for functions.
- **State**: Use Server Actions for mutations.
- **Icons**: Consistent size (usually `w-4 h-4` or `w-5 h-5`) for UI consistency.
