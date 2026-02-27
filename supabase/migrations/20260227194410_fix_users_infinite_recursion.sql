/*
  # Fix Infinite Recursion in Users Policies

  1. Changes
    - Create helper functions that bypass RLS to get user information
    - Update policies to use these helper functions instead of recursive queries
    - This prevents infinite recursion when policies query the same table

  2. Security Impact
    - Maintains the same access control logic
    - Eliminates infinite recursion errors
    - Improves performance by caching user context

  3. Functions Created
    - get_user_organization_id() - Returns the current user's organization ID
    - get_user_role() - Returns the current user's role
    - is_admin() - Returns true if current user is an admin
*/

-- Helper function to get current user's organization (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS uuid
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  org_id uuid;
BEGIN
  SELECT organization_id INTO org_id
  FROM users
  WHERE id = auth.uid();
  
  RETURN org_id;
END;
$$;

-- Helper function to get current user's role (bypasses RLS)
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = auth.uid();
  
  RETURN user_role;
END;
$$;

-- Helper function to check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE id = auth.uid()) = 'admin';
END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can create their own profile" ON users;
DROP POLICY IF EXISTS "Admins can insert users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can update users in their organization" ON users;
DROP POLICY IF EXISTS "Admins can delete users in their organization" ON users;

-- Recreate policies using helper functions
CREATE POLICY "Users can view profiles in their organization"
  ON users FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR organization_id = get_user_organization_id()
  );

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can create their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can insert users in their organization"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin()
    AND organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can update users in their organization"
  ON users FOR UPDATE
  TO authenticated
  USING (
    is_admin()
    AND organization_id = get_user_organization_id()
  )
  WITH CHECK (
    is_admin()
    AND organization_id = get_user_organization_id()
  );

CREATE POLICY "Admins can delete users in their organization"
  ON users FOR DELETE
  TO authenticated
  USING (
    is_admin()
    AND organization_id = get_user_organization_id()
  );