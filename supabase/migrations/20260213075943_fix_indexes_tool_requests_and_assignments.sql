/*
  # Fix indexes on tool_requests and tool_assignments

  1. New Indexes
    - `idx_tool_requests_tool_id` on `tool_requests(tool_id)` - covers foreign key
    - `idx_tool_requests_user_id` on `tool_requests(user_id)` - covers foreign key

  2. Dropped Indexes
    - `idx_tool_assignments_tool_id` - unused, removing to reduce write overhead
    - `idx_tool_assignments_person_id` - unused, removing to reduce write overhead
    - `idx_tool_assignments_location_id` - unused, removing to reduce write overhead

  3. Notes
    - The unindexed foreign keys on tool_requests caused suboptimal join/delete performance
    - The unused indexes on tool_assignments add unnecessary write overhead
*/

CREATE INDEX IF NOT EXISTS idx_tool_requests_tool_id ON public.tool_requests (tool_id);
CREATE INDEX IF NOT EXISTS idx_tool_requests_user_id ON public.tool_requests (user_id);

DROP INDEX IF EXISTS idx_tool_assignments_tool_id;
DROP INDEX IF EXISTS idx_tool_assignments_person_id;
DROP INDEX IF EXISTS idx_tool_assignments_location_id;
