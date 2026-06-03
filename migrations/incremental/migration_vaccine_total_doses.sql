-- Migration: add total_doses to vaccine_catalog
-- Specifies how many doses are in the schedule. NULL = no fixed limit (continuous/recurring).
-- Only meaningful when default_next_dose_days is set.

ALTER TABLE vaccine_catalog
  ADD COLUMN IF NOT EXISTS total_doses INT
  CONSTRAINT chk_vaccine_total_doses CHECK (total_doses IS NULL OR total_doses >= 1);

COMMENT ON COLUMN vaccine_catalog.total_doses IS
  'Total doses in the vaccination schedule. NULL = no fixed limit. Only meaningful when default_next_dose_days is set.';
