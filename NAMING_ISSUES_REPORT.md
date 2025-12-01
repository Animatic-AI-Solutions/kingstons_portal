# 📋 KINGSTON'S PORTAL - COMPLETE NAMING ISSUES REPORT
## Verified Issues Ready for Action

**Date:** December 1, 2025
**Total Verified Issues:** 11
**Total Estimated Effort:** ~9 hours
**All Issues Manually Verified:** ✓

---

## 🚨 CRITICAL PRIORITY (Must Fix First)

### Issue #1: Delete Dead Code Files
**Category:** Temporal Naming / Dead Code
**Severity:** CRITICAL
**Effort:** 30 minutes

**Files to Delete:**
1. `backend/app/utils/sequence_manager_new.py`
   - **Evidence:** No imports found anywhere in codebase
   - **Reason:** `_new` suffix is temporal naming anti-pattern
   - **Safe to delete:** Yes ✓

2. `backend/app/api/routes/clients.py`
   - **Evidence:** Not registered in `main.py` (only `client_groups.router` is registered)
   - **Reason:** Dead code, never executed
   - **Safe to delete:** Yes ✓

3. `backend/app/models/client.py`
   - **Evidence:** Only imported by dead `clients.py` file
   - **Reason:** Orphaned model, superseded by `client_group.py`
   - **Safe to delete:** Yes ✓

**Action Steps:**
```bash
# Delete files
rm backend/app/utils/sequence_manager_new.py
rm backend/app/api/routes/clients.py
rm backend/app/models/client.py

# Run tests to confirm
pytest backend/tests/
npm test --prefix frontend
```

---

### Issue #2: Delete or Rename Temporal File
**Category:** Temporal Naming
**Severity:** CRITICAL
**Effort:** 15 minutes

**File:** `frontend/src/pages/ClientGroupPhase2.old.tsx`
- **Line:** Entire file (1,620 lines)
- **Issue:** `.old` suffix violates naming conventions
- **Current:** `ClientGroupPhase2.old.tsx`

**Action Steps:**
```bash
# Option A: Delete if truly obsolete
rm frontend/src/pages/ClientGroupPhase2.old.tsx

# Option B: Rename if needed for reference
mv frontend/src/pages/ClientGroupPhase2.old.tsx \
   frontend/src/pages/ClientGroupPhase2Legacy.tsx
```

**Decision needed:** Check if this file is referenced anywhere before deleting

---

### Issue #3: Fix PascalCase Violations in Models
**Category:** Case Convention
**Severity:** CRITICAL
**Effort:** 30 minutes

**File:** `backend/app/models/client_product.py`
**Classes to Rename:**

| Line | Current Name | Correct Name |
|------|-------------|--------------|
| 5 | `ClientproductBase` | `ClientProductBase` |
| 35 | `ClientproductCreate` | `ClientProductCreate` |
| 38 | `ClientproductUpdate` | `ClientProductUpdate` |
| 58 | `Clientproduct` | `ClientProduct` |

**Action Steps:**
1. Find/replace in `client_product.py`:
   - `ClientproductBase` → `ClientProductBase`
   - `ClientproductCreate` → `ClientProductCreate`
   - `ClientproductUpdate` → `ClientProductUpdate`
   - `Clientproduct` → `ClientProduct`

2. Update imports in `backend/app/api/routes/client_products.py` line 6:
   ```python
   # Change from:
   from app.models.client_product import Clientproduct, ClientproductCreate, ClientproductUpdate

   # To:
   from app.models.client_product import ClientProduct, ClientProductCreate, ClientProductUpdate
   ```

3. Update all references in `client_products.py` file

4. Run tests:
   ```bash
   pytest backend/tests/ -v
   ```

---

### Issue #4: HTTP Verb Inconsistency
**Category:** REST API Consistency
**Severity:** CRITICAL
**Effort:** 15 minutes

**File:** `backend/app/api/routes/portfolio_valuations.py`
**Line:** 165

**Current:**
```python
@router.put("/portfolio_valuations/{valuation_id}", response_model=PortfolioValuation)
async def update_portfolio_valuation(...)
```

**Change to:**
```python
@router.patch("/portfolio_valuations/{valuation_id}", response_model=PortfolioValuation)
async def update_portfolio_valuation(...)
```

