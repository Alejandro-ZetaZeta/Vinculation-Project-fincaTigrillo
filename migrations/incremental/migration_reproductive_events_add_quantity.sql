-- ====================================================================
-- MIGRACIÓN: Cantidad para eventos de mortalidad (lotes avícolas)
--
-- Objetivo:
-- - Guardar la cantidad de muertes en una columna estructurada (quantity)
-- - Backfill desde notas legacy con formato: "[Cantidad: 56] ..."
-- - Enforzar que event_type='muerte' requiera quantity > 0
--
-- Ejecutar en la consola SQL de Insforge/Supabase.
-- ====================================================================

-- 1) Columna nueva (nullable para no romper filas existentes)
ALTER TABLE reproductive_events
  ADD COLUMN IF NOT EXISTS quantity INTEGER;

-- 2) Backfill best-effort desde notes legacy: "[Cantidad: N]"
--    Solo aplica a eventos de muerte que aún no tienen quantity.
UPDATE reproductive_events
SET quantity = NULLIF(substring(notes from '\\[Cantidad:\\s*([0-9]+)\\]'), '')::INTEGER
WHERE event_type = 'muerte'
  AND quantity IS NULL
  AND notes IS NOT NULL
  AND notes ~ '\\[Cantidad:\\s*[0-9]+\\]';

-- 3) Constraint: si es muerte, quantity debe existir y ser > 0.
--    (Permite quantity NULL para otros tipos de evento.)
--
-- Nota: si ya existen filas legacy con event_type='muerte' pero sin quantity
-- (o con quantity=0), el ADD CONSTRAINT fallará. Para no bloquear el despliegue,
-- lo creamos como NOT VALID: esto ENFORZA filas nuevas, pero no valida las viejas
-- hasta que las corrijas.

-- 3a) (Opcional) Identificar filas que violan la regla
--     Corrige estas filas manualmente (UPDATE ...) antes de validar.
SELECT id, animal_id, event_date, notes, quantity
FROM reproductive_events
WHERE event_type = 'muerte'
  AND (quantity IS NULL OR quantity <= 0)
ORDER BY event_date DESC, created_at DESC;

-- 3b) Crear constraint sin validar históricos (enforza inserts/updates nuevos)
ALTER TABLE reproductive_events
  ADD CONSTRAINT reproductive_events_muerte_quantity_check
  CHECK (event_type <> 'muerte' OR (quantity IS NOT NULL AND quantity > 0))
  NOT VALID;

-- 3c) Cuando ya corregiste los legacy, valida el constraint:
-- ALTER TABLE reproductive_events VALIDATE CONSTRAINT reproductive_events_muerte_quantity_check;
