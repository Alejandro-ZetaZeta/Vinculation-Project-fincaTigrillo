-- SQL Migration: Vaccine catalog reproductive state restriction
-- Adds allowed_reproductive_states to vaccine_catalog

ALTER TABLE vaccine_catalog
  ADD COLUMN IF NOT EXISTS allowed_reproductive_states TEXT[];
