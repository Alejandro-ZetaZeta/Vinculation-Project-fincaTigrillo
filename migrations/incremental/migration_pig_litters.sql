-- ====================================================================
-- MIGRACIÓN: Camadas Porcinas (Pig Litters)
--
-- Objetivo:
-- - Agregar columnas is_litter, litter_count, litter_alive a animals
-- - Backfill registros existentes con is_litter = false
-- - Backfill numero_pezones en metadata para porcino hembras existentes
-- - Índice para consultas de camadas
--
-- Ejecutar en la consola SQL de Insforge/Supabase.
-- ====================================================================

-- 1) Columnas nuevas para camadas
ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS is_litter BOOLEAN DEFAULT FALSE;

ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS litter_count INTEGER;

ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS litter_alive INTEGER;

-- 2) Constraint: si es camada, litter_count debe ser > 0
--    NOT VALID para no bloquear si hay filas legacy inconsistentes.
ALTER TABLE animals
  ADD CONSTRAINT animals_litter_count_check
  CHECK (is_litter = FALSE OR (litter_count IS NOT NULL AND litter_count > 0))
  NOT VALID;

-- 3) Índice parcial para consultas de camadas
CREATE INDEX IF NOT EXISTS idx_animals_is_litter
  ON animals(is_litter)
  WHERE is_litter = TRUE;

-- 4) Backfill: todos los animales existentes → is_litter = false
UPDATE animals
SET is_litter = FALSE
WHERE is_litter IS NULL;

-- 5) Backfill: numero_pezones = 0 en metadata para porcino hembras existentes
--    que aún no tengan este campo.
UPDATE animals
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"numero_pezones": 0}'::jsonb
WHERE type_id = (SELECT id FROM animal_types WHERE slug = 'porcino')
  AND sex = 'hembra'
  AND (metadata IS NULL OR NOT (metadata ? 'numero_pezones'));

-- 6) (Opcional) Validar constraint cuando estés seguro de que no hay filas legacy:
-- ALTER TABLE animals VALIDATE CONSTRAINT animals_litter_count_check;
