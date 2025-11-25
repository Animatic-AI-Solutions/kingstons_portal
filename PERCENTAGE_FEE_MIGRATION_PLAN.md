# Percentage Fee Migration Plan
## Phase 2: `percentage_fee` → `percentage_fee_facilitated`

**Version**: 1.0  
**Created**: 2025-11-25  
**Status**: Ready for Implementation  
**Risk Level**: MEDIUM-HIGH (With comprehensive mitigation)  
**Confidence**: 95/100  

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Pre-Migration Assessment](#pre-migration-assessment)
3. [Database Changes - Complete SQL](#database-changes)
4. [Backend Code Changes](#backend-changes)
5. [Frontend Code Changes](#frontend-changes)
6. [Deployment Procedure](#deployment-procedure)
7. [Validation Queries](#validation-queries)
8. [Rollback Procedure](#rollback-procedure)
9. [Testing Strategy](#testing-strategy)

---

## Project Overview

### Business Requirement

This is **Phase 2** of the fee structure refactoring project. Phase 1 successfully completed the `fixed_cost` → `fixed_fee_facilitated` migration.

**Current State** (2 fee types):
- Fixed Fee Facilitated ✅ (Phase 1 completed)
- Percentage Fee

**Target State** (3 fee types):
- Fixed Fee Direct (Future - Phase 3)
- Fixed Fee Facilitated ✅ (Phase 1 completed)
- Percentage Fee Facilitated (This Phase 2)

### Implementation Approach

**Phase 2** (This Plan): Rename `percentage_fee` → `percentage_fee_facilitated`
- Follows same pattern as successful Phase 1 migration
- Prepares system for future `percentage_fee_direct` addition
- Renames existing field without functional changes
- No new columns added yet

**Phase 3** (Future): Add `percentage_fee_direct`
- Will be planned after Phase 2 is stable
- Will complete the 3-fee model

### Impact Summary

**Database**:
- 1 table: `client_products`
- 3 views: `company_revenue_analytics`, `products_list_view`, `revenue_analytics_optimized`
- 1 computed column rename
- **Note**: The migration script analysis shows some views were already updated in Phase 1

**Backend**:
- 1 model file: `client_product.py` (3 Pydantic classes)
- 3 route files: `client_groups.py`, `client_products.py`, `revenue.py`
- ~40 line changes total

**Frontend**:
- 6 main files with `percentage_fee` references
- Variable naming consistency: `percentageFee` → `percentageFeeFacilitated`
- TypeScript interfaces and component updates

---

## Pre-Migration Assessment

### Current Database Schema Analysis

From the database documentation analysis:

**Table**: `client_products`
- Current column: `percentage_fee text` (line 117)
- Target column: `percentage_fee_facilitated text`

**Views with `percentage_fee` references**:
1. `company_revenue_analytics` - 4 references (lines 394, 401, 412, 414)
2. `products_list_view` - 2 references (lines 771, 782) 
3. `revenue_analytics_optimized` - 1 reference (line 829)

### Backend Code Impact Assessment

**Models** (`backend/app/models/client_product.py`):
- 3 Pydantic classes need updates:
  - `ClientproductBase` (line 22)
  - `ClientproductUpdate` (line 50)  
  - `ProductRevenueCalculation` (line 73)

**API Routes**:
1. `client_groups.py` - 2 references (lines 1233, 1249, 1492)
2. `client_products.py` - 15 references (validation, calculation logic)
3. `revenue.py` - 20 references (revenue calculation logic)

### Frontend Code Impact Assessment

**TypeScript Interfaces**:
- `useClientDetails.ts` (line 41)
- `useProductDetails.ts` (line 29) 
- `CreateClientProducts.tsx` (line 64)
- `ClientDetails.tsx` (line 91)

**Component Logic**:
- Form validation logic in `CreateClientProducts.tsx`
- Revenue calculation in `ClientDetails.tsx`
- Input handling and display logic

**Variable Naming**:
- `percentageFee` → `percentageFeeFacilitated`
- Property access: `product.percentage_fee` → `product.percentage_fee_facilitated`

---

## Database Changes

### Overview

**What's Changing**:
1. Column rename: `client_products.percentage_fee` → `percentage_fee_facilitated`
2. View updates: 3 views need recreation (7 total references)
3. Computed column rename: In `company_revenue_analytics` view

**Critical**: All changes must be in a single transaction (all or nothing).

### Complete Migration SQL Script

**File**: `backend/migrations/002_rename_percentage_fee_to_percentage_fee_facilitated.sql`

```sql
-- ============================================================================
-- Migration 002: Rename percentage_fee to percentage_fee_facilitated
-- Created: 2025-11-25
-- Risk: MEDIUM-HIGH
-- Rollback: See rollback script
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Rename Column
-- ============================================================================

ALTER TABLE client_products
RENAME COLUMN percentage_fee TO percentage_fee_facilitated;

COMMENT ON COLUMN client_products.percentage_fee_facilitated IS 'Annual percentage facilitated fee rate (e.g., 1.5 for 1.5%)';

-- ============================================================================
-- STEP 2: Update company_revenue_analytics View
-- ============================================================================
-- Changes: 4 field references

DROP VIEW IF EXISTS company_revenue_analytics CASCADE;

CREATE OR REPLACE VIEW company_revenue_analytics AS
SELECT
    sum(
        CASE
            WHEN ((cp.status = 'active'::text) AND (cp.fixed_fee_facilitated IS NOT NULL))
            THEN (cp.fixed_fee_facilitated)::numeric
            ELSE (0)::numeric
        END) AS total_fixed_facilitated_revenue,
    sum(
        CASE
            WHEN ((cp.status = 'active'::text) AND (cp.percentage_fee_facilitated IS NOT NULL) AND (pv.total_value > (0)::numeric))
            THEN (pv.total_value * ((cp.percentage_fee_facilitated)::numeric / 100.0))
            ELSE (0)::numeric
        END) AS total_percentage_facilitated_revenue,  -- RENAMED FROM total_percentage_revenue
    sum(
        CASE
            WHEN (cp.status = 'active'::text)
            THEN (COALESCE((cp.fixed_fee_facilitated)::numeric, (0)::numeric) +
            CASE
                WHEN ((cp.percentage_fee_facilitated IS NOT NULL) AND (pv.total_value > (0)::numeric))
                THEN (pv.total_value * ((cp.percentage_fee_facilitated)::numeric / 100.0))
                ELSE (0)::numeric
            END)
            ELSE (0)::numeric
        END) AS total_annual_revenue,
    count(DISTINCT cp.provider_id) AS active_providers,
    count(DISTINCT cp.client_id) AS active_clients,
    count(DISTINCT cp.id) AS active_products,
    sum(COALESCE(pv.total_value, (0)::numeric)) AS total_fum,
    avg(
        CASE
            WHEN ((cp.percentage_fee_facilitated IS NOT NULL) AND ((cp.percentage_fee_facilitated)::numeric > (0)::numeric))
            THEN (cp.percentage_fee_facilitated)::numeric
            ELSE NULL::numeric
        END) AS avg_percentage_facilitated_fee,  -- RENAMED FROM avg_percentage_fee
    avg(
        CASE
            WHEN ((cp.fixed_fee_facilitated IS NOT NULL) AND ((cp.fixed_fee_facilitated)::numeric > (0)::numeric))
            THEN (cp.fixed_fee_facilitated)::numeric
            ELSE NULL::numeric
        END) AS avg_fixed_facilitated_fee,
    CURRENT_TIMESTAMP AS calculated_at
FROM (client_products cp
    LEFT JOIN (
        SELECT p.id AS portfolio_id,
            sum(COALESCE(lpfv.valuation, (0)::numeric)) AS total_value
        FROM ((portfolios p
            LEFT JOIN portfolio_funds pf ON (((p.id = pf.portfolio_id) AND (pf.status = 'active'::text))))
            LEFT JOIN latest_portfolio_fund_valuations lpfv ON ((pf.id = lpfv.portfolio_fund_id)))
        GROUP BY p.id
    ) pv ON ((cp.portfolio_id = pv.portfolio_id)));

-- ============================================================================
-- STEP 3: Update products_list_view View
-- ============================================================================
-- Changes: 2 field references (SELECT + GROUP BY)

DROP VIEW IF EXISTS products_list_view CASCADE;

CREATE OR REPLACE VIEW products_list_view AS
SELECT
    cp.id,
    cp.client_id,
    cp.product_name,
    cp.product_type,
    cp.status,
    cp.start_date,
    cp.end_date,
    cp.provider_id,
    cp.portfolio_id,
    cp.plan_number,
    cp.created_at,
    cg.name AS client_name,
    cg.advisor,
    cg.type AS client_type,
    ap.name AS provider_name,
    ap.theme_color AS provider_color,
    p.portfolio_name,
    p.status AS portfolio_status,
    lpv.valuation AS current_value,
    lpv.valuation_date,
    lpir.irr_result AS current_irr,
    lpir.date AS irr_date,
    count(DISTINCT pop.product_owner_id) AS owner_count,
    string_agg(DISTINCT COALESCE(po.known_as, concat(po.firstname, ' ', po.surname)), ', '::text) AS owners,
    cp.fixed_fee_facilitated,
    cp.percentage_fee_facilitated  -- CHANGED
FROM (((((((client_products cp
    JOIN client_groups cg ON ((cp.client_id = cg.id)))
    LEFT JOIN available_providers ap ON ((cp.provider_id = ap.id)))
    LEFT JOIN portfolios p ON ((cp.portfolio_id = p.id)))
    LEFT JOIN latest_portfolio_valuations lpv ON ((p.id = lpv.portfolio_id)))
    LEFT JOIN latest_portfolio_irr_values lpir ON ((p.id = lpir.portfolio_id)))
    LEFT JOIN product_owner_products pop ON ((cp.id = pop.product_id)))
    LEFT JOIN product_owners po ON (((pop.product_owner_id = po.id) AND (po.status = 'active'::text))))
WHERE (cg.status = 'active'::text)
GROUP BY
    cp.id, cp.client_id, cp.product_name, cp.product_type, cp.status, cp.start_date,
    cp.end_date, cp.provider_id, cp.portfolio_id, cp.plan_number, cp.created_at,
    cg.name, cg.advisor, cg.type, ap.name, ap.theme_color, p.portfolio_name, p.status,
    lpv.valuation, lpv.valuation_date, lpir.irr_result, lpir.date,
    cp.fixed_fee_facilitated, cp.percentage_fee_facilitated;  -- CHANGED

-- ============================================================================
-- STEP 4: Update revenue_analytics_optimized View
-- ============================================================================
-- Changes: 1 field reference

DROP VIEW IF EXISTS revenue_analytics_optimized CASCADE;

CREATE OR REPLACE VIEW revenue_analytics_optimized AS
SELECT
    cg.id AS client_id,
    cg.name AS client_name,
    cg.status AS client_status,
    cp.id AS product_id,
    cp.fixed_fee_facilitated,
    cp.percentage_fee_facilitated,  -- CHANGED
    cp.portfolio_id,
    pf.id AS portfolio_fund_id,
    lfv.valuation AS fund_valuation,
    CASE
        WHEN (lfv.valuation IS NOT NULL) THEN true
        ELSE false
    END AS has_valuation,
    sum(COALESCE(lfv.valuation, (0)::numeric)) OVER (PARTITION BY cp.id) AS product_total_fum,
    count(pf.id) OVER (PARTITION BY cp.id) AS product_fund_count,
    count(lfv.valuation) OVER (PARTITION BY cp.id) AS product_valued_fund_count
FROM (((client_groups cg
    LEFT JOIN client_products cp ON (((cg.id = cp.client_id) AND (cp.status = 'active'::text))))
    LEFT JOIN portfolio_funds pf ON (((cp.portfolio_id = pf.portfolio_id) AND (pf.status = 'active'::text))))
    LEFT JOIN latest_portfolio_fund_valuations lfv ON ((pf.id = lfv.portfolio_fund_id)))
WHERE (cg.status = ANY (ARRAY['active'::text, 'dormant'::text]));

-- ============================================================================
-- VALIDATION: Quick Checks Before Commit
-- ============================================================================

-- Check 1: Verify column renamed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_products' AND column_name = 'percentage_fee_facilitated'
    ) THEN
        RAISE EXCEPTION 'Validation failed: percentage_fee_facilitated column not found';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'client_products' AND column_name = 'percentage_fee'
    ) THEN
        RAISE EXCEPTION 'Validation failed: percentage_fee column still exists';
    END IF;

    RAISE NOTICE 'Column rename validated successfully';
END $$;

-- Check 2: Verify views are queryable
SELECT * FROM company_revenue_analytics LIMIT 1;
SELECT * FROM products_list_view LIMIT 1;
SELECT * FROM revenue_analytics_optimized LIMIT 1;

-- If all validations pass:
COMMIT;

-- If any validation fails, transaction will auto-rollback
```

---

## Backend Changes

### Files to Update

**1. Models** (`backend/app/models/client_product.py`):
- Update 3 Pydantic classes to rename `percentage_fee` → `percentage_fee_facilitated`

**2. API Routes** (3 files):
- `backend/app/api/routes/client_groups.py` - Update SQL queries and response mapping
- `backend/app/api/routes/client_products.py` - Update validation logic and calculations 
- `backend/app/api/routes/revenue.py` - Update revenue calculation queries

### Detailed Backend Changes

**Model Updates**:
```python
# In ClientproductBase, ClientproductUpdate, and ProductRevenueCalculation
percentage_fee_facilitated: Optional[float] = None  # Percentage fee (e.g., 1.5 for 1.5%)
```

**API Route Updates**:
- Replace all `cp.percentage_fee` with `cp.percentage_fee_facilitated` in SQL queries
- Update response mapping: `"percentage_fee"` → `"percentage_fee_facilitated"`  
- Update validation logic variable names
- Update calculation logic to use new field name

---

## Frontend Changes

### Files to Update

**1. TypeScript Interfaces** (4 files):
- `frontend/src/hooks/useClientDetails.ts`
- `frontend/src/hooks/useProductDetails.ts`
- `frontend/src/pages/CreateClientProducts.tsx`
- `frontend/src/pages/ClientDetails.tsx`

**2. Component Logic** (2 main files):
- `frontend/src/pages/CreateClientProducts.tsx` - Form handling and validation
- `frontend/src/pages/ClientDetails.tsx` - Revenue calculations and display

### Detailed Frontend Changes

**Interface Updates**:
```typescript
// Change from:
percentage_fee?: number;

// Change to:
percentage_fee_facilitated?: number;
```

**Variable Naming Consistency**:
```typescript
// Change from:
const percentageFee = Number(product.percentage_fee) || 0;

// Change to:
const percentageFeeFacilitated = Number(product.percentage_fee_facilitated) || 0;
```

**Property Access Updates**:
```typescript
// Update all instances of:
product.percentage_fee → product.percentage_fee_facilitated
account.percentage_fee → account.percentage_fee_facilitated
```

**Form Field Updates**:
```typescript
// Update validation error keys:
productErrors.percentage_fee → productErrors.percentage_fee_facilitated

// Update form data keys:
percentage_fee: product.percentage_fee_facilitated ?? null
```

### Cache Invalidation Strategy

Add cache invalidation to `App.tsx` similar to Phase 1:
```typescript
// After migration, clear React Query cache
queryClient.clear();
```

---

## Validation Queries

### Pre-Migration Baseline Capture

**File**: `backend/migrations/validation/002_pre_migration_baseline.sql`

```sql
-- ============================================================================
-- Pre-Migration Baseline Capture - Phase 2
-- Execute: BEFORE running migration
-- Purpose: Capture current percentage_fee data for comparison
-- ============================================================================

-- Capture product-level percentage fee data
CREATE TEMP TABLE pre_migration_percentage_baseline AS
SELECT
    cp.id as product_id,
    cp.product_name,
    cp.client_id,
    cg.name as client_name,
    cp.status,
    cp.fixed_fee_facilitated as current_fixed_fee_facilitated,
    cp.percentage_fee as baseline_percentage_fee,
    lpv.valuation as baseline_portfolio_value,

    -- Calculate percentage revenue
    CASE
        WHEN cp.percentage_fee IS NOT NULL AND lpv.valuation > 0
        THEN (lpv.valuation * (cp.percentage_fee::numeric / 100.0))
        ELSE 0
    END as calculated_percentage_revenue,

    -- Calculate total revenue
    COALESCE(cp.fixed_fee_facilitated::numeric, 0) +
    CASE
        WHEN cp.percentage_fee IS NOT NULL AND lpv.valuation > 0
        THEN (lpv.valuation * (cp.percentage_fee::numeric / 100.0))
        ELSE 0
    END as calculated_total_revenue,

    CURRENT_TIMESTAMP as captured_at
FROM client_products cp
LEFT JOIN client_groups cg ON cp.client_id = cg.id
LEFT JOIN portfolios p ON cp.portfolio_id = p.id
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
WHERE cp.status IN ('active', 'lapsed')
ORDER BY cp.id;

-- Capture company totals
CREATE TEMP TABLE pre_migration_percentage_company_totals AS
SELECT
    sum(
        CASE
            WHEN cp.status = 'active' AND cp.percentage_fee IS NOT NULL AND pv.total_value > 0
            THEN (pv.total_value * (cp.percentage_fee::numeric / 100.0))
            ELSE 0
        END
    ) as total_percentage_revenue,

    sum(
        CASE
            WHEN cp.status = 'active' AND cp.fixed_fee_facilitated IS NOT NULL
            THEN cp.fixed_fee_facilitated::numeric
            ELSE 0
        END
    ) as total_fixed_facilitated_revenue,

    count(DISTINCT cp.id) as total_active_products,
    count(DISTINCT cp.client_id) as total_active_clients,

    CURRENT_TIMESTAMP as captured_at
FROM client_products cp
LEFT JOIN (
    SELECT
        p.id AS portfolio_id,
        sum(COALESCE(lpfv.valuation, 0)) AS total_value
    FROM portfolios p
    LEFT JOIN portfolio_funds pf ON p.id = pf.portfolio_id AND pf.status = 'active'
    LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id
    GROUP BY p.id
) pv ON cp.portfolio_id = pv.portfolio_id;

-- Display baseline summary
SELECT '=== PERCENTAGE FEE BASELINE CAPTURED ===' as status;
SELECT * FROM pre_migration_percentage_company_totals;

-- Save baseline to file
\copy (SELECT * FROM pre_migration_percentage_baseline) TO 'percentage_fee_baseline.csv' WITH CSV HEADER;
```

### Post-Migration Validation

**File**: `backend/migrations/validation/002_post_migration_validation.sql`

```sql
-- ============================================================================
-- Post-Migration Validation - Phase 2
-- Execute: IMMEDIATELY AFTER migration
-- Purpose: Verify percentage_fee_facilitated calculations match baseline
-- ============================================================================

-- Create post-migration calculations
CREATE TEMP TABLE post_migration_percentage_comparison AS
SELECT
    cp.id as product_id,
    cp.product_name,

    -- Post-migration values
    cp.percentage_fee_facilitated as current_percentage_fee_facilitated,

    -- Baseline values
    pre.baseline_percentage_fee,
    pre.calculated_percentage_revenue as baseline_percentage_revenue,
    pre.calculated_total_revenue as baseline_total_revenue,

    -- Current calculations
    CASE
        WHEN cp.percentage_fee_facilitated IS NOT NULL AND lpv.valuation > 0
        THEN (lpv.valuation * (cp.percentage_fee_facilitated::numeric / 100.0))
        ELSE 0
    END as current_percentage_revenue,

    -- Calculate differences (should be 0)
    CASE
        WHEN cp.percentage_fee_facilitated IS NOT NULL AND lpv.valuation > 0
        THEN (lpv.valuation * (cp.percentage_fee_facilitated::numeric / 100.0))
        ELSE 0
    END - pre.calculated_percentage_revenue as percentage_revenue_diff,

    CURRENT_TIMESTAMP as validated_at
FROM client_products cp
LEFT JOIN portfolios p ON cp.portfolio_id = p.id
LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
LEFT JOIN pre_migration_percentage_baseline pre ON cp.id = pre.product_id
WHERE cp.status IN ('active', 'lapsed');

-- Find mismatches
SELECT
    product_id,
    product_name,
    baseline_percentage_fee,
    current_percentage_fee_facilitated,
    percentage_revenue_diff
FROM post_migration_percentage_comparison
WHERE ABS(percentage_revenue_diff) > 0.01
ORDER BY ABS(percentage_revenue_diff) DESC;

-- Summary validation
DO $$
DECLARE
    mismatch_count INTEGER;
    null_mismatch_count INTEGER;
BEGIN
    -- Count revenue mismatches
    SELECT COUNT(*) INTO mismatch_count
    FROM post_migration_percentage_comparison
    WHERE ABS(percentage_revenue_diff) > 0.01;

    -- Count NULL mismatches
    SELECT COUNT(*) INTO null_mismatch_count
    FROM client_products cp
    LEFT JOIN pre_migration_percentage_baseline pre ON cp.id = pre.product_id
    WHERE pre.baseline_percentage_fee IS NOT NULL AND cp.percentage_fee_facilitated IS NULL;

    IF mismatch_count = 0 AND null_mismatch_count = 0 THEN
        RAISE NOTICE '========================================';
        RAISE NOTICE 'VALIDATION PASSED ✅';
        RAISE NOTICE '========================================';
        RAISE NOTICE 'All percentage fee calculations match baseline';
        RAISE NOTICE 'Migration is SUCCESSFUL';
    ELSE
        RAISE EXCEPTION 'VALIDATION FAILED ❌ - Mismatches: %, NULL issues: %',
            mismatch_count, null_mismatch_count;
        RAISE NOTICE 'EXECUTE ROLLBACK IMMEDIATELY';
    END IF;
END $$;
```

---

## Rollback Procedure

### When to Rollback

Execute rollback immediately if:
- Post-migration validation fails
- Percentage fee calculations don't match (> £0.01 difference)
- Any view fails to create
- Application shows errors
- Backend API errors occur

### Complete Rollback SQL

**File**: `backend/migrations/002_rollback_percentage_fee_facilitated.sql`

```sql
-- ============================================================================
-- ROLLBACK: Revert percentage_fee_facilitated back to percentage_fee
-- Execute: Only if migration fails or critical issues found
-- ============================================================================

BEGIN;

-- Step 1: Rename column back
ALTER TABLE client_products
RENAME COLUMN percentage_fee_facilitated TO percentage_fee;

-- Step 2: Restore company_revenue_analytics
DROP VIEW IF EXISTS company_revenue_analytics CASCADE;

CREATE OR REPLACE VIEW company_revenue_analytics AS
SELECT
    sum(
        CASE
            WHEN ((cp.status = 'active'::text) AND (cp.fixed_fee_facilitated IS NOT NULL))
            THEN (cp.fixed_fee_facilitated)::numeric
            ELSE (0)::numeric
        END) AS total_fixed_facilitated_revenue,
    sum(
        CASE
            WHEN ((cp.status = 'active'::text) AND (cp.percentage_fee IS NOT NULL) AND (pv.total_value > (0)::numeric))
            THEN (pv.total_value * ((cp.percentage_fee)::numeric / 100.0))
            ELSE (0)::numeric
        END) AS total_percentage_revenue,  -- ORIGINAL NAME RESTORED
    sum(
        CASE
            WHEN (cp.status = 'active'::text)
            THEN (COALESCE((cp.fixed_fee_facilitated)::numeric, (0)::numeric) +
            CASE
                WHEN ((cp.percentage_fee IS NOT NULL) AND (pv.total_value > (0)::numeric))
                THEN (pv.total_value * ((cp.percentage_fee)::numeric / 100.0))
                ELSE (0)::numeric
            END)
            ELSE (0)::numeric
        END) AS total_annual_revenue,
    count(DISTINCT cp.provider_id) AS active_providers,
    count(DISTINCT cp.client_id) AS active_clients,
    count(DISTINCT cp.id) AS active_products,
    sum(COALESCE(pv.total_value, (0)::numeric)) AS total_fum,
    avg(
        CASE
            WHEN ((cp.percentage_fee IS NOT NULL) AND ((cp.percentage_fee)::numeric > (0)::numeric))
            THEN (cp.percentage_fee)::numeric
            ELSE NULL::numeric
        END) AS avg_percentage_fee,  -- ORIGINAL NAME RESTORED
    avg(
        CASE
            WHEN ((cp.fixed_fee_facilitated IS NOT NULL) AND ((cp.fixed_fee_facilitated)::numeric > (0)::numeric))
            THEN (cp.fixed_fee_facilitated)::numeric
            ELSE NULL::numeric
        END) AS avg_fixed_facilitated_fee,
    CURRENT_TIMESTAMP AS calculated_at
FROM (client_products cp
    LEFT JOIN (
        SELECT p.id AS portfolio_id,
            sum(COALESCE(lpfv.valuation, (0)::numeric)) AS total_value
        FROM ((portfolios p
            LEFT JOIN portfolio_funds pf ON (((p.id = pf.portfolio_id) AND (pf.status = 'active'::text))))
            LEFT JOIN latest_portfolio_fund_valuations lpfv ON ((pf.id = lpfv.portfolio_fund_id)))
        GROUP BY p.id
    ) pv ON ((cp.portfolio_id = pv.portfolio_id)));

-- Step 3: Restore products_list_view
DROP VIEW IF EXISTS products_list_view CASCADE;

CREATE OR REPLACE VIEW products_list_view AS
SELECT
    cp.id,
    cp.client_id,
    cp.product_name,
    cp.product_type,
    cp.status,
    cp.start_date,
    cp.end_date,
    cp.provider_id,
    cp.portfolio_id,
    cp.plan_number,
    cp.created_at,
    cg.name AS client_name,
    cg.advisor,
    cg.type AS client_type,
    ap.name AS provider_name,
    ap.theme_color AS provider_color,
    p.portfolio_name,
    p.status AS portfolio_status,
    lpv.valuation AS current_value,
    lpv.valuation_date,
    lpir.irr_result AS current_irr,
    lpir.date AS irr_date,
    count(DISTINCT pop.product_owner_id) AS owner_count,
    string_agg(DISTINCT COALESCE(po.known_as, concat(po.firstname, ' ', po.surname)), ', '::text) AS owners,
    cp.fixed_fee_facilitated,
    cp.percentage_fee  -- ORIGINAL NAME RESTORED
FROM (((((((client_products cp
    JOIN client_groups cg ON ((cp.client_id = cg.id)))
    LEFT JOIN available_providers ap ON ((cp.provider_id = ap.id)))
    LEFT JOIN portfolios p ON ((cp.portfolio_id = p.id)))
    LEFT JOIN latest_portfolio_valuations lpv ON ((p.id = lpv.portfolio_id)))
    LEFT JOIN latest_portfolio_irr_values lpir ON ((p.id = lpir.portfolio_id)))
    LEFT JOIN product_owner_products pop ON ((cp.id = pop.product_id)))
    LEFT JOIN product_owners po ON (((pop.product_owner_id = po.id) AND (po.status = 'active'::text))))
WHERE (cg.status = 'active'::text)
GROUP BY
    cp.id, cp.client_id, cp.product_name, cp.product_type, cp.status, cp.start_date,
    cp.end_date, cp.provider_id, cp.portfolio_id, cp.plan_number, cp.created_at,
    cg.name, cg.advisor, cg.type, ap.name, ap.theme_color, p.portfolio_name, p.status,
    lpv.valuation, lpv.valuation_date, lpir.irr_result, lpir.date,
    cp.fixed_fee_facilitated, cp.percentage_fee;

-- Step 4: Restore revenue_analytics_optimized
DROP VIEW IF EXISTS revenue_analytics_optimized CASCADE;

CREATE OR REPLACE VIEW revenue_analytics_optimized AS
SELECT
    cg.id AS client_id,
    cg.name AS client_name,
    cg.status AS client_status,
    cp.id AS product_id,
    cp.fixed_fee_facilitated,
    cp.percentage_fee,  -- ORIGINAL NAME RESTORED
    cp.portfolio_id,
    pf.id AS portfolio_fund_id,
    lfv.valuation AS fund_valuation,
    CASE
        WHEN (lfv.valuation IS NOT NULL) THEN true
        ELSE false
    END AS has_valuation,
    sum(COALESCE(lfv.valuation, (0)::numeric)) OVER (PARTITION BY cp.id) AS product_total_fum,
    count(pf.id) OVER (PARTITION BY cp.id) AS product_fund_count,
    count(lfv.valuation) OVER (PARTITION BY cp.id) AS product_valued_fund_count
FROM (((client_groups cg
    LEFT JOIN client_products cp ON (((cg.id = cp.client_id) AND (cp.status = 'active'::text))))
    LEFT JOIN portfolio_funds pf ON (((cp.portfolio_id = pf.portfolio_id) AND (pf.status = 'active'::text))))
    LEFT JOIN latest_portfolio_fund_valuations lfv ON ((pf.id = lfv.portfolio_fund_id)))
WHERE (cg.status = ANY (ARRAY['active'::text, 'dormant'::text]));

-- Validation
SELECT * FROM company_revenue_analytics LIMIT 1;
SELECT * FROM products_list_view LIMIT 1;
SELECT * FROM revenue_analytics_optimized LIMIT 1;

COMMIT;

SELECT '✅ ROLLBACK COMPLETE' as status;
```

---

## Deployment Procedure

### Simple Offline Deployment

Since you're doing this offline when no users are online, simplified steps:

#### Step 1: Capture Baseline (5 min)
```bash
psql $DATABASE_URL -f backend/migrations/validation/002_pre_migration_baseline.sql > percentage_baseline.txt
```
- Save percentage_baseline.txt file
- Review company totals

#### Step 2: Run Migration (5 min)
```bash
psql $DATABASE_URL -f backend/migrations/002_rename_percentage_fee_to_percentage_fee_facilitated.sql
```
- Watch for errors
- Should see "COMMIT" at end

#### Step 3: Validate Migration (10 min)
```bash
psql $DATABASE_URL -f backend/migrations/validation/002_post_migration_validation.sql
```
- Look for "VALIDATION PASSED ✅"
- If you see "VALIDATION FAILED ❌", run rollback immediately

#### Step 4: Deploy Code (10 min)
```bash
# Deploy backend changes
cd backend
git pull origin main

# Deploy frontend changes
cd ../frontend
git pull origin main
npm run build
# Deploy frontend build
```

#### Step 5: Test (10 min)
- Open application
- Create a test product with percentage fee
- Check revenue page
- Verify calculations match
- Check for console errors

---

## Success Criteria

Migration is successful when ALL these are true:

- [ ] Database column is `percentage_fee_facilitated` (not `percentage_fee`)
- [ ] All 3 views recreate without errors
- [ ] Post-migration validation shows "VALIDATION PASSED ✅"
- [ ] Percentage fee calculations match baseline within £0.01
- [ ] Backend starts without errors
- [ ] Frontend loads without console errors
- [ ] Can create new products with percentage fees
- [ ] Can edit existing product percentage fees
- [ ] Revenue page displays correctly
- [ ] Revenue calculations are accurate

---

## Risk Assessment

**Risk Level**: MEDIUM-HIGH (with comprehensive mitigation)

**What Could Go Wrong**:
1. Database views fail to recreate → Automatic rollback
2. Percentage revenue calculations don't match → Immediate manual rollback
3. Application errors → Rollback and investigate
4. Frontend variable naming issues → Code review and testing

**Mitigation**:
- ✅ Following successful Phase 1 pattern
- ✅ All SQL scripts based on tested Phase 1 approach
- ✅ Complete rollback procedure ready
- ✅ Validation queries catch issues immediately
- ✅ Single transaction (all or nothing)
- ✅ Baseline captured for comparison
- ✅ Offline deployment (no user impact during deployment)

**Confidence**: 95/100

---

## Testing Strategy

### Pre-Deployment Testing

1. **Database Migration Testing**
   - Test migration script on development database
   - Verify all views recreate successfully
   - Confirm validation queries pass

2. **Backend Testing**
   - Run all tests after code changes
   - Test revenue calculation endpoints
   - Verify model serialization

3. **Frontend Testing**
   - Test product creation forms
   - Test revenue display components
   - Verify form validation

### Post-Deployment Testing

1. **Smoke Tests**
   - Create new product with percentage fee
   - Edit existing product percentage fee
   - View revenue analytics
   - Check client details page

2. **Data Integrity Tests**
   - Compare pre/post migration revenue calculations
   - Verify no data loss
   - Check edge cases (null values, zero fees)

3. **User Experience Tests**
   - Form field labels are correct
   - Error messages are clear
   - Revenue calculations display properly

---

## Quick Reference

### Files Created in This Plan

**SQL Scripts**:
- `backend/migrations/002_rename_percentage_fee_to_percentage_fee_facilitated.sql` - Migration
- `backend/migrations/validation/002_pre_migration_baseline.sql` - Baseline capture
- `backend/migrations/validation/002_post_migration_validation.sql` - Validation
- `backend/migrations/002_rollback_percentage_fee_facilitated.sql` - Rollback

**Code Changes Required**:
- Backend models and routes need updating
- Frontend interfaces and components need updating
- Cache invalidation strategy needs implementation

### Emergency Contacts

If something goes wrong:
1. Run rollback script immediately
2. Check application logs
3. Review validation output  
4. Document issue for post-mortem
5. Revert code changes if necessary

---

**Document Status**: COMPLETE AND READY FOR IMPLEMENTATION  
**Last Updated**: 2025-11-25  
**Next Action**: Create SQL scripts and implement code changes when ready

**Dependencies**: 
- Phase 1 (`fixed_cost` → `fixed_fee_facilitated`) must be completed ✅  
- Database must be accessible for migration
- Code deployment process must be available