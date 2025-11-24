# Deployment Runbook: Migration 001 - Fixed Cost to Fixed Fee Facilitated

**Migration**: 001_rename_fixed_cost_to_fixed_fee_facilitated
**Created**: 2025-11-24
**Risk Level**: MEDIUM-HIGH
**Estimated Duration**: 30-45 minutes
**Rollback Time**: 15-20 minutes

## Overview

This deployment implements Phase 1 of the fee type refactoring, renaming `fixed_cost` to `fixed_fee_facilitated` across the entire stack.

**Impact**:
- 1 database table column
- 3 database views (7 total references)
- 7 backend files
- 3 Pydantic models
- 4 frontend pages
- React Query cache

## Pre-Deployment Checklist

### ☐ Team Coordination
- [ ] Notify all stakeholders of maintenance window
- [ ] Schedule deployment during low-traffic period
- [ ] Ensure all team members available for deployment
- [ ] Confirm rollback procedures understood by team

### ☐ Environment Verification
- [ ] Verify database backup completed within last 24 hours
- [ ] Confirm staging environment testing passed
- [ ] Verify all validation queries run successfully
- [ ] Check application logs are clear of errors

### ☐ Code Preparation
- [ ] All frontend changes committed and pushed
- [ ] All backend changes committed and pushed
- [ ] Database migration scripts reviewed and tested
- [ ] Rollback scripts prepared and accessible

### ☐ Access Verification
- [ ] Database admin access confirmed
- [ ] Server deployment access confirmed
- [ ] Ability to restart backend services confirmed
- [ ] Ability to deploy frontend build confirmed

## Deployment Phases

### Phase 1: Pre-Migration Validation (5 minutes)

**Objective**: Capture baseline state and verify environment readiness

**Steps**:
1. Connect to production database
   ```bash
   psql $DATABASE_URL
   ```

2. Run pre-migration baseline capture
   ```sql
   \i backend/migrations/validation/001_pre_migration_baseline.sql
   ```

3. Save output to file for comparison
   ```bash
   psql $DATABASE_URL -f backend/migrations/validation/001_pre_migration_baseline.sql > baseline_output_$(date +%Y%m%d_%H%M%S).txt
   ```

4. Verify baseline captured successfully
   - Check for any query errors
   - Verify company totals match expected values
   - Confirm edge case counts are reasonable

**Success Criteria**:
- ✅ All baseline queries execute without errors
- ✅ Baseline data captured to file
- ✅ Company revenue totals match dashboard

**If Failed**: STOP - Investigate baseline query errors before proceeding

---

### Phase 2: Database Migration (5 minutes)

**Objective**: Execute schema changes in single transaction

**Steps**:
1. Review migration script one final time
   ```bash
   cat backend/migrations/001_rename_fixed_cost_to_fixed_fee_facilitated.sql
   ```

2. Execute migration (this is the point of no return until validation)
   ```sql
   \i backend/migrations/001_rename_fixed_cost_to_fixed_fee_facilitated.sql
   ```

3. Monitor for any errors during execution
   - Watch for constraint violations
   - Check for view creation errors
   - Verify transaction commits successfully

**Success Criteria**:
- ✅ Migration completes without errors
- ✅ Transaction commits successfully
- ✅ No constraint violations

**If Failed**:
- Database automatically rolls back transaction
- Review error messages
- DO NOT proceed to Phase 3
- Execute rollback procedure (see Rollback section)

---

### Phase 3: Post-Migration Validation (10 minutes)

**Objective**: Verify all revenue calculations match baseline

**Steps**:
1. Run post-migration validation immediately
   ```sql
   \i backend/migrations/validation/001_post_migration_validation.sql
   ```

2. Review validation output carefully:
   ```sql
   -- Check for revenue differences
   SELECT * FROM post_migration_revenue_comparison
   WHERE ABS(total_revenue_diff) > 0.01
   ORDER BY ABS(total_revenue_diff) DESC;

   -- Check company totals
   SELECT * FROM post_migration_company_comparison;
   ```

3. Compare to baseline captured in Phase 1

4. Verify all validation checks pass:
   - Revenue differences < £0.01 for all products
   - No NULL value mismatches
   - Company totals match baseline
   - All views queryable

