-- Migration: assign_vaccines_and_deduct_stock v3
-- Logs every assignment in vaccine_stock_movements with reason='Aplicación'.
-- One movement row per RPC call (delta = -v_doses).
-- The per-animal vaccination rows remain in animal_vaccinations and are
-- surfaced on the detail page's "Vacunaciones recientes" section.
--
-- v2 → v3 differences:
--   - Adds INSERT into vaccine_stock_movements with reason='Aplicación'
--   - related_vaccination_id is NULL here; the link is implicit via
--     (vaccine_id, created_at) proximity. Keeping the v3 body as plain
--     statements (no CTE) keeps it compatible with InsForge's SQL parser.

CREATE OR REPLACE FUNCTION assign_vaccines_and_deduct_stock(
  p_vaccine_id   UUID,
  p_animal_ids   UUID[],
  p_applied_at   DATE,
  p_next_dose_at DATE    DEFAULT NULL,
  p_notes        TEXT    DEFAULT NULL,
  p_created_by   UUID    DEFAULT NULL,
  p_doses_count  INT     DEFAULT NULL
)
RETURNS TABLE (inserted_count INT, stock_remaining INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS '
DECLARE
  v_stock INT;
  v_rows  INT;
  v_doses INT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION ''permission_denied: Solo los administradores pueden asignar vacunas'';
  END IF;

  v_rows := array_length(p_animal_ids, 1);

  IF v_rows IS NULL OR v_rows = 0 THEN
    RAISE EXCEPTION ''animal_ids_empty: Se requiere al menos un animal'';
  END IF;

  v_doses := COALESCE(p_doses_count, v_rows);

  IF v_doses <= 0 THEN
    RAISE EXCEPTION ''doses_count_invalid: El número de dosis debe ser mayor que cero'';
  END IF;

  SELECT stock_doses
    INTO v_stock
    FROM vaccine_catalog
   WHERE id = p_vaccine_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''vaccine_not_found: Vacuna no encontrada'';
  END IF;

  IF v_stock < v_doses THEN
    RAISE EXCEPTION ''stock_insuficiente: Stock insuficiente: % dosis disponible%, se requieren %'',
      v_stock,
      CASE WHEN v_stock = 1 THEN '''' ELSE ''s'' END,
      v_doses;
  END IF;

  INSERT INTO animal_vaccinations (animal_id, vaccine_id, applied_at, next_dose_at, notes, created_by)
  SELECT unnest(p_animal_ids), p_vaccine_id, p_applied_at, p_next_dose_at, p_notes, p_created_by;

  UPDATE vaccine_catalog
     SET stock_doses = stock_doses - v_doses
   WHERE id = p_vaccine_id;

  INSERT INTO vaccine_stock_movements (vaccine_id, delta, reason, notes, created_by)
  VALUES (p_vaccine_id, -v_doses, ''Aplicación'', p_notes, p_created_by);

  RETURN QUERY SELECT v_rows, (v_stock - v_doses)::INT;
END;
';

GRANT EXECUTE ON FUNCTION assign_vaccines_and_deduct_stock(UUID, UUID[], DATE, DATE, TEXT, UUID, INT)
  TO authenticated;
