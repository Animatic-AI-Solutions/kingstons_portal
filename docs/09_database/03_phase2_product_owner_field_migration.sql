-- ============================================================================
-- Phase 2: Product Owner Field Migration Script
-- ============================================================================
-- Purpose: Add product_owners fields to existing client_information_items
-- that were created before the product owner field requirement was enforced
--
-- IMPORTANT: Run this BEFORE enabling the CHECK constraint
-- validate_product_owner_field_pattern
--
-- Date: 2025-10-08
-- Author: Phase 2 Documentation Update
-- Related: PHASE2_DOCS_UPDATE_CHECKLIST.md
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Backup existing data
-- ============================================================================

-- Create backup table
CREATE TABLE IF NOT EXISTS client_information_items_product_owner_migration_backup AS
SELECT * FROM client_information_items;

-- Log backup creation
DO $$
DECLARE
    backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM client_information_items_product_owner_migration_backup;
    RAISE NOTICE 'Backup created: % rows backed up', backup_count;
END $$;

-- ============================================================================
-- STEP 2: Identify items missing product owner fields
-- ============================================================================

-- Pattern 1: Items that should have product_owners array but don't
DO $$
DECLARE
    missing_pattern1_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_pattern1_count
    FROM client_information_items
    WHERE item_type IN ('basic_detail', 'income_expenditure', 'vulnerability_health')
      AND NOT (data_content ? 'product_owners');

    RAISE NOTICE 'Pattern 1 (simple array): % items missing product_owners field', missing_pattern1_count;
END $$;

-- Pattern 2: Items that should have associated_product_owners but don't
DO $$
DECLARE
    missing_pattern2_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_pattern2_count
    FROM client_information_items
    WHERE item_type IN ('assets_liabilities', 'protection')
      AND NOT (data_content ? 'associated_product_owners');

    RAISE NOTICE 'Pattern 2 (complex ownership): % items missing associated_product_owners field', missing_pattern2_count;
END $$;

-- ============================================================================
-- STEP 3: Get client group product owners for default assignment
-- ============================================================================

-- Create temporary mapping of client_group_id to product_owner IDs
CREATE TEMPORARY TABLE temp_client_group_product_owners AS
SELECT
    cgpo.client_group_id,
    array_agg(cgpo.product_owner_id ORDER BY cgpo.product_owner_id) AS product_owner_ids
FROM client_group_product_owners cgpo
GROUP BY cgpo.client_group_id;

-- Log mapping
DO $$
DECLARE
    mapping_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mapping_count FROM temp_client_group_product_owners;
    RAISE NOTICE 'Created product owner mapping for % client groups', mapping_count;
END $$;

-- ============================================================================
-- STEP 4: Migrate Pattern 1 items (simple array)
-- ============================================================================

-- Update basic_detail, income_expenditure, vulnerability_health items
-- Add product_owners array based on client group's product owners
UPDATE client_information_items cii
SET data_content = data_content || jsonb_build_object(
    'product_owners',
    COALESCE(
        (SELECT to_jsonb(tcgpo.product_owner_ids)
         FROM temp_client_group_product_owners tcgpo
         WHERE tcgpo.client_group_id = cii.client_group_id),
        '[]'::jsonb  -- Empty array if no product owners found
    )
)
WHERE cii.item_type IN ('basic_detail', 'income_expenditure', 'vulnerability_health')
  AND NOT (cii.data_content ? 'product_owners');

-- Log migration
DO $$
DECLARE
    pattern1_migrated INTEGER;
BEGIN
    GET DIAGNOSTICS pattern1_migrated = ROW_COUNT;
    RAISE NOTICE 'Pattern 1 migration: Added product_owners to % items', pattern1_migrated;
END $$;

-- ============================================================================
-- STEP 5: Migrate Pattern 2 items (complex ownership)
-- ============================================================================

