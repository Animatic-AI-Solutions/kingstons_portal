-- Migration: Add income and expenditure tables
-- Description: Creates tables for tracking client income sources and expenditure items
-- Date: 2024-12-01
-- Author: Claude Code

-- Create income table
CREATE TABLE IF NOT EXISTS income (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    client_group_id BIGINT NOT NULL,
    category TEXT,
    source TEXT,
    product_owner_id BIGINT,
    frequency TEXT,
    annual_amount NUMERIC(15,2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,

    -- Foreign key to client_groups
    CONSTRAINT fk_income_client_group
        FOREIGN KEY (client_group_id)
        REFERENCES client_groups(id)
        ON DELETE CASCADE,

    -- Foreign key to product_owners
    CONSTRAINT fk_income_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE SET NULL
);

-- Create expenditure table
CREATE TABLE IF NOT EXISTS expenditure (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    client_group_id BIGINT NOT NULL,
    category TEXT,
    description TEXT,
    frequency TEXT,
    annual_amount NUMERIC(15,2),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,

    -- Foreign key to client_groups
    CONSTRAINT fk_expenditure_client_group
        FOREIGN KEY (client_group_id)
        REFERENCES client_groups(id)
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_income_client_group_id ON income(client_group_id);
CREATE INDEX IF NOT EXISTS idx_income_product_owner_id ON income(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_income_category ON income(category);
CREATE INDEX IF NOT EXISTS idx_income_frequency ON income(frequency);
CREATE INDEX IF NOT EXISTS idx_income_last_updated ON income(last_updated);

CREATE INDEX IF NOT EXISTS idx_expenditure_client_group_id ON expenditure(client_group_id);
CREATE INDEX IF NOT EXISTS idx_expenditure_category ON expenditure(category);
CREATE INDEX IF NOT EXISTS idx_expenditure_frequency ON expenditure(frequency);
CREATE INDEX IF NOT EXISTS idx_expenditure_last_updated ON expenditure(last_updated);

-- Migration completed successfully
