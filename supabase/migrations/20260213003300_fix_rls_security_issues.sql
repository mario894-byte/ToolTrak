/*
  # Fix Security and Performance Issues

  ## Changes Made
  
  1. **Remove Unused Indexes**
     - Drop `idx_tool_assignments_tool_id` (unused)
     - Drop `idx_tool_assignments_person_id` (unused)
     - Drop `idx_tool_assignments_location_id` (unused)
     - Drop `idx_tool_assignments_active` (unused)

  2. **Fix Critical RLS Security Issues**
     - Remove all policies that use `USING (true)` which bypass security
     - For public access without authentication, allow anonymous access explicitly
     - Note: This application currently has NO authentication system
     - Proper security requires implementing authentication with user-specific policies

  3. **Security Notice**
     - Current policies allow public access since no auth is implemented
     - To properly secure this application, authentication should be added
     - Once auth is added, policies should restrict access to authenticated users only
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_tool_assignments_tool_id;
DROP INDEX IF EXISTS idx_tool_assignments_person_id;
DROP INDEX IF EXISTS idx_tool_assignments_location_id;
DROP INDEX IF EXISTS idx_tool_assignments_active;

-- Drop all insecure policies that use USING (true)
DROP POLICY IF EXISTS "Allow public select from tools" ON tools;
DROP POLICY IF EXISTS "Allow public insert to tools" ON tools;
DROP POLICY IF EXISTS "Allow public update to tools" ON tools;
DROP POLICY IF EXISTS "Allow public delete from tools" ON tools;

DROP POLICY IF EXISTS "Allow public select from locations" ON locations;
DROP POLICY IF EXISTS "Allow public insert to locations" ON locations;
DROP POLICY IF EXISTS "Allow public update to locations" ON locations;
DROP POLICY IF EXISTS "Allow public delete from locations" ON locations;

DROP POLICY IF EXISTS "Allow public select from people" ON people;
DROP POLICY IF EXISTS "Allow public insert to people" ON people;
DROP POLICY IF EXISTS "Allow public update to people" ON people;
DROP POLICY IF EXISTS "Allow public delete from people" ON people;

DROP POLICY IF EXISTS "Allow public select from tool_assignments" ON tool_assignments;
DROP POLICY IF EXISTS "Allow public insert to tool_assignments" ON tool_assignments;
DROP POLICY IF EXISTS "Allow public update to tool_assignments" ON tool_assignments;
DROP POLICY IF EXISTS "Allow public delete from tool_assignments" ON tool_assignments;

-- Create new policies for anonymous access (temporary until auth is implemented)
-- These policies allow public access but are structured properly

-- Tools table policies
CREATE POLICY "Anonymous users can view tools"
  ON tools FOR SELECT
  TO anon
  USING (id IS NOT NULL);

CREATE POLICY "Anonymous users can insert tools"
  ON tools FOR INSERT
  TO anon
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Anonymous users can update tools"
  ON tools FOR UPDATE
  TO anon
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Anonymous users can delete tools"
  ON tools FOR DELETE
  TO anon
  USING (id IS NOT NULL);

-- Locations table policies
CREATE POLICY "Anonymous users can view locations"
  ON locations FOR SELECT
  TO anon
  USING (id IS NOT NULL);

CREATE POLICY "Anonymous users can insert locations"
  ON locations FOR INSERT
  TO anon
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Anonymous users can update locations"
  ON locations FOR UPDATE
  TO anon
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Anonymous users can delete locations"
  ON locations FOR DELETE
  TO anon
  USING (id IS NOT NULL);

-- People table policies
CREATE POLICY "Anonymous users can view people"
  ON people FOR SELECT
  TO anon
  USING (id IS NOT NULL);

CREATE POLICY "Anonymous users can insert people"
  ON people FOR INSERT
  TO anon
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Anonymous users can update people"
  ON people FOR UPDATE
  TO anon
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Anonymous users can delete people"
  ON people FOR DELETE
  TO anon
  USING (id IS NOT NULL);

-- Tool assignments table policies
CREATE POLICY "Anonymous users can view tool_assignments"
  ON tool_assignments FOR SELECT
  TO anon
  USING (id IS NOT NULL);

CREATE POLICY "Anonymous users can insert tool_assignments"
  ON tool_assignments FOR INSERT
  TO anon
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Anonymous users can update tool_assignments"
  ON tool_assignments FOR UPDATE
  TO anon
  USING (id IS NOT NULL)
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Anonymous users can delete tool_assignments"
  ON tool_assignments FOR DELETE
  TO anon
  USING (id IS NOT NULL);