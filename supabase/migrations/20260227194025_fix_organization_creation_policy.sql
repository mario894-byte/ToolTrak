/*
  # Fix Organization Creation Policy

  1. Changes
    - Replace the overly permissive organization creation policy
    - Restrict organization creation to first-time users (no existing organization)
    - This prevents users from creating multiple organizations or joining existing ones improperly

  2. Security Impact
    - Prevents authenticated users from creating unlimited organizations
    - Ensures each user can only create one organization during signup
    - Maintains proper multi-tenancy boundaries

  3. Policy Updated
    - Organizations INSERT policy now checks user doesn't already have an organization
*/

DROP POLICY IF EXISTS "Users can create organizations during signup" ON organizations;

CREATE POLICY "Users can create organizations during signup"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can only create an organization if they don't already have one
    NOT EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = (select auth.uid()) 
      AND users.organization_id IS NOT NULL
    )
  );