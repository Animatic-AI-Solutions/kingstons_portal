# IRR Cascade System - Implementation Plan

## Overview

This document outlines the complete implementation plan for the comprehensive IRR cascade system that maintains data integrity across portfolio fund and portfolio level IRRs.

## Core Requirements Implemented

1. **Valuation Deletion Cascade**: Fund valuation deleted → delete fund IRR → check completeness → conditionally delete portfolio IRR
2. **Activity Changes Impact**: Activities changed in batch → recalculate all affected IRRs for all affected dates  
3. **Valuation Creation/Edit**: Fund valuation created/edited → calculate fund IRR → check completeness → conditionally calculate portfolio IRR
4. **Historical Changes**: Any historical change recalculates all future IRRs from that date onwards

---

## Phase 1: Core Service Architecture ✅ COMPLETED

**Status**: ✅ **COMPLETED**
- Created `backend/app/services/irr_cascade_service.py` with comprehensive IRR management logic
- Implemented all four core requirement flows
- Added extensive logging and error handling
- Service is ready for integration

---

## Phase 2: Endpoint Integration

### 2.1 Fund Valuations Endpoints (`backend/app/api/routes/fund_valuations.py`)

**Priority**: **HIGH** - Most critical integration

#### Current Issues to Fix:
- Partial IRR cleanup logic exists but lacks completeness checking
- No portfolio IRR cascade deletion
- Inconsistent IRR recalculation

#### Integration Steps:

**Step 2.1.1: Import IRR Cascade Service**
```python
from app.services.irr_cascade_service import IRRCascadeService
```

**Step 2.1.2: Update Fund Valuation Deletion**
Replace current deletion logic in `update_fund_valuation()` method when empty string is provided:

```python
# OLD CODE TO REPLACE (lines ~620-660):
# Current partial IRR cleanup logic

# NEW CODE:
async def delete_fund_valuation_with_cascade(valuation_id: int, db):
    """Enhanced deletion with full IRR cascade"""
    irr_service = IRRCascadeService(db)
    
    # Use the comprehensive cascade deletion
    cascade_result = await irr_service.handle_fund_valuation_deletion(valuation_id)
    
    if not cascade_result.get("success"):
        raise HTTPException(status_code=500, detail=f"IRR cascade deletion failed: {cascade_result.get('error')}")
    
    return cascade_result
```

**Step 2.1.3: Update Fund Valuation Creation**
Replace current IRR calculation logic when fund valuations are created:

```python
# In create_fund_valuation() method:
async def create_fund_valuation_with_irr(valuation_data, db):
    """Enhanced creation with IRR calculation"""
    # Create the valuation first
    result = db.table("portfolio_fund_valuations").insert(valuation_data).execute()
    
    if result.data:
        created_valuation = result.data[0]
        portfolio_fund_id = created_valuation["portfolio_fund_id"]
        valuation_date = created_valuation["valuation_date"].split('T')[0]
        
        # Use cascade service for IRR calculation
        irr_service = IRRCascadeService(db)
        irr_result = await irr_service.handle_fund_valuation_creation_edit(
            portfolio_fund_id, valuation_date
        )
        
        logger.info(f"IRR calculation result: {irr_result}")
    
    return result
```

**Step 2.1.4: Update Fund Valuation Editing**
Replace current IRR update logic when fund valuations are edited:

```python
# In update_fund_valuation() method after successful update:
irr_service = IRRCascadeService(db)
irr_result = await irr_service.handle_fund_valuation_creation_edit(
    portfolio_fund_id, valuation_date
)
```

### 2.2 Activity Logs Endpoints (`backend/app/api/routes/holding_activity_logs.py`)

**Priority**: **HIGH** - Critical for batch activity processing

#### Current Issues:
- Individual activity processing instead of batch
- Incomplete IRR recalculation scope

#### Integration Steps:

