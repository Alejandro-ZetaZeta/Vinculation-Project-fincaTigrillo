-- Add title and notes to event_invoices
alter table event_invoices
  add column title varchar(150) not null default '',
  add column notes text;

-- Remove default so future inserts must supply title explicitly
alter table event_invoices
  alter column title drop default;
