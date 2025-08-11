# Sequence Reservation Implementation Plan
## IRR and Activity Saving Operations

### 📋 **Executive Summary**
Implement sequence reservation for the two most critical and high-scale database operations:
1. **Holding Activity Log Creation** (highest volume)
2. **IRR Value Storage** (most complex with 2 tables: `portfolio_fund_irr_values` + `portfolio_irr_values`)

### 🎯 **Scope & Impact Analysis**

#### **Current Problem Areas Identified:**

1. **Holding Activity Logs** (`holding_activity_logs.py:492-495`)
   - **Current**: Individual INSERT with implicit `nextval()`
   - **Volume**: 10-27 records/hour, peaks of 253/day
   - **Risk**: High - sequence conflicts during bulk saves

2. **Portfolio Fund IRR Values** (`portfolio_funds.py:1830-1833`)
   - **Current**: Individual INSERT with implicit `nextval()`
   - **Volume**: Triggered by every activity/valuation change
   - **Risk**: Medium-High - complex calculation dependencies

3. **Portfolio IRR Values** (`portfolios.py:999-1000`)
   - **Current**: Individual INSERT with implicit `nextval()`
   - **Volume**: Triggered by portfolio-level calculations
   - **Risk**: Medium - less frequent but critical for reporting

4. **Frontend Bulk Processing** (`transactionCoordinator.ts:67-70`)
   - **Current**: Sequential individual API calls
   - **Impact**: N API calls instead of 1 bulk call
   - **Risk**: High - race conditions between concurrent users

---

## 🚀 **Phase 1: Backend Sequence Reservation System**

### **Step 1: Create Sequence Utilities Module**

**File**: `backend/app/utils/sequence_manager.py` (NEW FILE)

```python
"""
Sequence Manager for Bulk Operations
Handles sequence reservation and bulk insertions with explicit ID management
"""

import logging
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class SequenceManager:
    """
    Manages PostgreSQL sequence reservations for bulk operations
    """
    
    @staticmethod
    async def reserve_sequence_range(
        db, 
        sequence_name: str, 
        count: int
    ) -> Tuple[int, int]:
        """
        Reserve a range of sequence values for bulk operations
        
        Args:
            db: Database connection
            sequence_name: Name of the sequence (e.g., 'holding_activity_log_id_seq')
            count: Number of IDs to reserve
            
        Returns:
            Tuple of (start_id, end_id) inclusive
        """
        if count <= 0:
            raise ValueError("Count must be positive")
        
        # Get the starting ID
        result = await db.fetchrow(f"SELECT nextval('{sequence_name}') as start_id")
        start_id = result['start_id']
        
        # Advance sequence to reserve the range
        if count > 1:
            end_id = start_id + count - 1
            await db.execute(f"SELECT setval('{sequence_name}', $1)", end_id)
        else:
            end_id = start_id
        
        logger.info(f"🔒 Reserved sequence range {sequence_name}: {start_id}-{end_id} ({count} IDs)")
        return start_id, end_id
    
    @staticmethod
    async def bulk_insert_with_reserved_ids(
        db,
        table_name: str,
        data: List[Dict[str, Any]],
        sequence_name: str,
        id_column: str = 'id'
    ) -> List[Dict[str, Any]]:
        """
        Bulk insert with pre-reserved sequence IDs
        
        Args:
            db: Database connection
            table_name: Target table name
            data: List of dictionaries containing row data
            sequence_name: Sequence to reserve from
            id_column: Name of the ID column (default: 'id')
            
        Returns:
            List of inserted records with assigned IDs
        """
        if not data:
            return []
        
        # Reserve sequence range
        start_id, end_id = await SequenceManager.reserve_sequence_range(
            db, sequence_name, len(data)
        )
        
        # Assign IDs to data
        for i, row in enumerate(data):
            row[id_column] = start_id + i
        
        # Build bulk insert query
        if not data:
            return []
        
        columns = list(data[0].keys())
        placeholders = ', '.join([f"${i+1}" for i in range(len(columns))])
        query = f"""
            INSERT INTO {table_name} ({', '.join(columns)})
            VALUES ({placeholders})
            RETURNING *
        """
        
        # Execute bulk insert
        inserted_records = []
        for row in data:
            values = [row[col] for col in columns]
            result = await db.fetchrow(query, *values)
            inserted_records.append(dict(result))
        
        logger.info(f"✅ Bulk inserted {len(inserted_records)} records into {table_name}")
        return inserted_records
```

