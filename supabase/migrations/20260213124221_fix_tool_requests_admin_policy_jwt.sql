/*
  # Fix tool_requests Admin Update Policy
  
  ## Summary
  Fixes the admin update policy for tool_requests to use auth.jwt() instead of auth.users subquery
  
  ## Changes
  - Drop existing admin update policy
  - Recreate using auth.jwt()->>'email'
  
  ## Security
  - Admin checks use JWT email claim
*/

DROP POLICY IF EXISTS "Admins can update any tool request" ON tool_requests;

CREATE POLICY "Admins can update any tool request"
  ON tool_requests
  FOR UPDATE
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
