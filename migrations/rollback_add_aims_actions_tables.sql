-- Rollback: Remove aims and actions tables
-- Description: Drops tables for tracking client goals/aims and actionable tasks
-- Date: 2024-12-01
-- Author: Claude Code

-- WARNING: This rollback will permanently delete all data in these tables!
-- Make sure you have a backup before proceeding.

-- Drop indexes for actions
DROP INDEX IF EXISTS idx_actions_priority;
DROP INDEX IF EXISTS idx_actions_status;
DROP INDEX IF EXISTS idx_actions_due_date;
DROP INDEX IF EXISTS idx_actions_assigned_advisor_id;
DROP INDEX IF EXISTS idx_actions_client_group_id;

-- Drop indexes for aims
DROP INDEX IF EXISTS idx_aims_focus;
DROP INDEX IF EXISTS idx_aims_target_date;
DROP INDEX IF EXISTS idx_aims_status;
DROP INDEX IF EXISTS idx_aims_client_group_id;

-- Drop tables
DROP TABLE IF EXISTS actions;
DROP TABLE IF EXISTS aims;

-- Rollback completed successfully