**Success Criteria**:
- ✅ All revenue calculations match baseline (within £0.01)
- ✅ Zero NULL value mismatches
- ✅ Company totals identical to baseline
- ✅ Validation script outputs "VALIDATION PASSED ✅"

**If Failed**:
- IMMEDIATE ROLLBACK REQUIRED
- Execute rollback procedure (see Rollback section)
- DO NOT proceed to Phase 4
- Schedule post-mortem to investigate failure

---

### Phase 4: Backend Deployment (5 minutes)

**Objective**: Deploy updated backend code with new field names

**Steps**:
1. Stop backend service
   ```powershell
   # Stop PM2 process
   pm2 stop kingstons-api
   ```

2. Deploy backend changes
   ```bash
   git pull origin main
   cd backend
   pip install -r requirements.txt --upgrade
   ```

3. Verify Pydantic models updated
   ```bash
   grep -n "fixed_fee_facilitated" backend/app/models/client_product.py
   ```

4. Start backend service
   ```powershell
   pm2 start kingstons-api
   ```

5. Monitor logs for startup errors
   ```powershell
   pm2 logs kingstons-api --lines 50
   ```

6. Test API health endpoint
   ```bash
   curl http://localhost:8001/health
   ```

**Success Criteria**:
- ✅ Backend starts without errors
- ✅ Health endpoint returns 200 OK
- ✅ No Pydantic validation errors in logs
- ✅ Database connections established

**If Failed**:
- Check logs for specific errors
- Verify database migration completed
- If backend won't start, execute rollback procedure
- DO NOT proceed to Phase 5

---

### Phase 5: Frontend Deployment (5 minutes)

**Objective**: Deploy updated frontend with cache invalidation

**Steps**:
1. Build frontend with updated field names
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. Verify build completes without errors
   ```bash
   echo $?  # Should output 0
   ```

3. Deploy frontend build
   ```powershell
   # Using deployment script
   .\deploy_minimal.ps1
   ```

4. Verify new build deployed
   - Check build timestamp
   - Verify App.tsx includes CacheInvalidationHandler
   - Confirm SCHEMA_VERSION is 1.1.0

**Success Criteria**:
- ✅ Frontend build completes without errors
- ✅ No TypeScript compilation errors
- ✅ Deployment script completes successfully
- ✅ New build accessible via browser

**If Failed**:
- Review build errors
- Check for TypeScript errors in updated files
- Verify all imports correct
- If critical, rollback deployment

---

### Phase 6: Cache Invalidation Verification (3 minutes)

**Objective**: Ensure React Query cache cleared for all users

**Steps**:
1. Open browser developer tools
2. Access application and check console
3. Verify cache invalidation message appears:
   ```
   Schema version changed: 1.0.0 → 1.1.0
   Invalidating React Query cache to prevent stale data...
   ✅ Cache invalidation complete
   ```

4. Verify localStorage updated:
   ```javascript
   localStorage.getItem('app_schema_version') // Should be '1.1.0'
   ```

5. Test multiple browsers/incognito windows to ensure consistent behavior

**Success Criteria**:
- ✅ Cache invalidation message appears in console
- ✅ localStorage version updated to 1.1.0
- ✅ No console errors after invalidation
- ✅ Data fetches successfully after cache clear

**If Failed**:
- Check if CacheInvalidationHandler component rendering
- Verify SCHEMA_VERSION constant is 1.1.0
- Clear browser cache manually as temporary workaround
- Consider forced page refresh for all users

---

### Phase 7: Functional Testing (5 minutes)

**Objective**: Verify all critical user workflows function correctly

**Test Cases**:

#### Test 1: View Client Details
- [ ] Navigate to Clients page
- [ ] Click on a client with products
- [ ] Verify "Fixed Fee Facilitated (£)" displays in product table
- [ ] Verify amounts display correctly
- [ ] Check for any console errors

#### Test 2: Create New Product
- [ ] Navigate to Create Client Products page
- [ ] Fill out product form
- [ ] Enter fixed fee amount in "Fixed Fee Facilitated (£)" field
- [ ] Submit form
- [ ] Verify product created successfully
- [ ] Verify fixed fee saved correctly

