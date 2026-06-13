-- ============================================================
-- Requests Module Migration
-- Adds requests job-queue table + scoped notifications support
-- Run in InsForge SQL editor
-- ============================================================

-- ── 1. Add user_id to notifications (scoped delivery) ────────
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id, created_at DESC);

-- Update SELECT policy to scope by user_id
DROP POLICY IF EXISTS "Admins can read notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;

CREATE POLICY "notifications_select"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    user_id IS NULL          -- broadcast (admin-wide, legacy)
    OR user_id = auth.uid()  -- personal (teacher feedback)
    OR is_admin()
  );

-- Allow UPDATE (mark-read) scoped to visible rows
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    user_id IS NULL
    OR user_id = auth.uid()
    OR is_admin()
  );

-- Allow INSERT (server-side routes insert notifications)
DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- ── 2. Create requests table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.requests (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type  TEXT        NOT NULL CHECK (request_type IN (
                  'animal_record',
                  'reproductive_event',
                  'mortality_event',
                  'production_event',
                  'vaccine_profile',
                  'vaccine_assignment'
                )),
  status        TEXT        NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  payload       JSONB       NOT NULL,
  admin_notes   TEXT,
  reviewed_by   UUID        REFERENCES auth.users(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_teacher_id  ON public.requests (teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_status      ON public.requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_type        ON public.requests (request_type);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION requests_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS requests_updated_at ON public.requests;
CREATE TRIGGER requests_updated_at
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION requests_set_updated_at();

-- ── 3. RLS on requests ────────────────────────────────────────
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Teachers: select only own rows
DROP POLICY IF EXISTS "requests_teacher_select" ON public.requests;
CREATE POLICY "requests_teacher_select"
  ON public.requests FOR SELECT TO authenticated
  USING (is_teacher() AND teacher_id = auth.uid());

-- Teachers: insert only own rows
DROP POLICY IF EXISTS "requests_teacher_insert" ON public.requests;
CREATE POLICY "requests_teacher_insert"
  ON public.requests FOR INSERT TO authenticated
  WITH CHECK (is_teacher() AND teacher_id = auth.uid());

-- Admins: select all rows
DROP POLICY IF EXISTS "requests_admin_select" ON public.requests;
CREATE POLICY "requests_admin_select"
  ON public.requests FOR SELECT TO authenticated
  USING (is_admin());

-- Admins: update any row (review, approve, reject, edit payload)
DROP POLICY IF EXISTS "requests_admin_update" ON public.requests;
CREATE POLICY "requests_admin_update"
  ON public.requests FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admins: delete rows (cleanup)
DROP POLICY IF EXISTS "requests_admin_delete" ON public.requests;
CREATE POLICY "requests_admin_delete"
  ON public.requests FOR DELETE TO authenticated
  USING (is_admin());
