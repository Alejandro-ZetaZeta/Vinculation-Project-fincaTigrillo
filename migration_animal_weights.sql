-- SQL Migration: Animal Weights Table
-- To run: npx @insforge/cli db query "<SQL content>" -y

-- 1. Create table
CREATE TABLE IF NOT EXISTS animal_weights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  weight_kg DECIMAL(10, 2) NOT NULL,
  recorded_at DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_animal_weights_animal_id ON animal_weights(animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_weights_recorded_at ON animal_weights(recorded_at);

-- 3. Enable RLS
ALTER TABLE animal_weights ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "authenticated_read_weights" ON animal_weights
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admins_insert_weights" ON animal_weights
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "admins_update_weights" ON animal_weights
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "admins_delete_weights" ON animal_weights
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- 5. Trigger for updated_at (if system.update_updated_at exists)
DO $$
BEGIN
  CREATE TRIGGER animal_weights_updated_at
    BEFORE UPDATE ON animal_weights
    FOR EACH ROW
    EXECUTE FUNCTION system.update_updated_at();
EXCEPTION
  WHEN undefined_function THEN
    -- Fallback if function doesn't exist
    NULL;
END $$;
