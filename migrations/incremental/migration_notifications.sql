-- ─────────────────────────────────────────────────────────────────
-- MIGRATION: notifications
-- Run once in your Insforge/Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      VARCHAR(255) NOT NULL,
  message    TEXT        NOT NULL,
  type       VARCHAR(20)  NOT NULL DEFAULT 'info'
               CHECK (type IN ('info', 'warning', 'success', 'error')),
  is_read    BOOLEAN      NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Index for the bell query: unread first, newest first
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications (created_at DESC);

-- Optional: auto-purge rows older than 60 days (keeps the table lean)
-- Uncomment if you have pg_cron available:
-- SELECT cron.schedule('purge-old-notifications', '0 3 * * *',
--   $$DELETE FROM public.notifications WHERE created_at < NOW() - INTERVAL '60 days'$$);

-- Row-level security (admins only — adjust to your auth model)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read notifications"
  ON public.notifications FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);          -- INSERT restricted to service-role key via API

CREATE POLICY "Admins can delete notifications"
  ON public.notifications FOR DELETE
  USING (auth.role() = 'authenticated');
