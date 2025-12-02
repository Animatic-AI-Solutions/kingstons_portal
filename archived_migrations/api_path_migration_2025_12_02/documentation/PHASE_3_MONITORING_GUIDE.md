# Phase 3: Monitoring Guide

**Duration:** 5-7 days
**Start Date:** 2025-12-02
**Expected Completion:** 2025-12-09
**Status:** IN PROGRESS

---

## Daily Monitoring Checklist

### Day 1-7: Daily Tasks (15 minutes/day)

#### 1. Check Middleware Usage Logs
```bash
cd backend/migration_artifacts
tail -50 path_usage_log.jsonl
```

**What to look for:**
- Declining underscore path usage over time (as caches clear)
- Any unusual API paths being accessed
- Error patterns or frequent 404s

**Example Log Entry:**
```json
{
  "timestamp": "2025-12-02T12:00:00",
  "original_path": "/api/client_groups",
  "converted_path": "/api/client-groups",
  "status": "success"
}
```

#### 2. Check Backend Error Logs
```bash
cd backend
grep -i "404\|error" logs/app.log | tail -50
```

**Red flags:**
- 404 errors for API paths
- Unexpected path-related errors
- Database query failures

#### 3. Check Frontend Console (Browser DevTools)
- Open application in browser
- Navigate through critical workflows:
  - Client Groups list → Client Details
  - Product Overview → Product creation
  - Portfolio management
  - IRR calculation pages
- Check console for errors (F12)

**Expected:** No 404s, no API path errors

#### 4. Spot Check Financial Data
```bash
cd backend
curl http://127.0.0.1:8001/api/analytics/company/irr
```

**Verify:**
- Company IRR: ~4.1% (should remain stable)
- Response structure unchanged
- No null values or errors

---

## Weekly Review (End of Week)

### Middleware Usage Analysis

Run usage analysis:
```bash
cd backend
python -c "
import json
from pathlib import Path

# Analyze usage logs
log_file = Path('migration_artifacts/path_usage_log.jsonl')
if log_file.exists():
    with open(log_file) as f:
        logs = [json.loads(line) for line in f]

    underscore_count = sum(1 for log in logs if '_' in log['original_path'])
    total_count = len(logs)

    print(f'Total requests: {total_count}')
    print(f'Underscore requests: {underscore_count} ({underscore_count/total_count*100:.1f}%)')
    print(f'Hyphenated requests: {total_count-underscore_count} ({(total_count-underscore_count)/total_count*100:.1f}%)')
else:
    print('No usage logs found')
"
```

**Expected Trend:**
- Day 1-2: 50-80% underscore requests (cached frontend)
- Day 3-5: 20-50% underscore requests (caches clearing)
- Day 6-7: <20% underscore requests (mostly cleared)

### Critical Workflow Testing

Manually test these workflows end-to-end:

- [ ] **Client Group Management**
  - Create new client group
  - View client group details
  - Edit client group information
  - FUM calculations display correctly

- [ ] **Product Creation**
  - Create new client product
  - Select provider, portfolio template, product owner
  - Verify product appears in overview
  - Edit product details

- [ ] **Portfolio Management**
  - View portfolio funds
  - Add/edit fund valuations
  - Portfolio IRR calculation
  - Performance metrics display

- [ ] **IRR Calculations**
  - Company-wide IRR (analytics page)
  - Product-level IRR
  - Client-level IRR
  - Portfolio-level IRR

- [ ] **Reporting**
  - Generate client reports
  - Export data (if applicable)
  - Historical IRR views

### Performance Check

```bash
# Check API response times
cd backend
python -c "
import time
import urllib.request

base_url = 'http://127.0.0.1:8001'
endpoints = [
    '/api/client-groups',
    '/api/analytics/company/irr',
    '/api/portfolios',
]

for endpoint in endpoints:
    start = time.time()
    try:
        with urllib.request.urlopen(f'{base_url}{endpoint}', timeout=10) as resp:
            duration = (time.time() - start) * 1000
            print(f'{endpoint:40} {duration:6.1f}ms')
    except Exception as e:
        print(f'{endpoint:40} ERROR: {e}')
"
```

**Expected:** Response times similar to pre-migration baseline (<500ms for most endpoints)

---

## Issue Response Procedures

### If 404 Errors Detected

1. **Identify the problematic path:**
   ```bash
   grep "404" backend/logs/app.log | grep "api"
   ```

2. **Check if it's a frontend or external call:**
   - Frontend: Check browser DevTools Network tab
   - External: Check API consumer logs

3. **Verify middleware is active:**
   ```bash
   curl -I http://127.0.0.1:8001/api/client_groups
   # Should return 200, not 404
   ```

