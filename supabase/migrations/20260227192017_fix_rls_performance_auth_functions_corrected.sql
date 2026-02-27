/*
  # Fix RLS Performance Issues with Auth Functions

  1. Changes
    - Replace all `auth.uid()` calls with `(select auth.uid())` in RLS policies
    - Replace all `auth.jwt()` calls with `(select auth.jwt())` in RLS policies
    - This prevents re-evaluation of auth functions for each row, significantly improving performance at scale

  2. Security
    - Maintains all existing security restrictions
    - No changes to access control logic, only performance optimization
    
  3. Tables Updated
    - users (4 policies)
    - organizations (3 policies)
    - sites (4 policies)
    - time_entries (5 policies)
    - location_logs (3 policies)
    - user_sites (4 policies)
    - tt_sites (4 policies)
    - tt_time_entries (5 policies)
    - tt_location_logs (3 policies)
    - tt_user_sites (4 policies)
*/

-- Drop and recreate users table policies
DROP POLICY IF EXISTS "Users can create their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their organization" ON users;

CREATE POLICY "Users can create their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Admins can delete users in their organization"
  ON users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = (select auth.uid())
      AND admin_user.organization_id = users.organization_id
      AND admin_user.role = 'admin'
    )
  );

-- Drop and recreate organizations table policies
DROP POLICY IF EXISTS "Users can create organizations during signup" ON organizations;
DROP POLICY IF EXISTS "Users can view their organization" ON organizations;
DROP POLICY IF EXISTS "Admins can update their organization" ON organizations;

CREATE POLICY "Users can create organizations during signup"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM users WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM users 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM users 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- Drop and recreate sites table policies
DROP POLICY IF EXISTS "Users can view sites in their organization" ON sites;
DROP POLICY IF EXISTS "Admins can insert sites" ON sites;
DROP POLICY IF EXISTS "Admins can update sites" ON sites;
DROP POLICY IF EXISTS "Admins can delete sites" ON sites;

CREATE POLICY "Users can view sites in their organization"
  ON sites FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can insert sites"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update sites"
  ON sites FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete sites"
  ON sites FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- Drop and recreate time_entries table policies
DROP POLICY IF EXISTS "Users can view their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can view all time entries in their organization" ON time_entries;
DROP POLICY IF EXISTS "Users can insert their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON time_entries;
DROP POLICY IF EXISTS "Admins can update time entries in their organization" ON time_entries;

CREATE POLICY "Users can view their own time entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can view all time entries in their organization"
  ON time_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = (select auth.uid())
      AND u1.role = 'admin'
      AND u2.id = time_entries.user_id
    )
  );

CREATE POLICY "Users can insert their own time entries"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Admins can update time entries in their organization"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = (select auth.uid())
      AND u1.role = 'admin'
      AND u2.id = time_entries.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = (select auth.uid())
      AND u1.role = 'admin'
      AND u2.id = time_entries.user_id
    )
  );

-- Drop and recreate location_logs table policies
DROP POLICY IF EXISTS "Users can view their own location logs" ON location_logs;
DROP POLICY IF EXISTS "Admins can view all location logs in their organization" ON location_logs;
DROP POLICY IF EXISTS "Users can insert their own location logs" ON location_logs;

CREATE POLICY "Users can view their own location logs"
  ON location_logs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can view all location logs in their organization"
  ON location_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = (select auth.uid())
      AND u1.role = 'admin'
      AND u2.id = location_logs.user_id
    )
  );

CREATE POLICY "Users can insert their own location logs"
  ON location_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Drop and recreate user_sites table policies
DROP POLICY IF EXISTS "Users can view their site assignments" ON user_sites;
DROP POLICY IF EXISTS "Admins can view all site assignments in their organization" ON user_sites;
DROP POLICY IF EXISTS "Admins can manage site assignments" ON user_sites;
DROP POLICY IF EXISTS "Admins can delete site assignments" ON user_sites;

