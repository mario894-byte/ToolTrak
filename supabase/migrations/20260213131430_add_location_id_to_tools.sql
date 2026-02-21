/*
  # Add Location ID to Tools Table
  
  ## Summary
  Adds location_id column to tools table to directly track where a tool is stored.
  
  ## Changes
  - Add location_id column referencing locations table
  - Add index for location_id
*/

ALTER TABLE tools 
ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tools_location_id ON tools(location_id);
