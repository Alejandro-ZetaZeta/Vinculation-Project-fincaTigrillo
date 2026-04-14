-- Add semester and career columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS semester TEXT DEFAULT NULL;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS career TEXT DEFAULT NULL;

-- Add constraint for valid careers
ALTER TABLE user_profiles ADD CONSTRAINT valid_career
  CHECK (career IS NULL OR career IN ('Agropecuaria', 'Agronegocios', 'Alimentos'));

-- Add constraint for valid semesters (1-10)
ALTER TABLE user_profiles ADD CONSTRAINT valid_semester
  CHECK (semester IS NULL OR semester IN ('1','2','3','4','5','6','7','8','9','10'));