CREATE POLICY "Users can view their site assignments"
  ON user_sites FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can view all site assignments in their organization"
  ON user_sites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = (select auth.uid())
      AND u1.role = 'admin'
      AND u2.id = user_sites.user_id
    )
  );

CREATE POLICY "Admins can manage site assignments"
  ON user_sites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = (select auth.uid())
      AND u1.role = 'admin'
      AND u2.id = user_sites.user_id
    )
  );

CREATE POLICY "Admins can delete site assignments"
  ON user_sites FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = (select auth.uid())
      AND u1.role = 'admin'
      AND u2.id = user_sites.user_id
    )
  );

-- Drop and recreate tt_sites table policies
DROP POLICY IF EXISTS "Users can view sites in their organization" ON tt_sites;
DROP POLICY IF EXISTS "Admins can insert sites" ON tt_sites;
DROP POLICY IF EXISTS "Admins can update sites" ON tt_sites;
DROP POLICY IF EXISTS "Admins can delete sites" ON tt_sites;

CREATE POLICY "Users can view sites in their organization"
  ON tt_sites FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can insert sites"
  ON tt_sites FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update sites"
  ON tt_sites FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete sites"
  ON tt_sites FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

-- Drop and recreate tt_time_entries table policies
DROP POLICY IF EXISTS "Users can view their own time entries" ON tt_time_entries;
DROP POLICY IF EXISTS "Admins can view all time entries in their organization" ON tt_time_entries;
DROP POLICY IF EXISTS "Users can insert their own time entries" ON tt_time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON tt_time_entries;
DROP POLICY IF EXISTS "Admins can update time entries in their organization" ON tt_time_entries;

CREATE POLICY "Users can view their own time entries"
  ON tt_time_entries FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can view all time entries in their organization"
  ON tt_time_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = (select auth.uid())
      AND u1.role = 'admin'
      AND u2.id = tt_time_entries.user_id
    )
  );

CREATE POLICY "Users can insert their own time entries"
  ON tt_time_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own time entries"
  ON tt_time_entries FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Admins can update time entries in their organization"
  ON tt_time_entries FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = (select auth.uid())
      AND u1.role = 'admin'
      AND u2.id = tt_time_entries.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = (select auth.uid())
      AND u1.role = 'admin'
      AND u2.id = tt_time_entries.user_id
    )
  );

-- Drop and recreate tt_location_logs table policies
DROP POLICY IF EXISTS "Users can view their own location logs" ON tt_location_logs;
DROP POLICY IF EXISTS "Admins can view all location logs in their organization" ON tt_location_logs;
DROP POLICY IF EXISTS "Users can insert their own location logs" ON tt_location_logs;

CREATE POLICY "Users can view their own location logs"
  ON tt_location_logs FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can view all location logs in their organization"
  ON tt_location_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = (select auth.uid())
      AND u1.role = 'admin'
      AND u2.id = tt_location_logs.user_id
    )
  );

CREATE POLICY "Users can insert their own location logs"
  ON tt_location_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Drop and recreate tt_user_sites table policies
DROP POLICY IF EXISTS "Users can view their site assignments" ON tt_user_sites;
DROP POLICY IF EXISTS "Admins can view all site assignments in their organization" ON tt_user_sites;
DROP POLICY IF EXISTS "Admins can manage site assignments" ON tt_user_sites;
DROP POLICY IF EXISTS "Admins can delete site assignments" ON tt_user_sites;

CREATE POLICY "Users can view their site assignments"
  ON tt_user_sites FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can view all site assignments in their organization"
  ON tt_user_sites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = (select auth.uid())
      AND u1.role = 'admin'
      AND u2.id = tt_user_sites.user_id
    )
  );

CREATE POLICY "Admins can manage site assignments"
  ON tt_user_sites FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = (select auth.uid())
      AND u1.role = 'admin'
      AND u2.id = tt_user_sites.user_id
    )
  );

CREATE POLICY "Admins can delete site assignments"
  ON tt_user_sites FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = (select auth.uid())
      AND u1.role = 'admin'
      AND u2.id = tt_user_sites.user_id
    )
  );