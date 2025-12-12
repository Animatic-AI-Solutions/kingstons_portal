-- Migration: Add special_relationships table and junction table
-- Description: Creates special_relationships table for tracking personal and professional relationships
--              and a junction table for the many-to-many relationship with product_owners
-- Date: 2024-12-01
-- Author: Claude Code

-- Create special_relationships table
CREATE TABLE IF NOT EXISTS special_relationships (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    type TEXT,
    dob DATE,
    name TEXT,
    age INTEGER,
    dependency BOOLEAN DEFAULT false,
    address_id BIGINT,
    status TEXT DEFAULT 'active',
    email TEXT,
    phone TEXT,
    relationship TEXT,
    notes TEXT,

    -- Foreign key to addresses
    CONSTRAINT fk_special_relationships_address
        FOREIGN KEY (address_id)
        REFERENCES addresses(id)
        ON DELETE SET NULL
);

-- Create junction table for many-to-many relationship between product_owners and special_relationships
CREATE TABLE IF NOT EXISTS product_owner_special_relationships (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    product_owner_id BIGINT NOT NULL,
    special_relationship_id BIGINT NOT NULL,

    -- Foreign keys
    CONSTRAINT fk_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_special_relationship
        FOREIGN KEY (special_relationship_id)
        REFERENCES special_relationships(id)
        ON DELETE CASCADE,

    -- Ensure unique combinations
    CONSTRAINT unique_product_owner_special_relationship
        UNIQUE (product_owner_id, special_relationship_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_special_relationships_type ON special_relationships(type);
CREATE INDEX IF NOT EXISTS idx_special_relationships_name ON special_relationships(name);
CREATE INDEX IF NOT EXISTS idx_special_relationships_address_id ON special_relationships(address_id);
CREATE INDEX IF NOT EXISTS idx_special_relationships_status ON special_relationships(status);
CREATE INDEX IF NOT EXISTS idx_product_owner_special_relationships_product_owner_id ON product_owner_special_relationships(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_product_owner_special_relationships_special_relationship_id ON product_owner_special_relationships(special_relationship_id);

-- Migration completed successfully
