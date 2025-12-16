-- Migration Script: Recreate special_relationships table with correct schema for API
-- This script recreates the table to match the expected API schema from test_special_relationships_routes.py
--
-- IMPORTANT: This will drop existing data. Run in test/dev environment first!

BEGIN;

-- Step 1: Backup existing data (if needed)
DO $$
BEGIN
    -- Create backup table if original has data
    IF EXISTS (SELECT 1 FROM special_relationships LIMIT 1) THEN
        CREATE TABLE IF NOT EXISTS special_relationships_backup_old AS
        SELECT * FROM special_relationships;
        RAISE NOTICE 'Backed up % rows to special_relationships_backup_old',
            (SELECT COUNT(*) FROM special_relationships);
    ELSE
        RAISE NOTICE 'No data to backup';
    END IF;
END $$;

-- Step 2: Drop junction table first (due to foreign key)
DROP TABLE IF EXISTS product_owner_special_relationships CASCADE;

-- Step 3: Drop the old table
DROP TABLE IF EXISTS special_relationships CASCADE;

-- Step 4: Create new table with correct schema matching API requirements
CREATE TABLE special_relationships (
    -- Primary key (using UUID for consistency with frontend)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign key to client_groups
    client_group_id BIGINT NOT NULL,

    -- Required fields
    first_name VARCHAR(200) NOT NULL,
    last_name VARCHAR(200) NOT NULL,
    relationship_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',

    -- Optional personal information
    title VARCHAR(20),
    date_of_birth DATE,
    email VARCHAR(255),
    mobile_phone VARCHAR(50),
    home_phone VARCHAR(50),
    work_phone VARCHAR(50),

    -- Optional address fields
    address_line1 VARCHAR(200),
    address_line2 VARCHAR(200),
    city VARCHAR(100),
    county VARCHAR(100),
    postcode VARCHAR(20),
    country VARCHAR(100),

    -- Optional professional fields
    company_name VARCHAR(200),
    position VARCHAR(100),
    professional_id VARCHAR(100),

    -- Optional notes
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Foreign key constraint
    CONSTRAINT fk_special_relationships_client_group
        FOREIGN KEY (client_group_id)
        REFERENCES client_groups(id)
        ON DELETE CASCADE,

    -- Check constraints
    CONSTRAINT check_status_valid
        CHECK (status IN ('Active', 'Inactive', 'Deceased')),

    CONSTRAINT check_first_name_not_empty
        CHECK (LENGTH(TRIM(first_name)) > 0),

    CONSTRAINT check_last_name_not_empty
        CHECK (LENGTH(TRIM(last_name)) > 0),

    CONSTRAINT check_relationship_type_not_empty
        CHECK (LENGTH(TRIM(relationship_type)) > 0)
);

-- Step 5: Create indexes for performance
CREATE INDEX idx_special_relationships_client_group_id
    ON special_relationships(client_group_id);

CREATE INDEX idx_special_relationships_deleted_at
    ON special_relationships(deleted_at)
    WHERE deleted_at IS NULL;  -- Partial index for active records

CREATE INDEX idx_special_relationships_status
    ON special_relationships(status);

CREATE INDEX idx_special_relationships_relationship_type
    ON special_relationships(relationship_type);

-- Step 6: Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_special_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_special_relationships_updated_at
    BEFORE UPDATE ON special_relationships
    FOR EACH ROW
    EXECUTE FUNCTION update_special_relationships_updated_at();

-- Step 7: Add comments for documentation
COMMENT ON TABLE special_relationships IS 'Stores personal and professional relationships for client groups';
COMMENT ON COLUMN special_relationships.client_group_id IS 'Foreign key to client_groups table';
COMMENT ON COLUMN special_relationships.relationship_type IS 'Type of relationship (Spouse, Child, Accountant, etc.)';
COMMENT ON COLUMN special_relationships.status IS 'Status: Active, Inactive, or Deceased';
COMMENT ON COLUMN special_relationships.deleted_at IS 'Soft delete timestamp - NULL means active, NOT NULL means deleted';

-- Step 8: Verification
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'special_relationships';

    RAISE NOTICE 'Table created with % columns', col_count;

    -- Verify required columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'special_relationships'
        AND column_name = 'client_group_id'
    ) THEN
        RAISE EXCEPTION 'Missing required column: client_group_id';
    END IF;

    RAISE NOTICE 'Schema validation passed';
END $$;

COMMIT;

-- Display new schema
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'special_relationships'
ORDER BY ordinal_position;

SELECT 'Migration completed successfully!' AS result;