**Step 2.2.1: Enhance Activity Creation/Update**
```python
# Add to activity creation/update endpoints:
async def process_activity_batch_with_irr_recalc(activities_data, portfolio_id, db):
    """Process multiple activities then recalculate IRRs"""
    
    # Step 1: Process all activity changes first
    processed_activities = []
    affected_dates = set()
    
    for activity_data in activities_data:
        # Create/update activity
        result = db.table("holding_activity_log").insert(activity_data).execute()
        processed_activities.append(result)
        
        # Collect affected date
        activity_date = activity_data["activity_timestamp"]
        if isinstance(activity_date, str):
            activity_date = activity_date.split('T')[0]
        affected_dates.add(activity_date)
    
    # Step 2: Batch recalculate all affected IRRs
    if affected_dates:
        irr_service = IRRCascadeService(db)
        recalc_result = await irr_service.handle_activity_changes_batch(
            portfolio_id, list(affected_dates)
        )
        logger.info(f"Batch IRR recalculation: {recalc_result}")
    
    return processed_activities
```

**Step 2.2.2: Replace Current IRR Recalculation Logic**
Replace the existing `recalculate_portfolio_irr_values_from_date()` function calls with the new cascade service:

```python
# REPLACE existing calls like this:
# portfolio_irr_recalculated = await recalculate_portfolio_irr_values_from_date(
#     portfolio_id, activity_date, db
# )

# WITH:
irr_service = IRRCascadeService(db)
recalc_result = await irr_service.handle_historical_changes(portfolio_id, activity_date)
```

### 2.3 Portfolio Endpoints (`backend/app/api/routes/portfolios.py`)

**Priority**: **MEDIUM** - For portfolio-level operations

#### Integration Points:
- Portfolio deletion (cascade to IRR cleanup)
- Portfolio status changes affecting active funds

### 2.4 Portfolio Funds Endpoints (`backend/app/api/routes/portfolio_funds.py`)

**Priority**: **MEDIUM** - For fund-level operations

#### Integration Points:
- Portfolio fund deletion (trigger IRR recalculation)
- Portfolio fund status changes (affecting portfolio completeness)

---

## Phase 3: Database Migration Strategy

### 3.1 Data Integrity Validation

**Step 3.1.1: Pre-Migration Audit**
```sql
-- Identify orphaned IRR records
SELECT 'portfolio_fund_irr_values' as table_name, COUNT(*) as orphaned_count
FROM portfolio_fund_irr_values pfiv
LEFT JOIN portfolio_fund_valuations pfv ON pfiv.fund_valuation_id = pfv.id
WHERE pfv.id IS NULL AND pfiv.fund_valuation_id IS NOT NULL

UNION ALL

SELECT 'portfolio_irr_values' as table_name, COUNT(*) as orphaned_count  
FROM portfolio_irr_values piv
LEFT JOIN portfolio_valuations pv ON piv.portfolio_valuation_id = pv.id
WHERE pv.id IS NULL AND piv.portfolio_valuation_id IS NOT NULL;
```

**Step 3.1.2: Completeness Validation**
```sql
-- Check portfolio IRRs that exist without complete fund coverage
WITH portfolio_dates AS (
    SELECT DISTINCT portfolio_id, date
    FROM portfolio_irr_values
),
active_funds_per_portfolio AS (
    SELECT portfolio_id, COUNT(*) as active_fund_count
    FROM portfolio_funds 
    WHERE end_date IS NULL
    GROUP BY portfolio_id
),
fund_valuations_per_date AS (
    SELECT pf.portfolio_id, pfv.valuation_date, COUNT(DISTINCT pf.id) as funds_with_valuations
    FROM portfolio_fund_valuations pfv
    JOIN portfolio_funds pf ON pfv.portfolio_fund_id = pf.id
    GROUP BY pf.portfolio_id, pfv.valuation_date
)
SELECT pd.portfolio_id, pd.date, 
       afpp.active_fund_count,
       COALESCE(fvpd.funds_with_valuations, 0) as funds_with_valuations,
       CASE WHEN afpp.active_fund_count = COALESCE(fvpd.funds_with_valuations, 0) 
            THEN 'COMPLETE' ELSE 'INCOMPLETE' END as status
FROM portfolio_dates pd
JOIN active_funds_per_portfolio afpp ON pd.portfolio_id = afpp.portfolio_id
LEFT JOIN fund_valuations_per_date fvpd ON pd.portfolio_id = fvpd.portfolio_id 
    AND pd.date = fvpd.valuation_date
WHERE afpp.active_fund_count != COALESCE(fvpd.funds_with_valuations, 0)
ORDER BY pd.portfolio_id, pd.date;
```

### 3.2 Migration Execution Plan

**Step 3.2.1: Backup Current State**
```bash
# Create full database backup before migration
pg_dump -h localhost -U postgres -d kingstons_portal > backup_pre_irr_migration.sql
```

