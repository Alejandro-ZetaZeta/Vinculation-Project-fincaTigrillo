
CREATE OR REPLACE FUNCTION assign_vaccines_and_deduct_stock(
  p_vaccine_id   UUID,
  p_animal_ids   UUID[],
  p_applied_at   DATE,
  p_next_dose_at DATE    DEFAULT NULL,
  p_notes        TEXT    DEFAULT NULL,
  p_created_by   UUID    DEFAULT NULL
)
RETURNS TABLE (inserted_count INT, stock_remaining INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS '
DECLARE
  v_stock INT;
  v_count INT;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION ''permission_denied: Solo los administradores pueden asignar vacunas'';
  END IF;

  v_count := array_length(p_animal_ids, 1);

  IF v_count IS NULL OR v_count = 0 THEN
    RAISE EXCEPTION ''animal_ids_empty: Se requiere al menos un animal'';
  END IF;

  SELECT stock_doses
    INTO v_stock
    FROM vaccine_catalog
   WHERE id = p_vaccine_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION ''vaccine_not_found: Vacuna no encontrada'';
  END IF;

  IF v_stock < v_count THEN
    RAISE EXCEPTION ''stock_insuficiente: Stock insuficiente: % dosis disponible%, se requieren %'',
      v_stock,
      CASE WHEN v_stock = 1 THEN '''' ELSE ''s'' END,
      v_count;
  END IF;

  INSERT INTO animal_vaccinations (animal_id, vaccine_id, applied_at, next_dose_at, notes, created_by)
  SELECT unnest(p_animal_ids), p_vaccine_id, p_applied_at, p_next_dose_at, p_notes, p_created_by;

  UPDATE vaccine_catalog
     SET stock_doses = stock_doses - v_count
   WHERE id = p_vaccine_id;

  RETURN QUERY SELECT v_count, (v_stock - v_count)::INT;
END;
';

GRANT EXECUTE ON FUNCTION assign_vaccines_and_deduct_stock(UUID, UUID[], DATE, DATE, TEXT, UUID)
  TO authenticated;
