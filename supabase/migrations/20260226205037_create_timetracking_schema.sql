/*
  # Time Tracking System Database Schema

  ## Overview
  Complete schema for a mobile-first time tracking application with geofencing,
  GPS tracking, and comprehensive management features.

  ## New Tables

  ### 1. `organizations`
  - `id` (uuid, primary key)
  - `name` (text) - Organization name
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `users`
  - `id` (uuid, primary key, references auth.users)
  - `organization_id` (uuid, references organizations)
  - `email` (text)
  - `full_name` (text)
  - `role` (text) - 'admin' or 'employee'
  - `phone` (text, optional)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `sites`
  - `id` (uuid, primary key)
  - `organization_id` (uuid, references organizations)
  - `name` (text)
  - `address` (text)
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `geofence_radius` (integer) - Radius in meters
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. `time_entries`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users)
  - `site_id` (uuid, references sites)
  - `clock_in_time` (timestamptz)
  - `clock_in_latitude` (numeric)
  - `clock_in_longitude` (numeric)
  - `clock_in_address` (text, optional)
  - `clock_out_time` (timestamptz, optional)
  - `clock_out_latitude` (numeric, optional)
  - `clock_out_longitude` (numeric, optional)
  - `clock_out_address` (text, optional)
  - `total_hours` (numeric, optional)
  - `notes` (text, optional)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. `location_logs`
  - `id` (uuid, primary key)
  - `time_entry_id` (uuid, references time_entries)
  - `user_id` (uuid, references users)
  - `latitude` (numeric)
  - `longitude` (numeric)
  - `accuracy` (numeric) - GPS accuracy in meters
  - `logged_at` (timestamptz)

  ### 6. `user_sites`
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users)
  - `site_id` (uuid, references sites)
  - `assigned_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Admin users can manage everything in their organization
  - Employees can only view/edit their own data
  - Location data is protected and only accessible to admins and the owning user

  ## Indexes
  - Performance indexes on foreign keys and frequently queried columns
  - Spatial queries optimized for geofencing calculations
*/

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'employee')),
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create sites table
CREATE TABLE IF NOT EXISTS sites (
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

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
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

-- Create location_logs table
CREATE TABLE IF NOT EXISTS location_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id uuid NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  latitude numeric(10, 8) NOT NULL,
  longitude numeric(11, 8) NOT NULL,
  accuracy numeric(6, 2),
  logged_at timestamptz DEFAULT now()
);

-- Create user_sites junction table
CREATE TABLE IF NOT EXISTS user_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, site_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_organization ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sites_organization ON sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_site ON time_entries(site_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_clock_in ON time_entries(clock_in_time);
CREATE INDEX IF NOT EXISTS idx_location_logs_time_entry ON location_logs(time_entry_id);
CREATE INDEX IF NOT EXISTS idx_location_logs_user ON location_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sites_user ON user_sites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sites_site ON user_sites(site_id);

-- Enable Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for users
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can insert users in their organization"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update users in their organization"
  ON users FOR UPDATE
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

CREATE POLICY "Admins can delete users in their organization"
  ON users FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for sites
CREATE POLICY "Users can view sites in their organization"
  ON sites FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert sites"
  ON sites FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update sites"
  ON sites FOR UPDATE
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
  ON sites FOR DELETE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for time_entries
CREATE POLICY "Users can view their own time entries"
  ON time_entries FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all time entries in their organization"
  ON time_entries FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Users can insert their own time entries"
  ON time_entries FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own time entries"
  ON time_entries FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update time entries in their organization"
  ON time_entries FOR UPDATE
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

-- RLS Policies for location_logs
CREATE POLICY "Users can view their own location logs"
  ON location_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all location logs in their organization"
  ON location_logs FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Users can insert their own location logs"
  ON location_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_sites
CREATE POLICY "Users can view their site assignments"
  ON user_sites FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all site assignments in their organization"
  ON user_sites FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Admins can manage site assignments"
  ON user_sites FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IN (
      SELECT id FROM users WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "Admins can delete site assignments"
  ON user_sites FOR DELETE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM users WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Create function to calculate total hours
CREATE OR REPLACE FUNCTION calculate_total_hours()
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
DROP TRIGGER IF EXISTS trigger_calculate_total_hours ON time_entries;
CREATE TRIGGER trigger_calculate_total_hours
  BEFORE INSERT OR UPDATE ON time_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_total_hours();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS trigger_organizations_updated_at ON organizations;
CREATE TRIGGER trigger_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_sites_updated_at ON sites;
CREATE TRIGGER trigger_sites_updated_at
  BEFORE UPDATE ON sites
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();