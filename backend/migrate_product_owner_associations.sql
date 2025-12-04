-- Migration: Populate client_group_product_owners junction table
--
-- This script creates associations between client groups and product owners
-- based on existing product ownership relationships.
--
-- Logic:
-- - For each product owner that owns a product, create an association
--   with the client group that owns that product
-- - Uses DISTINCT to avoid duplicates (same owner may be on multiple products
--   within the same client group)
-- - Uses ON CONFLICT DO NOTHING to skip any associations that already exist

BEGIN;

-- Show current state
SELECT
    'Before migration' as status,
    COUNT(*) as existing_associations
FROM client_group_product_owners;

-- Step 1: Add unique constraint to prevent duplicate associations
-- This ensures a product owner can only be associated with a client group once
-- Note: Uses DO $$ block to handle case where constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'client_group_product_owners_unique'
    ) THEN
        ALTER TABLE client_group_product_owners
        ADD CONSTRAINT client_group_product_owners_unique
        UNIQUE (client_group_id, product_owner_id);

        RAISE NOTICE 'Added unique constraint: client_group_product_owners_unique';
    ELSE
        RAISE NOTICE 'Unique constraint already exists, skipping';
    END IF;
END $$;

-- Step 2: Insert new associations
INSERT INTO client_group_product_owners (client_group_id, product_owner_id, created_at)
SELECT DISTINCT
    cp.client_id as client_group_id,
    pop.product_owner_id,
    NOW() as created_at
FROM product_owner_products pop
INNER JOIN client_products cp ON pop.product_id = cp.id
ON CONFLICT (client_group_id, product_owner_id) DO NOTHING;

-- Show results
SELECT
    'After migration' as status,
    COUNT(*) as total_associations
FROM client_group_product_owners;

-- Show breakdown by client group (first 10)
SELECT
    cg.id as client_group_id,
    cg.name as client_group_name,
    COUNT(cgpo.product_owner_id) as product_owner_count,
    STRING_AGG(po.firstname || ' ' || po.surname, ', ' ORDER BY po.surname) as product_owners
FROM client_groups cg
LEFT JOIN client_group_product_owners cgpo ON cg.id = cgpo.client_group_id
LEFT JOIN product_owners po ON cgpo.product_owner_id = po.id
WHERE cgpo.product_owner_id IS NOT NULL
GROUP BY cg.id, cg.name
ORDER BY cg.id
LIMIT 10;

COMMIT;

-- Final verification query (run separately after commit)
-- SELECT
--     'Verification' as check_type,
--     (SELECT COUNT(*) FROM product_owner_products) as total_product_owner_products,
--     (SELECT COUNT(DISTINCT (cp.client_id, pop.product_owner_id))
--      FROM product_owner_products pop
--      INNER JOIN client_products cp ON pop.product_id = cp.id) as unique_pairs_expected,
--     (SELECT COUNT(*) FROM client_group_product_owners) as actual_associations_created;
