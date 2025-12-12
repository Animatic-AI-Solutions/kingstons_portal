-- Rollback: Restore polymorphic health table
-- Description: Drops separate health tables and recreates original polymorphic health table
-- Date: 2024-12-01
-- Author: Claude Code

-- WARNING: This will drop the health_product_owners and health_special_relationships tables and all their data!
-- Make sure you have a backup before proceeding.

-- Drop indexes for health_special_relationships
DROP INDEX IF EXISTS idx_health_special_relationships_date_recorded;
DROP INDEX IF EXISTS idx_health_special_relationships_date_of_diagnosis;
DROP INDEX IF EXISTS idx_health_special_relationships_status;
DROP INDEX IF EXISTS idx_health_special_relationships_special_relationship_id;

-- Drop indexes for health_product_owners
DROP INDEX IF EXISTS idx_health_product_owners_date_recorded;
DROP INDEX IF EXISTS idx_health_product_owners_date_of_diagnosis;
DROP INDEX IF EXISTS idx_health_product_owners_status;
DROP INDEX IF EXISTS idx_health_product_owners_product_owner_id;

-- Drop tables
DROP TABLE IF EXISTS health_special_relationships;
DROP TABLE IF EXISTS health_product_owners;

-- Recreate original polymorphic health table
CREATE TABLE IF NOT EXISTS health (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    product_owner_id BIGINT,
    special_relationship_id BIGINT,
    condition TEXT,
    name TEXT,
    date_of_diagnosis DATE,
    status TEXT,
    medication TEXT,
    date_recorded TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,

    -- Foreign key to product_owners
    CONSTRAINT fk_health_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    -- Foreign key to special_relationships
    CONSTRAINT fk_health_special_relationship
        FOREIGN KEY (special_relationship_id)
        REFERENCES special_relationships(id)
        ON DELETE CASCADE,

    -- Check constraint to ensure exactly one foreign key is populated
    CONSTRAINT chk_health_exactly_one_owner
        CHECK (
            (product_owner_id IS NOT NULL AND special_relationship_id IS NULL) OR
            (product_owner_id IS NULL AND special_relationship_id IS NOT NULL)
        )
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_health_product_owner_id ON health(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_health_special_relationship_id ON health(special_relationship_id);
CREATE INDEX IF NOT EXISTS idx_health_status ON health(status);
CREATE INDEX IF NOT EXISTS idx_health_date_of_diagnosis ON health(date_of_diagnosis);
CREATE INDEX IF NOT EXISTS idx_health_date_recorded ON health(date_recorded);

-- Rollback completed successfully
