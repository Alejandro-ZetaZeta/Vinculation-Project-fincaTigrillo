-- Migration: Allow teachers to insert activity_assignments
-- Run this in the InsForge SQL editor.
--
-- Problem: The original migration only allowed admins to INSERT into
-- activity_assignments. Teachers can create activities (via RLS policy
-- "teachers_insert_activities") but then the server-side bulk-assignment
-- loop silently fails because their token is blocked from inserting rows
-- into activity_assignments. This leaves students with no assignments.

-- Teachers can insert assignments for activities THEY created
CREATE POLICY "teachers_insert_assignments" ON activity_assignments
  FOR INSERT TO authenticated
  WITH CHECK (
    is_teacher()
    AND EXISTS (
      SELECT 1 FROM activities
      WHERE id = activity_assignments.activity_id
        AND created_by = (SELECT auth.uid())
    )
  );

-- Teachers can also delete assignments for activities they created
-- (needed if teacher deletes an activity and cascade doesn't fire under their token)
CREATE POLICY "teachers_delete_own_assignments" ON activity_assignments
  FOR DELETE TO authenticated
  USING (
    is_teacher()
    AND EXISTS (
      SELECT 1 FROM activities
      WHERE id = activity_assignments.activity_id
        AND created_by = (SELECT auth.uid())
    )
  );