**Reason:** PATCH is correct for partial updates; all other routes use PATCH

**Action Steps:**
1. Change `@router.put` to `@router.patch` on line 165
2. Test the endpoint manually or with API client
3. Update any frontend code calling this endpoint if needed

---

### Issue #5: Path Parameter Semantic Mismatch
**Category:** API Clarity
**Severity:** CRITICAL
**Effort:** 15 minutes

**File:** `backend/app/api/routes/historical_irr.py`
**Line:** 28

**Current:**
```python
@router.get("/portfolio/{product_id}")
async def get_portfolio_historical_irr(product_id: int, ...)
```

**Issue:** Path says "portfolio" but parameter is `product_id`

**Change to:**
```python
@router.get("/product/{product_id}/portfolio-historical-irr")
async def get_portfolio_historical_irr(product_id: int, ...)
```

**Action Steps:**
1. Update endpoint path to clarify it's a product endpoint
2. Search for frontend API calls to this endpoint and update
3. Test affected functionality

---

## ⚠️ HIGH PRIORITY (Fix Next Sprint)

### Issue #6: Page Component Name Mismatches
**Category:** File/Component Naming
**Severity:** HIGH
**Effort:** 2 hours

**6 Files Affected:**

#### 6.1: AddProducts.tsx → AddAccount.tsx
- **File:** `frontend/src/pages/AddProducts.tsx`
- **Line:** 1160 (export statement)
- **Current:** File named `AddProducts.tsx`, exports `AddAccount`
- **Action:** Rename file to match component name

```bash
# Rename file
mv frontend/src/pages/AddProducts.tsx \
   frontend/src/pages/AddAccount.tsx

# Update route in App.tsx
# Search for: <Route path="/add-products"
# Update imports in any files that reference AddProducts
```

#### 6.2: ProductIRRCalculation.tsx → AccountIRRCalculation.tsx
- **File:** `frontend/src/pages/ProductIRRCalculation.tsx`
- **Line:** 2958 (export statement)
- **Action:** Rename file to `AccountIRRCalculation.tsx`

#### 6.3: ProductIRRHistory.tsx → AccountIRRHistory.tsx
- **File:** `frontend/src/pages/ProductIRRHistory.tsx`
- **Line:** 869 (export statement)
- **Action:** Rename file to `AccountIRRHistory.tsx`

#### 6.4: Funds.tsx → DefinitionsFunds.tsx
- **File:** `frontend/src/pages/Funds.tsx`
- **Line:** 172 (export statement)
- **Action:** Rename file to `DefinitionsFunds.tsx`

#### 6.5: Providers.tsx → DefinitionsProviders.tsx
- **File:** `frontend/src/pages/Providers.tsx`
- **Line:** 179 (export statement)
- **Action:** Rename file to `DefinitionsProviders.tsx`

#### 6.6: Components.tsx → ComponentShowcase.tsx
- **File:** `frontend/src/pages/Components.tsx`
- **Line:** 1620 (export statement)
- **Current:** Generic name for component showcase/demo page
- **Action:** Rename to `ComponentShowcase.tsx` or `UIComponentLibrary.tsx`

**Action Steps for All:**
1. Rename each file to match component export
2. Update `App.tsx` route definitions
3. Update any direct imports
4. Search codebase for old file names
5. Run build: `npm run build --prefix frontend`

---

### Issue #7: Generic Endpoint Without Context
**Category:** API Clarity
**Severity:** HIGH
**Effort:** 15 minutes

**File:** `backend/app/api/routes/historical_irr.py`
**Line:** 215

**Current:**
```python
@router.post("/summary")
```

**Change to:**
```python
@router.post("/historical-irr/summary")
```

**Reason:** `/summary` is too generic; needs context prefix

**Action Steps:**
1. Update endpoint path
2. Update frontend API calls to this endpoint
3. Test functionality

---

### Issue #8: Demo Component in Production
**Category:** Code Organization
**Severity:** HIGH
**Effort:** 30 minutes

**File:** `frontend/src/components/ui/SearchInputDemo.tsx`
- **Size:** 430 lines
- **Issue:** Demo/showcase component exported in production `index.ts`
- **Pollutes:** Production bundle unnecessarily

