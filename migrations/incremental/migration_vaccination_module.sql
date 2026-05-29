-- SQL Migration: Vaccination Module (Catalog + History)
-- To run (example): npx @insforge/cli db query "<SQL content>" -y

-- 1) Vaccine catalog
CREATE TABLE IF NOT EXISTS vaccine_catalog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,

  -- Targeting rules (nullable means "no restriction")
  target_type_id UUID REFERENCES animal_types(id) ON DELETE SET NULL,
  target_sex TEXT NOT NULL DEFAULT 'any' CHECK (target_sex IN ('any', 'macho', 'hembra', 'mixto')),
  age_min_days INT CHECK (age_min_days IS NULL OR age_min_days >= 0),
  age_max_days INT CHECK (age_max_days IS NULL OR age_max_days >= 0),

  -- Reproductive state restriction for female animals (null/empty means any)
  allowed_reproductive_states TEXT[],

  -- Default interval used to suggest next dose when not provided
  default_next_dose_days INT CHECK (default_next_dose_days IS NULL OR default_next_dose_days >= 0),

  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_vaccine_catalog_name ON vaccine_catalog(lower(name));
CREATE INDEX IF NOT EXISTS idx_vaccine_catalog_target_type ON vaccine_catalog(target_type_id);
CREATE INDEX IF NOT EXISTS idx_vaccine_catalog_is_active ON vaccine_catalog(is_active);

-- 2) Vaccination history (pivot/transaction)
CREATE TABLE IF NOT EXISTS animal_vaccinations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  vaccine_id UUID NOT NULL REFERENCES vaccine_catalog(id) ON DELETE RESTRICT,
  applied_at DATE NOT NULL,
  next_dose_at DATE,
  notes TEXT,

  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_animal_vaccinations_animal_id_applied_at ON animal_vaccinations(animal_id, applied_at);
CREATE INDEX IF NOT EXISTS idx_animal_vaccinations_next_dose_at ON animal_vaccinations(next_dose_at);
CREATE INDEX IF NOT EXISTS idx_animal_vaccinations_vaccine_id ON animal_vaccinations(vaccine_id);

-- 3) RLS
ALTER TABLE vaccine_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_vaccinations ENABLE ROW LEVEL SECURITY;

-- 4) Policies
-- Everyone authenticated can read
CREATE POLICY "authenticated_read_vaccine_catalog" ON vaccine_catalog
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_read_animal_vaccinations" ON animal_vaccinations
  FOR SELECT TO authenticated
  USING (true);

-- Admins write
CREATE POLICY "admins_insert_vaccine_catalog" ON vaccine_catalog
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admins_update_vaccine_catalog" ON vaccine_catalog
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins_delete_vaccine_catalog" ON vaccine_catalog
  FOR DELETE TO authenticated
  USING (is_admin());

CREATE POLICY "admins_insert_animal_vaccinations" ON animal_vaccinations
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admins_update_animal_vaccinations" ON animal_vaccinations
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins_delete_animal_vaccinations" ON animal_vaccinations
  FOR DELETE TO authenticated
  USING (is_admin());

-- 5) updated_at triggers
DO $$
BEGIN
  CREATE TRIGGER vaccine_catalog_updated_at
    BEFORE UPDATE ON vaccine_catalog
    FOR EACH ROW
    EXECUTE FUNCTION system.update_updated_at();
EXCEPTION
  WHEN undefined_function THEN
    NULL;
END $$;

DO $$
BEGIN
  CREATE TRIGGER animal_vaccinations_updated_at
    BEFORE UPDATE ON animal_vaccinations
    FOR EACH ROW
    EXECUTE FUNCTION system.update_updated_at();
EXCEPTION
  WHEN undefined_function THEN
    NULL;
END $$;
