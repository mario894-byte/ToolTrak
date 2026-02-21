/*
  # Fix Security and Performance Issues

  ## Overview
  This migration addresses security vulnerabilities and performance issues identified by the Supabase security scanner.

  ## Changes

  ### 1. Performance: Add Indexes for Foreign Keys
  Adds covering indexes for all foreign key columns in tool_assignments table to improve query performance:
  - Index on `tool_id` (foreign key to tools table)
  - Index on `person_id` (foreign key to people table)  
  - Index on `location_id` (foreign key to locations table)
  These indexes significantly improve JOIN performance and foreign key constraint checking.

  ### 2. Security: Fix Function Search Path
  Updates the `update_updated_at_column` function to have a secure, immutable search_path.
  - Sets explicit search_path to prevent search path manipulation attacks
  - Changes from IMMUTABLE to STABLE (correct volatility since it uses now())

  ### 3. Security: Enable Row Level Security (RLS)
  Enables RLS on all public tables as a security best practice:
  - Enables RLS on `people` table
  - Enables RLS on `locations` table
  - Enables RLS on `tools` table
  - Enables RLS on `tool_assignments` table
  
  Creates permissive policies that allow public access for this single-user inventory system.
  These policies can be restricted later when authentication is added.

  ## Notes
  - The Auth DB Connection Strategy issue must be addressed in Supabase dashboard settings
  - RLS policies use `true` for this single-user app but should be updated when auth is added
  - Foreign key indexes are critical for query performance when filtering by relationships
*/

-- ============================================================================
-- 1. ADD PERFORMANCE INDEXES FOR FOREIGN KEYS
-- ============================================================================

-- Index for tool_id foreign key (used in queries filtering by tool)
CREATE INDEX IF NOT EXISTS idx_tool_assignments_tool_id 
  ON tool_assignments(tool_id);

-- Index for person_id foreign key (used in queries filtering by person)
CREATE INDEX IF NOT EXISTS idx_tool_assignments_person_id 
  ON tool_assignments(person_id);

-- Index for location_id foreign key (used in queries filtering by location)
CREATE INDEX IF NOT EXISTS idx_tool_assignments_location_id 
  ON tool_assignments(location_id);

-- Additional composite index for active assignments (commonly queried pattern)
CREATE INDEX IF NOT EXISTS idx_tool_assignments_active 
  ON tool_assignments(returned_at, tool_id) 
  WHERE returned_at IS NULL;

-- ============================================================================
-- 2. FIX FUNCTION SEARCH PATH SECURITY ISSUE
-- ============================================================================

-- Drop existing function and recreate with proper settings
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create function with secure search_path and correct volatility
CREATE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate trigger for tools table
CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. ENABLE ROW LEVEL SECURITY ON ALL PUBLIC TABLES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. CREATE RLS POLICIES FOR PUBLIC ACCESS
-- ============================================================================
-- Note: These policies allow unrestricted access for single-user apps.
-- Update these policies when authentication is implemented.

-- Policies for people table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'people' AND policyname = 'Allow public read access to people'
  ) THEN
    CREATE POLICY "Allow public read access to people"
      ON people FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'people' AND policyname = 'Allow public insert to people'
  ) THEN
    CREATE POLICY "Allow public insert to people"
      ON people FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'people' AND policyname = 'Allow public update to people'
  ) THEN
    CREATE POLICY "Allow public update to people"
      ON people FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'people' AND policyname = 'Allow public delete from people'
  ) THEN
    CREATE POLICY "Allow public delete from people"
      ON people FOR DELETE
      USING (true);
  END IF;
END $$;

-- Policies for locations table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'locations' AND policyname = 'Allow public read access to locations'
  ) THEN
    CREATE POLICY "Allow public read access to locations"
      ON locations FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'locations' AND policyname = 'Allow public insert to locations'
  ) THEN
    CREATE POLICY "Allow public insert to locations"
      ON locations FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'locations' AND policyname = 'Allow public update to locations'
  ) THEN
    CREATE POLICY "Allow public update to locations"
      ON locations FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'locations' AND policyname = 'Allow public delete from locations'
  ) THEN
    CREATE POLICY "Allow public delete from locations"
      ON locations FOR DELETE
      USING (true);
  END IF;
END $$;

-- Policies for tools table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tools' AND policyname = 'Allow public read access to tools'
  ) THEN
    CREATE POLICY "Allow public read access to tools"
      ON tools FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tools' AND policyname = 'Allow public insert to tools'
  ) THEN
    CREATE POLICY "Allow public insert to tools"
      ON tools FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tools' AND policyname = 'Allow public update to tools'
  ) THEN
    CREATE POLICY "Allow public update to tools"
      ON tools FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tools' AND policyname = 'Allow public delete from tools'
  ) THEN
    CREATE POLICY "Allow public delete from tools"
      ON tools FOR DELETE
      USING (true);
  END IF;
END $$;

-- Policies for tool_assignments table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tool_assignments' AND policyname = 'Allow public read access to tool_assignments'
  ) THEN
    CREATE POLICY "Allow public read access to tool_assignments"
      ON tool_assignments FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tool_assignments' AND policyname = 'Allow public insert to tool_assignments'
  ) THEN
    CREATE POLICY "Allow public insert to tool_assignments"
      ON tool_assignments FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tool_assignments' AND policyname = 'Allow public update to tool_assignments'
  ) THEN
    CREATE POLICY "Allow public update to tool_assignments"
      ON tool_assignments FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tool_assignments' AND policyname = 'Allow public delete from tool_assignments'
  ) THEN
    CREATE POLICY "Allow public delete from tool_assignments"
      ON tool_assignments FOR DELETE
      USING (true);
  END IF;
END $$;