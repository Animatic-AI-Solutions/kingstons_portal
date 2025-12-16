-- Migration: Alter special_relationships table to match specification
-- Description: Updates special_relationships table schema to match prompt2.md requirements
-- Date: 2024-12-15
-- Author: Claude Code
--
-- Changes:
-- 1. Add updated_at timestamp
-- 2. Add firm_name column
-- 3. Rename dob to date_of_birth
-- 4. Rename phone to phone_number
-- 5. Drop calculated age column
-- 6. Add trigger for auto-updating updated_at
--
-- NOTE: No soft delete - records are hard deleted
-- NOTE: No client_group_id - linked via product_owner_special_relationships junction table

BEGIN;

-- Step 1: Add new columns
ALTER TABLE special_relationships
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS firm_name TEXT;

-- Step 2: Rename columns for consistency
ALTER TABLE special_relationships
    RENAME COLUMN dob TO date_of_birth;

ALTER TABLE special_relationships
    RENAME COLUMN phone TO phone_number;

-- Step 3: Drop calculated column
ALTER TABLE special_relationships
    DROP COLUMN IF EXISTS age;

-- Step 4: Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_special_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_special_relationships_updated_at ON special_relationships;

CREATE TRIGGER trigger_update_special_relationships_updated_at
    BEFORE UPDATE ON special_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_special_relationships_updated_at();

-- Step 5: Add comment to table
COMMENT ON TABLE special_relationships IS 'Stores personal and professional relationships. Linked to client groups via product_owner_special_relationships junction table.';

-- Step 6: Add column comments for documentation
COMMENT ON COLUMN special_relationships.name IS 'Full name of the person';
COMMENT ON COLUMN special_relationships.type IS 'Type of relationship: Personal or Professional';
COMMENT ON COLUMN special_relationships.date_of_birth IS 'Date of birth';
COMMENT ON COLUMN special_relationships.relationship IS 'Nature of relationship (e.g., Spouse, Accountant, Solicitor)';
COMMENT ON COLUMN special_relationships.dependency IS 'Whether this person is a dependent (for personal relationships)';
COMMENT ON COLUMN special_relationships.email IS 'Email address';
COMMENT ON COLUMN special_relationships.phone_number IS 'Phone number';
COMMENT ON COLUMN special_relationships.status IS 'Status: Active, Inactive, or Deceased';
COMMENT ON COLUMN special_relationships.address_id IS 'Foreign key to addresses table';
COMMENT ON COLUMN special_relationships.notes IS 'Additional notes about the relationship';
COMMENT ON COLUMN special_relationships.firm_name IS 'Name of firm (for professional relationships)';
COMMENT ON COLUMN special_relationships.updated_at IS 'Timestamp of last update (auto-updated by trigger)';

COMMIT;

-- Migration completed successfully
--
-- Final table structure:
-- special_relationships (
--     id                  BIGSERIAL PRIMARY KEY,
--     created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
--     updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     name                TEXT,
--     type                TEXT (Personal/Professional),
--     date_of_birth       DATE,
--     relationship        TEXT (Spouse, Accountant, etc.),
--     dependency          BOOLEAN DEFAULT false,
--     email               TEXT,
--     phone_number        TEXT,
--     status              TEXT DEFAULT 'active',
--     address_id          BIGINT FK → addresses(id),
--     notes               TEXT,
--     firm_name           TEXT
-- )
--
-- Linked to client_groups via:
--   special_relationships → product_owner_special_relationships → product_owners → client_groups