### **Step 2: Modify Holding Activity Logs Route**

**File**: `backend/app/api/routes/holding_activity_logs.py`

**Insertion Point**: After line 1050 (end of file)

```python
# ==================== BULK OPERATIONS WITH SEQUENCE RESERVATION ====================

from app.utils.sequence_manager import SequenceManager

@router.post("/holding_activity_logs/bulk", response_model=List[dict])
async def create_bulk_holding_activity_logs(
    activities: List[HoldingActivityLogCreate],
    skip_irr_calculation: bool = Query(False, description="Skip IRR recalculation for transaction coordination"),
    db = Depends(get_db)
):
    """
    Bulk create holding activity logs with sequence reservation
    
    This endpoint uses sequence reservation to prevent ID conflicts during bulk operations.
    Designed for high-volume activity imports and bulk monthly saves.
    
    Args:
        activities: List of activity log data to create
        skip_irr_calculation: Skip IRR calc for transaction coordination (default: False)
        db: Database dependency
        
    Returns:
        List of created activity log records with assigned IDs
    """
    try:
        if not activities:
            return []
        
        logger.info(f"🚀 BULK: Creating {len(activities)} activity logs with sequence reservation")
        
        # Convert Pydantic models to dict format for bulk insertion
        activity_data = []
        for log in activities:
            # Handle timezone conversion (same logic as individual create)
            if isinstance(log.activity_timestamp, date) and not isinstance(log.activity_timestamp, datetime):
                from datetime import timezone
                activity_datetime = datetime.combine(log.activity_timestamp, datetime.min.time()).replace(tzinfo=timezone.utc)
            else:
                activity_datetime = log.activity_timestamp
            
            activity_data.append({
                'portfolio_fund_id': log.portfolio_fund_id,
                'product_id': log.product_id,
                'activity_type': log.activity_type,
                'activity_timestamp': activity_datetime,
                'amount': float(log.amount) if log.amount is not None else None,
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            })
        
        # Use sequence manager for bulk insert
        created_activities = await SequenceManager.bulk_insert_with_reserved_ids(
            db=db,
            table_name='holding_activity_log',
            data=activity_data,
            sequence_name='holding_activity_log_id_seq'
        )
        
        logger.info(f"✅ BULK: Successfully created {len(created_activities)} activities")
        
        # Handle IRR recalculation if not skipped
        if not skip_irr_calculation:
            logger.info("🔄 BULK: Triggering IRR recalculation for affected funds...")
            
            # Group by portfolio fund for efficient recalculation
            portfolio_funds = set(activity['portfolio_fund_id'] for activity in created_activities)
            
            for portfolio_fund_id in portfolio_funds:
                try:
                    # Use the existing IRR recalculation logic
                    await recalculate_irr_after_activity_change(
                        portfolio_fund_id, 
                        db, 
                        activity_date=None  # Will use latest activity date
                    )
                except Exception as irr_error:
                    logger.error(f"⚠️ BULK: IRR recalculation failed for fund {portfolio_fund_id}: {irr_error}")
                    # Don't fail the entire bulk operation for IRR issues
        
        return created_activities
        
    except Exception as e:
        logger.error(f"❌ BULK: Error creating bulk activity logs: {e}")
        raise HTTPException(status_code=500, detail=f"Bulk activity creation failed: {str(e)}")
```

