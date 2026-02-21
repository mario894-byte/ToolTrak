/*
  # Fix All RLS Policies Using auth.users Subqueries
  
  ## Summary
  Fixes all remaining RLS policies that incorrectly query auth.users table directly.
  Uses auth.jwt()->>'email' to get user email from JWT token instead.
  
  ## Changes
  - Fix user_invitations admin policy
  - Fix allowed_emails signup policy
  - Fix any other policies using auth.users subqueries
  
  ## Security
  - All policies still require appropriate authentication
  - Admin checks use JWT email claim matched against allowed_emails
*/

-- Fix user_invitations policy
DROP POLICY IF EXISTS "Admins can manage all invitations" ON user_invitations;

CREATE POLICY "Admins can view invitations"
  ON user_invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (auth.jwt()->>'email')
      AND allowed_emails.is_admin = true
    )
  );

CREATE POLICY "Admins can insert invitations"
  ON user_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (auth.jwt()->>'email')
      AND allowed_emails.is_admin = true
    )
  );

CREATE POLICY "Admins can update invitations"
  ON user_invitations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (auth.jwt()->>'email')
      AND allowed_emails.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (auth.jwt()->>'email')
      AND allowed_emails.is_admin = true
    )
  );

CREATE POLICY "Admins can delete invitations"
  ON user_invitations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (auth.jwt()->>'email')
      AND allowed_emails.is_admin = true
    )
  );

-- Fix allowed_emails signup policy
DROP POLICY IF EXISTS "Users in people list can register" ON allowed_emails;

CREATE POLICY "Users in people list can register"
  ON allowed_emails FOR INSERT
  TO authenticated
  WITH CHECK (
    email = (auth.jwt()->>'email')
    AND is_admin = false
    AND EXISTS (
      SELECT 1 FROM people 
      WHERE people.email = allowed_emails.email
    )
  );
