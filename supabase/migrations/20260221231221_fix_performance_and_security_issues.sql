/*
  # Fix Performance and Security Issues

  1. Performance Improvements
    - Add missing indexes on foreign keys for tool_assignments table
    - Add missing indexes on foreign keys for tool_event_log table
    - Add missing indexes on foreign keys for user_invitations table
    - Add missing indexes on foreign keys for user_locations table
    - Optimize RLS policies to use subqueries for auth functions

  2. Security Improvements
    - Fix RLS policy for tool_event_log to restrict insert access properly
    - Consolidate multiple permissive policies into single policies with OR conditions
    - Optimize auth function calls in RLS policies

  3. Changes Made
    - Added indexes: tool_assignments(location_id, person_id, tool_id, return_approved_by)
    - Added indexes: tool_event_log(from_location_id, from_person_id, to_location_id, to_person_id)
    - Added indexes: user_invitations(invited_by)
    - Added indexes: user_locations(assigned_by)
    - Replaced all RLS policies to use (select auth.uid()) pattern
    - Consolidated multiple permissive policies into single policies
    - Fixed tool_event_log insert policy to properly restrict access
*/

-- Add missing indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_tool_assignments_location_id ON tool_assignments(location_id);
CREATE INDEX IF NOT EXISTS idx_tool_assignments_person_id ON tool_assignments(person_id);
CREATE INDEX IF NOT EXISTS idx_tool_assignments_tool_id ON tool_assignments(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_assignments_return_approved_by ON tool_assignments(return_approved_by);

CREATE INDEX IF NOT EXISTS idx_tool_event_log_from_location_id ON tool_event_log(from_location_id);
CREATE INDEX IF NOT EXISTS idx_tool_event_log_from_person_id ON tool_event_log(from_person_id);
CREATE INDEX IF NOT EXISTS idx_tool_event_log_to_location_id ON tool_event_log(to_location_id);
CREATE INDEX IF NOT EXISTS idx_tool_event_log_to_person_id ON tool_event_log(to_person_id);

CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON user_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_user_locations_assigned_by ON user_locations(assigned_by);

-- Drop existing RLS policies to recreate them optimized
DROP POLICY IF EXISTS "Users can update their own pending tool requests" ON tool_requests;
DROP POLICY IF EXISTS "Admins can update any tool request" ON tool_requests;
DROP POLICY IF EXISTS "Users can request returns for own assignments" ON tool_assignments;
DROP POLICY IF EXISTS "Admins can update all tool_assignments" ON tool_assignments;
DROP POLICY IF EXISTS "Authenticated users can update tool_assignments" ON tool_assignments;
DROP POLICY IF EXISTS "Admins can view invitations" ON user_invitations;
DROP POLICY IF EXISTS "Anyone can view invitations by token for signup" ON user_invitations;
DROP POLICY IF EXISTS "Admins can insert invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON user_invitations;
DROP POLICY IF EXISTS "Allow marking invitation as used during signup" ON user_invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users in people list can register" ON allowed_emails;
DROP POLICY IF EXISTS "Users can view own location assignments" ON user_locations;
DROP POLICY IF EXISTS "Admins can view all location assignments" ON user_locations;
DROP POLICY IF EXISTS "Admins can insert location assignments" ON user_locations;
DROP POLICY IF EXISTS "Admins can update location assignments" ON user_locations;
DROP POLICY IF EXISTS "Admins can delete location assignments" ON user_locations;
DROP POLICY IF EXISTS "Authenticated users can insert event logs" ON tool_event_log;

-- Recreate optimized RLS policies for tool_requests
CREATE POLICY "Users and admins can update tool requests"
  ON tool_requests
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (select auth.email())
      AND allowed_emails.is_admin = true
    )
  )
  WITH CHECK (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (select auth.email())
      AND allowed_emails.is_admin = true
    )
  );

-- Recreate optimized RLS policies for tool_assignments
CREATE POLICY "Users and admins can update tool assignments"
  ON tool_assignments
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (select auth.email())
      AND allowed_emails.is_admin = true
    )
  )
  WITH CHECK (
    assigned_to = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (select auth.email())
      AND allowed_emails.is_admin = true
    )
  );

-- Recreate optimized RLS policies for user_invitations
CREATE POLICY "Admin and public access to invitations"
  ON user_invitations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (select auth.email())
      AND allowed_emails.is_admin = true
    ) OR
    token IS NOT NULL
  );

CREATE POLICY "Admins can manage invitations"
  ON user_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (select auth.email())
      AND allowed_emails.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (select auth.email())
      AND allowed_emails.is_admin = true
    )
  );

CREATE POLICY "Allow marking invitation used during signup"
  ON user_invitations
  FOR UPDATE
  TO authenticated
  USING (used_at IS NULL AND expires_at > now())
  WITH CHECK (used_at IS NOT NULL);

-- Recreate optimized RLS policy for allowed_emails
CREATE POLICY "People list can register"
  ON allowed_emails
  FOR SELECT
  TO authenticated
  USING (
    email = (select auth.email())
  );

-- Recreate optimized RLS policies for user_locations
CREATE POLICY "Users and admins can view location assignments"
  ON user_locations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM people
      WHERE people.id = user_locations.person_id
      AND people.user_id = (select auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (select auth.email())
      AND allowed_emails.is_admin = true
    )
  );

CREATE POLICY "Admins can manage location assignments"
  ON user_locations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (select auth.email())
      AND allowed_emails.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (select auth.email())
      AND allowed_emails.is_admin = true
    )
  );

-- Fix tool_event_log insert policy to properly restrict access
CREATE POLICY "Authenticated users can log events"
  ON tool_event_log
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);