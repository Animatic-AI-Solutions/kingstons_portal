-- Migration: Add title, middle_names, and relationship_status to product_owners table
-- Date: 2025-12-03
-- Description: Adds three new personal information fields to product_owners table

-- ============================================================================
-- FORWARD MIGRATION (Apply Changes)
-- ============================================================================

-- Add title field (Mr, Mrs, Miss, Ms, Dr, Prof, etc.)
ALTER TABLE product_owners
ADD COLUMN IF NOT EXISTS title text;

COMMENT ON COLUMN product_owners.title IS 'Honorific title (Mr, Mrs, Miss, Ms, Dr, Prof, etc.)';

-- Add middle_names field
ALTER TABLE product_owners
ADD COLUMN IF NOT EXISTS middle_names text;

COMMENT ON COLUMN product_owners.middle_names IS 'Middle name(s) of the product owner';

-- Add relationship_status field (Single, Married, Divorced, Widowed, Civil Partnership, etc.)
ALTER TABLE product_owners
ADD COLUMN IF NOT EXISTS relationship_status text;

COMMENT ON COLUMN product_owners.relationship_status IS 'Marital/relationship status (Single, Married, Divorced, Widowed, Civil Partnership)';

-- Verify columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'product_owners'
  AND column_name IN ('title', 'middle_names', 'relationship_status')
ORDER BY column_name;

-- ============================================================================
-- ROLLBACK MIGRATION (Reverse Changes)
-- ============================================================================

-- Uncomment the following lines to rollback this migration:

-- ALTER TABLE product_owners DROP COLUMN IF EXISTS title;
-- ALTER TABLE product_owners DROP COLUMN IF EXISTS middle_names;
-- ALTER TABLE product_owners DROP COLUMN IF EXISTS relationship_status;
