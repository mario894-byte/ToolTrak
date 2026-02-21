/*
  # Create User Invitations Table

  1. New Tables
    - user_invitations
      - id (uuid, primary key) - Unique invitation identifier
      - email (text) - Email address to invite
      - is_admin (boolean) - Whether the invited user will be an admin
      - token (text, unique) - Unique invitation token for the link
      - invited_by (uuid) - Admin user who created the invitation
      - expires_at (timestamptz) - Expiration date for the invitation
      - used_at (timestamptz, nullable) - When the invitation was used
      - created_at (timestamptz) - When the invitation was created

  2. Security
    - Enable RLS on user_invitations table
    - Add policy for admins to create, read, and manage invitations
    - Add policy for anyone to view invitations by token (for signup flow)

  3. Indexes
    - Add index on token for quick lookup
    - Add index on email for searching
    - Add index on expires_at for cleanup queries
*/

CREATE TABLE IF NOT EXISTS user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  is_admin boolean DEFAULT false NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);

CREATE POLICY "Admins can manage all invitations"
  ON user_invitations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND allowed_emails.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM allowed_emails
      WHERE allowed_emails.email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND allowed_emails.is_admin = true
    )
  );

CREATE POLICY "Anyone can view invitations by token for signup"
  ON user_invitations
  FOR SELECT
  TO anon, authenticated
  USING (true);
