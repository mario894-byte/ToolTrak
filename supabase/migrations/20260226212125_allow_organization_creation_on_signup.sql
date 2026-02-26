/*
  # Allow Organization Creation During Signup

  1. Changes
    - Adds INSERT policy for organizations table to allow new users to create their organization during signup
    - Adds INSERT policy for users table to allow profile creation after auth signup
    
  2. Security
    - Authenticated users can create an organization (needed during signup flow)
    - Authenticated users can create their own user profile (id must match auth.uid())
    - Maintains existing SELECT and UPDATE policies
*/

-- Allow authenticated users to create organizations (needed for signup)
CREATE POLICY "Users can create organizations during signup"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow users to create their own profile
CREATE POLICY "Users can create their own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());
