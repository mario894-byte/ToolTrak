/*
  # Fix User Locations RLS Policies
  
  ## Summary
  Fixes RLS policies that incorrectly query auth.users table directly.
  Uses auth.jwt() to get user email from JWT token instead.
  
  ## Changes
  - Drop existing policies on user_locations that use auth.users subquery
  - Recreate policies using auth.jwt()->>'email' for admin checks
  - Fix tool_assignments update policies with same approach
  
  ## Security
  - All policies still require authentication
  - Admin checks use JWT email claim matched against allowed_emails
  - Users can only view their own location assignments
*/

-- Drop existing policies on user_locations
DROP POLICY IF EXISTS "Users can view own location assignments" ON user_locations;
DROP POLICY IF EXISTS "Admins can view all location assignments" ON user_locations;
DROP POLICY IF EXISTS "Admins can insert location assignments" ON user_locations;
DROP POLICY IF EXISTS "Admins can delete location assignments" ON user_locations;

-- Recreate user_locations policies using auth.jwt()

-- Users can view their own location assignments
CREATE POLICY "Users can view own location assignments"
  ON user_locations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all location assignments
CREATE POLICY "Admins can view all location assignments"
  ON user_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (auth.jwt()->>'email')
      AND is_admin = true
    )
  );

-- Admins can insert location assignments
CREATE POLICY "Admins can insert location assignments"
  ON user_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (auth.jwt()->>'email')
      AND is_admin = true
    )
  );

-- Admins can update location assignments
CREATE POLICY "Admins can update location assignments"
  ON user_locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (auth.jwt()->>'email')
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (auth.jwt()->>'email')
      AND is_admin = true
    )
  );

-- Admins can delete location assignments
CREATE POLICY "Admins can delete location assignments"
  ON user_locations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (auth.jwt()->>'email')
      AND is_admin = true
    )
  );

-- Fix tool_assignments update policies
DROP POLICY IF EXISTS "Users can request returns for own assignments" ON tool_assignments;
DROP POLICY IF EXISTS "Admins can update all tool_assignments" ON tool_assignments;

-- Regular users can request returns for their assigned tools
CREATE POLICY "Users can request returns for own assignments"
  ON tool_assignments FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = assigned_to AND
    returned_at IS NULL
  )
  WITH CHECK (
    auth.uid() = assigned_to AND
    returned_at IS NULL
  );

-- Admins can update all tool_assignments
CREATE POLICY "Admins can update all tool_assignments"
  ON tool_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (auth.jwt()->>'email')
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (auth.jwt()->>'email')
      AND is_admin = true
    )
  );
