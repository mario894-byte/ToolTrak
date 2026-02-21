/*
  # Restrict Signup to People List

  ## Summary
  Only allows sign-up for users whose email exists in the people table

  ## Changes
  - Drop the open signup policy
  - Add new policy to check if email exists in people table before allowing registration
  
  ## Security
  - Users can only register if their email is in the people table
  - Users cannot set is_admin to true during signup
  - Admins retain full control over role management
*/

-- Drop the open signup policy
DROP POLICY IF EXISTS "Users can register themselves" ON allowed_emails;

-- Allow registration only for emails that exist in the people table
CREATE POLICY "Users in people list can register"
  ON allowed_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND is_admin = false
    AND EXISTS (
      SELECT 1 FROM people 
      WHERE people.email = allowed_emails.email
    )
  );