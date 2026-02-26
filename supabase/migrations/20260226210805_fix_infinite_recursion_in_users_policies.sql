/*
  # Fix Infinite Recursion in Users Table RLS Policies
  
  ## Problem
  The existing RLS policies on the `users` table cause infinite recursion because they
  query the same `users` table within the policy evaluation, creating a circular dependency.
  
  ## Solution
  1. Drop all existing policies on the `users` table
  2. Create a security definer function that bypasses RLS to get user's organization and role
  3. Recreate policies using the new function to avoid recursion
  
  ## Security Notes
  - The helper function is SECURITY DEFINER but only returns the current user's data
  - This prevents infinite recursion while maintaining security
  - Users can still only access their own profile and users in their organization
*/

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can view users in their organization" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can insert users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their organization" ON users;

-- Create a security definer function to get user info without triggering RLS
CREATE OR REPLACE FUNCTION get_my_user_info()
RETURNS TABLE (
  user_id uuid,
  organization_id uuid,
  role text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id, organization_id, role
  FROM users
  WHERE id = auth.uid();
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_my_user_info() TO authenticated;

-- Recreate policies using the helper function

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can view users in their organization
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT get_my_user_info.organization_id FROM get_my_user_info()
    )
  );

-- Users can update their own profile (but not their role or organization)
CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    organization_id = (SELECT get_my_user_info.organization_id FROM get_my_user_info() LIMIT 1) AND
    role = (SELECT get_my_user_info.role FROM get_my_user_info() LIMIT 1)
  );

-- Admins can insert users in their organization
CREATE POLICY "Admins can insert users in their organization"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT get_my_user_info.organization_id 
      FROM get_my_user_info()
      WHERE get_my_user_info.role = 'admin'
    )
  );

-- Admins can update users in their organization
CREATE POLICY "Admins can update users in their organization"
  ON users FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT get_my_user_info.organization_id 
      FROM get_my_user_info()
      WHERE get_my_user_info.role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT get_my_user_info.organization_id 
      FROM get_my_user_info()
      WHERE get_my_user_info.role = 'admin'
    )
  );

-- Admins can delete users in their organization (but not themselves)
CREATE POLICY "Admins can delete users in their organization"
  ON users FOR DELETE
  TO authenticated
  USING (
    id != auth.uid() AND
    organization_id IN (
      SELECT get_my_user_info.organization_id 
      FROM get_my_user_info()
      WHERE get_my_user_info.role = 'admin'
    )
  );