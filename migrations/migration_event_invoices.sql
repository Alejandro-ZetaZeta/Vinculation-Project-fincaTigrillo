-- ============================================================
-- Table: event_invoices
-- Purpose: store invoice image URLs linked (optionally) to events
-- ============================================================
create table if not exists event_invoices (
  id          uuid        primary key default gen_random_uuid(),
  event_id    uuid,
  file_url    text        not null,
  created_at  timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────
alter table event_invoices enable row level security;

create policy "invoices_read" on event_invoices
  for select to authenticated using (true);

create policy "invoices_insert" on event_invoices
  for insert to authenticated
  with check (
    exists (
      select 1 from user_profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );

create policy "invoices_delete" on event_invoices
  for delete to authenticated using (
    exists (
      select 1 from user_profiles
      where user_id = auth.uid() and role = 'admin'
    )
  );
