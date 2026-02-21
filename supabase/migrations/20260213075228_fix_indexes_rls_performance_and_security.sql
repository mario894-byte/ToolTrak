/*
  # Fix indexes, RLS performance, duplicate policies, and function security

  1. New Indexes
    - `idx_tool_assignments_tool_id` on `tool_assignments(tool_id)` - covers foreign key
    - `idx_tool_assignments_person_id` on `tool_assignments(person_id)` - covers foreign key
    - `idx_tool_assignments_location_id` on `tool_assignments(location_id)` - covers foreign key

  2. Removed Duplicate Policies
    - Dropped `Allow public read access to tools` (duplicate of authenticated SELECT policy)
    - Dropped `Allow public read access to locations` (duplicate of authenticated SELECT policy)
    - Dropped `Allow public read access to people` (duplicate of authenticated SELECT policy)
    - Dropped `Allow public read access to tool_assignments` (duplicate of authenticated SELECT policy)

  3. RLS Performance Fix
    - All policies on `tools`, `locations`, `people`, `tool_assignments`, `tool_requests`, `allowed_emails`
      updated to use `(select auth.uid())` instead of `auth.uid()` to avoid per-row re-evaluation

  4. Function Security
    - Recreated `update_tool_requests_updated_at` with immutable `search_path` set to `public`

  5. Dropped Unused Indexes
    - `idx_tool_requests_user_id` (unused)
    - `idx_tool_requests_status` (unused)
    - `idx_tool_requests_tool_id` (unused)
*/

-- =============================================================
-- 1. Add missing foreign key indexes on tool_assignments
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_tool_assignments_tool_id
  ON public.tool_assignments (tool_id);

CREATE INDEX IF NOT EXISTS idx_tool_assignments_person_id
  ON public.tool_assignments (person_id);

CREATE INDEX IF NOT EXISTS idx_tool_assignments_location_id
  ON public.tool_assignments (location_id);

-- =============================================================
-- 2. Drop duplicate public SELECT policies
-- =============================================================
DROP POLICY IF EXISTS "Allow public read access to tools" ON public.tools;
DROP POLICY IF EXISTS "Allow public read access to locations" ON public.locations;
DROP POLICY IF EXISTS "Allow public read access to people" ON public.people;
DROP POLICY IF EXISTS "Allow public read access to tool_assignments" ON public.tool_assignments;

-- =============================================================
-- 3. Recreate all RLS policies with (select auth.uid()) pattern
-- =============================================================

-- --- tools ---
DROP POLICY IF EXISTS "Authenticated users can view tools" ON public.tools;
CREATE POLICY "Authenticated users can view tools"
  ON public.tools FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert tools" ON public.tools;
CREATE POLICY "Authenticated users can insert tools"
  ON public.tools FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update tools" ON public.tools;
CREATE POLICY "Authenticated users can update tools"
  ON public.tools FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete tools" ON public.tools;
CREATE POLICY "Authenticated users can delete tools"
  ON public.tools FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- --- locations ---
DROP POLICY IF EXISTS "Authenticated users can view locations" ON public.locations;
CREATE POLICY "Authenticated users can view locations"
  ON public.locations FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert locations" ON public.locations;
CREATE POLICY "Authenticated users can insert locations"
  ON public.locations FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update locations" ON public.locations;
CREATE POLICY "Authenticated users can update locations"
  ON public.locations FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete locations" ON public.locations;
CREATE POLICY "Authenticated users can delete locations"
  ON public.locations FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- --- people ---
DROP POLICY IF EXISTS "Authenticated users can view people" ON public.people;
CREATE POLICY "Authenticated users can view people"
  ON public.people FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert people" ON public.people;
CREATE POLICY "Authenticated users can insert people"
  ON public.people FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update people" ON public.people;
CREATE POLICY "Authenticated users can update people"
  ON public.people FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete people" ON public.people;
CREATE POLICY "Authenticated users can delete people"
  ON public.people FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- --- tool_assignments ---
DROP POLICY IF EXISTS "Authenticated users can view tool_assignments" ON public.tool_assignments;
CREATE POLICY "Authenticated users can view tool_assignments"
  ON public.tool_assignments FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can insert tool_assignments" ON public.tool_assignments;
CREATE POLICY "Authenticated users can insert tool_assignments"
  ON public.tool_assignments FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can update tool_assignments" ON public.tool_assignments;
CREATE POLICY "Authenticated users can update tool_assignments"
  ON public.tool_assignments FOR UPDATE TO authenticated
  USING ((select auth.uid()) IS NOT NULL)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can delete tool_assignments" ON public.tool_assignments;
CREATE POLICY "Authenticated users can delete tool_assignments"
  ON public.tool_assignments FOR DELETE TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- --- tool_requests ---
DROP POLICY IF EXISTS "Authenticated users can view all tool requests" ON public.tool_requests;
CREATE POLICY "Authenticated users can view all tool requests"
  ON public.tool_requests FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can create tool requests" ON public.tool_requests;
CREATE POLICY "Authenticated users can create tool requests"
  ON public.tool_requests FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own tool requests" ON public.tool_requests;
CREATE POLICY "Users can update their own tool requests"
  ON public.tool_requests FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own pending tool requests" ON public.tool_requests;
CREATE POLICY "Users can delete their own pending tool requests"
  ON public.tool_requests FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id AND status = 'pending');

-- --- allowed_emails ---
DROP POLICY IF EXISTS "Authenticated users can view allowed emails" ON public.allowed_emails;
CREATE POLICY "Authenticated users can view allowed emails"
  ON public.allowed_emails FOR SELECT TO authenticated
  USING ((select auth.uid()) IS NOT NULL);

-- =============================================================
-- 4. Fix mutable search_path on function
-- =============================================================
CREATE OR REPLACE FUNCTION public.update_tool_requests_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================
-- 5. Drop unused indexes on tool_requests
-- =============================================================
DROP INDEX IF EXISTS public.idx_tool_requests_user_id;
DROP INDEX IF EXISTS public.idx_tool_requests_status;
DROP INDEX IF EXISTS public.idx_tool_requests_tool_id;
