/*
  # Add user_id to people table

  1. Changes
    - Add `user_id` column to `people` table to link people to their auth accounts
    - Create unique index on user_id for fast lookups
    - Add foreign key constraint (optional, commented out as auth.users may not be accessible)

  2. Purpose
    - Allows tracking which people have registered accounts
    - Enables querying registered users without admin API access
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'people' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE people ADD COLUMN user_id uuid UNIQUE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_people_user_id ON people(user_id) WHERE user_id IS NOT NULL;