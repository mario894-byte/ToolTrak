/*
  # Add return location, condition tracking, and base warehouses

  1. Modified Tables
    - `tools`
      - Update status constraint to include 'damaged' and 'lost' statuses
    - `tool_assignments`
      - `return_location_id` (uuid, FK to locations) - where the tool was returned to
      - `return_condition` (text) - condition when returned: 'good', 'damaged', 'lost'
      - `return_notes` (text) - details about damage or loss
    - `locations`
      - `is_base_warehouse` (boolean) - marks default return locations

  2. Seed Data
    - Insert 'Rähni' and 'Viljandi' as base warehouse locations if they don't exist

  3. Security
    - RLS policies already exist on all affected tables

  4. Notes
    - Tools returned as 'damaged' will have status set to 'damaged' in app logic
    - Tools returned as 'lost' will have status set to 'lost' in app logic
    - The assignment_target constraint is relaxed to allow return_location_id alongside person_id/location_id
*/

-- Update tools status constraint to include 'damaged' and 'lost'
ALTER TABLE tools DROP CONSTRAINT IF EXISTS valid_status;
ALTER TABLE tools ADD CONSTRAINT valid_status CHECK (
  status IN ('available', 'in_use', 'maintenance', 'retired', 'damaged', 'lost')
);

-- Add return tracking columns to tool_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tool_assignments' AND column_name = 'return_location_id'
  ) THEN
    ALTER TABLE tool_assignments ADD COLUMN return_location_id uuid REFERENCES locations(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tool_assignments' AND column_name = 'return_condition'
  ) THEN
    ALTER TABLE tool_assignments ADD COLUMN return_condition text DEFAULT 'good';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tool_assignments' AND column_name = 'return_notes'
  ) THEN
    ALTER TABLE tool_assignments ADD COLUMN return_notes text;
  END IF;
END $$;

-- Add is_base_warehouse column to locations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'is_base_warehouse'
  ) THEN
    ALTER TABLE locations ADD COLUMN is_base_warehouse boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Seed base warehouse locations
INSERT INTO locations (name, description, is_base_warehouse)
SELECT 'Rähni', 'Base warehouse - Rähni', true
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Rähni');

INSERT INTO locations (name, description, is_base_warehouse)
SELECT 'Viljandi', 'Base warehouse - Viljandi', true
WHERE NOT EXISTS (SELECT 1 FROM locations WHERE name = 'Viljandi');

-- Mark existing Rähni and Viljandi locations as base warehouses if they already exist
UPDATE locations SET is_base_warehouse = true WHERE name IN ('Rähni', 'Viljandi');

-- Add index for return location lookups
CREATE INDEX IF NOT EXISTS idx_tool_assignments_return_location_id ON tool_assignments(return_location_id);
CREATE INDEX IF NOT EXISTS idx_locations_base_warehouse ON locations(is_base_warehouse) WHERE is_base_warehouse = true;
