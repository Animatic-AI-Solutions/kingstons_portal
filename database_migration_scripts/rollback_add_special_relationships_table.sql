-- Rollback Migration: Remove special_relationships and junction table
-- Description: Removes the special_relationships table and product_owner_special_relationships junction table
-- Date: 2024-12-01
-- Author: Claude Code
-- WARNING: This will permanently delete all special relationship data!

-- Drop indexes first
DROP INDEX IF EXISTS idx_special_relationships_type;
DROP INDEX IF EXISTS idx_special_relationships_name;
DROP INDEX IF EXISTS idx_special_relationships_address_id;
DROP INDEX IF EXISTS idx_special_relationships_status;
DROP INDEX IF EXISTS idx_product_owner_special_relationships_product_owner_id;
DROP INDEX IF EXISTS idx_product_owner_special_relationships_special_relationship_id;

-- Drop junction table (must be dropped before special_relationships due to foreign key)
DROP TABLE IF EXISTS product_owner_special_relationships;

-- Drop special_relationships table
DROP TABLE IF EXISTS special_relationships;

-- Rollback completed successfully
