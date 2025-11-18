# Fee Type Refactoring Plan

## Project Requirements (Client Request)

### Original Request
Client feedback indicates that instead of having 2 fee types (fixed and percentage), there should now be 3 types:
1. **Fixed Fee Direct**
2. **Fixed Fee Facilitated**
3. **Percentage Fee Facilitated**

### Affected Areas
This change will require modifications to:
- Create Client Products page
- Product Overview page
- Client Group Details page
- Revenue page
- Database structure (tables and views)

---

## Phase 1: Rename Fixed Cost → Fixed Fee Facilitated

**Objective**: Rename the current `fixed_cost` field to `fixed_fee_facilitated` throughout the entire codebase as the first step toward supporting the 3-fee-type model.

---

### Overview

This refactoring will rename the current `fixed_cost` field to `fixed_fee_facilitated` across:
- **1 database table**: `client_products`
- **1 database view**: `company_revenue_analytics` (and related views)
- **4 backend files**: Models and API routes
- **9 frontend files**: Pages, hooks, and components

**Estimated Impact**:
- Database: 1 table, ~3-5 views
- Backend: 4 files, ~20-30 line changes
- Frontend: 9 files, ~50-60 line changes
- Total Lines Changed: ~80-100 lines
- Risk Level: **Medium** (affects revenue calculations)

---

## Phase 1 Implementation Details

### 1. Database Changes

#### 1.1 Table Modifications
**Table**: `client_products`
- **Change**: Rename column `fixed_cost` → `fixed_fee_facilitated`
- **SQL Migration**:
  ```sql
  ALTER TABLE client_products
  RENAME COLUMN fixed_cost TO fixed_fee_facilitated;
  ```

#### 1.2 View Updates
**Views to Update**:
- `company_revenue_analytics` - Uses `cp.fixed_cost` in SUM calculation
- `revenue_analytics_optimized` - Likely uses fixed_cost
- Any other revenue views that reference `fixed_cost`

**Example for `company_revenue_analytics`**:
```sql
-- Current:
WHEN ((cp.status = 'active'::text) AND (cp.fixed_cost IS NOT NULL))
  THEN (cp.fixed_cost)::numeric

-- Updated:
WHEN ((cp.status = 'active'::text) AND (cp.fixed_fee_facilitated IS NOT NULL))
  THEN (cp.fixed_fee_facilitated)::numeric
```

**Action Items**:
1. Find all views using `fixed_cost` via database query
2. Drop and recreate each view with updated column name
3. Update `total_fixed_revenue` calculations to use `fixed_fee_facilitated`

**Query to Find All Views Using fixed_cost**:
```sql
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE definition LIKE '%fixed_cost%'
AND schemaname NOT IN ('pg_catalog', 'information_schema');
```

---

### 2. Backend Changes

#### 2.1 Models (`backend/app/models/client_product.py`)

**Lines to Update**: 21-22, 49-50, 72-73

**Current**:
```python
class ClientproductBase(BaseModel):
    fixed_cost: Optional[float] = None  # Fixed annual cost
    percentage_fee: Optional[float] = None
```

**Updated**:
```python
class ClientproductBase(BaseModel):
    fixed_fee_facilitated: Optional[float] = None  # Fixed annual facilitated fee
    percentage_fee: Optional[float] = None
```

**Classes to Update**:
- `ClientproductBase` (line 21-22)
- `ClientproductUpdate` (line 49-50)
- `ProductRevenueCalculation` (line 72-73)

#### 2.2 API Routes - Revenue (`backend/app/api/routes/revenue.py`)

**Lines to Update**: 33-34, 56, 128-129, 173, 315-316, 339, 349-350, 464-465, 468

**Current Pattern**:
```python
"total_fixed_revenue": float(revenue_data.get("total_fixed_revenue", 0) or 0)
revenue = fixed_cost + (total_valuations * percentage_fee / 100)
```

**Updated Pattern**:
```python
"total_fixed_facilitated_revenue": float(revenue_data.get("total_fixed_facilitated_revenue", 0) or 0)
revenue = fixed_fee_facilitated + (total_valuations * percentage_fee / 100)
```

