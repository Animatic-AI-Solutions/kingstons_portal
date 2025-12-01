-- Rollback Migration: Remove risk_assessments and capacity_for_loss tables
-- Description: Removes the risk assessment tables and all associated indexes
-- Date: 2024-12-01
-- Author: Claude Code
-- WARNING: This will permanently delete all risk assessment data!

-- Drop indexes first
DROP INDEX IF EXISTS idx_risk_assessments_product_owner_id;
DROP INDEX IF EXISTS idx_risk_assessments_type;
DROP INDEX IF EXISTS idx_risk_assessments_date;
DROP INDEX IF EXISTS idx_risk_assessments_status;

DROP INDEX IF EXISTS idx_capacity_for_loss_product_owner_id;
DROP INDEX IF EXISTS idx_capacity_for_loss_date_assessed;
DROP INDEX IF EXISTS idx_capacity_for_loss_status;

-- Drop tables
DROP TABLE IF EXISTS capacity_for_loss;
DROP TABLE IF EXISTS risk_assessments;

-- Rollback completed successfully
