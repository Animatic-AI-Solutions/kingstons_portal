-- Rollback Migration: Remove vulnerabilities table
-- Description: Removes the vulnerabilities table and all associated indexes
-- Date: 2024-12-01
-- Author: Claude Code
-- WARNING: This will permanently delete all vulnerabilities data!

-- Drop indexes first
DROP INDEX IF EXISTS idx_vulnerabilities_product_owner_id;
DROP INDEX IF EXISTS idx_vulnerabilities_special_relationship_id;
DROP INDEX IF EXISTS idx_vulnerabilities_status;
DROP INDEX IF EXISTS idx_vulnerabilities_diagnosed;
DROP INDEX IF EXISTS idx_vulnerabilities_date_recorded;

-- Drop vulnerabilities table
DROP TABLE IF EXISTS vulnerabilities;

-- Rollback completed successfully
