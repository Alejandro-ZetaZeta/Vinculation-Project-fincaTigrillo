-- SQL Migration: Increase weight_kg precision on animal_weights + animals
-- Reason: DECIMAL(10, 2) cannot hold grams precision after /1000 conversion
--         (41g -> 0.041 kg truncated to 0.04 kg -> display 40g).
--         DECIMAL(10, 4) gives 0.1g precision, safe for both pollitos (g)
--         and adult poultry (lbs) round-trips.
-- Run: npx @insforge/cli db query "<content of this file>" -y

ALTER TABLE animal_weights
  ALTER COLUMN weight_kg TYPE DECIMAL(10, 4);

ALTER TABLE animals
  ALTER COLUMN weight_kg TYPE DECIMAL(10, 4);
