-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Farm Tools & Equipment Inventory
-- Creates: tool_category (ENUM), farm_tools, farm_tool_movements
-- RLS:      authenticated read (admin-only via is_admin()); full CRUD for admin
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. ENUM for tool categories ───────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tool_category') THEN
    CREATE TYPE tool_category AS ENUM (
      'Maquinaria',
      'Herramienta manual',
      'Veterinaria',
      'Riego',
      'Eléctrico',
      'Transporte',
      'Seguridad',
      'Otro'
    );
  END IF;
END $$;

-- ── 2. Tool / equipment catalogue ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS farm_tools (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL,
  description TEXT,
  category    tool_category NOT NULL DEFAULT 'Otro',
  unit        TEXT        NOT NULL DEFAULT 'unidad',   -- "unidad", "kg", "litros", …
  stock       INT         NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_stock   INT         DEFAULT NULL CHECK (min_stock IS NULL OR min_stock >= 0),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,

  created_by  UUID        REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Unique name (case-insensitive) to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS ux_farm_tools_name
  ON farm_tools (lower(name));

-- Index for category filter
CREATE INDEX IF NOT EXISTS idx_farm_tools_category
  ON farm_tools (category);

CREATE INDEX IF NOT EXISTS idx_farm_tools_is_active
  ON farm_tools (is_active);

COMMENT ON TABLE farm_tools IS
  'Catalogue of farm tools and equipment with real-time stock tracking.';

COMMENT ON COLUMN farm_tools.stock IS
  'Current units in inventory. Updated atomically by farm_tool_movements inserts.';

COMMENT ON COLUMN farm_tools.min_stock IS
  'Optional low-stock alert threshold. NULL means no alert.';

-- ── 3. Movement log (full audit trail for every stock change) ─────────────
CREATE TABLE IF NOT EXISTS farm_tool_movements (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  tool_id    UUID        NOT NULL REFERENCES farm_tools(id) ON DELETE CASCADE,

  -- Positive = stock added (purchase, return); negative = stock removed (loss, damage…)
  delta      INT         NOT NULL CHECK (delta <> 0),

  reason     TEXT        NOT NULL,  -- e.g. 'Compra', 'Pérdida', 'Daño', 'Mantenimiento'
  notes      TEXT,

  created_by UUID        REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_farm_tool_movements_tool_id
  ON farm_tool_movements (tool_id, created_at DESC);

COMMENT ON TABLE farm_tool_movements IS
  'Immutable audit log of every stock adjustment made to a farm tool. Delta is applied atomically to farm_tools.stock.';

-- ── 4. Enable RLS ─────────────────────────────────────────────────────────
ALTER TABLE farm_tools           ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_tool_movements  ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS Policies ───────────────────────────────────────────────────────

-- farm_tools: admin read/write; regular authenticated users have NO access
CREATE POLICY "admins_select_farm_tools" ON farm_tools
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "admins_insert_farm_tools" ON farm_tools
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admins_update_farm_tools" ON farm_tools
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins_delete_farm_tools" ON farm_tools
  FOR DELETE TO authenticated
  USING (is_admin());

-- farm_tool_movements: admin read/write; no access for regular users
CREATE POLICY "admins_select_farm_tool_movements" ON farm_tool_movements
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "admins_insert_farm_tool_movements" ON farm_tool_movements
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Movements are immutable — no UPDATE or DELETE policies

-- ── 6. updated_at trigger for farm_tools ──────────────────────────────────
DO $$
BEGIN
  CREATE TRIGGER farm_tools_updated_at
    BEFORE UPDATE ON farm_tools
    FOR EACH ROW
    EXECUTE FUNCTION system.update_updated_at();
EXCEPTION
  WHEN undefined_function THEN
    -- Function does not exist in this environment; skip trigger
    NULL;
END $$;
