-- Migration: Add risk_assessments and capacity_for_loss tables
-- Description: Creates tables for tracking financial risk assessments and capacity for loss for product owners
-- Date: 2024-12-01
-- Author: Claude Code

-- Create risk_assessments table
CREATE TABLE IF NOT EXISTS risk_assessments (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    product_owner_id BIGINT NOT NULL,
    type TEXT,
    actual_score NUMERIC(5,2),
    category_score INTEGER,
    risk_group TEXT,
    date DATE,
    status TEXT,

    -- Foreign key to product_owners
    CONSTRAINT fk_risk_assessments_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    -- Constraints for valid score ranges
    CONSTRAINT chk_actual_score_range
        CHECK (actual_score >= 0 AND actual_score <= 100),

    CONSTRAINT chk_category_score_range
        CHECK (category_score >= 1 AND category_score <= 7)
);

-- Create capacity_for_loss table
CREATE TABLE IF NOT EXISTS capacity_for_loss (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    product_owner_id BIGINT NOT NULL,
    score INTEGER,
    category TEXT,
    date_assessed DATE,
    status TEXT,

    -- Foreign key to product_owners
    CONSTRAINT fk_capacity_for_loss_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    -- Constraint for valid score range
    CONSTRAINT chk_score_range
        CHECK (score >= 1 AND score <= 10)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_risk_assessments_product_owner_id ON risk_assessments(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_type ON risk_assessments(type);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_date ON risk_assessments(date);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_status ON risk_assessments(status);

CREATE INDEX IF NOT EXISTS idx_capacity_for_loss_product_owner_id ON capacity_for_loss(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_capacity_for_loss_date_assessed ON capacity_for_loss(date_assessed);
CREATE INDEX IF NOT EXISTS idx_capacity_for_loss_status ON capacity_for_loss(status);

-- Migration completed successfully
