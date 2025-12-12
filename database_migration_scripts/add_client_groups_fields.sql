-- Migration: Add new fields to client_groups table
-- Description: Adds compliance and tracking fields to client_groups for ongoing management
-- Date: 2024-12-01
-- Author: Claude Code

-- Add new fields to client_groups table
ALTER TABLE client_groups
  ADD COLUMN ongoing_start DATE,
  ADD COLUMN client_declaration DATE,
  ADD COLUMN privacy_declaration DATE,
  ADD COLUMN full_fee_agreement DATE,
  ADD COLUMN last_satisfactory_discussion DATE,
  ADD COLUMN notes TEXT;

-- Create indexes for date-based queries
CREATE INDEX IF NOT EXISTS idx_client_groups_ongoing_start ON client_groups(ongoing_start);
CREATE INDEX IF NOT EXISTS idx_client_groups_client_declaration ON client_groups(client_declaration);
CREATE INDEX IF NOT EXISTS idx_client_groups_privacy_declaration ON client_groups(privacy_declaration);
CREATE INDEX IF NOT EXISTS idx_client_groups_full_fee_agreement ON client_groups(full_fee_agreement);
CREATE INDEX IF NOT EXISTS idx_client_groups_last_satisfactory_discussion ON client_groups(last_satisfactory_discussion);

-- Migration completed successfully
