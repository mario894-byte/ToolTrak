/*
  # Create Tool Event Log Table

  1. New Tables
    - `tool_event_log`
      - `id` (uuid, primary key) - Unique identifier for each event
      - `tool_id` (uuid, foreign key) - Reference to the tool
      - `event_type` (text) - Type of event: 'assigned', 'returned', 'moved', 'status_changed', 'created', 'updated'
      - `from_location_id` (uuid, nullable) - Location the tool moved from
      - `to_location_id` (uuid, nullable) - Location the tool moved to
      - `from_person_id` (uuid, nullable) - Person the tool was assigned from
      - `to_person_id` (uuid, nullable) - Person the tool was assigned to
      - `old_status` (text, nullable) - Previous status of the tool
      - `new_status` (text, nullable) - New status of the tool
      - `notes` (text, nullable) - Additional notes about the event
      - `user_id` (uuid, nullable) - User who triggered the event
      - `created_at` (timestamptz) - When the event occurred

  2. Security
    - Enable RLS on `tool_event_log` table
    - Add policy for authenticated users to read all event logs
    - Add policy for authenticated users to insert event logs

  3. Indexes
    - Add index on tool_id for faster lookups
    - Add index on created_at for date-based queries
    - Add index on event_type for filtering
*/

CREATE TABLE IF NOT EXISTS tool_event_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id uuid REFERENCES tools(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  from_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  to_location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  from_person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  to_person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  old_status text,
  new_status text,
  notes text,
  user_id uuid,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE tool_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all event logs"
  ON tool_event_log
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert event logs"
  ON tool_event_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_tool_event_log_tool_id ON tool_event_log(tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_event_log_created_at ON tool_event_log(created_at);
CREATE INDEX IF NOT EXISTS idx_tool_event_log_event_type ON tool_event_log(event_type);