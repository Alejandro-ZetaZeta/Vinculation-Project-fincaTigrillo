-- ====================================================================
-- Ross 308 AP — Tabla de consumo diario de alimento por ave (engorde)
-- Fuente: Aviagen Ross 308 AP Broiler Performance Objectives
-- ====================================================================

CREATE TABLE IF NOT EXISTS ross308_daily_feed (
  day          INTEGER  PRIMARY KEY CHECK (day BETWEEN 1 AND 46),
  daily_feed_g DECIMAL(7, 2) NOT NULL
);

ALTER TABLE ross308_daily_feed ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_ross308" ON ross308_daily_feed
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_write_ross308" ON ross308_daily_feed
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Seed: valores oficiales Ross 308 AP (g/ave/día)
INSERT INTO ross308_daily_feed (day, daily_feed_g) VALUES
  (1,  11), (2,  14), (3,  17), (4,  21),
  (5,  24), (6,  28), (7,  32), (8,  34),
  (9,  36), (10, 39), (11, 44), (12, 49),
  (13, 55), (14, 60), (15, 66), (16, 72),
  (17, 78), (18, 84), (19, 91), (20, 96),
  (21, 104),(22, 110),(23, 117),(24, 122),
  (25, 129),(26, 136),(27, 141),(28, 148),
  (29, 154),(30, 159),(31, 165),(32, 171),
  (33, 175),(34, 180),(35, 185),(36, 190),
  (37, 192),(38, 196),(39, 199),(40, 200),
  (41, 202),(42, 204),(43, 206),(44, 204),
  (45, 204),(46, 203)
ON CONFLICT (day) DO UPDATE SET daily_feed_g = EXCLUDED.daily_feed_g;
