-- Catalog update: add Patos + Caprino types; clean Aves description.
-- Safe to run multiple times (uses WHERE NOT EXISTS).

-- 1) Update existing Aves de Corral description
UPDATE animal_types
SET description = 'Gallinas, pollos, gallos'
WHERE slug = 'aves-de-corral';

-- 2) Ensure Caprino type exists under Ganado Menor
INSERT INTO animal_types (category_id, name, slug, description, icon, display_order)
SELECT c.id, 'Caprino', 'caprino', 'Cabras, chivos y crías', 'Milk', 2
FROM animal_categories c
WHERE c.slug = 'ganado-menor'
  AND NOT EXISTS (SELECT 1 FROM animal_types t WHERE t.slug = 'caprino');

-- 3) Ensure Patos type exists under Ganado Menor
INSERT INTO animal_types (category_id, name, slug, description, icon, display_order)
SELECT c.id, 'Patos', 'patos', 'Patos domésticos registrados individualmente', 'Egg', 4
FROM animal_categories c
WHERE c.slug = 'ganado-menor'
  AND NOT EXISTS (SELECT 1 FROM animal_types t WHERE t.slug = 'patos');

-- 4) Optional: normalize display order for Ganado Menor cards
UPDATE animal_types
SET display_order = 1
WHERE slug = 'porcino';

UPDATE animal_types
SET display_order = 2
WHERE slug = 'caprino';

UPDATE animal_types
SET display_order = 3
WHERE slug = 'aves-de-corral';

UPDATE animal_types
SET display_order = 4
WHERE slug = 'patos';