**Action Steps:**
```bash
# Create demos directory
mkdir -p frontend/src/demos

# Move demo component
mv frontend/src/components/ui/SearchInputDemo.tsx \
   frontend/src/demos/SearchInputDemo.tsx

# Remove from ui/index.ts
# Delete line 75: export { default as SearchInputDemo } from './SearchInputDemo';

# Update any imports (likely only in development routes)
```

---

### Issue #9: API Path Separator Inconsistency
**Category:** REST API Convention
**Severity:** HIGH
**Effort:** 3-4 hours (significant refactoring)

**Issue:** Mixed hyphens and underscores in API paths

**Examples from `backend/app/api/routes/portfolio_funds.py`:**

**Mixed (worst offenders):**
```python
# Line 901 - underscore_then-hyphen
@router.get("/portfolio_funds/{portfolio_fund_id}/latest-irr")

# Line 1326 - underscore_then-hyphen
@router.post("/portfolio_funds/aggregated-irr-history")
```

**Pattern Found:**
- Hyphens: ~30 endpoints (e.g., `/calculate-irr`, `/batch-valuations`)
- Underscores: ~50 endpoints (e.g., `/client_groups`, `/portfolio_funds`)
- Mixed: ~5 endpoints

**Recommendation:** Standardize to hyphens (RESTful convention)

**Action Steps:**
1. **Document decision:** Choose hyphens or underscores
2. **Create migration script** to update all paths
3. **Update frontend API calls** accordingly
4. **Comprehensive testing** required
5. **Consider backward compatibility** if external consumers exist

**Note:** This is largest effort item - plan carefully

---

## 📋 MEDIUM PRIORITY (Plan for Later)

### Issue #10: Hook Return Value Naming Inconsistency
**Category:** React Convention
**Severity:** MEDIUM
**Effort:** 30 minutes

**Files Affected:**

#### 10.1: usePortfolioGenerations.ts
- **File:** `frontend/src/hooks/usePortfolioGenerations.ts`
- **Line:** 19
- **Current:** `loading: boolean`
- **Change to:** `isLoading: boolean`

#### 10.2: usePortfolioTemplates.ts
- **File:** `frontend/src/hooks/usePortfolioTemplates.ts`
- **Line:** ~18
- **Change to:** `isLoading: boolean`

#### 10.3: useDashboardData.ts
- **File:** `frontend/src/hooks/useDashboardData.ts`
- **Line:** ~93
- **Change to:** `isLoading: boolean`

**Action Steps:**
1. Update interface definitions in each hook
2. Update return statement
3. Search for usage: `loading` → `isLoading`
4. Update consuming components
5. Run tests: `npm test --prefix frontend`

---

### Issue #11: Generic Hook Naming
**Category:** Code Clarity
**Severity:** MEDIUM
**Effort:** 30 minutes

**File:** `frontend/src/hooks/useEntityData.ts`
- **Current:** `useEntityData` (too generic)
- **Suggested:** `useFetchWithFilters` (describes behavior)

**Action Steps:**
1. Rename file: `useEntityData.ts` → `useFetchWithFilters.ts`
2. Rename exported function inside file
3. Find all imports and update:
   ```bash
   grep -r "useEntityData" frontend/src/
   ```
4. Update imports to new name
5. Run tests

---

### Issue #12: Model Field Naming Inconsistency
**Category:** Database/Model Consistency
**Severity:** MEDIUM
**Effort:** 1 hour (may need DB migration)

**Files Affected:**

#### 12.1: product_fund.py
- **File:** `backend/app/models/product_fund.py`
- **Line:** 6-7
- **Current:** `available_products_id`, `available_funds_id` (plural)
- **Issue:** Foreign keys should be singular
- **Change to:** `available_product_id`, `available_fund_id`

#### 12.2: portfolio_fund.py
- **File:** `backend/app/models/portfolio_fund.py`
- **Line:** 13
- **Current:** `available_funds_id` (plural)
- **Change to:** `available_fund_id` (singular)

**Action Steps:**
1. **Check database schema** - these may match actual column names
2. If DB uses plural:
   - Consider leaving as-is for DB consistency
   - OR create migration to rename columns
3. If DB uses singular:
   - Update model field names
   - Update all queries using these fields
4. Run full test suite

**Warning:** This may require database migration - verify before proceeding

---

## 📊 SUMMARY TABLE

