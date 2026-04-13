-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = (SELECT auth.uid()) AND role = 'admin'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals ENABLE ROW LEVEL SECURITY;

-- user_profiles policies
CREATE POLICY "authenticated_read_profiles" ON user_profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "users_insert_own_profile" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "users_update_own_profile" ON user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- animal_categories policies (everyone reads, admins write)
CREATE POLICY "authenticated_read_categories" ON animal_categories
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admins_insert_categories" ON animal_categories
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admins_update_categories" ON animal_categories
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins_delete_categories" ON animal_categories
  FOR DELETE TO authenticated
  USING (is_admin());

-- animal_types policies (everyone reads, admins write)
CREATE POLICY "authenticated_read_types" ON animal_types
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admins_insert_types" ON animal_types
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admins_update_types" ON animal_types
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins_delete_types" ON animal_types
  FOR DELETE TO authenticated
  USING (is_admin());

-- animals policies (everyone reads, admins write)
CREATE POLICY "authenticated_read_animals" ON animals
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "admins_insert_animals" ON animals
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "admins_update_animals" ON animals
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins_delete_animals" ON animals
  FOR DELETE TO authenticated
  USING (is_admin());

-- Indexes for RLS performance
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_animals_type_id ON animals(type_id);
CREATE INDEX idx_animals_status ON animals(status);
CREATE INDEX idx_animals_created_by ON animals(created_by);
CREATE INDEX idx_animal_types_category_id ON animal_types(category_id);

-- Auto-update updated_at triggers
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

CREATE TRIGGER animals_updated_at
  BEFORE UPDATE ON animals
  FOR EACH ROW
  EXECUTE FUNCTION system.update_updated_at();

-- Seed data: categories
INSERT INTO animal_categories (name, slug, description, icon, display_order) VALUES
  ('Ganado Mayor', 'ganado-mayor', 'Bovinos, equinos y otros animales de gran tamaño', 'Beef', 1),
  ('Ganado Menor', 'ganado-menor', 'Porcinos, aves de corral y otros animales de menor tamaño', 'Bird', 2);

-- Seed data: types
INSERT INTO animal_types (category_id, name, slug, description, icon, display_order) VALUES
  ((SELECT id FROM animal_categories WHERE slug = 'ganado-mayor'), 'Bovino', 'bovino', 'Ganado vacuno: vacas, toros, terneros', 'Milk', 1),
  ((SELECT id FROM animal_categories WHERE slug = 'ganado-mayor'), 'Equino', 'equino', 'Caballos, yeguas, potros, mulas, burros', 'Ribbon', 2),
  ((SELECT id FROM animal_categories WHERE slug = 'ganado-menor'), 'Porcino', 'porcino', 'Cerdos, lechones, cerdas de cría', 'Drumstick', 1),
  ((SELECT id FROM animal_categories WHERE slug = 'ganado-menor'), 'Aves de Corral', 'aves-de-corral', 'Gallinas, pollos, gallos, patos, pavos', 'Egg', 2);
