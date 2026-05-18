-- ================================================================
-- Producción de leche diaria — Finca Tigrillo
-- Aplica a bovinos y caprinos hembra.
-- total_liters es columna generada: liters_am + liters_pm.
-- Ejecutar en el SQL editor de InsForge/Supabase.
-- ================================================================

CREATE TABLE IF NOT EXISTS milk_production_events (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id      UUID         NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  recorded_date  DATE         NOT NULL,
  liters_am      NUMERIC(7,2) NOT NULL DEFAULT 0 CHECK (liters_am >= 0),
  liters_pm      NUMERIC(7,2) NOT NULL DEFAULT 0 CHECK (liters_pm >= 0),
  total_liters   NUMERIC(7,2) GENERATED ALWAYS AS (liters_am + liters_pm) STORED,
  notes          TEXT,
  created_by     UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milk_events_animal_date
  ON milk_production_events (animal_id, recorded_date DESC);

CREATE INDEX IF NOT EXISTS idx_milk_events_date
  ON milk_production_events (recorded_date DESC);

-- ── RLS ──────────────────────────────────────────────────────────

ALTER TABLE milk_production_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "milk_events_select"
  ON milk_production_events FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "milk_events_insert"
  ON milk_production_events FOR INSERT
  TO authenticated WITH CHECK (is_admin());

CREATE POLICY "milk_events_delete"
  ON milk_production_events FOR DELETE
  TO authenticated USING (is_admin());

CREATE POLICY "milk_events_update"
  ON milk_production_events FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