**Specific Changes**:
- Line 33-34: Rename `total_fixed_revenue` key in analytics response
- Line 56: Update key reference in company analytics
- Lines 128-129, 173, 315-316, etc.: Update all `fixed_cost` variable references to `fixed_fee_facilitated`

#### 2.3 API Routes - Client Products (`backend/app/api/routes/client_products.py`)

**Lines to Update**: 21-22

**Changes**:
- Update any field references from `fixed_cost` to `fixed_fee_facilitated`
- Update query filters if searching by fixed fee

#### 2.4 API Routes - Client Groups (`backend/app/api/routes/client_groups.py`)

**Lines to Update**: 99, 278

**Changes**:
- Update revenue aggregation logic
- Update field references in client group breakdown calculations

---

### 3. Frontend Changes

#### 3.1 TypeScript Interfaces & Types

**Files to Update**:
- `frontend/src/hooks/useClientDetails.ts` (lines 40-41)
- `frontend/src/hooks/useProductDetails.ts` (lines 28-29)
- `frontend/src/pages/ClientDetails.tsx` (lines 90-91)
- `frontend/src/pages/CreateClientProducts.tsx` (lines 63-64)
- `frontend/src/pages/ProductOverview.tsx` (lines 62-63)

**Current**:
```typescript
interface Product {
  fixed_cost?: number;
  percentage_fee?: number;
}
```

**Updated**:
```typescript
interface Product {
  fixed_fee_facilitated?: number;
  percentage_fee?: number;
}
```

#### 3.2 ClientDetails.tsx (`frontend/src/pages/ClientDetails.tsx`)

**Lines to Update**: 90-91, 913, 1197-1198, 1271, 1542, 1838, 1840, 1846, 1849-1850, 1866, 1913-1934, 1959-1971

**Key Changes**:

1. **Line 913**: Revenue calculation function
   ```typescript
   // Current:
   calculateRevenue(account.fixed_cost, account.percentage_fee, displayValue)

   // Updated:
   calculateRevenue(account.fixed_fee_facilitated, account.percentage_fee, displayValue)
   ```

2. **Lines 1913-1934**: Form field handling
   ```typescript
   // Current:
   const fixedCost = parseFloat(formData.fixed_cost || '0');

   // Updated:
   const fixedFeeFacilitated = parseFloat(formData.fixed_fee_facilitated || '0');
   ```

3. **Lines 1959-1971**: Validation logic
   - Update field name references in validation
   - Update error messages to reference "Fixed Fee Facilitated"

#### 3.3 CreateClientProducts.tsx (`frontend/src/pages/CreateClientProducts.tsx`)

**Lines to Update**: 63-64, 1294-1309, 2552-2583

**Key Changes**:

1. **Lines 63-64**: Interface definition
   ```typescript
   fixed_fee_facilitated?: number;
   ```

2. **Lines 1294-1309**: Validation logic
   ```typescript
   // Current:
   if (product.fixed_cost === undefined || product.fixed_cost === null) {
     errors.push(`Product ${i + 1}: Fixed cost is required`);
   }

   // Updated:
   if (product.fixed_fee_facilitated === undefined || product.fixed_fee_facilitated === null) {
     errors.push(`Product ${i + 1}: Fixed Fee Facilitated is required`);
   }
   ```

3. **Lines 2552-2583**: UI Input Components
   ```tsx
   {/* Current */}
   <NumberInput
     label="Fixed Cost (Annual)"
     value={product.fixed_cost}
     onChange={(value) => updateProduct(index, 'fixed_cost', value)}
   />

   {/* Updated */}
   <NumberInput
     label="Fixed Fee Facilitated (Annual)"
     value={product.fixed_fee_facilitated}
     onChange={(value) => updateProduct(index, 'fixed_fee_facilitated', value)}
   />
   ```

#### 3.4 ProductOverview.tsx (`frontend/src/pages/ProductOverview.tsx`)