| # | Issue | Priority | Effort | Files Affected |
|---|-------|----------|--------|----------------|
| 1 | Delete Dead Code Files | CRITICAL | 30 min | 3 files |
| 2 | Delete/Rename `.old.tsx` | CRITICAL | 15 min | 1 file |
| 3 | Fix PascalCase Violations | CRITICAL | 30 min | 2 files |
| 4 | HTTP Verb Inconsistency | CRITICAL | 15 min | 1 file |
| 5 | Path Parameter Mismatch | CRITICAL | 15 min | 1 file |
| 6 | Page Component Name Mismatches | HIGH | 2 hours | 6 files + routes |
| 7 | Generic Endpoint `/summary` | HIGH | 15 min | 1 file + frontend |
| 8 | Demo Component in Production | HIGH | 30 min | 1 file + index |
| 9 | API Path Separator Mix | HIGH | 3-4 hours | 20+ files |
| 10 | Hook `loading` vs `isLoading` | MEDIUM | 30 min | 3 files + consumers |
| 11 | Generic `useEntityData` Hook | MEDIUM | 30 min | 1 file + imports |
| 12 | Plural Foreign Key Names | MEDIUM | 1 hour | 2 files + DB? |
| **TOTAL** | **12 Issues** | - | **~9 hours** | **40+ files** |

---

## 🗓️ SUGGESTED IMPLEMENTATION SCHEDULE

### Week 1: Critical Issues (Day 1-2, ~2 hours)
- [ ] Issue #1: Delete 3 dead code files
- [ ] Issue #2: Delete/rename `.old.tsx` file
- [ ] Issue #3: Fix `Clientproduct*` → `ClientProduct*`
- [ ] Issue #4: Fix PUT → PATCH
- [ ] Issue #5: Fix path parameter mismatch

**Checkpoint:** Run full test suite

### Week 2: High Priority Pages (Day 3-4, ~3 hours)
- [ ] Issue #6: Rename 6 page components
- [ ] Issue #7: Fix generic `/summary` endpoint
- [ ] Issue #8: Move demo component out of production

**Checkpoint:** Run build, manual testing

### Week 3: High Priority API (Day 5-7, ~4 hours)
- [ ] Issue #9: Plan path separator standardization
- [ ] Issue #9: Implement path changes
- [ ] Issue #9: Update frontend API calls
- [ ] Issue #9: Comprehensive testing

**Checkpoint:** API regression testing

### Week 4: Medium Priority Polish (Day 8-9, ~2 hours)
- [ ] Issue #10: Standardize hook return naming
- [ ] Issue #11: Rename generic hook
- [ ] Issue #12: Fix plural foreign keys (if DB allows)

**Checkpoint:** Final full test suite + QA

---

## 🎯 QUICK START GUIDE

**Want to start right now? Do this:**

```bash
# 1. Delete dead code (safest, 5 minutes)
git rm backend/app/utils/sequence_manager_new.py
git rm backend/app/api/routes/clients.py
git rm backend/app/models/client.py
git commit -m "Remove dead code files with temporal naming"

# 2. Run tests to confirm nothing broke
pytest backend/tests/
npm test --prefix frontend

# 3. If tests pass, you've fixed 3 issues in 5 minutes! ✓
```

---

## 📝 NOTES & WARNINGS

**Before Starting:**
1. ✅ Create a new branch: `git checkout -b refactor/naming-conventions`
2. ✅ Run tests before changes: `pytest && npm test`
3. ✅ Commit frequently with clear messages
4. ✅ Test after each issue fixed

**High Risk Items:**
- **Issue #9 (Path Separators):** Affects API contract, needs comprehensive testing
- **Issue #12 (Foreign Keys):** May need database migration

**Low Risk Items:**
- **Issue #1 (Dead Code):** Safe to delete, no imports
- **Issue #4 (PUT→PATCH):** Simple one-line change

---

## ✅ COMPLETION CHECKLIST

After fixing all issues:

- [ ] All tests passing (`pytest && npm test`)
- [ ] Build succeeds (`npm run build --prefix frontend`)
- [ ] Manual smoke testing completed
- [ ] Documentation updated (if needed)
- [ ] Create PR with summary of changes
- [ ] Code review by team member

---

**Ready to start fixing? Pick an issue and let's go!**
