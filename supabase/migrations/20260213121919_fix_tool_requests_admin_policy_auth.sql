/*
  # Fix tool_requests admin update policy

  1. Changes
    - Drop existing admin update policy that incorrectly queries auth.users
    - Create new policy using auth.jwt() to get email from JWT token

  2. Security
    - Admin check uses JWT email claim instead of querying auth.users table
    - This avoids permission issues with the protected auth schema
*/

DROP POLICY IF EXISTS "Admins can update any tool request" ON tool_requests;

CREATE POLICY "Admins can update any tool request"
  ON tool_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = auth.jwt() ->> 'email'
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = auth.jwt() ->> 'email'
      AND is_admin = true
    )
  );