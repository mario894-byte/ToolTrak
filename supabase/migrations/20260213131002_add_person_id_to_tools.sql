/*
  # Add Person ID to Tools Table
  
  ## Summary
  Allows tools to be assigned directly to a person (user) as their current location.
  A tool can now be at a physical location OR with a person.
  
  ## Changes
  - Add person_id column to tools table referencing people
  - Add constraint that tool can be at location OR with person, not both
  - Add index for person_id
  
  ## Notes
  - When person_id is set, the tool is currently with that person
  - When location_id is set, the tool is at that location
  - Both cannot be set at the same time
*/

ALTER TABLE tools 
ADD COLUMN IF NOT EXISTS person_id uuid REFERENCES people(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tools_person_id ON tools(person_id);
