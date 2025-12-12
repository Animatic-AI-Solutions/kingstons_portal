-- Rollback: Remove other_products and junction tables
-- Description: Drops tables for tracking protection policies and their ownership
-- Date: 2024-12-01
-- Author: Claude Code

-- WARNING: This rollback will permanently delete all data in these tables!
-- Make sure you have a backup before proceeding.

-- Drop indexes for product_owner_other_products
DROP INDEX IF EXISTS idx_product_owner_other_products_other_product_id;
DROP INDEX IF EXISTS idx_product_owner_other_products_product_owner_id;

-- Drop indexes for other_products
DROP INDEX IF EXISTS idx_other_products_investment_element;
DROP INDEX IF EXISTS idx_other_products_in_trust;
DROP INDEX IF EXISTS idx_other_products_end_date;
DROP INDEX IF EXISTS idx_other_products_start_date;
DROP INDEX IF EXISTS idx_other_products_cover_type;
DROP INDEX IF EXISTS idx_other_products_policy_number;
DROP INDEX IF EXISTS idx_other_products_provider_id;

-- Drop tables (junction table first due to foreign key dependency)
DROP TABLE IF EXISTS product_owner_other_products;
DROP TABLE IF EXISTS other_products;

-- Rollback completed successfully
