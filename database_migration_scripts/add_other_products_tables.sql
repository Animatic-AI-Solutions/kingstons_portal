-- Migration: Add other_products and junction tables
-- Description: Creates tables for tracking protection policies and their ownership
-- Date: 2024-12-01
-- Author: Claude Code

-- Create other_products table
CREATE TABLE IF NOT EXISTS other_products (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    provider_id BIGINT,
    policy_number TEXT,
    cover_type TEXT,
    term_type TEXT,
    sum_assured NUMERIC(15,2),
    duration TEXT,
    start_date DATE,
    monthly_payment NUMERIC(15,2),
    end_date DATE,
    investment_element BOOLEAN DEFAULT false,
    surrender_value NUMERIC(15,2),
    in_trust BOOLEAN DEFAULT false,
    trust_notes TEXT,
    notes TEXT,

    -- Foreign key to available_providers
    CONSTRAINT fk_other_products_provider
        FOREIGN KEY (provider_id)
        REFERENCES available_providers(id)
        ON DELETE SET NULL
);

-- Create product_owner_other_products junction table
CREATE TABLE IF NOT EXISTS product_owner_other_products (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    product_owner_id BIGINT NOT NULL,
    other_product_id BIGINT NOT NULL,

    -- Foreign key to product_owners
    CONSTRAINT fk_product_owner_other_products_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    -- Foreign key to other_products
    CONSTRAINT fk_product_owner_other_products_other_product
        FOREIGN KEY (other_product_id)
        REFERENCES other_products(id)
        ON DELETE CASCADE,

    -- Unique constraint to prevent duplicate relationships
    CONSTRAINT uq_product_owner_other_product
        UNIQUE (product_owner_id, other_product_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_other_products_provider_id ON other_products(provider_id);
CREATE INDEX IF NOT EXISTS idx_other_products_policy_number ON other_products(policy_number);
CREATE INDEX IF NOT EXISTS idx_other_products_cover_type ON other_products(cover_type);
CREATE INDEX IF NOT EXISTS idx_other_products_start_date ON other_products(start_date);
CREATE INDEX IF NOT EXISTS idx_other_products_end_date ON other_products(end_date);
CREATE INDEX IF NOT EXISTS idx_other_products_in_trust ON other_products(in_trust);
CREATE INDEX IF NOT EXISTS idx_other_products_investment_element ON other_products(investment_element);

CREATE INDEX IF NOT EXISTS idx_product_owner_other_products_product_owner_id ON product_owner_other_products(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_product_owner_other_products_other_product_id ON product_owner_other_products(other_product_id);

-- Migration completed successfully