4. **If middleware disabled accidentally:**
   ```bash
   # Check backend/.env
   ENABLE_LEGACY_API_PATHS=true  # Should be true during Phase 3

   # Restart backend
   uvicorn main:app --reload
   ```

### If Financial Data Discrepancies

1. **Capture emergency snapshot:**
   ```bash
   cd backend
   python migration_tools/response_snapshots.py capture --name emergency --base-url http://127.0.0.1:8001
   ```

2. **Compare with baseline:**
   ```bash
   python migration_tools/response_snapshots.py compare --baseline baseline --comparison emergency
   ```

3. **If IRR calculation changed:**
   - Check if underlying data changed (fund valuations, dates)
   - Verify calculation logic unchanged
   - Compare with manual calculation

4. **If data integrity compromised:**
   - **STOP** - Do not proceed to Phase 4
   - Review rollback procedure
   - Investigate root cause

### If Performance Degradation

1. **Measure middleware overhead:**
   ```python
   # Check middleware execution time in logs
   # Should be <1ms per request
   ```

2. **Compare pre/post migration response times:**
   - If >10% slower, investigate
   - Check database query performance
   - Review middleware implementation

3. **If significant overhead (>5ms):**
   - Consider optimizing middleware
   - Review path conversion logic
   - Check logging frequency

---

## Success Criteria for Phase 3 Completion

After 5-7 days, verify all criteria met:

### Must-Have Criteria (Required)

- [ ] **Zero 404 errors** related to API paths in production logs
- [ ] **Zero financial discrepancies** - IRR and valuations match baseline
- [ ] **Zero user-reported issues** related to API functionality
- [ ] **All critical workflows tested** and functioning correctly

### Should-Have Criteria (Desired)

- [ ] **Middleware usage declining** - <20% underscore requests by day 7
- [ ] **Performance stable** - response times within 10% of baseline
- [ ] **No unexpected errors** in backend or frontend logs

### Nice-to-Have Criteria (Optional)

- [ ] **Monitoring dashboards updated** with new path conventions
- [ ] **Documentation reviewed** by team members
- [ ] **Stakeholder approval** to proceed to Phase 4

---

## Phase 3 Completion Decision

### If All Success Criteria Met

**Proceed to Phase 4:**
1. Schedule Phase 4 cleanup (2-3 hours)
2. Notify team of final migration step
3. Follow Phase 4 cleanup procedure

### If Issues Discovered

**Investigation Required:**
1. Document all issues found
2. Assess severity (critical vs minor)
3. Determine if rollback needed or if fixes possible
4. Extend monitoring period if needed

### If Critical Issues Found

**Execute Rollback:**
1. Follow rollback procedure in PHASE_1_2_COMPLETION_SUMMARY.md
2. Disable middleware: `ENABLE_LEGACY_API_PATHS=false`
3. Revert frontend changes
4. Investigate root cause before re-attempting

---

## Daily Monitoring Log Template

```markdown
## Monitoring Log - Day X (YYYY-MM-DD)

### Middleware Usage
- Total requests: X
- Underscore requests: X (X%)
- Hyphenated requests: X (X%)

### Error Check
- 404 errors: X
- API errors: X
- Other issues: X

### Workflow Testing
- Client Group Management: ✅ / ❌
- Product Creation: ✅ / ❌
- Portfolio Management: ✅ / ❌
- IRR Calculations: ✅ / ❌

### Financial Validation
- Company IRR: X% (baseline: 4.1%)
- IRR calculations match: ✅ / ❌

### Performance
- Average API response time: Xms
- Slowest endpoint: /api/X (Xms)

### Issues Identified
- None / [List issues]

### Notes
- [Any observations or concerns]

### Status: ✅ All Good / ⚠️ Minor Issues / ❌ Critical Issues
```

---

## Contact & Escalation

### Issue Severity Levels

**🟢 Low:** Minor issues, no user impact, can wait
- Log for review
- Monitor if pattern emerges

**🟡 Medium:** Some users affected, workaround available
- Investigate within 24 hours
- Document issue and resolution

**🔴 High:** Many users affected, no workaround
- Immediate investigation required
- Consider temporary rollback

**⚫ Critical:** Financial data integrity compromised
- **STOP ALL OPERATIONS**
- Execute rollback immediately
- Full investigation before proceeding

---

**Next Steps After Phase 3:**
Once all success criteria met, proceed to `PHASE_4_CLEANUP_PROCEDURE.md`

**Document Status:** Active monitoring guide
**Last Updated:** 2025-12-02
**Next Review:** Daily during monitoring period
