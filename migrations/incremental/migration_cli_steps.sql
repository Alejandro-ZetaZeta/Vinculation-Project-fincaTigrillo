-- Run each block separately in the InsForge CLI as:
-- npx @insforge/cli db query "<SQL here>" -y

-- STEP 1: Create table
CREATE TABLE IF NOT EXISTS reproductive_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('monta_natural','inseminacion','confirmacion_prenez','parto','aborto','destete')),
  event_date DATE NOT NULL,
  expected_due_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- STEP 2: Indexes
CREATE INDEX IF NOT EXISTS idx_repro_events_animal_id ON reproductive_events(animal_id);
CREATE INDEX IF NOT EXISTS idx_repro_events_event_type ON reproductive_events(event_type);
CREATE INDEX IF NOT EXISTS idx_repro_events_event_date ON reproductive_events(event_date);

-- STEP 3: Enable RLS
ALTER TABLE reproductive_events ENABLE ROW LEVEL SECURITY;

-- STEP 4: Read policy
CREATE POLICY "authenticated_read_repro_events" ON reproductive_events FOR SELECT TO authenticated USING (true);

-- STEP 5: Insert policy
CREATE POLICY "admins_insert_repro_events" ON reproductive_events FOR INSERT TO authenticated WITH CHECK (is_admin());

-- STEP 6: Update policy
CREATE POLICY "admins_update_repro_events" ON reproductive_events FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- STEP 7: Delete policy
CREATE POLICY "admins_delete_repro_events" ON reproductive_events FOR DELETE TO authenticated USING (is_admin());
