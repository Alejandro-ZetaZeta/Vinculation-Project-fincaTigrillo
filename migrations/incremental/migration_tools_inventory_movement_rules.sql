-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Restrict farm_tool_movements reasons + add expected_return_date
--
-- Changes:
--   1. Add expected_return_date DATE column (nullable) — only used when
--      reason = 'Mantenimiento' (temporary stock removal).
--   2. Add CHECK constraint enforcing per-reason rules:
--        - 'Compra'              → delta > 0
--        - 'Devolución'          → delta < 0
--        - 'Pérdida'             → delta < 0
--        - 'Daño'                → delta < 0
--        - 'Mantenimiento'       → delta < 0 AND expected_return_date IS NOT NULL
--        - 'Ajuste de inventario' → notes IS NOT NULL
--   3. Drop the old CHECK that allowed any sign for any reason.
--   4. Drop the 'Otro' reason (caller must pick a specific bucket).
--
-- Note: If existing rows violate the new constraints, this migration FAILS
-- by design — fix the offending rows manually before re-running.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Add column (idempotent) ─────────────────────────────────────────────
ALTER TABLE farm_tool_movements
  ADD COLUMN IF NOT EXISTS expected_return_date DATE DEFAULT NULL;

COMMENT ON COLUMN farm_tool_movements.expected_return_date IS
  'Required when reason = ''Mantenimiento''. Expected date the tool returns to inventory.';

-- ── 2. Drop the old permissive CHECK (if it exists) ───────────────────────
ALTER TABLE farm_tool_movements
  DROP CONSTRAINT IF EXISTS farm_tool_movements_reason_check;

ALTER TABLE farm_tool_movements
  DROP CONSTRAINT IF EXISTS farm_tool_movements_delta_nonzero;

-- Ensure the basic non-zero CHECK exists (mirrors original schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'farm_tool_movements_delta_nonzero'
      AND conrelid = 'farm_tool_movements'::regclass
  ) THEN
    ALTER TABLE farm_tool_movements
      ADD CONSTRAINT farm_tool_movements_delta_nonzero
      CHECK (delta <> 0);
  END IF;
END $$;

-- ── 3. Single CHECK enforcing reason-specific sign + notes + date ─────────
ALTER TABLE farm_tool_movements
  ADD CONSTRAINT farm_tool_movements_reason_check CHECK (
    (reason = 'Compra'              AND delta > 0)
    OR
    (reason = 'Devolución'          AND delta < 0)
    OR
    (reason = 'Pérdida'             AND delta < 0)
    OR
    (reason = 'Daño'                AND delta < 0)
    OR
    (reason = 'Mantenimiento'       AND delta < 0 AND expected_return_date IS NOT NULL)
    OR
    (reason = 'Ajuste de inventario' AND notes IS NOT NULL AND length(trim(notes)) > 0)
  );

-- ── 4. Index for finding pending maintenances ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_farm_tool_movements_maintenance
  ON farm_tool_movements (expected_return_date)
  WHERE reason = 'Mantenimiento';
