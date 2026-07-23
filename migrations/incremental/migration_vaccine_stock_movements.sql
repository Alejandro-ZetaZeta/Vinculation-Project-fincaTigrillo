-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Vaccine Stock Movements
-- Creates: vaccine_movement_reason (ENUM), vaccine_stock_movements
-- Purpose: immutable audit log for every change to vaccine_catalog.stock_doses
-- RLS:     admin-only read/write; append-only
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. ENUM for movement reasons ───────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vaccine_movement_reason') THEN
    CREATE TYPE vaccine_movement_reason AS ENUM (
      'Compra',
      'Pérdida',
      'Daño',
      'Vencimiento',
      'Ajuste de inventario',
      'Aplicación'
    );
  END IF;
END $$;

-- ── 2. Movement log ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vaccine_stock_movements (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaccine_id             UUID NOT NULL REFERENCES vaccine_catalog(id) ON DELETE CASCADE,

  -- Positive = stock added (purchase, return); negative = stock removed (loss, damage, application)
  delta                  INT  NOT NULL CHECK (delta <> 0),

  reason                 vaccine_movement_reason NOT NULL,
  notes                  TEXT,

  -- Optional link to the vaccination that caused this movement (when reason = 'Aplicación')
  related_vaccination_id UUID REFERENCES animal_vaccinations(id) ON DELETE SET NULL,

  created_by             UUID REFERENCES auth.users(id),
  created_at             TIMESTAMPTZ DEFAULT now()
);

-- Primary access pattern: list movements for a vaccine, newest first
CREATE INDEX IF NOT EXISTS idx_vaccine_stock_movements_vaccine
  ON vaccine_stock_movements (vaccine_id, created_at DESC);

-- For resolving "which application caused this" lookups
CREATE INDEX IF NOT EXISTS idx_vaccine_stock_movements_related_vaccination
  ON vaccine_stock_movements (related_vaccination_id)
  WHERE related_vaccination_id IS NOT NULL;

COMMENT ON TABLE vaccine_stock_movements IS
  'Immutable audit log of every stock adjustment made to a vaccine. Delta is applied atomically to vaccine_catalog.stock_doses.';

COMMENT ON COLUMN vaccine_stock_movements.delta IS
  'Signed change in stock_doses. Positive = addition, negative = removal. CHECK delta <> 0.';

COMMENT ON COLUMN vaccine_stock_movements.related_vaccination_id IS
  'When reason = ''Aplicación'', links to the animal_vaccinations row that consumed the doses.';

-- ── 3. RLS ─────────────────────────────────────────────────────────────────
ALTER TABLE vaccine_stock_movements ENABLE ROW LEVEL SECURITY;

-- Admin-only read
CREATE POLICY "admins_select_vaccine_stock_movements"
  ON vaccine_stock_movements
  FOR SELECT TO authenticated
  USING (is_admin());

-- Admin-only insert (append-only)
CREATE POLICY "admins_insert_vaccine_stock_movements"
  ON vaccine_stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- No UPDATE or DELETE policies → movements are immutable

-- ── 4. Reason-specific sign + notes CHECK (enforced at DB level) ──────────
-- Mirrors the tools_inventory_movement_rules pattern.
-- 'Aplicación' is excluded from this CHECK because it is written by the
-- SECURITY DEFINER RPC (assign_vaccines_and_deduct_stock) which always
-- uses negative deltas.
ALTER TABLE vaccine_stock_movements
  DROP CONSTRAINT IF EXISTS vaccine_stock_movements_reason_check;

ALTER TABLE vaccine_stock_movements
  ADD CONSTRAINT vaccine_stock_movements_reason_check CHECK (
    (reason = 'Compra'               AND delta > 0)
    OR
    (reason = 'Pérdida'              AND delta < 0)
    OR
    (reason = 'Daño'                 AND delta < 0)
    OR
    (reason = 'Vencimiento'          AND delta < 0)
    OR
    (reason = 'Ajuste de inventario' AND notes IS NOT NULL AND length(trim(notes)) > 0)
    OR
    (reason = 'Aplicación'           AND delta < 0)
  );
