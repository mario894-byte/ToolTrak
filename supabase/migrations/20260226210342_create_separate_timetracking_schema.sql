/*
  # Create Separate Time Tracking Schema
  
  ## Overview
  Creates a completely separate schema for the time tracking app to avoid conflicts
  with the tool inventory app. Both apps can now coexist using the same authentication
  but different database tables.
  
  ## New Tables (with tt_ prefix for "time tracking")
  
  ### 1. `tt_sites`
  - Work sites with geofencing capabilities
  - Tracks location, radius, and activity status
  
  ### 2. `tt_time_entries`
  - Clock in/out records with GPS coordinates
  - Automatic total hours calculation
  
  ### 3. `tt_location_logs`
  - Continuous GPS tracking during active time entries
  - Stores latitude, longitude, and accuracy
  
  ### 4. `tt_user_sites`
  - Junction table for user-site assignments
  - Controls which employees can access which sites
  
  ## Security
  - Enable RLS on all tables
  - Admin users (from existing users table) can manage everything in their organization
  - Employees can only view/edit their own data
  - Location data is protected
  
  ## Important Notes
  - Uses existing `users` and `organizations` tables from tool inventory
  - All time tracking tables prefixed with `tt_` to avoid conflicts
  - Fully compatible with existing authentication system
*/

-- Create time tracking sites table
CREATE TABLE IF NOT EXISTS tt_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text NOT NULL,
  latitude numeric(10, 8) NOT NULL,
  longitude numeric(11, 8) NOT NULL,
  geofence_radius integer NOT NULL DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create time tracking entries table
CREATE TABLE IF NOT EXISTS tt_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES tt_sites(id) ON DELETE CASCADE,
  clock_in_time timestamptz NOT NULL DEFAULT now(),
  clock_in_latitude numeric(10, 8) NOT NULL,
  clock_in_longitude numeric(11, 8) NOT NULL,
  clock_in_address text,
  clock_out_time timestamptz,
  clock_out_latitude numeric(10, 8),
  clock_out_longitude numeric(11, 8),
  clock_out_address text,
  total_hours numeric(5, 2),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create location logs table for GPS tracking
CREATE TABLE IF NOT EXISTS tt_location_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid NOT NULL REFERENCES tt_time_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude numeric(10, 8) NOT NULL,
  longitude numeric(11, 8) NOT NULL,
  accuracy numeric(6, 2),
  logged_at timestamptz DEFAULT now()
);

-- Create user-sites junction table
CREATE TABLE IF NOT EXISTS tt_user_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES tt_sites(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, site_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tt_sites_organization ON tt_sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_tt_time_entries_user ON tt_time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_tt_time_entries_site ON tt_time_entries(site_id);
CREATE INDEX IF NOT EXISTS idx_tt_time_entries_clock_in ON tt_time_entries(clock_in_time);
CREATE INDEX IF NOT EXISTS idx_tt_location_logs_time_entry ON tt_location_logs(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_tt_location_logs_user ON tt_location_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tt_user_sites_user ON tt_user_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_tt_user_sites_site ON tt_user_sites(site_id);

-- Enable Row Level Security
ALTER TABLE tt_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_location_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tt_user_sites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tt_sites
CREATE POLICY "Users can view sites in their organization"
  ON tt_sites FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert sites"
  ON tt_sites FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update sites"
  ON tt_sites FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete sites"
  ON tt_sites FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for tt_time_entries
CREATE POLICY "Users can view their own time entries"
  ON tt_time_entries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all time entries in their organization"
  ON tt_time_entries FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Users can insert their own time entries"
  ON tt_time_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own time entries"
  ON tt_time_entries FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update time entries in their organization"
  ON tt_time_entries FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- RLS Policies for tt_location_logs
CREATE POLICY "Users can view their own location logs"
  ON tt_location_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all location logs in their organization"
  ON tt_location_logs FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Users can insert their own location logs"
  ON tt_location_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for tt_user_sites
CREATE POLICY "Users can view their site assignments"
  ON tt_user_sites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all site assignments in their organization"
  ON tt_user_sites FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Admins can manage site assignments"
  ON tt_user_sites FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Admins can delete site assignments"
  ON tt_user_sites FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Create function to calculate total hours
CREATE OR REPLACE FUNCTION tt_calculate_total_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out_time IS NOT NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out_time - NEW.clock_in_time)) / 3600.0;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for calculating total hours
DROP TRIGGER IF EXISTS trigger_tt_calculate_total_hours ON tt_time_entries;
CREATE TRIGGER trigger_tt_calculate_total_hours
  BEFORE INSERT OR UPDATE ON tt_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION tt_calculate_total_hours();

-- Create trigger for updated_at on sites
DROP TRIGGER IF EXISTS trigger_tt_sites_updated_at ON tt_sites;
CREATE TRIGGER trigger_tt_sites_updated_at
  BEFORE UPDATE ON tt_sites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();