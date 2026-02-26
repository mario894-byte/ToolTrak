/*
  # Clean Up Orphaned Auth Users

  1. Changes
    - Removes auth users that don't have a corresponding profile in the users table
    - This happens when signup fails partway through (auth user created but profile creation failed)
    
  2. Security
    - Only affects orphaned users with no profile data
    - Allows users to retry signup after a failed attempt
*/

-- Delete auth users that don't have a profile in the users table
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users);
