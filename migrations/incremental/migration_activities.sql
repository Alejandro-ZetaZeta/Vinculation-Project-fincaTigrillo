-- =============================================
-- Activities tables
-- =============================================

CREATE TABLE activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  target_career TEXT NOT NULL,
  target_semester TEXT NOT NULL,
  due_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(activity_id, student_id)
);

-- =============================================
-- RLS
-- =============================================

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_assignments ENABLE ROW LEVEL SECURITY;

-- activities: everyone reads, admins write
CREATE POLICY "authenticated_read_activities" ON activities
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_insert_activities" ON activities
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "admins_update_activities" ON activities
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admins_delete_activities" ON activities
  FOR DELETE TO authenticated USING (is_admin());

-- activity_assignments: everyone reads, admin inserts/deletes, student updates own
CREATE POLICY "authenticated_read_assignments" ON activity_assignments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins_insert_assignments" ON activity_assignments
  FOR INSERT TO authenticated WITH CHECK (is_admin());

CREATE POLICY "admins_delete_assignments" ON activity_assignments
  FOR DELETE TO authenticated USING (is_admin());

-- Students can update their own assignment status
CREATE POLICY "students_update_own_assignment" ON activity_assignments
  FOR UPDATE TO authenticated
  USING (student_id = (SELECT auth.uid()))
  WITH CHECK (student_id = (SELECT auth.uid()));

-- Admin can also update any assignment
CREATE POLICY "admins_update_assignments" ON activity_assignments
  FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- =============================================
-- Admin can update/delete viewer profiles
-- =============================================

CREATE POLICY "admins_update_profiles" ON user_profiles
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins_delete_profiles" ON user_profiles
  FOR DELETE TO authenticated
  USING (is_admin());

-- =============================================
-- Indexes
-- =============================================

CREATE INDEX idx_activities_career_semester ON activities(target_career, target_semester);
CREATE INDEX idx_activities_created_by ON activities(created_by);
CREATE INDEX idx_assignments_activity_id ON activity_assignments(activity_id);
CREATE INDEX idx_assignments_student_id ON activity_assignments(student_id);
CREATE INDEX idx_assignments_status ON activity_assignments(status);
CREATE INDEX idx_user_profiles_career_semester ON user_profiles(career, semester);
