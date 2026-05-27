-- ─────────────────────────────────────────────────────────────────────────────
-- Avatar support for viewer (student) profiles
-- Run ONLY this file in the InsForge SQL editor.
-- Bucket creation → see README note below (use InsForge CLI or dashboard).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url          TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS avatar_updated_at   TIMESTAMPTZ DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- After running this SQL, create the storage bucket via CLI:
--
--   insforge storage create avatars --public
--
-- Or via the InsForge dashboard → Storage → New bucket → name: avatars → Public
-- ─────────────────────────────────────────────────────────────────────────────