#### Test 3: Edit Existing Product
- [ ] Navigate to Product Overview page
- [ ] Edit a product with fixed fee
- [ ] Modify fixed fee amount
- [ ] Save changes
- [ ] Verify update saved correctly
- [ ] Check product display shows updated amount

#### Test 4: Revenue Calculations
- [ ] Navigate to Revenue page
- [ ] Verify company totals display correctly
- [ ] Check individual client revenue displays
- [ ] Verify fixed facilitated fee calculations correct
- [ ] Compare to baseline totals from Phase 1

#### Test 5: Product Details API
- [ ] Test API endpoint: GET /api/client_products/{id}
- [ ] Verify response includes `fixed_fee_facilitated` field
- [ ] Verify no `fixed_cost` field in response
- [ ] Check revenue calculation endpoint works

**Success Criteria**:
- ✅ All 5 test cases pass
- ✅ No console errors during testing
- ✅ UI displays "Fixed Fee Facilitated" correctly
- ✅ Revenue calculations match expected values
- ✅ CRUD operations work correctly

**If Failed**:
- Document which test failed
- Check browser console for errors
- Review API responses for incorrect field names
- If critical functionality broken, execute rollback

---

### Phase 8: Monitoring & Verification (24 hours)

**Objective**: Monitor production for issues and ensure stability

**Immediate Monitoring (First Hour)**:
1. Monitor application logs
   ```powershell
   pm2 logs kingstons-api --lines 100
   ```

2. Watch for errors related to:
   - `fixed_fee_facilitated` field not found
   - Pydantic validation errors
   - Database query errors
   - Frontend console errors

3. Monitor user activity:
   - Check if users creating products successfully
   - Verify no support tickets about broken functionality
   - Monitor revenue page for calculation errors

**4-Hour Check**:
- [ ] Review error logs
- [ ] Check for any user-reported issues
- [ ] Verify revenue reports accurate
- [ ] Monitor database performance

**24-Hour Check**:
- [ ] Compare revenue totals to previous day
- [ ] Verify all clients can access their data
- [ ] Check for any delayed error reports
- [ ] Review application metrics

**Success Criteria**:
- ✅ Zero critical errors in 24 hours
- ✅ No user-reported functionality issues
- ✅ Revenue calculations consistent
- ✅ Application performance normal

**If Issues Arise**:
- Minor issues: Document and schedule fix
- Moderate issues: Investigate and patch if possible
- Critical issues: Execute rollback procedure immediately

---

## Rollback Procedure

### When to Rollback

Execute rollback immediately if ANY of these occur:
- Post-migration validation fails (Phase 3)
- Backend fails to start (Phase 4)
- Critical functionality broken (Phase 7)
- Revenue calculations incorrect (Phase 7)
- Database errors in production (Phase 8)

### Rollback Steps

#### 1. Stop Application Traffic (if possible)
```powershell
# Stop backend
pm2 stop kingstons-api
```

#### 2. Execute Database Rollback
```sql
\i backend/migrations/001_rollback_fixed_fee_facilitated.sql
```

#### 3. Verify Rollback Success
```sql
-- Check column reverted
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'client_products'
AND column_name IN ('fixed_cost', 'fixed_fee_facilitated');

-- Should show 'fixed_cost', NOT 'fixed_fee_facilitated'
```

#### 4. Rollback Backend Code
```bash
git checkout HEAD~1  # Rollback to previous commit
cd backend
pm2 restart kingstons-api
```

#### 5. Rollback Frontend Code
```bash
cd frontend
git checkout HEAD~1
npm run build
# Deploy previous build
```

#### 6. Reset Schema Version
Update App.tsx:
```typescript
const SCHEMA_VERSION = '1.0.0';  // Revert from 1.1.0
```

Rebuild and deploy frontend.

#### 7. Verify Rollback Complete
- [ ] Database column is `fixed_cost`
- [ ] Backend starts without errors
- [ ] Frontend displays "Fixed Cost" labels
- [ ] API returns `fixed_cost` in responses
- [ ] No errors in application logs

#### 8. Communicate Rollback
- Notify team of rollback completion
- Document reason for rollback
- Schedule post-mortem meeting
- Plan fixes for identified issues

