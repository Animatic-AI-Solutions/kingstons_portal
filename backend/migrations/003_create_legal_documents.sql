-- =============================================================================
-- Migration: Create Legal Documents Tables
-- Description: Creates legal_documents table and junction table for product
--              owner associations. Legal documents link to client groups
--              indirectly through product owners.
-- =============================================================================

-- =============================================================================
-- Main Table: legal_documents
-- =============================================================================

CREATE TABLE IF NOT EXISTS legal_documents (
    id SERIAL PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    document_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'Signed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Check constraint for valid status values
    CONSTRAINT legal_documents_status_check
        CHECK (status IN ('Signed', 'Registered', 'Lapsed')),

    -- Check constraint for notes length (max 2000 characters)
    CONSTRAINT legal_documents_notes_length
        CHECK (notes IS NULL OR LENGTH(notes) <= 2000)
);

-- Table and column documentation
COMMENT ON TABLE legal_documents IS 'Stores legal documents linked to client groups indirectly via product owners';
COMMENT ON COLUMN legal_documents.type IS 'Document type (e.g., Will, LPOA P&F, LPOA H&W, EPA, General Power of Attorney, Advance Directive, or custom)';
COMMENT ON COLUMN legal_documents.document_date IS 'Date of the legal document';
COMMENT ON COLUMN legal_documents.status IS 'Document status: Signed, Registered, or Lapsed';
COMMENT ON COLUMN legal_documents.notes IS 'Additional notes about the document (max 2000 chars)';

-- =============================================================================
-- Junction Table: product_owner_legal_documents
-- =============================================================================

CREATE TABLE IF NOT EXISTS product_owner_legal_documents (
    product_owner_id INTEGER NOT NULL,
    legal_document_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Composite primary key
    PRIMARY KEY (product_owner_id, legal_document_id),

    -- Foreign key to product_owners
    CONSTRAINT fk_polo_legal_product_owner
        FOREIGN KEY (product_owner_id)
        REFERENCES product_owners(id)
        ON DELETE CASCADE,

    -- Foreign key to legal_documents
    CONSTRAINT fk_polo_legal_document
        FOREIGN KEY (legal_document_id)
        REFERENCES legal_documents(id)
        ON DELETE CASCADE
);

COMMENT ON TABLE product_owner_legal_documents IS 'Junction table linking product owners to legal documents (many-to-many)';

-- =============================================================================
-- Indexes for Performance
-- =============================================================================

-- Index on status for filtering queries
CREATE INDEX IF NOT EXISTS idx_legal_documents_status
    ON legal_documents(status);

-- Index on type for filtering queries
CREATE INDEX IF NOT EXISTS idx_legal_documents_type
    ON legal_documents(type);

-- Index on product_owner_id for junction table lookups
CREATE INDEX IF NOT EXISTS idx_polo_legal_product_owner
    ON product_owner_legal_documents(product_owner_id);

-- Index on legal_document_id for junction table lookups
CREATE INDEX IF NOT EXISTS idx_polo_legal_document
    ON product_owner_legal_documents(legal_document_id);

-- =============================================================================
-- Trigger: Auto-update updated_at
-- =============================================================================

-- Create trigger function
CREATE OR REPLACE FUNCTION update_legal_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists to ensure clean state)
DROP TRIGGER IF EXISTS trigger_legal_documents_updated_at ON legal_documents;
CREATE TRIGGER trigger_legal_documents_updated_at
    BEFORE UPDATE ON legal_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_legal_documents_updated_at();
