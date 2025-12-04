-- Migration: Add display_order column to client_group_product_owners table
--
-- This adds a display_order field to track the user's preferred ordering
-- of product owners within each client group.
--
-- Logic:
-- - Add display_order column (INTEGER, NOT NULL, DEFAULT 0)
-- - Initialize existing rows with order based on created_at (earliest = 1, etc.)
-- - This preserves the current implicit ordering by creation time

BEGIN;

-- Show current state
SELECT
    'Before migration' as status,
    COUNT(*) as total_associations,
    COUNT(DISTINCT client_group_id) as client_groups_with_owners
FROM client_group_product_owners;

-- Step 1: Add display_order column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_group_product_owners'
        AND column_name = 'display_order'
    ) THEN
        ALTER TABLE client_group_product_owners
        ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;

        RAISE NOTICE 'Added display_order column to client_group_product_owners';
    ELSE
        RAISE NOTICE 'display_order column already exists, skipping';
    END IF;
END $$;

-- Step 2: Initialize display_order for existing rows
-- Order by created_at within each client group (earliest = 1, next = 2, etc.)
UPDATE client_group_product_owners
SET display_order = subquery.row_num
FROM (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY client_group_id
            ORDER BY created_at ASC, id ASC
        ) as row_num
    FROM client_group_product_owners
) as subquery
WHERE client_group_product_owners.id = subquery.id
AND client_group_product_owners.display_order = 0;

-- Show results
SELECT
    'After migration' as status,
    COUNT(*) as total_associations,
    COUNT(DISTINCT client_group_id) as client_groups_with_owners,
    MIN(display_order) as min_order,
    MAX(display_order) as max_order
FROM client_group_product_owners;

-- Show sample data (first 10 client groups with their ordered product owners)
SELECT
    cg.id as client_group_id,
    cg.name as client_group_name,
    cgpo.display_order,
    po.firstname || ' ' || po.surname as product_owner_name,
    cgpo.created_at
FROM client_group_product_owners cgpo
INNER JOIN client_groups cg ON cgpo.client_group_id = cg.id
INNER JOIN product_owners po ON cgpo.product_owner_id = po.id
WHERE cg.id IN (
    SELECT DISTINCT client_group_id
    FROM client_group_product_owners
    ORDER BY client_group_id
    LIMIT 10
)
ORDER BY cg.id, cgpo.display_order;

COMMIT;

-- Final verification query (run separately after commit)
-- This shows any client groups where display_order might have gaps or duplicates
-- SELECT
--     client_group_id,
--     COUNT(*) as owner_count,
--     ARRAY_AGG(display_order ORDER BY display_order) as display_orders,
--     CASE
--         WHEN COUNT(DISTINCT display_order) < COUNT(*) THEN 'HAS DUPLICATES'
--         ELSE 'OK'
--     END as status
-- FROM client_group_product_owners
-- GROUP BY client_group_id
-- HAVING COUNT(DISTINCT display_order) < COUNT(*)
--    OR MIN(display_order) != 1
--    OR MAX(display_order) != COUNT(*);
