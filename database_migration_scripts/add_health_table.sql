-- Migration: Add health table
-- Description: Creates health table for tracking health conditions and medications for product owners
-- Date: 2024-12-01
-- Author: Claude Code

-- Create health table
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

    -- Foreign keys (one or the other must be set, but not both)
    CONSTRAINT fk_health_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_health_special_relationship
        FOREIGN KEY (special_relationship_id)
        REFERENCES special_relationships(id)
        ON DELETE CASCADE,

    -- Ensure exactly one foreign key is populated
    CONSTRAINT chk_health_exactly_one_owner
        CHECK (
            (product_owner_id IS NOT NULL AND special_relationship_id IS NULL) OR
            (product_owner_id IS NULL AND special_relationship_id IS NOT NULL)
        )
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_health_product_owner_id ON health(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_health_special_relationship_id ON health(special_relationship_id);
CREATE INDEX IF NOT EXISTS idx_health_status ON health(status);
CREATE INDEX IF NOT EXISTS idx_health_date_of_diagnosis ON health(date_of_diagnosis);
CREATE INDEX IF NOT EXISTS idx_health_date_recorded ON health(date_recorded);

-- Migration completed successfully
