/*
  # Fix tool_requests RLS policies for admin access

  1. Changes
    - Drop existing update policy that only allows users to update their own requests
    - Create new policies:
      - Users can update their own pending requests (notes, preferred_location)
      - Admins can update any tool request's status (approve, reject, fulfill)

  2. Security
    - Admins are identified by checking allowed_emails table
    - Users can only modify their own pending requests
    - Admins can change status of any request
*/

DROP POLICY IF EXISTS "Users can update their own tool requests" ON tool_requests;

CREATE POLICY "Users can update their own pending tool requests"
  ON tool_requests
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
  );

CREATE POLICY "Admins can update any tool request"
  ON tool_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND is_admin = true
    )
  );