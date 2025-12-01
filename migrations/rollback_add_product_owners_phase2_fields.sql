-- Rollback Migration: Remove Phase 2 fields from product_owners table
-- Description: Removes the Phase 2 fields added to product_owners table
-- Date: 2024-12-01
-- Author: Claude Code
-- WARNING: This will permanently delete data in these columns!

-- Drop indexes first
DROP INDEX IF EXISTS idx_product_owners_email_1;
DROP INDEX IF EXISTS idx_product_owners_email_2;
DROP INDEX IF EXISTS idx_product_owners_dob;
DROP INDEX IF EXISTS idx_product_owners_aml_date;
DROP INDEX IF EXISTS idx_product_owners_aml_result;

-- Remove Phase 2 fields from product_owners table
ALTER TABLE product_owners

  -- Personal Information
  DROP COLUMN IF EXISTS gender,
  DROP COLUMN IF EXISTS previous_names,
  DROP COLUMN IF EXISTS dob,
  DROP COLUMN IF EXISTS age,
  DROP COLUMN IF EXISTS place_of_birth,

  -- Contact Information
  DROP COLUMN IF EXISTS email_1,
  DROP COLUMN IF EXISTS email_2,
  DROP COLUMN IF EXISTS phone_1,
  DROP COLUMN IF EXISTS phone_2,

  -- Residential Information
  DROP COLUMN IF EXISTS moved_in_date,

  -- Client Profiling
  DROP COLUMN IF EXISTS three_words,
  DROP COLUMN IF EXISTS share_data_with,

  -- Employment Information
  DROP COLUMN IF EXISTS employment_status,
  DROP COLUMN IF EXISTS occupation,

  -- Identity & Compliance (KYC/AML)
  DROP COLUMN IF EXISTS passport_expiry_date,
  DROP COLUMN IF EXISTS ni_number,
  DROP COLUMN IF EXISTS aml_result,
  DROP COLUMN IF EXISTS aml_date;

-- Rollback completed successfully