---

## Communication Plan

### Pre-Deployment
**Timing**: 24 hours before deployment
**Audience**: All users
**Message**:
```
Scheduled Maintenance: [DATE] at [TIME]

We will be performing database maintenance to improve system functionality.

Expected Duration: 30-45 minutes
Impact: Brief application downtime
Recommended Action: Save work before [TIME]

Contact [SUPPORT] with questions.
```

### During Deployment
**Timing**: At start of deployment
**Audience**: Team members
**Communication**: Slack/Teams channel updates at each phase

### Post-Deployment Success
**Timing**: After Phase 7 completion
**Audience**: All users
**Message**:
```
Maintenance Complete

Database maintenance completed successfully. All systems operational.

You may need to refresh your browser to see the latest version.

Thank you for your patience.
```

### Post-Deployment Failure
**Timing**: Immediately after rollback
**Audience**: All users + Management
**Message**:
```
Maintenance Update

We encountered an issue during maintenance and have rolled back changes.

All systems restored to normal operation.

We will reschedule the maintenance and provide advance notice.

We apologize for any inconvenience.
```

---

## Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Document any issues encountered
- [ ] Update runbook with lessons learned
- [ ] Verify all monitoring dashboards show green
- [ ] Send completion report to stakeholders

### Short-term (Week 1)
- [ ] Monitor for late-emerging issues
- [ ] Review user feedback and support tickets
- [ ] Validate revenue reports match expectations
- [ ] Update documentation with any corrections

### Planning (Week 2)
- [ ] Schedule retrospective meeting
- [ ] Identify improvements for future migrations
- [ ] Begin planning Phase 2: Add fixed_fee_direct
- [ ] Update refactoring plan with actual timings

---

## Emergency Contacts

**Database Admin**: [CONTACT]
**Backend Lead**: [CONTACT]
**Frontend Lead**: [CONTACT]
**DevOps**: [CONTACT]
**Product Owner**: [CONTACT]

**Escalation Path**:
1. Team Lead (First 30 minutes)
2. Technical Director (After 30 minutes)
3. CTO (Critical issues only)

---

## Appendix A: Validation Queries

### Quick Revenue Check
```sql
SELECT
    COUNT(*) as total_products,
    SUM(fixed_fee_facilitated) as total_fixed_fees,
    SUM(CASE
        WHEN percentage_fee IS NOT NULL
        THEN (percentage_fee * 100) -- Example calculation
        ELSE 0
    END) as total_percentage_fees
FROM client_products
WHERE status = 'active';
```

### Check for NULL Values
```sql
SELECT id, product_name, client_id
FROM client_products
WHERE fixed_fee_facilitated IS NULL
AND status = 'active'
ORDER BY id;
```

### Verify Views
```sql
-- Test all views
SELECT COUNT(*) FROM company_revenue_analytics;
SELECT COUNT(*) FROM products_list_view;
SELECT COUNT(*) FROM revenue_analytics_optimized;
```

---

## Appendix B: Troubleshooting

### Issue: Backend Won't Start
**Symptoms**: PM2 shows crashed status, logs show import errors
**Cause**: Pydantic model mismatch with database
**Solution**:
1. Verify database migration completed
2. Check Pydantic models have `fixed_fee_facilitated` field
3. Restart with `pm2 restart kingstons-api --update-env`

### Issue: Frontend Shows "fixed_cost" Not Found
**Symptoms**: Console errors about missing field, data not displaying
**Cause**: Frontend not rebuilt with new field names
**Solution**:
1. Verify App.tsx has SCHEMA_VERSION 1.1.0
2. Clear browser cache completely
3. Hard refresh (Ctrl+Shift+R)
4. Rebuild frontend if needed

### Issue: Revenue Calculations Incorrect
**Symptoms**: Revenue totals don't match baseline
**Cause**: Database views not updated correctly
**Solution**:
1. Re-run migration script
2. Check all 3 views for correct column names
3. If still incorrect, execute rollback

---

## Sign-off

**Deployment Lead**: ________________  Date: ________
**Database Admin**: ________________  Date: ________
**Product Owner**: ________________  Date: ________

**Post-Deployment Verification**: ________________  Date: ________
