-- Migration: Auth / RLS hardening
-- Run this in the InsForge SQL editor after the existing migrations.
--
-- 1. Blocks privilege escalation: authenticated users could previously
--    INSERT/UPDATE their own user_profiles row with role = 'admin' (the
--    RLS policies only checked user_id = auth.uid()).
-- 2. Restricts notification deletion to admins (old policy allowed any
--    authenticated user).
-- 3. Lets teachers UPDATE the activities they created (they could already
--    INSERT and DELETE them, but not edit).

-- ── 1. Role escalation guard ─────────────────────────────────────────────

-- SECURITY DEFINER helper so the (invoker-rights) trigger can read auth.users.
CREATE OR REPLACE FUNCTION auth_email_for(uid uuid)
RETURNS text AS $$
  SELECT lower(email) FROM auth.users WHERE id = uid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Invoker rights on purpose: current_user must reflect the PostgREST role
-- ('authenticated' for end users) — inside SECURITY DEFINER it would be the
-- function owner and the bypass check below would break.
CREATE OR REPLACE FUNCTION enforce_user_profile_role()
RETURNS trigger AS $$
BEGIN
  -- Service role / SQL editor bypass; only end-user requests are constrained.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'No autorizado para cambiar el rol';
    END IF;
    RETURN NEW;
  END IF;

  -- INSERT: role must be consistent with the institutional email domain.
  IF NEW.role = 'admin' THEN
    RAISE EXCEPTION 'No autorizado para crear perfiles con rol admin';
  END IF;

  IF NEW.role = 'teacher' THEN
    DECLARE
      user_email text := auth_email_for(NEW.user_id);
    BEGIN
      IF user_email IS NULL
         OR user_email LIKE '%@live.uleam.edu.ec'
         OR user_email NOT LIKE '%@uleam.edu.ec' THEN
        RAISE EXCEPTION 'El rol docente requiere un correo @uleam.edu.ec';
      END IF;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_profiles_role_guard ON user_profiles;
CREATE TRIGGER user_profiles_role_guard
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION enforce_user_profile_role();

-- ── 2. Notifications: only admins can delete ────────────────────────────

DROP POLICY IF EXISTS "Admins can delete notifications" ON notifications;
CREATE POLICY "admins_delete_notifications" ON notifications
  FOR DELETE USING (is_admin());

-- ── 3. Teachers can edit their own activities ───────────────────────────

DROP POLICY IF EXISTS "teachers_update_own_activities" ON activities;
CREATE POLICY "teachers_update_own_activities" ON activities
  FOR UPDATE
  USING (is_teacher() AND created_by = auth.uid())
  WITH CHECK (is_teacher() AND created_by = auth.uid());
