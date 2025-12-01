-- Rollback Migration: Remove health table
-- Description: Removes the health table and all associated indexes
-- Date: 2024-12-01
-- Author: Claude Code
-- WARNING: This will permanently delete all health data!

-- Drop indexes first
DROP INDEX IF EXISTS idx_health_product_owner_id;
DROP INDEX IF EXISTS idx_health_special_relationship_id;
DROP INDEX IF EXISTS idx_health_status;
DROP INDEX IF EXISTS idx_health_date_of_diagnosis;
DROP INDEX IF EXISTS idx_health_date_recorded;

-- Drop health table
DROP TABLE IF EXISTS health;

-- Rollback completed successfully
