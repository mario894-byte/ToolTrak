/*
  # Create Tool Requests Table

  ## Description
  This migration creates a table for users to request tools. Users can request either:
  - New tools that don't exist in the system yet
  - Existing tools from specific locations (when tools are checked out or unavailable)

  ## New Tables
  
  ### `tool_requests`
  - `id` (uuid, primary key) - Unique identifier for the request
  - `user_id` (uuid, not null) - User who made the request (references auth.users)
  - `request_type` (text, not null) - Either 'new' or 'existing'
  - `tool_id` (uuid, nullable) - References tools table if requesting existing tool
  - `tool_name` (text, not null) - Name of the tool being requested
  - `preferred_location` (text, nullable) - Preferred location (e.g., 'Räni', 'Viljandi, Kauba')
  - `notes` (text, nullable) - Additional notes or comments
  - `status` (text, not null) - Status: 'pending', 'approved', 'rejected', 'fulfilled'
  - `created_at` (timestamptz) - When the request was created
  - `updated_at` (timestamptz) - When the request was last updated

  ## Security
  - Enable RLS on tool_requests table
  - Users can view all requests
  - Users can create their own requests
  - Users can update their own requests (e.g., cancel pending requests)
  - Users can delete their own pending requests
*/

-- Create tool_requests table
CREATE TABLE IF NOT EXISTS tool_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('new', 'existing')),
  tool_id uuid REFERENCES tools(id) ON DELETE SET NULL,
  tool_name text NOT NULL,
  preferred_location text,
  notes text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'fulfilled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tool_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for tool_requests

-- All authenticated users can view all requests
CREATE POLICY "Authenticated users can view all tool requests"
  ON tool_requests FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Users can create their own requests
CREATE POLICY "Authenticated users can create tool requests"
  ON tool_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own requests
CREATE POLICY "Users can update their own tool requests"
  ON tool_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own pending requests
CREATE POLICY "Users can delete their own pending tool requests"
  ON tool_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tool_requests_user_id ON tool_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tool_requests_status ON tool_requests(status);
CREATE INDEX IF NOT EXISTS idx_tool_requests_tool_id ON tool_requests(tool_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tool_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_tool_requests_updated_at_trigger ON tool_requests;
CREATE TRIGGER update_tool_requests_updated_at_trigger
  BEFORE UPDATE ON tool_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_tool_requests_updated_at();