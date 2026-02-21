/*
  # User Location Assignments and Return Approval System

  ## Summary
  Creates user-location assignments and tool return approval workflow

  ## New Tables
  
  ### `user_locations`
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `location_id` (uuid, foreign key) - References locations table
  - `assigned_by` (uuid, foreign key) - Admin who made the assignment
  - `assigned_at` (timestamptz) - Timestamp of assignment
  
  ## Modified Tables
  
  ### `tool_assignments`
  - Add `return_status` (text) - Status of return: 'active', 'pending_return', 'returned'
  - Add `return_requested_at` (timestamptz) - When return was requested
  - Add `return_approved_by` (uuid) - Admin who approved return
  - Add `return_approved_at` (timestamptz) - When return was approved
  - Add `assigned_to` (uuid) - User ID of who the tool is assigned to
  
  ## Security
  - Enable RLS on user_locations table
  - Policies for authenticated users to read their assignments
  - Policies for admins to manage user-location assignments
  - Update tool_assignments policies to handle return approval workflow
  
  ## Indexes
  - Index on user_locations(user_id) for faster lookups
  - Index on user_locations(location_id) for location-based queries
  - Index on tool_assignments(return_status) for filtering returns
  - Index on tool_assignments(assigned_to) for user lookups
*/

-- Create user_locations table
CREATE TABLE IF NOT EXISTS user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, location_id)
);

-- Add columns to tool_assignments if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tool_assignments' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE tool_assignments ADD COLUMN assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tool_assignments' AND column_name = 'return_status'
  ) THEN
    ALTER TABLE tool_assignments ADD COLUMN return_status text DEFAULT 'active' CHECK (return_status IN ('active', 'pending_return', 'returned'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tool_assignments' AND column_name = 'return_requested_at'
  ) THEN
    ALTER TABLE tool_assignments ADD COLUMN return_requested_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tool_assignments' AND column_name = 'return_approved_by'
  ) THEN
    ALTER TABLE tool_assignments ADD COLUMN return_approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tool_assignments' AND column_name = 'return_approved_at'
  ) THEN
    ALTER TABLE tool_assignments ADD COLUMN return_approved_at timestamptz;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_location_id ON user_locations(location_id);
CREATE INDEX IF NOT EXISTS idx_tool_assignments_return_status ON tool_assignments(return_status);
CREATE INDEX IF NOT EXISTS idx_tool_assignments_assigned_to ON tool_assignments(assigned_to);

-- Enable RLS
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_locations

-- Authenticated users can view their own location assignments
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
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
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
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
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
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND is_admin = true
    )
  );

-- Drop existing restrictive update policy on tool_assignments if it exists
DROP POLICY IF EXISTS "Users can update own tool_assignments" ON tool_assignments;

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

-- Admins can update all tool_assignments including approving returns
CREATE POLICY "Admins can update all tool_assignments"
  ON tool_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND is_admin = true
    )
  );