**Step 3.2.2: Clean Up Orphaned Records**
```python
# Run cleanup script using IRR Cascade Service
async def cleanup_orphaned_irr_records(db):
    """Clean up orphaned IRR records before migration"""
    
    # Delete fund IRR records without corresponding valuations
    orphaned_fund_irrs = db.table("portfolio_fund_irr_values")\
        .select("id, fund_valuation_id")\
        .not_.is_("fund_valuation_id", "null")\
        .execute()
    
    for irr_record in orphaned_fund_irrs.data:
        valuation_exists = db.table("portfolio_fund_valuations")\
            .select("id")\
            .eq("id", irr_record["fund_valuation_id"])\
            .execute()
        
        if not valuation_exists.data:
            db.table("portfolio_fund_irr_values")\
                .delete()\
                .eq("id", irr_record["id"])\
                .execute()
            logger.info(f"Deleted orphaned fund IRR record {irr_record['id']}")
```

---

## Phase 4: Testing Strategy

### 4.1 Unit Tests

**File**: `backend/tests/test_irr_cascade_service.py`

```python
import pytest
from app.services.irr_cascade_service import IRRCascadeService

class TestIRRCascadeService:
    
    @pytest.mark.asyncio
    async def test_fund_valuation_deletion_cascade_complete_portfolio(self, test_db):
        """Test deletion when portfolio remains complete"""
        # Setup: Portfolio with 3 funds, delete 1 fund's valuation
        # Expected: Fund IRR deleted, portfolio IRR remains
        
    @pytest.mark.asyncio
    async def test_fund_valuation_deletion_cascade_incomplete_portfolio(self, test_db):
        """Test deletion when portfolio becomes incomplete"""
        # Setup: Portfolio with 2 funds, delete 1 fund's valuation  
        # Expected: Fund IRR deleted, portfolio IRR deleted
        
    @pytest.mark.asyncio
    async def test_activity_batch_recalculation(self, test_db):
        """Test batch activity processing"""
        # Setup: Multiple activities affecting different dates
        # Expected: All relevant IRRs recalculated for affected dates
        
    @pytest.mark.asyncio
    async def test_valuation_creation_complete_portfolio(self, test_db):
        """Test valuation creation completing portfolio"""
        # Setup: Portfolio missing 1 fund valuation, add the missing one
        # Expected: Fund IRR calculated, portfolio IRR calculated
        
    @pytest.mark.asyncio
    async def test_historical_changes_cascade(self, test_db):
        """Test historical changes affecting future IRRs"""
        # Setup: Change activity in the past
        # Expected: All future IRRs recalculated
```

### 4.2 Integration Tests

**File**: `backend/tests/test_irr_integration.py`

```python
class TestIRRIntegration:
    
    @pytest.mark.asyncio
    async def test_fund_valuation_deletion_endpoint(self, test_client):
        """Test DELETE /fund_valuations/{id} with cascade"""
        
    @pytest.mark.asyncio  
    async def test_activity_creation_batch_recalc(self, test_client):
        """Test POST /holding_activity_logs with IRR recalculation"""
        
    @pytest.mark.asyncio
    async def test_valuation_update_irr_flow(self, test_client):
        """Test PUT /fund_valuations/{id} with IRR updates"""
```

### 4.3 Performance Tests

**File**: `backend/tests/test_irr_performance.py`

```python
class TestIRRPerformance:
    
    @pytest.mark.asyncio
    async def test_large_portfolio_recalculation(self, test_db):
        """Test IRR recalculation for portfolio with 50+ funds"""
        
    @pytest.mark.asyncio
    async def test_historical_recalculation_performance(self, test_db):
        """Test historical recalculation affecting 100+ IRR records"""
        
    @pytest.mark.asyncio
    async def test_batch_activity_processing_performance(self, test_db):
        """Test batch processing of 20+ activities"""
```

---

## Phase 5: Deployment and Monitoring

### 5.1 Deployment Plan

**Step 5.1.1: Pre-Deployment Validation**
```bash
# Run all tests
pytest backend/tests/test_irr_cascade_service.py -v
pytest backend/tests/test_irr_integration.py -v
pytest backend/tests/test_irr_performance.py -v

# Validate database integrity
python -m scripts.validate_irr_data_integrity
```

