-- Rollback Migration: Remove new fields from client_groups table
-- Description: Removes the compliance and tracking fields added to client_groups
-- Date: 2024-12-01
-- Author: Claude Code
-- WARNING: This will permanently delete data in these columns!

-- Drop indexes first
DROP INDEX IF EXISTS idx_client_groups_ongoing_start;
DROP INDEX IF EXISTS idx_client_groups_client_declaration;
DROP INDEX IF EXISTS idx_client_groups_privacy_declaration;
DROP INDEX IF EXISTS idx_client_groups_full_fee_agreement;
DROP INDEX IF EXISTS idx_client_groups_last_satisfactory_discussion;

-- Remove fields from client_groups table
ALTER TABLE client_groups
  DROP COLUMN IF EXISTS ongoing_start,
  DROP COLUMN IF EXISTS client_declaration,
  DROP COLUMN IF EXISTS privacy_declaration,
  DROP COLUMN IF EXISTS full_fee_agreement,
  DROP COLUMN IF EXISTS last_satisfactory_discussion,
  DROP COLUMN IF EXISTS notes;

-- Rollback completed successfully