### **Step 3: Modify Portfolio Funds IRR Storage**

**File**: `backend/app/api/routes/portfolio_funds.py`

**Modification Point**: Lines 1827-1833 (replace individual INSERT)

```python
# ==================== BULK IRR STORAGE WITH SEQUENCE RESERVATION ====================

from app.utils.sequence_manager import SequenceManager

async def bulk_store_portfolio_fund_irr_values(
    db,
    irr_data: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Bulk store portfolio fund IRR values with sequence reservation
    
    Args:
        db: Database connection
        irr_data: List of IRR data dictionaries containing:
                 - fund_id, irr_result, date, fund_valuation_id
                 
    Returns:
        List of created IRR records
    """
    if not irr_data:
        return []
    
    logger.info(f"🚀 BULK IRR: Storing {len(irr_data)} portfolio fund IRR values")
    
    # Prepare data for bulk insertion
    prepared_data = []
    for irr_record in irr_data:
        prepared_data.append({
            'fund_id': irr_record['fund_id'],
            'irr_result': float(round(irr_record['irr_result'], 2)),
            'date': irr_record['date'],
            'fund_valuation_id': irr_record['fund_valuation_id'],
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        })
    
    # Use sequence manager for bulk insert
    created_records = await SequenceManager.bulk_insert_with_reserved_ids(
        db=db,
        table_name='portfolio_fund_irr_values',
        data=prepared_data,
        sequence_name='portfolio_fund_irr_values_id_seq'
    )
    
    logger.info(f"✅ BULK IRR: Successfully stored {len(created_records)} portfolio fund IRR values")
    return created_records

# MODIFY EXISTING FUNCTION AT LINE 1827-1833
# Replace the individual INSERT with bulk-capable logic:

async def store_irr_value(db, fund_id: int, irr_result: float, date, fund_valuation_id: int = None):
    """
    Store a single IRR value (wrapper for bulk function for backward compatibility)
    """
    irr_data = [{
        'fund_id': fund_id,
        'irr_result': irr_result,
        'date': date,
        'fund_valuation_id': fund_valuation_id
    }]
    
    results = await bulk_store_portfolio_fund_irr_values(db, irr_data)
    return results[0] if results else None
```

### **Step 4: Modify Portfolio IRR Storage**

**File**: `backend/app/api/routes/portfolios.py`

**Modification Point**: Lines 997-1001 (replace individual INSERT)

```python
# ==================== BULK PORTFOLIO IRR STORAGE ====================

from app.utils.sequence_manager import SequenceManager

async def bulk_store_portfolio_irr_values(
    db,
    portfolio_irr_data: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Bulk store portfolio IRR values with sequence reservation
    
    Args:
        db: Database connection
        portfolio_irr_data: List of portfolio IRR data dictionaries
                           
    Returns:
        List of created portfolio IRR records
    """
    if not portfolio_irr_data:
        return []
    
    logger.info(f"🚀 BULK PORTFOLIO IRR: Storing {len(portfolio_irr_data)} portfolio IRR values")
    
    # Prepare data with timestamps
    prepared_data = []
    for irr_record in portfolio_irr_data:
        prepared_data.append({
            **irr_record,
            'created_at': datetime.utcnow(),
            'updated_at': datetime.utcnow()
        })
    
    # Use sequence manager for bulk insert
    created_records = await SequenceManager.bulk_insert_with_reserved_ids(
        db=db,
        table_name='portfolio_irr_values',
        data=prepared_data,
        sequence_name='portfolio_irr_values_id_seq'
    )
    
    logger.info(f"✅ BULK PORTFOLIO IRR: Successfully stored {len(created_records)} portfolio IRR values")
    return created_records

# MODIFY EXISTING CODE AT LINES 997-1001
# Replace the individual INSERT with call to bulk function
```

---

## 🌐 **Phase 2: Frontend Bulk Optimization**

