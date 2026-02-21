/*
  # Allow Public Signup

  ## Summary
  Removes invite-only restriction and allows anyone to sign up

  ## Changes
  - Add policy to allow users to insert their own email into allowed_emails during signup
  - Users will be created as regular users (is_admin = false) by default
  
  ## Security
  - Users can only insert their own email (matches auth.uid())
  - Users cannot set is_admin to true during signup
  - Admins can still manage roles through the Users section
*/

-- Allow authenticated users to insert their own email into allowed_emails
CREATE POLICY "Users can register themselves"
  ON allowed_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND is_admin = false
  );