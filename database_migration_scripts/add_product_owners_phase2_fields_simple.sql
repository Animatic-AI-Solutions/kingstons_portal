-- Migration: Add Phase 2 fields to product_owners table
-- Description: Adds comprehensive personal and KYC/AML fields to product_owners table for Phase 2 client management
-- Date: 2024-12-01

-- Add Phase 2 fields to product_owners table
ALTER TABLE product_owners
  ADD COLUMN gender TEXT,
  ADD COLUMN previous_names TEXT,
  ADD COLUMN dob DATE,
  ADD COLUMN age INTEGER,
  ADD COLUMN place_of_birth TEXT,
  ADD COLUMN email_1 TEXT,
  ADD COLUMN email_2 TEXT,
  ADD COLUMN phone_1 TEXT,
  ADD COLUMN phone_2 TEXT,
  ADD COLUMN moved_in_date DATE,
  ADD COLUMN three_words TEXT,
  ADD COLUMN share_data_with TEXT,
  ADD COLUMN employment_status TEXT,
  ADD COLUMN occupation TEXT,
  ADD COLUMN passport_expiry_date DATE,
  ADD COLUMN ni_number TEXT,
  ADD COLUMN aml_result TEXT,
  ADD COLUMN aml_date DATE;

-- Create indexes on frequently searched fields for better performance
CREATE INDEX IF NOT EXISTS idx_product_owners_email_1 ON product_owners(email_1);
CREATE INDEX IF NOT EXISTS idx_product_owners_email_2 ON product_owners(email_2);
CREATE INDEX IF NOT EXISTS idx_product_owners_dob ON product_owners(dob);
CREATE INDEX IF NOT EXISTS idx_product_owners_aml_date ON product_owners(aml_date);
CREATE INDEX IF NOT EXISTS idx_product_owners_aml_result ON product_owners(aml_result);
