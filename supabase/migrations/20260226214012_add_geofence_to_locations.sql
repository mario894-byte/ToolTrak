/*
  # Add Geofence Support to Locations

  1. Changes
    - Add `latitude` column (decimal) to locations table
    - Add `longitude` column (decimal) to locations table
    - Add `geofence_radius` column (integer, in meters) to locations table
    - All columns are nullable to support existing locations without geofences

  2. Notes
    - Latitude and longitude store the center point of the location
    - Geofence radius defines the circular boundary around that point
    - Existing locations will have NULL values for these fields
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'latitude'
  ) THEN
    ALTER TABLE locations ADD COLUMN latitude DECIMAL(10, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'longitude'
  ) THEN
    ALTER TABLE locations ADD COLUMN longitude DECIMAL(11, 8);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'locations' AND column_name = 'geofence_radius'
  ) THEN
    ALTER TABLE locations ADD COLUMN geofence_radius INTEGER DEFAULT 100;
  END IF;
END $$;