-- Update assets_liabilities, protection items
-- Add associated_product_owners with equal distribution
UPDATE client_information_items cii
SET data_content = data_content || (
    SELECT jsonb_build_object(
        'associated_product_owners',
        jsonb_build_object('association_type', 'individual') ||
        (
            SELECT jsonb_object_agg(
                product_owner_id::text,
                CASE
                    WHEN array_length(product_owner_ids, 1) = 1 THEN 100.00
                    ELSE ROUND(100.0 / array_length(product_owner_ids, 1), 2)
                END
            )
            FROM (
                SELECT unnest(tcgpo.product_owner_ids) AS product_owner_id,
                       tcgpo.product_owner_ids
                FROM temp_client_group_product_owners tcgpo
                WHERE tcgpo.client_group_id = cii.client_group_id
            ) AS po_data
        )
    )
    FROM temp_client_group_product_owners tcgpo
    WHERE tcgpo.client_group_id = cii.client_group_id
    LIMIT 1
)
WHERE cii.item_type IN ('assets_liabilities', 'protection')
  AND NOT (cii.data_content ? 'associated_product_owners')
  AND EXISTS (
      SELECT 1
      FROM temp_client_group_product_owners tcgpo
      WHERE tcgpo.client_group_id = cii.client_group_id
  );

-- Log migration
DO $$
DECLARE
    pattern2_migrated INTEGER;
BEGIN
    GET DIAGNOSTICS pattern2_migrated = ROW_COUNT;
    RAISE NOTICE 'Pattern 2 migration: Added associated_product_owners to % items', pattern2_migrated;
END $$;

-- ============================================================================
-- STEP 6: Handle items with no product owners in client group
-- ============================================================================

-- These items need manual review - add empty product_owners for Pattern 1
UPDATE client_information_items cii
SET data_content = data_content || jsonb_build_object('product_owners', '[]'::jsonb)
WHERE cii.item_type IN ('basic_detail', 'income_expenditure', 'vulnerability_health')
  AND NOT (cii.data_content ? 'product_owners')
  AND NOT EXISTS (
      SELECT 1
      FROM temp_client_group_product_owners tcgpo
      WHERE tcgpo.client_group_id = cii.client_group_id
  );

-- Log orphaned items for manual review
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphaned_count
    FROM client_information_items cii
    WHERE cii.item_type IN ('assets_liabilities', 'protection')
      AND NOT (cii.data_content ? 'associated_product_owners')
      AND NOT EXISTS (
          SELECT 1
          FROM temp_client_group_product_owners tcgpo
          WHERE tcgpo.client_group_id = cii.client_group_id
      );

    IF orphaned_count > 0 THEN
        RAISE WARNING 'Found % assets/liabilities items without client group product owners - these require manual review', orphaned_count;

        -- Output list for manual review
        RAISE NOTICE 'Orphaned items requiring manual review:';
        FOR rec IN (
            SELECT cii.id, cii.client_group_id, cii.item_type, cii.item_category
            FROM client_information_items cii
            WHERE cii.item_type IN ('assets_liabilities', 'protection')
              AND NOT (cii.data_content ? 'associated_product_owners')
              AND NOT EXISTS (
                  SELECT 1
                  FROM temp_client_group_product_owners tcgpo
                  WHERE tcgpo.client_group_id = cii.client_group_id
              )
            LIMIT 20
        )
        LOOP
            RAISE NOTICE '  Item ID %, Client Group %, Type %, Category %',
                rec.id, rec.client_group_id, rec.item_type, rec.item_category;
        END LOOP;
    END IF;
END $$;

-- ============================================================================
-- STEP 7: Validation
-- ============================================================================

-- Validate Pattern 1 items have product_owners
DO $$
DECLARE
    invalid_pattern1 INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_pattern1
    FROM client_information_items
    WHERE item_type IN ('basic_detail', 'income_expenditure', 'vulnerability_health')
      AND NOT (data_content ? 'product_owners');

    IF invalid_pattern1 > 0 THEN
        RAISE EXCEPTION 'Migration failed: % Pattern 1 items still missing product_owners', invalid_pattern1;
    ELSE
        RAISE NOTICE '✓ Validation passed: All Pattern 1 items have product_owners field';
    END IF;
