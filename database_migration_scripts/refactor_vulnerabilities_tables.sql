-- Migration: Refactor vulnerabilities table into separate tables
-- Description: Replaces polymorphic vulnerabilities table with vulnerabilities_product_owners and vulnerabilities_special_relationships
-- Date: 2024-12-01
-- Author: Claude Code

-- WARNING: This will drop the existing vulnerabilities table and all its data!
-- Backup data before running if needed.

-- Drop existing vulnerabilities table and its indexes
DROP INDEX IF EXISTS idx_vulnerabilities_date_recorded;
DROP INDEX IF EXISTS idx_vulnerabilities_diagnosed;
DROP INDEX IF EXISTS idx_vulnerabilities_status;
DROP INDEX IF EXISTS idx_vulnerabilities_special_relationship_id;
DROP INDEX IF EXISTS idx_vulnerabilities_product_owner_id;
DROP TABLE IF EXISTS vulnerabilities;

-- Create vulnerabilities_product_owners table
CREATE TABLE IF NOT EXISTS vulnerabilities_product_owners (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    product_owner_id BIGINT NOT NULL,
    description TEXT,
    adjustments TEXT,
    diagnosed BOOLEAN DEFAULT false,
    date_recorded TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT,
    notes TEXT,

    -- Foreign key to product_owners
    CONSTRAINT fk_vulnerabilities_product_owners_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE
);

-- Create vulnerabilities_special_relationships table
CREATE TABLE IF NOT EXISTS vulnerabilities_special_relationships (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    special_relationship_id BIGINT NOT NULL,
    description TEXT,
    adjustments TEXT,
    diagnosed BOOLEAN DEFAULT false,
    date_recorded TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT,
    notes TEXT,

    -- Foreign key to special_relationships
    CONSTRAINT fk_vulnerabilities_special_relationships_special_relationship
        FOREIGN KEY (special_relationship_id)
        REFERENCES special_relationships(id)
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vuln_product_owners_product_owner_id ON vulnerabilities_product_owners(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_vuln_product_owners_status ON vulnerabilities_product_owners(status);
CREATE INDEX IF NOT EXISTS idx_vuln_product_owners_diagnosed ON vulnerabilities_product_owners(diagnosed);
CREATE INDEX IF NOT EXISTS idx_vuln_product_owners_date_recorded ON vulnerabilities_product_owners(date_recorded);

CREATE INDEX IF NOT EXISTS idx_vuln_special_relationships_special_rel_id ON vulnerabilities_special_relationships(special_relationship_id);
CREATE INDEX IF NOT EXISTS idx_vuln_special_relationships_status ON vulnerabilities_special_relationships(status);
CREATE INDEX IF NOT EXISTS idx_vuln_special_relationships_diagnosed ON vulnerabilities_special_relationships(diagnosed);
CREATE INDEX IF NOT EXISTS idx_vuln_special_relationships_date_recorded ON vulnerabilities_special_relationships(date_recorded);

-- Migration completed successfully
