-- Migration: Refactor health table into separate tables
-- Description: Replaces polymorphic health table with health_product_owners and health_special_relationships
-- Date: 2024-12-01
-- Author: Claude Code

-- WARNING: This will drop the existing health table and all its data!
-- Backup data before running if needed.

-- Drop existing health table and its indexes
DROP INDEX IF EXISTS idx_health_date_recorded;
DROP INDEX IF EXISTS idx_health_date_of_diagnosis;
DROP INDEX IF EXISTS idx_health_status;
DROP INDEX IF EXISTS idx_health_special_relationship_id;
DROP INDEX IF EXISTS idx_health_product_owner_id;
DROP TABLE IF EXISTS health;

-- Create health_product_owners table
CREATE TABLE IF NOT EXISTS health_product_owners (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    product_owner_id BIGINT NOT NULL,
    condition TEXT,
    name TEXT,
    date_of_diagnosis DATE,
    status TEXT,
    medication TEXT,
    date_recorded TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,

    -- Foreign key to product_owners
    CONSTRAINT fk_health_product_owners_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE
);

-- Create health_special_relationships table
CREATE TABLE IF NOT EXISTS health_special_relationships (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    special_relationship_id BIGINT NOT NULL,
    condition TEXT,
    name TEXT,
    date_of_diagnosis DATE,
    status TEXT,
    medication TEXT,
    date_recorded TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,

    -- Foreign key to special_relationships
    CONSTRAINT fk_health_special_relationships_special_relationship
        FOREIGN KEY (special_relationship_id)
        REFERENCES special_relationships(id)
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_health_product_owners_product_owner_id ON health_product_owners(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_health_product_owners_status ON health_product_owners(status);
CREATE INDEX IF NOT EXISTS idx_health_product_owners_date_of_diagnosis ON health_product_owners(date_of_diagnosis);
CREATE INDEX IF NOT EXISTS idx_health_product_owners_date_recorded ON health_product_owners(date_recorded);

CREATE INDEX IF NOT EXISTS idx_health_special_relationships_special_relationship_id ON health_special_relationships(special_relationship_id);
CREATE INDEX IF NOT EXISTS idx_health_special_relationships_status ON health_special_relationships(status);
CREATE INDEX IF NOT EXISTS idx_health_special_relationships_date_of_diagnosis ON health_special_relationships(date_of_diagnosis);
CREATE INDEX IF NOT EXISTS idx_health_special_relationships_date_recorded ON health_special_relationships(date_recorded);

-- Migration completed successfully