### **Step 5: Update Transaction Coordinator**

**File**: `frontend/src/services/transactionCoordinator.ts`

**Modification Point**: Lines 67-70 (replace individual saves with bulk)

```typescript
// ==================== BULK ACTIVITY SAVING ====================

/**
 * Save activities in bulk using sequence reservation
 */
private static async saveBulkActivities(
  activities: ActivityEdit[], 
  accountHoldingId: number
): Promise<void> {
  
  if (activities.length === 0) return;
  
  console.log(`🚀 BULK: Saving ${activities.length} activities with sequence reservation`);
  
  // Convert to backend format
  const activityData = activities
    .filter(activity => !activity.toDelete) // Handle deletions separately
    .map(activity => ({
      portfolio_fund_id: activity.fundId,
      product_id: accountHoldingId,
      activity_type: this.convertActivityTypeForBackend(activity.activityType),
      activity_timestamp: `${activity.month}-01`,
      amount: parseFloat(activity.value)
    }));

  if (activityData.length > 0) {
    // Use bulk endpoint with sequence reservation
    const response = await api.post('holding_activity_logs/bulk', activityData, {
      params: { skip_irr_calculation: true }
    });
    
    console.log(`✅ BULK: Successfully saved ${response.data.length} activities`);
  }
  
  // Handle deletions individually (they don't need sequence reservation)
  const deletions = activities.filter(activity => activity.toDelete && activity.originalActivityId);
  for (const deletion of deletions) {
    await api.delete(`holding_activity_logs/${deletion.originalActivityId}`);
  }
}

// MODIFY EXISTING saveActivitiesAndValuations METHOD AT LINES 64-73
// Replace the individual loop with bulk call:

// PHASE 1: Save all activities first
if (activities.length > 0) {
  console.log('📥 Phase 1: Saving activities in bulk...');
  
  await this.saveBulkActivities(activities, accountHoldingId);
  result.processedActivities = activities.length;
  
  console.log(`✅ Phase 1 Complete: ${result.processedActivities} activities saved in bulk`);
}
```

### **Step 6: Add Bulk Validation & Error Handling**

**File**: `frontend/src/services/transactionCoordinator.ts`

**Addition Point**: After line 170 (before return result)

```typescript
// ==================== BULK OPERATION VALIDATION ====================

/**
 * Validate activities before bulk save to prevent sequence reservation waste
 */
private static validateBulkActivities(activities: ActivityEdit[]): string[] {
  const errors: string[] = [];
  
  activities.forEach((activity, index) => {
    if (!activity.fundId) {
      errors.push(`Activity ${index + 1}: Missing fund ID`);
    }
    if (!activity.activityType) {
      errors.push(`Activity ${index + 1}: Missing activity type`);
    }
    if (!activity.value || isNaN(parseFloat(activity.value))) {
      errors.push(`Activity ${index + 1}: Invalid amount value`);
    }
    if (!activity.month || !/^\d{4}-\d{2}$/.test(activity.month)) {
      errors.push(`Activity ${index + 1}: Invalid month format (expected YYYY-MM)`);
    }
  });
  
  return errors;
}

// MODIFY saveActivitiesAndValuations TO ADD VALIDATION AT LINE 56:

try {
  // Validate before processing to prevent sequence waste
  const validationErrors = this.validateBulkActivities(edits);
  if (validationErrors.length > 0) {
    throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
  }
  
  // ... rest of existing logic
```

---

## 🔧 **Phase 3: Monitoring & Health Checks**

### **Step 7: Add Sequence Health Monitoring**

**File**: `backend/app/api/routes/system.py` (NEW FILE)

