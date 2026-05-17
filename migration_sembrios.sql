-- =============================================
-- Módulo de Sembrios: Potreros y Sembrios
-- =============================================

-- Tabla de Potreros (perfiles de cada lote de tierra)
CREATE TABLE potreros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  area_total_m2 NUMERIC(12, 2) NOT NULL CHECK (area_total_m2 > 0),
  tipo_suelo TEXT,                                   -- arcilloso, arenoso, franco, etc.
  ubicacion_referencia TEXT,                         -- descripción o referencia en el mapa
  activo BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de Sembrios (registros por potrero)
CREATE TABLE sembrios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  potrero_id UUID NOT NULL REFERENCES potreros(id) ON DELETE CASCADE,
  tipo_cultivo TEXT NOT NULL,                        -- Maíz, Pasto Saboya, Yuca, etc.
  variedad TEXT,                                     -- subtipo o variedad del cultivo
  area_sembrada_m2 NUMERIC(12, 2) NOT NULL CHECK (area_sembrada_m2 > 0),
  fecha_siembra DATE NOT NULL,
  fecha_cosecha_estimada DATE,
  fecha_cosecha_real DATE,
  estado TEXT NOT NULL DEFAULT 'en_crecimiento'
    CHECK (estado IN ('en_crecimiento','cosechado','en_descanso','fallido','en_preparacion')),
  rendimiento_kg NUMERIC(10, 2),                    -- kg cosechados (se llena al cosechar)
  observaciones TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- RLS
-- =============================================

ALTER TABLE potreros ENABLE ROW LEVEL SECURITY;
ALTER TABLE sembrios  ENABLE ROW LEVEL SECURITY;

-- potreros: todos leen, solo admin escribe
CREATE POLICY "authenticated_read_potreros" ON potreros
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_insert_potreros" ON potreros
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "admins_update_potreros" ON potreros
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admins_delete_potreros" ON potreros
  FOR DELETE TO authenticated USING (is_admin());

-- sembrios: todos leen, solo admin escribe
CREATE POLICY "authenticated_read_sembrios" ON sembrios
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_insert_sembrios" ON sembrios
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "admins_update_sembrios" ON sembrios
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admins_delete_sembrios" ON sembrios
  FOR DELETE TO authenticated USING (is_admin());

-- =============================================
-- Triggers updated_at
-- =============================================

CREATE TRIGGER potreros_updated_at
  BEFORE UPDATE ON potreros
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER sembrios_updated_at
  BEFORE UPDATE ON sembrios
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_potreros_activo     ON potreros(activo);
CREATE INDEX idx_potreros_created_by ON potreros(created_by);
CREATE INDEX idx_sembrios_potrero_id ON sembrios(potrero_id);
CREATE INDEX idx_sembrios_estado     ON sembrios(estado);
CREATE INDEX idx_sembrios_created_by ON sembrios(created_by);
