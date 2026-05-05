# Finca Tigrillo: Sistema de Gestión Ganadera

Proyecto de vinculación para la gestión técnica y educativa de la Finca Tigrillo.

## Requisitos
- Node.js 20+
- Cuenta en InsForge (o Supabase compatible)

## Configuración
1. Clonar el repositorio.
2. Crear un archivo `.env.local` con las credenciales de InsForge (ver `.env.example`).
3. Ejecutar `npm install`.
4. (Opcional) Ejecutar `node seed-users.mjs` para poblar datos iniciales.

## Módulos Principales
- **Dashboard**: Vista general de métricas y actividades pendientes.
- **Inventario Animal**: Registro detallado por categorías y tipos.
- **Eventos Reproductivos**: Seguimiento de preñez y partos.
- **Gestión Estudiantil**: Sistema Kanban para el control de prácticas.

## Contribución
Siga las guías en `AGENTS.md` y `SPEC.md` para mantener la integridad del sistema.
