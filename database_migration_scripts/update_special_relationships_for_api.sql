-- Migration to update special_relationships table for API compatibility
-- This script modifies the table to match the expected schema from the tests

-- Step 1: Add new columns that are required for the API
ALTER TABLE special_relationships
    ADD COLUMN IF NOT EXISTS client_group_id BIGINT,
    ADD COLUMN IF NOT EXISTS first_name TEXT,
    ADD COLUMN IF NOT EXISTS last_name TEXT,
    ADD COLUMN IF NOT EXISTS relationship_type TEXT,
    ADD COLUMN IF NOT EXISTS title TEXT,
    ADD COLUMN IF NOT EXISTS mobile_phone TEXT,
    ADD COLUMN IF NOT EXISTS home_phone TEXT,
    ADD COLUMN IF NOT EXISTS work_phone TEXT,
    ADD COLUMN IF NOT EXISTS address_line1 TEXT,
    ADD COLUMN IF NOT EXISTS address_line2 TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS county TEXT,
    ADD COLUMN IF NOT EXISTS postcode TEXT,
    ADD COLUMN IF NOT EXISTS country TEXT,
    ADD COLUMN IF NOT EXISTS company_name TEXT,
    ADD COLUMN IF NOT EXISTS position TEXT,
    ADD COLUMN IF NOT EXISTS professional_id TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Rename columns to match new schema
-- dob -> date_of_birth (if data exists, migrate it)
ALTER TABLE special_relationships
    ADD COLUMN IF NOT EXISTS date_of_birth DATE;

UPDATE special_relationships
SET date_of_birth = dob
WHERE dob IS NOT NULL AND date_of_birth IS NULL;

-- Step 3: Add foreign key constraint for client_group_id
ALTER TABLE special_relationships
    DROP CONSTRAINT IF EXISTS fk_special_relationships_client_group;

ALTER TABLE special_relationships
    ADD CONSTRAINT fk_special_relationships_client_group
    FOREIGN KEY (client_group_id)
    REFERENCES client_groups(id)
    ON DELETE CASCADE;

-- Step 4: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_special_relationships_client_group_id ON special_relationships(client_group_id);
CREATE INDEX IF NOT EXISTS idx_special_relationships_deleted_at ON special_relationships(deleted_at);
CREATE INDEX IF NOT EXISTS idx_special_relationships_relationship_type ON special_relationships(relationship_type);

-- Step 5: Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_special_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_special_relationships_updated_at_trigger ON special_relationships;

CREATE TRIGGER update_special_relationships_updated_at_trigger
    BEFORE UPDATE ON special_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_special_relationships_updated_at();

-- Step 6: Set default value for status if not set
UPDATE special_relationships
SET status = 'Active'
WHERE status IS NULL OR status = 'active';

-- Verification
SELECT 'Migration completed successfully!' AS result;
SELECT COUNT(*) as total_relationships FROM special_relationships;
