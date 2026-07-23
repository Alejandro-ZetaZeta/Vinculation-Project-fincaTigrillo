-- Migration: add min_stock to vaccine_catalog
-- Optional low-stock alert threshold. NULL = no alert (uses defaults).

ALTER TABLE vaccine_catalog
  ADD COLUMN IF NOT EXISTS min_stock INT DEFAULT NULL
  CONSTRAINT chk_vaccine_min_stock_non_negative CHECK (min_stock IS NULL OR min_stock >= 0);

COMMENT ON COLUMN vaccine_catalog.min_stock IS
  'Optional low-stock alert threshold. When stock_doses <= min_stock, the UI surfaces a warning. NULL disables the per-vaccine alert.';
