-- Rollback: Restore polymorphic vulnerabilities table
-- Description: Drops separate vulnerabilities tables and recreates original polymorphic vulnerabilities table
-- Date: 2024-12-01
-- Author: Claude Code

-- WARNING: This will drop the vulnerabilities_product_owners and vulnerabilities_special_relationships tables and all their data!
-- Make sure you have a backup before proceeding.

-- Drop indexes for vulnerabilities_special_relationships
DROP INDEX IF EXISTS idx_vuln_special_relationships_date_recorded;
DROP INDEX IF EXISTS idx_vuln_special_relationships_diagnosed;
DROP INDEX IF EXISTS idx_vuln_special_relationships_status;
DROP INDEX IF EXISTS idx_vuln_special_relationships_special_rel_id;

-- Drop indexes for vulnerabilities_product_owners
DROP INDEX IF EXISTS idx_vuln_product_owners_date_recorded;
DROP INDEX IF EXISTS idx_vuln_product_owners_diagnosed;
DROP INDEX IF EXISTS idx_vuln_product_owners_status;
DROP INDEX IF EXISTS idx_vuln_product_owners_product_owner_id;

-- Drop tables
DROP TABLE IF EXISTS vulnerabilities_special_relationships;
DROP TABLE IF EXISTS vulnerabilities_product_owners;

-- Recreate original polymorphic vulnerabilities table
CREATE TABLE IF NOT EXISTS vulnerabilities (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    product_owner_id BIGINT,
    special_relationship_id BIGINT,
    description TEXT,
    adjustments TEXT,
    diagnosed BOOLEAN DEFAULT false,
    date_recorded TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT,
    notes TEXT,

    -- Foreign key to product_owners
    CONSTRAINT fk_vulnerabilities_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    -- Foreign key to special_relationships
    CONSTRAINT fk_vulnerabilities_special_relationship
        FOREIGN KEY (special_relationship_id)
        REFERENCES special_relationships(id)
        ON DELETE CASCADE,

    -- Check constraint to ensure exactly one foreign key is populated
    CONSTRAINT chk_vulnerabilities_exactly_one_owner
        CHECK (
            (product_owner_id IS NOT NULL AND special_relationship_id IS NULL) OR
            (product_owner_id IS NULL AND special_relationship_id IS NOT NULL)
        )
);

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_product_owner_id ON vulnerabilities(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_special_relationship_id ON vulnerabilities(special_relationship_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_diagnosed ON vulnerabilities(diagnosed);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_date_recorded ON vulnerabilities(date_recorded);

-- Rollback completed successfully
