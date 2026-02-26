/*
  # Clean Up Orphaned Auth Users

  1. Changes
    - Removes auth users that don't have corresponding entries in the users table
    - This allows users to sign up fresh with the time tracking system

  2. Security
    - Only deletes users without matching profiles
    - Preserves data integrity
*/

DO $$
DECLARE
  orphaned_user RECORD;
BEGIN
  FOR orphaned_user IN 
    SELECT au.id 
    FROM auth.users au
    LEFT JOIN public.users u ON au.id = u.id
    WHERE u.id IS NULL
  LOOP
    DELETE FROM auth.users WHERE id = orphaned_user.id;
  END LOOP;
END $$;
