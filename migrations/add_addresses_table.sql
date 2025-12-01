-- Migration: Add addresses table and link to product_owners
-- Description: Creates addresses table for product owner addresses with foreign key relationship
-- Date: 2024-12-01
-- Author: Claude Code

-- Create addresses table
CREATE TABLE IF NOT EXISTS addresses (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    line_1 TEXT,
    line_2 TEXT,
    line_3 TEXT,
    line_4 TEXT,
    line_5 TEXT
);

-- Add foreign key column to product_owners table
ALTER TABLE product_owners
  ADD COLUMN address_id BIGINT;

-- Add foreign key constraint
ALTER TABLE product_owners
  ADD CONSTRAINT fk_product_owners_address
  FOREIGN KEY (address_id)
  REFERENCES addresses(id)
  ON DELETE SET NULL;

-- Create index on foreign key for better join performance
CREATE INDEX IF NOT EXISTS idx_product_owners_address_id ON product_owners(address_id);

-- Migration completed successfully