**Lines to Update**: 62-63, 346

**Changes**:
- Update interface to use `fixed_fee_facilitated`
- Update display labels in UI to show "Fixed Fee Facilitated"

#### 3.5 Phase 2 Prototype (Already Aligned)

**Note**: The Phase 2 prototype already distinguishes between `fixedFeeDirect` and `fixedFeeFacilitated`.

**Files**:
- `frontend/src/pages/phase2_prototype/types.ts` (lines 273-276) - Already has `fixedFeeFacilitated`
- `frontend/src/pages/phase2_prototype/sections/ClientManagementSection.tsx` (lines 228-229) - Already displays "Fixed Fee Facilitated"

**Action**: Keep as-is. This naming now aligns perfectly with the main system.

---

### 4. Testing & Validation

#### 4.1 Backend Tests
- [ ] Update model serialization tests
- [ ] Update API endpoint tests for revenue calculations
- [ ] Verify database migrations run successfully
- [ ] Test revenue analytics queries return correct data

#### 4.2 Frontend Tests
- [ ] Update component tests for form validation
- [ ] Test revenue calculation functions with new field names
- [ ] Verify TypeScript compilation passes
- [ ] Test UI displays "Fixed Fee Facilitated" labels correctly

#### 4.3 Integration Tests
- [ ] Create client product with fixed_fee_facilitated value
- [ ] Verify revenue calculations are correct
- [ ] Test client group aggregations
- [ ] Verify revenue analytics dashboard displays correctly

---

### 5. Execution Order

Follow this sequence to minimize disruption:

1. **Database** (requires downtime or careful migration):
   - Rename column in `client_products` table: `fixed_cost` → `fixed_fee_facilitated`
   - Update all database views
   - Test view queries return expected results

2. **Backend** (deploy simultaneously):
   - Update models: `fixed_cost` → `fixed_fee_facilitated`
   - Update API routes (revenue, client_products, client_groups)
   - Run backend tests
   - Deploy backend changes

3. **Frontend** (deploy after backend):
   - Update interfaces and types: `fixed_cost` → `fixed_fee_facilitated`
   - Update all component references
   - Update UI labels: "Fixed Cost" → "Fixed Fee Facilitated"
   - Run frontend tests
   - Build and deploy frontend changes

4. **Testing**:
   - Run full test suite (backend + frontend)
   - Manual QA on affected pages:
     - CreateClientProducts page
     - ClientDetails page
     - ProductOverview page
     - Revenue analytics page
   - Verify revenue calculations match expected values

---

### 6. Rollback Plan

If issues arise after deployment:

1. **Database**: Revert migration
   ```sql
   ALTER TABLE client_products
   RENAME COLUMN fixed_fee_facilitated TO fixed_cost;
   ```
   Then recreate views with original column names

2. **Backend**: Redeploy previous version from git
   ```bash
   git revert <commit-hash>
   # Redeploy backend
   ```

3. **Frontend**: Redeploy previous version
   ```bash
   git revert <commit-hash>
   npm run build
   # Redeploy frontend
   ```

4. **Cache**: Clear browser caches for all users or increment app version to force refresh

---

## Phase 2: Add Fixed Fee Direct & Percentage Fee Facilitated

**Objective**: After Phase 1 is complete and stable, add the two new fee types to support the full 3-fee-type model.

### Phase 2 Changes (Overview)

1. **Database**:
   - Add `fixed_fee_direct` column to `client_products` table
   - Rename `percentage_fee` → `percentage_fee_facilitated`
   - Update all views to include new fee types
   - Update revenue calculations to sum all 3 fee types

2. **Backend**:
   - Add `fixed_fee_direct` to models
   - Rename `percentage_fee` → `percentage_fee_facilitated`
   - Update revenue calculation logic:
     ```python
     total_revenue = (
         fixed_fee_direct +
         fixed_fee_facilitated +
         (portfolio_value * percentage_fee_facilitated / 100)
     )
     ```

