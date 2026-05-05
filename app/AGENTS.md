<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent Instructions: Finca Tigrillo Project

## Framework Constraints (Next.js 16 / React 19)
- **React 19**: Use the `use` hook for context/promises and `useActionState` for forms.
- **Server Components**: Prefer Server Components for data fetching.
- **Tailwind CSS 4**: Do not look for `tailwind.config.js`. Configuration is CSS-first in `globals.css`.

## InsForge SDK Patterns
- **Server-Side**: Use `@/lib/insforge/server` for fetching in Server Components/Actions.
- **Client-Side**: Use `@/lib/insforge/client` for real-time subscriptions or client-only logic.
- **RLS**: Never attempt to bypass RLS. Assume the user is authenticated via the middleware.

## Coding Standards
- **Icons**: Use `lucide-react` only.
- **Forms**: Use `ActivityForm.tsx` or `AnimalForm.tsx` as patterns for new forms.
- **Types**: Always use TypeScript. Define interfaces for database returns matching the SQL schema.
