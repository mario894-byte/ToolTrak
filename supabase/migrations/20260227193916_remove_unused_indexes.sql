/*
  # Remove Unused Indexes

  1. Changes
    - Drop all unused indexes identified by the database analyzer
    - These indexes consume storage and slow down writes without providing query benefits
    - Indexes can be recreated later if usage patterns change

  2. Performance Impact
    - Reduces storage overhead
    - Improves INSERT/UPDATE/DELETE performance
    - No impact on query performance as these indexes are not being used

  3. Indexes Removed
    - Tool event log indexes (event_type, from_person_id, to_person_id)
    - Tool assignments indexes (return_location_id, location_id, person_id, tool_id, return_approved_by, return_status, assigned_to)
    - Locations index (base_warehouse)
    - Tools index (person_id)
    - User invitations indexes (token, email, expires_at, invited_by)
    - People index (user_id)
    - User locations indexes (location_id, assigned_by)
    - Tool requests indexes (tool_id, user_id, destination_location)
    - Sites index (organization)
    - Time entries indexes (user, site, clock_in)
    - Location logs indexes (time_entry, user)
    - User sites indexes (user, site)
    - Time tracking table indexes (tt_time_entries, tt_location_logs, tt_user_sites)
*/

-- Tool event log indexes
DROP INDEX IF EXISTS idx_tool_event_log_event_type;
DROP INDEX IF EXISTS idx_tool_event_log_from_person_id;
DROP INDEX IF EXISTS idx_tool_event_log_to_person_id;

-- Tool assignments indexes
DROP INDEX IF EXISTS idx_tool_assignments_return_location_id;
DROP INDEX IF EXISTS idx_tool_assignments_location_id;
DROP INDEX IF EXISTS idx_tool_assignments_person_id;
DROP INDEX IF EXISTS idx_tool_assignments_tool_id;
DROP INDEX IF EXISTS idx_tool_assignments_return_approved_by;
DROP INDEX IF EXISTS idx_tool_assignments_return_status;
DROP INDEX IF EXISTS idx_tool_assignments_assigned_to;

-- Locations index
DROP INDEX IF EXISTS idx_locations_base_warehouse;

-- Tools index
DROP INDEX IF EXISTS idx_tools_person_id;

-- User invitations indexes
DROP INDEX IF EXISTS idx_user_invitations_token;
DROP INDEX IF EXISTS idx_user_invitations_email;
DROP INDEX IF EXISTS idx_user_invitations_expires_at;
DROP INDEX IF EXISTS idx_user_invitations_invited_by;

-- People index
DROP INDEX IF EXISTS idx_people_user_id;

-- User locations indexes
DROP INDEX IF EXISTS idx_user_locations_location_id;
DROP INDEX IF EXISTS idx_user_locations_assigned_by;

-- Tool requests indexes
DROP INDEX IF EXISTS idx_tool_requests_tool_id;
DROP INDEX IF EXISTS idx_tool_requests_user_id;
DROP INDEX IF EXISTS idx_tool_requests_destination_location;

-- Sites index
DROP INDEX IF EXISTS idx_sites_organization;

-- Time entries indexes
DROP INDEX IF EXISTS idx_time_entries_user;
DROP INDEX IF EXISTS idx_time_entries_site;
DROP INDEX IF EXISTS idx_time_entries_clock_in;

-- Location logs indexes
DROP INDEX IF EXISTS idx_location_logs_time_entry;
DROP INDEX IF EXISTS idx_location_logs_user;

-- User sites indexes
DROP INDEX IF EXISTS idx_user_sites_user;
DROP INDEX IF EXISTS idx_user_sites_site;

-- Time tracking tables indexes
DROP INDEX IF EXISTS idx_tt_time_entries_user;
DROP INDEX IF EXISTS idx_tt_time_entries_site;
DROP INDEX IF EXISTS idx_tt_location_logs_time_entry;
DROP INDEX IF EXISTS idx_tt_location_logs_user;
DROP INDEX IF EXISTS idx_tt_user_sites_user;
DROP INDEX IF EXISTS idx_tt_user_sites_site;