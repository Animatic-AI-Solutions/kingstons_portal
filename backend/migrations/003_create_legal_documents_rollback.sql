-- =============================================================================
-- Rollback Migration: Drop Legal Documents Tables
-- Description: Removes legal_documents table and all related objects
-- Warning: This will DELETE all legal document data!
-- =============================================================================

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_legal_documents_updated_at ON legal_documents;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_legal_documents_updated_at();

-- Drop indexes (explicit for clarity, tables drop them automatically)
DROP INDEX IF EXISTS idx_polo_legal_document;
DROP INDEX IF EXISTS idx_polo_legal_product_owner;
DROP INDEX IF EXISTS idx_legal_documents_type;
DROP INDEX IF EXISTS idx_legal_documents_status;

-- Drop junction table first (has foreign keys to legal_documents)
DROP TABLE IF EXISTS product_owner_legal_documents;

-- Drop main table
DROP TABLE IF EXISTS legal_documents;
