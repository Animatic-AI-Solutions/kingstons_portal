-- Rollback Migration: Remove addresses table and foreign key from product_owners
-- Description: Removes the addresses table and address_id foreign key column
-- Date: 2024-12-01
-- Author: Claude Code
-- WARNING: This will permanently delete all address data!

-- Drop foreign key constraint first
ALTER TABLE product_owners
  DROP CONSTRAINT IF EXISTS fk_product_owners_address;

-- Drop index
DROP INDEX IF EXISTS idx_product_owners_address_id;

-- Drop foreign key column from product_owners
ALTER TABLE product_owners
  DROP COLUMN IF EXISTS address_id;

-- Drop addresses table
DROP TABLE IF EXISTS addresses;

-- Rollback completed successfully
