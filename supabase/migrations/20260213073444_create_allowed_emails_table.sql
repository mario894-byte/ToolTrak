/*
  # Create allowed_emails table for invite-only registration

  1. New Tables
    - `allowed_emails`
      - `id` (uuid, primary key)
      - `email` (text, unique, not null) - the email address allowed to register
      - `created_at` (timestamptz, default now())
  
  2. Seed Data
    - mario894@gmail.com is pre-approved for registration

  3. Security
    - Enable RLS on `allowed_emails` table
    - Anon users can SELECT to check if their email is allowed during signup
    - Authenticated users can SELECT to view allowed emails
    - No INSERT/UPDATE/DELETE policies (managed via migrations/admin only)
*/

CREATE TABLE IF NOT EXISTS allowed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon users can check if email is allowed"
  ON allowed_emails
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can view allowed emails"
  ON allowed_emails
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

INSERT INTO allowed_emails (email)
VALUES ('mario894@gmail.com')
ON CONFLICT (email) DO NOTHING;