3. **Frontend**:
   - Update forms to include 3 fee input fields
   - Update validation to handle 3 fee types
   - Update revenue display to show breakdown by fee type
   - Update UI labels and help text

### Phase 2 Impact Areas
- CreateClientProducts page: Add fixed_fee_direct input field
- ClientDetails page: Update revenue assignment form with 3 fields
- ProductOverview page: Display all 3 fee types
- Revenue page: Show breakdown of revenue by fee type
- Client Group Details: Aggregate 3 fee types per client

**Note**: Detailed Phase 2 plan to be created after Phase 1 is successfully deployed.

---

## Success Criteria

### Phase 1 Complete When:
- [ ] Database column renamed: `fixed_cost` → `fixed_fee_facilitated`
- [ ] All database views updated and returning correct data
- [ ] Backend models and routes updated with new field name
- [ ] Frontend interfaces and components updated
- [ ] All UI labels display "Fixed Fee Facilitated"
- [ ] All tests passing (backend + frontend)
- [ ] Revenue calculations accurate on all affected pages
- [ ] No console errors or TypeScript compilation errors
- [ ] Manual QA completed and signed off

### Full Project Complete When:
- [ ] Phase 1 deployed and stable
- [ ] Phase 2 planned and implemented
- [ ] All 3 fee types (fixed_fee_direct, fixed_fee_facilitated, percentage_fee_facilitated) functional
- [ ] Revenue calculations correctly sum all 3 fee types
- [ ] UI supports creating/editing all 3 fee types
- [ ] Existing client products migrated/compatible with new structure
- [ ] Documentation updated

---

## Risk Assessment

### Medium Risks
- **Revenue Calculation Impact**: Changes affect core revenue calculations across multiple pages
- **Data Migration**: Existing products need column rename without data loss
- **View Dependencies**: Multiple database views depend on `fixed_cost` column

### Mitigation Strategies
- Thorough testing of revenue calculations before deployment
- Database migration tested on staging environment first
- Comprehensive rollback plan documented and tested
- Phased approach (Phase 1 → Phase 2) reduces risk
- Manual QA on all affected pages before production deployment

---

## Notes

- Phase 2 prototype already implements `fixedFeeDirect` and `fixedFeeFacilitated` separation, providing a reference implementation
- Current system has 2 fee models: Managed Products (fixed_cost + percentage_fee) and Phase 2 Client Management (fixedFeeDirect + fixedFeeFacilitated + percentageFee)
- After full refactoring, both models will align with 3-fee-type structure
- Consider whether old client products should default `fixed_fee_direct = 0` or migrate `fixed_cost` values to one of the new fields

---

## Appendix: File Reference

### Backend Files
1. `backend/app/models/client_product.py` - 3 classes to update
2. `backend/app/api/routes/revenue.py` - ~10 locations
3. `backend/app/api/routes/client_products.py` - CRUD operations
4. `backend/app/api/routes/client_groups.py` - Aggregations

### Frontend Files
1. `frontend/src/hooks/useClientDetails.ts` - Data fetching
2. `frontend/src/hooks/useProductDetails.ts` - Product data
3. `frontend/src/pages/ClientDetails.tsx` - Revenue form (~15 locations)
4. `frontend/src/pages/CreateClientProducts.tsx` - Product creation (~20 locations)
5. `frontend/src/pages/ProductOverview.tsx` - Product display
6. `frontend/src/pages/phase2_prototype/types.ts` - Type definitions (reference)
7. `frontend/src/pages/phase2_prototype/sampleData.ts` - Sample data (reference)
8. `frontend/src/pages/phase2_prototype/sections/ClientManagementSection.tsx` - Fee display (reference)
9. `frontend/src/pages/phase2_prototype/tabs/BasicDetailsTab.tsx` - Integration (reference)

### Database Objects
- Table: `client_products` (column: `fixed_cost` → `fixed_fee_facilitated`)
- Views: `company_revenue_analytics`, `revenue_analytics_optimized`, and others

---

**Document Version**: 1.0
**Created**: 2025-11-18
**Status**: Phase 1 - Planning Complete, Implementation Pending
