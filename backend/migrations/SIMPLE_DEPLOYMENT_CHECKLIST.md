# Simple Deployment Checklist - Migration 001
## Fixed Cost → Fixed Fee Facilitated

**Date**: _______________
**Started**: _______________
**Completed**: _______________

---

## ✅ Pre-Deployment Verification (5 min)

- [ ] All users logged out / offline period confirmed
- [ ] Database backup completed today (check timestamp)
- [ ] Git changes committed and pushed
- [ ] PostgreSQL connection ready: `psql $DATABASE_URL`

---

## 📊 STEP 1: Capture Baseline (5 min)

**Run this command**:
```bash
psql $DATABASE_URL -f backend/migrations/validation/001_pre_migration_baseline.sql > pre_baseline_$(date +%Y%m%d_%H%M%S).txt
```

**What to check**:
- [ ] Script completes without errors
- [ ] Company totals look reasonable in output file
- [ ] Save the output file - you'll compare to it later

**🛑 STOP if**: Script fails or totals look wrong

---

## 🗄️ STEP 2: Run Database Migration (5 min)

**Run this command**:
```bash
psql $DATABASE_URL -f backend/migrations/001_rename_fixed_cost_to_fixed_fee_facilitated.sql
```

**What happens**:
- Renames column: `fixed_cost` → `fixed_fee_facilitated`
- Recreates 3 database views
- All in single transaction (auto-rollback if error)

**What to check**:
- [ ] Script completes without errors
- [ ] See "COMMIT" message (not "ROLLBACK")

**🛑 STOP if**: Any error occurs (will auto-rollback)

---

## ✅ STEP 3: Validate Migration (10 min) - CRITICAL

**Run this command**:
```bash
psql $DATABASE_URL -f backend/migrations/validation/001_post_migration_validation.sql
```

**What to look for**:
```
✅ VALIDATION PASSED ✅
All revenue calculations match baseline
No NULL value mismatches found
Company totals match within tolerance
Migration is SUCCESSFUL
```

**Critical checks**:
- [ ] "VALIDATION PASSED ✅" message appears
- [ ] "REVENUE DIFFERENCES" section is EMPTY (no products listed)
- [ ] Company totals diff shows £0.00
- [ ] All three views are queryable

**🚨 IMMEDIATE ROLLBACK if**:
- You see "VALIDATION FAILED ❌"
- Any revenue differences appear (> £0.01)
- Company totals don't match

**→ If validation fails, skip to ROLLBACK PROCEDURE at bottom**

---

## 💻 STEP 4: Deploy Backend Changes (2 min)

**Run these commands**:
```bash
cd backend
git pull origin main
```

**What to check**:
- [ ] Git pull successful
- [ ] Files updated: `client_groups.py`, `client_products.py`, `client_product.py`

**No need to restart backend** - we'll do full restart at end

---

## 🎨 STEP 5: Deploy Frontend Changes (5 min)

**Run these commands**:
```bash
cd frontend
git pull origin main
npm install
npm run build
```

**What to check**:
- [ ] Build completes without TypeScript errors
- [ ] No red error messages during build
- [ ] Build output shows success

**Deploy the build**:
```powershell
.\deploy_minimal.ps1
```

---

## 🔄 STEP 6: Restart Services (2 min)

**Restart backend** (if using PM2):
```powershell
pm2 restart kingstons-api
```

**Or restart however you normally do**:
```powershell
# Your normal restart command here
```

**What to check**:
- [ ] Backend starts without errors
- [ ] Check logs for any startup errors
- [ ] Test health endpoint: `curl http://localhost:8001/health`

---

## 🧪 STEP 7: Quick Functional Test (5 min)

### Test 1: View a Client
1. Login to application
2. Navigate to Clients page
3. Click any client with products
4. **✅ Check**: Products display correctly
5. **✅ Check**: Fee amounts show
6. **✅ Check**: No console errors (F12 → Console tab)

### Test 2: Check Revenue Page
1. Navigate to Revenue page
2. **✅ Check**: Company totals display
3. **✅ Check**: Totals match baseline from Step 1
4. **✅ Check**: No errors on page

### Test 3: Create a Product
1. Navigate to Create Client Products
2. Fill out form with test data
3. Enter a fixed fee amount
4. Submit
5. **✅ Check**: Product created successfully
6. **✅ Check**: Fixed fee saved correctly

### Test 4: Check Browser Cache Cleared
1. Open browser console (F12)
2. Look for this message:
   ```
   Schema version changed: 1.0.0 → 1.1.0
   ✅ Cache invalidation complete
   ```
3. **✅ Check**: Message appears
4. **✅ Check**: Data loads correctly

---

## 📝 Post-Deployment Notes

**Issues encountered** (if any):
```
[Write any issues here]
```

**Completion time**: _______________

**Deployment successful**: ☐ YES  ☐ NO

---

## 🚨 ROLLBACK PROCEDURE (If Needed)

**When to rollback**:
- Validation fails (Step 3)
- Critical functionality broken (Step 7)
- Revenue calculations wrong

### Rollback Steps:

1. **Run rollback SQL**:
   ```bash
   psql $DATABASE_URL -f backend/migrations/001_rollback_fixed_fee_facilitated.sql
   ```

2. **Verify rollback**:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'client_products'
   AND column_name IN ('fixed_cost', 'fixed_fee_facilitated');
   ```
   Should show `fixed_cost` only (NOT fixed_fee_facilitated)

3. **Rollback code**:
   ```bash
   git checkout HEAD~1  # Or commit hash before migration
   cd frontend
   npm run build
   # Deploy
   cd ../backend
   pm2 restart kingstons-api
   ```

4. **Verify rollback complete**:
   - [ ] Backend starts without errors
   - [ ] Frontend works correctly
   - [ ] API returns `fixed_cost` field (not fixed_fee_facilitated)

5. **Document what went wrong**:
   ```
   [Write issue details here]
   ```

---

## 📞 If You Need Help

**Issues to investigate before escalating**:
- Check PM2 logs: `pm2 logs kingstons-api --lines 100`
- Check browser console for errors (F12)
- Verify database backup is accessible
- Review validation output for specific errors

**Post-Deployment**:
- Monitor for first 24 hours
- Check application logs regularly
- Watch for any user-reported issues

---

## ✅ Sign-off

**Database Migration**: ☐ Completed  ☐ Rolled Back

**Backend Deployment**: ☐ Completed  ☐ Rolled Back

**Frontend Deployment**: ☐ Completed  ☐ Rolled Back

**Functional Testing**: ☐ Passed  ☐ Failed

**Final Status**: ☐ SUCCESS  ☐ ROLLED BACK

**Signature**: ________________  **Date/Time**: ________________
