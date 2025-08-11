"""
Basic test script for sequence reservation functionality
Tests the core SequenceManager functionality and system endpoints
"""

import asyncio
import logging
from datetime import datetime
from app.db import database
from app.utils.sequence_manager import SequenceManager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_sequence_reservation():
    """Test basic sequence reservation functionality"""
    
    print("🧪 Starting Sequence Reservation Tests")
    print("=" * 50)
    
    # Initialize database connection
    await database.create_db_pool()
    
    # Get connection from pool
    async with database._pool.acquire() as db:
        try:
            # Test 1: Check sequence health
            print("\n📋 Test 1: Checking sequence health...")
            health_status = await SequenceManager.check_sequence_health(
                db, 'holding_activity_log', 'holding_activity_log_id_seq'
            )
            
            print(f"   Table: {health_status['table']}")
            print(f"   Sequence: {health_status['sequence']}")
            print(f"   Sequence Value: {health_status['sequence_value']}")
            print(f"   Table Max ID: {health_status['table_max_id']}")
            print(f"   Is Healthy: {health_status['is_healthy']}")
            print(f"   Status: {health_status['status']}")
            
            # Test 2: Reserve a small sequence range
            print("\n🔒 Test 2: Reserving sequence range...")
            start_id, end_id = await SequenceManager.reserve_sequence_range(
                db, 'holding_activity_log_id_seq', 3
            )
            
            print(f"   Reserved range: {start_id} - {end_id}")
            print(f"   Range size: {end_id - start_id + 1}")
            
            # Test 3: Test bulk insert preparation (without actual insert)
            print("\n🚀 Test 3: Testing bulk insert preparation...")
            test_data = [
                {
                    'portfolio_fund_id': 1,
                    'product_id': 1,
                    'activity_type': 'test_investment',
                    'activity_timestamp': datetime.utcnow(),
                    'amount': 100.0,
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                },
                {
                    'portfolio_fund_id': 2,
                    'product_id': 1,
                    'activity_type': 'test_withdrawal',
                    'activity_timestamp': datetime.utcnow(),
                    'amount': 50.0,
                    'created_at': datetime.utcnow(),
                    'updated_at': datetime.utcnow()
                }
            ]
            
            # Reserve IDs for test data (but don't actually insert)
            reserved_start, reserved_end = await SequenceManager.reserve_sequence_range(
                db, 'holding_activity_log_id_seq', len(test_data)
            )
            
            # Assign IDs to test data
            for i, record in enumerate(test_data):
                record['id'] = reserved_start + i
            
            print(f"   Prepared {len(test_data)} records with reserved IDs:")
            for record in test_data:
                print(f"     ID: {record['id']}, Fund: {record['portfolio_fund_id']}, Type: {record['activity_type']}")
            
            # Test 4: Check if repair is needed
            print("\n🔧 Test 4: Checking if sequence repair is needed...")
            repair_result = await SequenceManager.repair_sequence(
                db, 'holding_activity_log', 'holding_activity_log_id_seq'
            )
            
            print(f"   Repair Status: {repair_result['status']}")
            if repair_result['status'] == 'REPAIRED':
                print(f"   Old Value: {repair_result['old_value']}")
                print(f"   New Value: {repair_result['new_value']}")
                print(f"   Gap Fixed: {repair_result['gap_fixed']}")
            else:
                print(f"   Current Value: {repair_result.get('current_value', 'N/A')}")
                print(f"   Table Max ID: {repair_result.get('table_max_id', 'N/A')}")
            
            print("\n✅ All tests completed successfully!")
            
        except Exception as e:
            print(f"\n❌ Test failed with error: {e}")
            import traceback
            traceback.print_exc()
    
    await database.close_db_pool()

async def test_concurrent_reservations():
    """Test concurrent sequence reservations to verify no conflicts"""
    
    print("\n🔀 Testing Concurrent Sequence Reservations")
    print("=" * 50)
    
    await database.create_db_pool()
    
    async def reserve_range(operation_id: int, count: int):
        """Reserve a range for a specific operation"""
        async with database._pool.acquire() as db:
            start_id, end_id = await SequenceManager.reserve_sequence_range(
                db, 'holding_activity_log_id_seq', count
            )
            print(f"   Operation {operation_id}: Reserved {start_id}-{end_id} ({count} IDs)")
            return start_id, end_id
    
    try:
        # Run 3 concurrent operations
        tasks = [
            reserve_range(1, 5),
            reserve_range(2, 3),
            reserve_range(3, 7)
        ]
        
        results = await asyncio.gather(*tasks)
        
        # Verify no overlapping ranges
        ranges = [(start, end) for start, end in results]
        ranges.sort()
        
        print(f"\n📊 Concurrent reservation results:")
        for i, (start, end) in enumerate(ranges, 1):
            print(f"   Range {i}: {start}-{end} (size: {end-start+1})")
        
        # Check for overlaps
        overlaps_found = False
        for i in range(len(ranges) - 1):
            if ranges[i][1] >= ranges[i+1][0]:
                print(f"   ❌ OVERLAP DETECTED: {ranges[i]} and {ranges[i+1]}")
                overlaps_found = True
        
        if not overlaps_found:
            print("   ✅ No overlaps detected - concurrent reservations work correctly!")
        
    except Exception as e:
        print(f"\n❌ Concurrent test failed: {e}")
        import traceback
        traceback.print_exc()
        
    finally:
        await database.close_db_pool()

if __name__ == "__main__":
    print("🚀 Kingston's Portal - Sequence Reservation Test Suite")
    print("Testing Phase 1 Implementation")
    print("=" * 60)
    
    # Run basic tests
    asyncio.run(test_sequence_reservation())
    
    # Run concurrent tests
    asyncio.run(test_concurrent_reservations())
    
    print("\n🎉 Test Suite Complete!")
    print("=" * 60)
