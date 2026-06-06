
-- Migration: assign_vaccines_and_deduct_stock v2
-- Adds p_doses_count parameter so poultry batches can deduct the correct
-- number of doses (current live bird count) instead of the number of DB rows.
-- If p_doses_count is NULL the RPC falls back to array_length(p_animal_ids).

CREATE OR REPLACE FUNCTION assign_vaccines_and_deduct_stock(
  p_vaccine_id   UUID,
  p_animal_ids   UUID[],
  p_applied_at   DATE,
  p_next_dose_at DATE    DEFAULT NULL,
  p_notes        TEXT    DEFAULT NULL,
  p_created_by   UUID    DEFAULT NULL,
  p_doses_count  INT     DEFAULT NULL   -- explicit override for batch types (e.g. poultry)
)
RETURNS TABLE (inserted_count INT, stock_remaining INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS '
DECLARE
  v_stock INT;
  v_rows  INT;  -- number of animal DB rows being inserted
  v_doses INT;  -- actual doses to deduct (may differ from v_rows for batch animals)
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION ''permission_denied: Solo los administradores pueden asignar vacunas'';
  END IF;

  v_rows := array_length(p_animal_ids, 1);

  IF v_rows IS NULL OR v_rows = 0 THEN
    RAISE EXCEPTION ''animal_ids_empty: Se requiere al menos un animal'';
  END IF;

  -- Use explicit override when provided (e.g. poultry batch live count),
  -- otherwise fall back to the number of animal rows (standard case).
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

  RETURN QUERY SELECT v_rows, (v_stock - v_doses)::INT;
END;
';

GRANT EXECUTE ON FUNCTION assign_vaccines_and_deduct_stock(UUID, UUID[], DATE, DATE, TEXT, UUID, INT)
  TO authenticated;