END $$;

-- Validate Pattern 2 items have associated_product_owners
DO $$
DECLARE
    invalid_pattern2 INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_pattern2
    FROM client_information_items
    WHERE item_type IN ('assets_liabilities', 'protection')
      AND NOT (data_content ? 'associated_product_owners');

    IF invalid_pattern2 > 0 THEN
        RAISE WARNING 'Validation warning: % Pattern 2 items still missing associated_product_owners - manual review required', invalid_pattern2;
    ELSE
        RAISE NOTICE '✓ Validation passed: All Pattern 2 items have associated_product_owners field';
    END IF;
END $$;

-- Validate ownership percentages total 100% for tenants_in_common
DO $$
DECLARE
    invalid_percentages INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_percentages
    FROM client_information_items
    WHERE data_content->'associated_product_owners'->>'association_type' = 'tenants_in_common'
      AND (
          SELECT SUM((value)::numeric)
          FROM jsonb_each_text(data_content->'associated_product_owners')
          WHERE key ~ '^[0-9]+$'
      ) NOT BETWEEN 99.99 AND 100.01;

    IF invalid_percentages > 0 THEN
        RAISE WARNING 'Validation warning: % items have invalid ownership percentages (not totaling 100%%)', invalid_percentages;
    ELSE
        RAISE NOTICE '✓ Validation passed: All ownership percentages valid';
    END IF;
END $$;

-- ============================================================================
-- STEP 8: Summary Report
-- ============================================================================

DO $$
DECLARE
    total_items INTEGER;
    pattern1_items INTEGER;
    pattern2_items INTEGER;
    backup_rows INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_items FROM client_information_items;
    SELECT COUNT(*) INTO pattern1_items FROM client_information_items
        WHERE item_type IN ('basic_detail', 'income_expenditure', 'vulnerability_health');
    SELECT COUNT(*) INTO pattern2_items FROM client_information_items
        WHERE item_type IN ('assets_liabilities', 'protection');
    SELECT COUNT(*) INTO backup_rows FROM client_information_items_product_owner_migration_backup;

    RAISE NOTICE '';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'MIGRATION SUMMARY';
    RAISE NOTICE '=================================================================';
    RAISE NOTICE 'Total items in database: %', total_items;
    RAISE NOTICE 'Pattern 1 items (simple array): %', pattern1_items;
    RAISE NOTICE 'Pattern 2 items (complex ownership): %', pattern2_items;
    RAISE NOTICE 'Backup rows created: %', backup_rows;
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Review orphaned items (if any) and manually assign product owners';
    RAISE NOTICE '2. Verify migration with: SELECT * FROM client_information_items LIMIT 10;';
    RAISE NOTICE '3. Enable CHECK constraint: ALTER TABLE client_information_items';
    RAISE NOTICE '      ADD CONSTRAINT valid_product_owner_field_pattern';
    RAISE NOTICE '      CHECK (validate_product_owner_fields(item_type, data_content));';
    RAISE NOTICE '4. Drop backup after verification: DROP TABLE client_information_items_product_owner_migration_backup;';
    RAISE NOTICE '=================================================================';
END $$;

-- ============================================================================
-- ROLLBACK PROCEDURE (if needed)
-- ============================================================================
-- To rollback this migration, run:
--
-- BEGIN;
-- UPDATE client_information_items cii
-- SET data_content = backup.data_content
-- FROM client_information_items_product_owner_migration_backup backup
-- WHERE cii.id = backup.id;
-- COMMIT;
-- ============================================================================

COMMIT;

-- ============================================================================
-- CLEANUP (Run after verification)
-- ============================================================================
-- DROP TABLE IF EXISTS client_information_items_product_owner_migration_backup;
-- DROP TABLE IF EXISTS temp_client_group_product_owners;
-- ============================================================================
