-- Migration: Teacher Role
-- Run this in the InsForge SQL editor after the existing migrations.

-- 1. Helper function so RLS policies can identify teacher users
CREATE OR REPLACE FUNCTION is_teacher()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = (SELECT auth.uid()) AND role = 'teacher'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. Teachers can create activities (students from @uleam.edu.ec staff domain)
CREATE POLICY "teachers_insert_activities" ON activities
  FOR INSERT WITH CHECK (is_teacher());

-- 3. Teachers can delete only the activities they created
CREATE POLICY "teachers_delete_own_activities" ON activities
  FOR DELETE USING (is_teacher() AND created_by = auth.uid());
