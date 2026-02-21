/*
  # Link Locations to People Instead of Auth Users
  
  ## Summary
  Changes user_locations to reference people table instead of auth.users.
  This unifies "people" and "users" - locations can be assigned to anyone in the people list.
  
  ## Changes
  - Drop existing user_locations table
  - Recreate with person_id referencing people table
  - Update indexes
  - Update RLS policies
  
  ## Security
  - Admins can manage all location assignments
  - Users can view their own assignments (matched via people.user_id)
*/

-- Drop existing table and recreate with new schema
DROP TABLE IF EXISTS user_locations CASCADE;

CREATE TABLE user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id uuid NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(person_id, location_id)
);

CREATE INDEX IF NOT EXISTS idx_user_locations_person_id ON user_locations(person_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_location_id ON user_locations(location_id);

ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own location assignments"
  ON user_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM people
      WHERE people.id = user_locations.person_id
      AND people.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all location assignments"
  ON user_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (auth.jwt()->>'email')
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can insert location assignments"
  ON user_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (auth.jwt()->>'email')
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can update location assignments"
  ON user_locations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (auth.jwt()->>'email')
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (auth.jwt()->>'email')
      AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete location assignments"
  ON user_locations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (auth.jwt()->>'email')
      AND is_admin = true
    )
  );
