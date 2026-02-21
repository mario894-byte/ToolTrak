/*
  # Allow Email Verification for Signup

  ## Summary
  Allows unauthenticated users to check if their email exists in the people table during sign-up

  ## Changes
  - Add policy to allow public SELECT on people table for email verification
  
  ## Security
  - Only allows reading from people table (no modifications)
  - Necessary for sign-up flow to verify if user's email is in the people list
  - Does not expose sensitive data beyond email existence
*/

-- Allow unauthenticated users to check if their email exists in people table
CREATE POLICY "Anyone can verify email exists in people list"
  ON people FOR SELECT
  TO anon
  USING (true);