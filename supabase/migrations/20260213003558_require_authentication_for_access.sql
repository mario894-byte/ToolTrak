/*
  # Require Authentication for All Access

  ## Changes Made
  
  1. **Remove Anonymous Access Policies**
     - Drop all policies that allow anonymous (unauthenticated) access
     - These policies were temporary until authentication was implemented

  2. **Create Authenticated-Only Policies**
     - Add policies that ONLY allow authenticated users to access data
     - All tables now require a valid user session to read, insert, update, or delete
     - This properly secures the application data

  3. **Security Model**
     - Users must be signed in to access any data
     - All authenticated users can manage all inventory data
     - Future enhancement: Add user-specific or role-based access control

  ## Tables Affected
  - tools
  - locations
  - people
  - tool_assignments
*/

-- Drop all anonymous access policies
DROP POLICY IF EXISTS "Anonymous users can view tools" ON tools;
DROP POLICY IF EXISTS "Anonymous users can insert tools" ON tools;
DROP POLICY IF EXISTS "Anonymous users can update tools" ON tools;
DROP POLICY IF EXISTS "Anonymous users can delete tools" ON tools;

DROP POLICY IF EXISTS "Anonymous users can view locations" ON locations;
DROP POLICY IF EXISTS "Anonymous users can insert locations" ON locations;
DROP POLICY IF EXISTS "Anonymous users can update locations" ON locations;
DROP POLICY IF EXISTS "Anonymous users can delete locations" ON locations;

DROP POLICY IF EXISTS "Anonymous users can view people" ON people;
DROP POLICY IF EXISTS "Anonymous users can insert people" ON people;
DROP POLICY IF EXISTS "Anonymous users can update people" ON people;
DROP POLICY IF EXISTS "Anonymous users can delete people" ON people;

DROP POLICY IF EXISTS "Anonymous users can view tool_assignments" ON tool_assignments;
DROP POLICY IF EXISTS "Anonymous users can insert tool_assignments" ON tool_assignments;
DROP POLICY IF EXISTS "Anonymous users can update tool_assignments" ON tool_assignments;
DROP POLICY IF EXISTS "Anonymous users can delete tool_assignments" ON tool_assignments;

-- Create authenticated-only policies for tools table
CREATE POLICY "Authenticated users can view tools"
  ON tools FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert tools"
  ON tools FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tools"
  ON tools FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tools"
  ON tools FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Create authenticated-only policies for locations table
CREATE POLICY "Authenticated users can view locations"
  ON locations FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert locations"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update locations"
  ON locations FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete locations"
  ON locations FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Create authenticated-only policies for people table
CREATE POLICY "Authenticated users can view people"
  ON people FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert people"
  ON people FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update people"
  ON people FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete people"
  ON people FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Create authenticated-only policies for tool_assignments table
CREATE POLICY "Authenticated users can view tool_assignments"
  ON tool_assignments FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert tool_assignments"
  ON tool_assignments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tool_assignments"
  ON tool_assignments FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete tool_assignments"
  ON tool_assignments FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);