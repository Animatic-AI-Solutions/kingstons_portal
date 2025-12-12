-- Rollback: Remove assigned_meetings and meeting_history tables
-- Description: Drops tables for tracking expected client meetings and recording actual meeting history
-- Date: 2024-12-01
-- Author: Claude Code

-- WARNING: This rollback will permanently delete all data in these tables!
-- Make sure you have a backup before proceeding.

-- Drop indexes for meeting_history
DROP INDEX IF EXISTS idx_meeting_history_status;
DROP INDEX IF EXISTS idx_meeting_history_year;
DROP INDEX IF EXISTS idx_meeting_history_date_actually_held;
DROP INDEX IF EXISTS idx_meeting_history_date_booked_for;
DROP INDEX IF EXISTS idx_meeting_history_assigned_meeting_id;

-- Drop indexes for assigned_meetings
DROP INDEX IF EXISTS idx_assigned_meetings_status;
DROP INDEX IF EXISTS idx_assigned_meetings_expected_month;
DROP INDEX IF EXISTS idx_assigned_meetings_meeting_type;
DROP INDEX IF EXISTS idx_assigned_meetings_client_group_id;

-- Drop tables (meeting_history first due to foreign key dependency)
DROP TABLE IF EXISTS meeting_history;
DROP TABLE IF EXISTS assigned_meetings;

-- Rollback completed successfully
