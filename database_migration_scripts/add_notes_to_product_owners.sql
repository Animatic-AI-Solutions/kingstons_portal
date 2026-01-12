-- Migration: Add notes column to product_owners table
-- Date: 2026-01-12
-- Description: Adds a notes text field to product_owners for storing general notes about the product owner

-- Add notes column
ALTER TABLE product_owners
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN product_owners.notes IS 'General notes about the product owner';
