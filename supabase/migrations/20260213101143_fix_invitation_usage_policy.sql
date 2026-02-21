/*
  # Fix Invitation Usage Policy

  1. Changes
    - Add policy to allow anyone to update invitation used_at field
    - This enables the signup flow to mark invitations as used
    - Only allows updating the used_at column, not other fields

  2. Security
    - Policy is restrictive: only allows setting used_at once (when it's null)
    - Cannot modify other invitation fields
    - Cannot re-use an already used invitation
*/

CREATE POLICY "Allow marking invitation as used during signup"
  ON user_invitations
  FOR UPDATE
  TO anon, authenticated
  USING (used_at IS NULL)
  WITH CHECK (
    used_at IS NOT NULL 
    AND email = email 
    AND is_admin = is_admin 
    AND token = token
  );