```python
"""
System monitoring and health check endpoints
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from app.db.database import get_db
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/system/sequence-health")
async def check_sequence_health(db = Depends(get_db)):
    """
    Monitor sequence synchronization across critical tables
    
    Returns:
        Dictionary with health status of all sequences
    """
    sequences_to_check = [
        ('holding_activity_log', 'holding_activity_log_id_seq'),
        ('portfolio_fund_irr_values', 'portfolio_fund_irr_values_id_seq'),
        ('portfolio_irr_values', 'portfolio_irr_values_id_seq'),
        ('portfolio_fund_valuations', 'portfolio_fund_valuations_id_seq')
    ]
    
    results = []
    overall_healthy = True
    
    try:
        for table_name, sequence_name in sequences_to_check:
            # Get sequence value
            seq_result = await db.fetchrow(f"SELECT last_value FROM {sequence_name}")
            seq_val = seq_result['last_value'] if seq_result else 0
            
            # Get max table ID
            max_result = await db.fetchrow(f"SELECT MAX(id) as max_id FROM {table_name}")
            max_id = max_result['max_id'] if max_result and max_result['max_id'] else 0
            
            is_healthy = seq_val > max_id
            gap = max_id - seq_val if not is_healthy else 0
            
            if not is_healthy:
                overall_healthy = False
            
            results.append({
                'table': table_name,
                'sequence': sequence_name,
                'sequence_value': seq_val,
                'table_max_id': max_id,
                'is_healthy': is_healthy,
                'gap': gap,
                'status': 'OK' if is_healthy else 'NEEDS_REPAIR',
                'severity': 'HIGH' if gap > 100 else 'MEDIUM' if gap > 10 else 'LOW'
            })
        
        return {
            'overall_health': overall_healthy,
            'sequences': results,
            'checked_at': datetime.utcnow().isoformat(),
            'total_sequences': len(results),
            'healthy_sequences': sum(1 for r in results if r['is_healthy'])
        }
        
    except Exception as e:
        logger.error(f"Error checking sequence health: {e}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")

@router.post("/system/repair-sequences")
async def repair_sequences(db = Depends(get_db)):
    """
    Automatically repair out-of-sync sequences
    
    Returns:
        Dictionary with repair results
    """
    sequences_to_repair = [
        ('holding_activity_log', 'holding_activity_log_id_seq'),
        ('portfolio_fund_irr_values', 'portfolio_fund_irr_values_id_seq'),
        ('portfolio_irr_values', 'portfolio_irr_values_id_seq'),
        ('portfolio_fund_valuations', 'portfolio_fund_valuations_id_seq')
    ]
    
    repair_results = []
    total_repaired = 0
    
    try:
        for table_name, sequence_name in sequences_to_repair:
            max_result = await db.fetchrow(f"SELECT MAX(id) as max_id FROM {table_name}")
            max_id = max_result['max_id'] if max_result and max_result['max_id'] else 0
            
            seq_result = await db.fetchrow(f"SELECT last_value FROM {sequence_name}")
            seq_val = seq_result['last_value'] if seq_result else 0
            
            if seq_val <= max_id:
                new_val = max_id + 1
                await db.execute(f"SELECT setval('{sequence_name}', $1, false)", new_val)
                
                repair_results.append({
                    'table': table_name,
                    'sequence': sequence_name,
                    'old_value': seq_val,
                    'new_value': new_val,
                    'gap_fixed': max_id - seq_val,
                    'status': 'REPAIRED'
                })
                total_repaired += 1
                logger.warning(f"🔧 Repaired sequence {sequence_name}: {seq_val} → {new_val}")
            else:
                repair_results.append({
                    'table': table_name,
                    'sequence': sequence_name,
                    'current_value': seq_val,
                    'table_max_id': max_id,
                    'status': 'HEALTHY'
                })
        
        return {
            'repair_completed': True,
            'sequences_repaired': total_repaired,
            'results': repair_results,
            'repaired_at': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error repairing sequences: {e}")
        raise HTTPException(status_code=500, detail=f"Sequence repair failed: {str(e)}")
```

### **Step 8: Register System Routes**

**File**: `backend/main.py`

