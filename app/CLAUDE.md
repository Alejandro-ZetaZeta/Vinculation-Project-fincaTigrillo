# Development Guide

## Build & Run
- Dev Server: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

## Project Structure
- `src/app/api`: Edge-compatible route handlers.
- `src/app/dashboard`: Protected routes (Admin/Student).
- `src/components`: Divided by domain (animals, activities, layout).
- `src/lib`: Core logic, formulas, and InsForge clients.

## Conventions
- **Naming**: Kebab-case for directories, PascalCase for Components, camelCase for functions.
- **State**: Use Server Actions for mutations.
- **Icons**: Consistent size (usually `w-4 h-4` or `w-5 h-5`) for UI consistency.
