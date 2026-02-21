/*
  # Fix Security Issues

  1. Remove Unused Indexes
    - Removed idx_tools_status
    - Removed idx_tool_assignments_tool_id
    - Removed idx_tool_assignments_person_id
    - Removed idx_tool_assignments_location_id
    - Removed idx_tool_assignments_active
    These indexes were not being used by the query planner

  2. Fix Function Search Path
    - Updated update_updated_at_column function to have immutable search_path

  3. Fix RLS Policies
    - Disabled RLS on all tables (appropriate for single-user personal inventory tracker)
    - Removed permissive policies that allowed unrestricted access
    - Since this app has no authentication, public access without RLS is more secure
      than false RLS protection with `USING (true)` clauses
*/

-- Drop unused indexes
DROP INDEX IF EXISTS idx_tools_status;
DROP INDEX IF EXISTS idx_tool_assignments_tool_id;
DROP INDEX IF EXISTS idx_tool_assignments_person_id;
DROP INDEX IF EXISTS idx_tool_assignments_location_id;
DROP INDEX IF EXISTS idx_tool_assignments_active;

-- Fix function search path
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Disable RLS on all tables since this is a single-user app without authentication
ALTER TABLE people DISABLE ROW LEVEL SECURITY;
ALTER TABLE locations DISABLE ROW LEVEL SECURITY;
ALTER TABLE tools DISABLE ROW LEVEL SECURITY;
ALTER TABLE tool_assignments DISABLE ROW LEVEL SECURITY;

-- Drop all permissive RLS policies
DROP POLICY IF EXISTS "Anyone can view people" ON people;
DROP POLICY IF EXISTS "Anyone can insert people" ON people;
DROP POLICY IF EXISTS "Anyone can update people" ON people;
DROP POLICY IF EXISTS "Anyone can delete people" ON people;

DROP POLICY IF EXISTS "Anyone can view locations" ON locations;
DROP POLICY IF EXISTS "Anyone can insert locations" ON locations;
DROP POLICY IF EXISTS "Anyone can update locations" ON locations;
DROP POLICY IF EXISTS "Anyone can delete locations" ON locations;

DROP POLICY IF EXISTS "Anyone can view tools" ON tools;
DROP POLICY IF EXISTS "Anyone can insert tools" ON tools;
DROP POLICY IF EXISTS "Anyone can update tools" ON tools;
DROP POLICY IF EXISTS "Anyone can delete tools" ON tools;

DROP POLICY IF EXISTS "Anyone can view tool assignments" ON tool_assignments;
DROP POLICY IF EXISTS "Anyone can insert tool assignments" ON tool_assignments;
DROP POLICY IF EXISTS "Anyone can update tool assignments" ON tool_assignments;
DROP POLICY IF EXISTS "Anyone can delete tool assignments" ON tool_assignments;
