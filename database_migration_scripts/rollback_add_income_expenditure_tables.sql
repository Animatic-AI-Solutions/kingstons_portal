-- Rollback: Remove income and expenditure tables
-- Description: Drops tables for tracking client income sources and expenditure items
-- Date: 2024-12-01
-- Author: Claude Code

-- WARNING: This rollback will permanently delete all data in these tables!
-- Make sure you have a backup before proceeding.

-- Drop indexes for expenditure
DROP INDEX IF EXISTS idx_expenditure_last_updated;
DROP INDEX IF EXISTS idx_expenditure_frequency;
DROP INDEX IF EXISTS idx_expenditure_category;
DROP INDEX IF EXISTS idx_expenditure_client_group_id;

-- Drop indexes for income
DROP INDEX IF EXISTS idx_income_last_updated;
DROP INDEX IF EXISTS idx_income_frequency;
DROP INDEX IF EXISTS idx_income_category;
DROP INDEX IF EXISTS idx_income_product_owner_id;
DROP INDEX IF EXISTS idx_income_client_group_id;

-- Drop tables
DROP TABLE IF EXISTS expenditure;
DROP TABLE IF EXISTS income;

-- Rollback completed successfully
