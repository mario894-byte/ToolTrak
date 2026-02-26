/*
  # Fix Organizations Signup Policy

  1. Changes
    - Updates the INSERT policy for organizations to work during signup
    - Uses `auth.uid() IS NOT NULL` to check for any authenticated session
    - Allows newly created auth users to create their organization
    
  2. Security
    - Still requires authentication (auth.uid() must exist)
    - Only allows users to create organizations, not modify existing ones
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can create organizations during signup" ON organizations;

-- Create a new policy that works during signup
CREATE POLICY "Users can create organizations during signup"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
