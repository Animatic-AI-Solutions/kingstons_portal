-- Migration: Add vulnerabilities table
-- Description: Creates vulnerabilities table for tracking vulnerabilities for product owners and special relationships
-- Date: 2024-12-01
-- Author: Claude Code

-- Create vulnerabilities table
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

    -- Foreign keys (one or the other must be set, but not both)
    CONSTRAINT fk_vulnerabilities_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_vulnerabilities_special_relationship
        FOREIGN KEY (special_relationship_id)
        REFERENCES special_relationships(id)
        ON DELETE CASCADE,

    -- Ensure exactly one foreign key is populated
    CONSTRAINT chk_vulnerabilities_exactly_one_owner
        CHECK (
            (product_owner_id IS NOT NULL AND special_relationship_id IS NULL) OR
            (product_owner_id IS NULL AND special_relationship_id IS NOT NULL)
        )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_product_owner_id ON vulnerabilities(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_special_relationship_id ON vulnerabilities(special_relationship_id);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_status ON vulnerabilities(status);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_diagnosed ON vulnerabilities(diagnosed);
CREATE INDEX IF NOT EXISTS idx_vulnerabilities_date_recorded ON vulnerabilities(date_recorded);

-- Migration completed successfully
