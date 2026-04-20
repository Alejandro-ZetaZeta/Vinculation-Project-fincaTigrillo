-- ====================================================================
-- MIGRACIÓN: Tabla de Eventos Reproductivos
-- Ejecutar en la consola SQL de Insforge/Supabase
-- ====================================================================

-- Tabla principal de eventos reproductivos
CREATE TABLE IF NOT EXISTS reproductive_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  animal_id UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'monta_natural',
    'inseminacion',
    'confirmacion_prenez',
    'parto',
    'aborto',
    'destete'
  )),
  event_date DATE NOT NULL,
  -- Fecha estimada de parto (se calcula al registrar monta/inseminación)
  expected_due_date DATE,
  -- Notas adicionales del evento
  notes TEXT,
  -- Quién registró el evento
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX idx_repro_events_animal_id ON reproductive_events(animal_id);
CREATE INDEX idx_repro_events_event_type ON reproductive_events(event_type);
CREATE INDEX idx_repro_events_event_date ON reproductive_events(event_date);

-- RLS
ALTER TABLE reproductive_events ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden leer
CREATE POLICY "authenticated_read_repro_events" ON reproductive_events
  FOR SELECT TO authenticated
  USING (true);

-- Solo admins pueden insertar
CREATE POLICY "admins_insert_repro_events" ON reproductive_events
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

-- Solo admins pueden actualizar
CREATE POLICY "admins_update_repro_events" ON reproductive_events
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Solo admins pueden eliminar
CREATE POLICY "admins_delete_repro_events" ON reproductive_events
  FOR DELETE TO authenticated
  USING (is_admin());

-- Trigger para auto-update de updated_at
CREATE TRIGGER reproductive_events_updated_at
  BEFORE UPDATE ON reproductive_events
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();