**Modification Point**: After existing router inclusions (around line 200)

```python
# Add system monitoring routes
from app.api.routes import system
app.include_router(system.router, prefix="/api", tags=["system"])
```

---

## 🧪 **Phase 4: Testing & Validation**

### **Step 9: Create Test Suite**

**File**: `backend/test_sequence_reservation.py` (NEW FILE)

```python
"""
Test suite for sequence reservation functionality
"""

import asyncio
import pytest
from app.db.database import get_db_connection
from app.utils.sequence_manager import SequenceManager

async def test_sequence_reservation():
    """Test sequence reservation under concurrent load"""
    
    # Simulate concurrent bulk operations
    async def bulk_operation(operation_id: int, count: int):
        db = await get_db_connection()
        try:
            start_id, end_id = await SequenceManager.reserve_sequence_range(
                db, 'holding_activity_log_id_seq', count
            )
            print(f"Operation {operation_id}: Reserved {start_id}-{end_id}")
            return start_id, end_id
        finally:
            await db.close()
    
    # Run 5 concurrent operations
    tasks = [
        bulk_operation(1, 10),
        bulk_operation(2, 15),
        bulk_operation(3, 5),
        bulk_operation(4, 20),
        bulk_operation(5, 8)
    ]
    
    results = await asyncio.gather(*tasks)
    
    # Verify no overlapping ranges
    ranges = [(start, end) for start, end in results]
    ranges.sort()
    
    for i in range(len(ranges) - 1):
        assert ranges[i][1] < ranges[i+1][0], f"Overlapping ranges detected: {ranges[i]} and {ranges[i+1]}"
    
    print("✅ Concurrent sequence reservation test passed")

if __name__ == "__main__":
    asyncio.run(test_sequence_reservation())
```

---

## 📊 **Implementation Timeline & Priorities**

### **Week 1: Core Infrastructure**
- ✅ Create `SequenceManager` utility class
- ✅ Implement bulk activity logs endpoint
- ✅ Add sequence health monitoring

### **Week 2: IRR Integration**
- ✅ Implement bulk IRR storage functions
- ✅ Update portfolio funds IRR storage
- ✅ Update portfolio IRR storage

### **Week 3: Frontend Integration**
- ✅ Update TransactionCoordinator for bulk operations
- ✅ Add validation and error handling
- ✅ Test bulk operations end-to-end

### **Week 4: Monitoring & Testing**
- ✅ Implement system monitoring endpoints
- ✅ Create comprehensive test suite
- ✅ Load testing and performance validation

---

## 🎯 **Success Metrics**

### **Performance Targets**
1. **Bulk Operations**: <2 seconds for 50 activities
2. **Sequence Conflicts**: 0% failure rate
3. **Concurrent Operations**: Support 10+ simultaneous bulk saves
4. **IRR Calculation**: <5 seconds for portfolio recalculation

### **Monitoring KPIs**
1. **Sequence Health**: 100% uptime
2. **Error Rate**: <0.1% for bulk operations
3. **Response Time**: 95th percentile <3 seconds
4. **Throughput**: 1000+ activities/minute capacity

---

## ⚠️ **Risk Mitigation**

### **Rollback Plan**
1. Keep existing individual endpoints as fallback
2. Feature flag for bulk vs individual operations
3. Gradual rollout starting with low-volume operations

### **Monitoring & Alerts**
1. Sequence health checks every 5 minutes
2. Alert on sequence gaps >10 IDs
3. Performance monitoring for bulk operations
4. Error rate tracking and alerting

### **Data Safety**
1. Transaction-wrapped bulk operations
2. Validation before sequence reservation
3. Automatic sequence repair on startup
4. Comprehensive logging for audit trails

---

This implementation plan provides a complete roadmap for implementing sequence reservation across the most critical database operations in Kingston's Portal, with specific line numbers, code examples, and a phased approach to minimize risk while maximizing impact.