**Step 5.1.2: Staged Rollout**
1. **Stage 1**: Deploy to development environment
2. **Stage 2**: Run full integration tests
3. **Stage 3**: Deploy to production with monitoring
4. **Stage 4**: Monitor for 48 hours, rollback plan ready

### 5.2 Monitoring and Validation

**Step 5.2.1: IRR Integrity Monitoring**
```python
# Create monitoring script: monitor_irr_integrity.py
async def check_irr_data_integrity(db):
    """Daily integrity check for IRR data"""
    
    checks = {
        "orphaned_fund_irrs": 0,
        "orphaned_portfolio_irrs": 0, 
        "incomplete_portfolio_irrs": 0,
        "missing_fund_irrs": 0
    }
    
    # Check for orphaned records
    # Check for incomplete portfolios with IRRs
    # Check for missing IRRs where valuations exist
    
    return checks
```

**Step 5.2.2: Performance Monitoring**
```python
# Add to logging for performance tracking
@performance_monitor
async def handle_fund_valuation_deletion(self, valuation_id: int):
    start_time = time.time()
    result = await self._handle_deletion_cascade(valuation_id)
    duration = time.time() - start_time
    
    logger.info(f"IRR deletion cascade completed in {duration:.2f}s")
    return result
```

---

## Phase 6: Documentation and Training

### 6.1 API Documentation Updates

Update FastAPI docs to reflect new IRR cascade behavior:

```python
@router.delete("/fund_valuations/{valuation_id}")
async def delete_fund_valuation(valuation_id: int):
    """
    Delete a fund valuation with automatic IRR cascade.
    
    Cascade Behavior:
    1. Deletes portfolio fund IRR for the same date
    2. Checks if portfolio still has complete valuations
    3. If incomplete, deletes portfolio valuation and portfolio IRR
    4. Deletes the original fund valuation
    
    Returns:
        Deletion summary with cascade actions taken
    """
```

### 6.2 User Guide Updates

Create user documentation explaining:
- New IRR calculation behavior
- What happens when valuations are deleted
- How historical changes affect IRRs
- Troubleshooting common IRR issues

---

## Implementation Timeline

| Phase | Duration | Dependencies | Status |
|-------|----------|--------------|---------|
| Phase 1: Core Service | 1 day | None | ✅ **COMPLETED** |
| Phase 2: Endpoint Integration | 3 days | Phase 1 | 🔄 **NEXT** |
| Phase 3: Database Migration | 1 day | Phase 2 | ⏳ Pending |
| Phase 4: Testing | 2 days | Phase 3 | ⏳ Pending |
| Phase 5: Deployment | 1 day | Phase 4 | ⏳ Pending |
| Phase 6: Documentation | 1 day | Phase 5 | ⏳ Pending |

**Total Estimated Timeline: 9 days**

---

## Risk Mitigation

### High Risk Items:
1. **Data Integrity**: Comprehensive backup and rollback plan
2. **Performance Impact**: Load testing and monitoring  
3. **Complex Dependencies**: Thorough integration testing

### Mitigation Strategies:
1. **Database Backup**: Full backup before any migration
2. **Gradual Rollout**: Deploy to dev first, then production
3. **Monitoring**: Real-time IRR integrity monitoring
4. **Rollback Plan**: Automated rollback procedure ready

---

## Success Criteria

### Functional Requirements:
- ✅ IRR deletion cascade works correctly
- ✅ Activity batch processing recalculates affected IRRs  
- ✅ Valuation changes trigger appropriate IRR calculations
- ✅ Historical changes recalculate future IRRs

### Non-Functional Requirements:
- ✅ Performance: IRR operations complete within 5 seconds for typical portfolios
- ✅ Reliability: 99.9% success rate for IRR calculations
- ✅ Data Integrity: Zero orphaned IRR records
- ✅ Maintainability: Comprehensive logging and error handling

---

## Next Steps

**Immediate Action Required:**
1. **Start Phase 2.1**: Begin integration with fund_valuations endpoints
2. **Create Test Data**: Set up comprehensive test scenarios
3. **Schedule Code Review**: Plan team review of IRR cascade service

**Questions for Team Discussion:**
1. Should we implement gradual rollout by endpoint or all at once?
2. What is the acceptable downtime window for migration?
3. Do we need additional database indexes for performance?

This implementation plan provides a comprehensive roadmap for deploying the IRR cascade system while maintaining data integrity and system reliability. 