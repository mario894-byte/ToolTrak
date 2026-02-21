/*
  # Add Destination Location to Tool Requests
  
  ## Summary
  Adds a proper location reference for tool requests. When approved, 
  tools will be moved to this location.
  
  ## Changes
  - Add destination_location_id column referencing locations table
  - Remove old preferred_location text column
  - Add index for destination_location_id
  
  ## Notes
  - Users will only be able to select locations they're assigned to
  - On approval/fulfillment, the tool's location will be updated to destination_location_id
*/

ALTER TABLE tool_requests 
ADD COLUMN IF NOT EXISTS destination_location_id uuid REFERENCES locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tool_requests_destination_location ON tool_requests(destination_location_id);
