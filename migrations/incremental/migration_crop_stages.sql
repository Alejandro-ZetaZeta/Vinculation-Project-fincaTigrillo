-- =============================================
-- Crop Growth Stages: Stage Config, Stage Log, Suggestions
-- =============================================

-- Per-sembrío stage configuration (admin-defined)
CREATE TABLE sembrio_stage_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sembrio_id UUID NOT NULL REFERENCES sembrios(id) ON DELETE CASCADE,
  stages JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sembrio_id)
);

-- Stage change audit log
CREATE TABLE sembrio_stage_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sembrio_id UUID NOT NULL REFERENCES sembrios(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL DEFAULT 'manual'
    CHECK (change_type IN ('manual', 'suggestion_accepted', 'suggestion_rejected')),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Pending stage suggestions (cron or client-generated)
CREATE TABLE stage_suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sembrio_id UUID NOT NULL REFERENCES sembrios(id) ON DELETE CASCADE,
  current_stage TEXT NOT NULL,
  suggested_stage TEXT NOT NULL,
  days_in_current INT NOT NULL,
  theoretical_days INT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'dismissed')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add stage tracking columns to sembrios
ALTER TABLE sembrios ADD COLUMN IF NOT EXISTS current_stage TEXT DEFAULT 'en_preparacion';
ALTER TABLE sembrios ADD COLUMN IF NOT EXISTS stage_updated_at TIMESTAMPTZ DEFAULT now();

-- =============================================
-- RLS
-- =============================================

ALTER TABLE sembrio_stage_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sembrio_stage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_suggestions ENABLE ROW LEVEL SECURITY;

-- sembrio_stage_config: all read, admin write
CREATE POLICY "authenticated_read_sembrio_stage_config" ON sembrio_stage_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_insert_sembrio_stage_config" ON sembrio_stage_config
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "admins_update_sembrio_stage_config" ON sembrio_stage_config
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admins_delete_sembrio_stage_config" ON sembrio_stage_config
  FOR DELETE TO authenticated USING (is_admin());

-- sembrio_stage_log: all read, admin write
CREATE POLICY "authenticated_read_sembrio_stage_log" ON sembrio_stage_log
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_insert_sembrio_stage_log" ON sembrio_stage_log
  FOR INSERT TO authenticated WITH CHECK (is_admin());

-- stage_suggestions: all read, admin+service write
CREATE POLICY "authenticated_read_stage_suggestions" ON stage_suggestions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_insert_stage_suggestions" ON stage_suggestions
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "admins_update_stage_suggestions" ON stage_suggestions
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- =============================================
-- Triggers
-- =============================================

CREATE OR REPLACE FUNCTION update_sembrio_stage_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sembrio_stage_config_updated_at
  BEFORE UPDATE ON sembrio_stage_config
  FOR EACH ROW
  EXECUTE FUNCTION update_sembrio_stage_config_updated_at();

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_sembrio_stage_config_sembrio ON sembrio_stage_config(sembrio_id);
CREATE INDEX idx_sembrio_stage_log_sembrio ON sembrio_stage_log(sembrio_id);
CREATE INDEX idx_sembrio_stage_log_created ON sembrio_stage_log(created_at DESC);
CREATE INDEX idx_stage_suggestions_sembrio ON stage_suggestions(sembrio_id);
CREATE INDEX idx_stage_suggestions_status ON stage_suggestions(status);
CREATE INDEX idx_stage_suggestions_created ON stage_suggestions(created_at DESC);
CREATE INDEX idx_sembrios_current_stage ON sembrios(current_stage);
