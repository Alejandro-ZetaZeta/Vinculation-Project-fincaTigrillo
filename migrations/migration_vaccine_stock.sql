
ALTER TABLE vaccine_catalog
  ADD COLUMN IF NOT EXISTS stock_doses INT NOT NULL DEFAULT 0
  CONSTRAINT chk_vaccine_stock_non_negative CHECK (stock_doses >= 0);

COMMENT ON COLUMN vaccine_catalog.stock_doses IS
  'Current number of doses in inventory. Decremented automatically on each vaccination assignment. Increased by admin purchase entries.';
