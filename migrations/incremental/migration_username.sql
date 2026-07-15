-- ─────────────────────────────────────────────────────────────────────────────
-- Username (full_name) change cooldown for students and teachers
-- Run ONLY this file in the InsForge SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS name_updated_at   TIMESTAMPTZ DEFAULT NULL;

-- Existing 'users_update_own_profile' policy allows the user to update their
-- own row, so name_updated_at / full_name updates are already permitted at
-- the RLS layer for owner. We only need the column itself.
