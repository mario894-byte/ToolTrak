/*
  # Add admin role to allowed_emails

  1. Modified Tables
    - `allowed_emails`
      - Added `is_admin` (boolean, default false) - whether the user has admin privileges

  2. Seed Data
    - mario894@gmail.com is set as admin

  3. Notes
    - Admins can approve/reject tool requests and manage all data
    - Non-admin users can only view and create requests
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'allowed_emails' AND column_name = 'is_admin'
  ) THEN
    ALTER TABLE allowed_emails ADD COLUMN is_admin boolean DEFAULT false;
  END IF;
END $$;

UPDATE allowed_emails SET is_admin = true WHERE email = 'mario894@gmail.com';
