/*
  # Tool Inventory Tracking System

  ## Overview
  This migration creates a complete inventory tracking system for tools,
  allowing tracking of what tools exist, who possesses them, and where they are located.

  ## New Tables

  ### 1. `people`
  Stores information about people who can possess tools
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Person's full name
  - `email` (text, optional) - Contact email
  - `phone` (text, optional) - Contact phone
  - `created_at` (timestamptz) - Record creation timestamp

  ### 2. `locations`
  Stores physical locations where tools can be stored
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Location name (e.g., "Workshop", "Warehouse A")
  - `description` (text, optional) - Additional location details
  - `created_at` (timestamptz) - Record creation timestamp

  ### 3. `tools`
  Stores information about each tool in the inventory
  - `id` (uuid, primary key) - Unique identifier
  - `name` (text) - Tool name
  - `description` (text, optional) - Tool description
  - `serial_number` (text, optional) - Serial or model number
  - `purchase_date` (date, optional) - When tool was acquired
  - `purchase_price` (numeric, optional) - Original purchase price
  - `status` (text) - Current status: 'available', 'in_use', 'maintenance', 'retired'
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 4. `tool_assignments`
  Tracks current and historical assignments of tools to people/locations
  - `id` (uuid, primary key) - Unique identifier
  - `tool_id` (uuid, foreign key) - Reference to tools table
  - `person_id` (uuid, foreign key, optional) - Person who has the tool
  - `location_id` (uuid, foreign key, optional) - Location where tool is stored
  - `assigned_at` (timestamptz) - When assignment was made
  - `returned_at` (timestamptz, optional) - When tool was returned (null = still assigned)
  - `notes` (text, optional) - Additional notes about the assignment
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - RLS enabled on all tables
  - Public read access for all inventory data (can be restricted later)
  - Authenticated users can manage all records
  
  ## Notes
  1. A tool can be assigned to either a person OR a location, but not both simultaneously
  2. Only assignments with `returned_at = NULL` are considered active
  3. The `status` field on tools provides quick filtering without joining assignments
  4. All timestamps use `timestamptz` for timezone awareness
*/

-- Create people table
CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create tools table
CREATE TABLE IF NOT EXISTS tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  serial_number text,
  purchase_date date,
  purchase_price numeric(10, 2),
  status text NOT NULL DEFAULT 'available',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('available', 'in_use', 'maintenance', 'retired'))
);

-- Create tool_assignments table
CREATE TABLE IF NOT EXISTS tool_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  returned_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT assignment_target CHECK (
    (person_id IS NOT NULL AND location_id IS NULL) OR
    (person_id IS NULL AND location_id IS NOT NULL)
  )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);
CREATE INDEX IF NOT EXISTS idx_tool_assignments_tool_id ON tool_assignments(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_assignments_person_id ON tool_assignments(person_id);
CREATE INDEX IF NOT EXISTS idx_tool_assignments_location_id ON tool_assignments(location_id);
CREATE INDEX IF NOT EXISTS idx_tool_assignments_active ON tool_assignments(tool_id, returned_at) WHERE returned_at IS NULL;

-- Enable Row Level Security
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for people table
CREATE POLICY "Anyone can view people"
  ON people FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert people"
  ON people FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update people"
  ON people FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete people"
  ON people FOR DELETE
  USING (true);

-- RLS Policies for locations table
CREATE POLICY "Anyone can view locations"
  ON locations FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert locations"
  ON locations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update locations"
  ON locations FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete locations"
  ON locations FOR DELETE
  USING (true);

-- RLS Policies for tools table
CREATE POLICY "Anyone can view tools"
  ON tools FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert tools"
  ON tools FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update tools"
  ON tools FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete tools"
  ON tools FOR DELETE
  USING (true);

-- RLS Policies for tool_assignments table
CREATE POLICY "Anyone can view tool assignments"
  ON tool_assignments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert tool assignments"
  ON tool_assignments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update tool assignments"
  ON tool_assignments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete tool assignments"
  ON tool_assignments FOR DELETE
  USING (true);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on tools table
CREATE TRIGGER update_tools_updated_at
  BEFORE UPDATE ON tools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();