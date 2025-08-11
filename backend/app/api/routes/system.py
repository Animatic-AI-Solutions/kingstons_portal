"""
System monitoring and health check endpoints

This module provides endpoints for monitoring system health,
particularly focusing on database sequence synchronization
and bulk operation performance.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
from typing import List, Dict, Any
from app.db.database import get_db
from app.utils.sequence_manager import SequenceManager
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# Critical sequences to monitor
CRITICAL_SEQUENCES = [
    ('holding_activity_log', 'holding_activity_log_id_seq'),
    ('portfolio_fund_irr_values', 'portfolio_fund_irr_values_id_seq'), 
    ('portfolio_irr_values', 'portfolio_irr_values_id_seq'),
    ('portfolio_fund_valuations', 'portfolio_fund_valuations_id_seq')
]

async def _internal_sequence_health_check(db):
    """
    Internal sequence health check without FastAPI Query parameters
    Used by other endpoints that need sequence health data
    """
    try:
        results = []
        overall_healthy = True
        
        for table_name, sequence_name in CRITICAL_SEQUENCES:
            health_status = await SequenceManager.check_sequence_health(
                db, table_name, sequence_name
            )
            
            if not health_status.get('is_healthy', False):
                overall_healthy = False
            
            results.append(health_status)
        
        return {
            'overall_health': overall_healthy,
            'sequences': results,
            'checked_at': datetime.utcnow().isoformat(),
            'total_sequences': len(results),
            'healthy_sequences': sum(1 for r in results if r.get('is_healthy', False))
        }
        
    except Exception as e:
        logger.error(f"❌ SYSTEM: Internal sequence health check failed: {e}")
        # Return a safe default
        return {
            'overall_health': False,
            'sequences': [],
            'checked_at': datetime.utcnow().isoformat(),
            'total_sequences': 0,
            'healthy_sequences': 0,
            'error': str(e)
        }


@router.get("/system/sequence-health")
async def check_sequence_health(
    table_filter: str = Query(None, description="Filter by specific table name"),
    db = Depends(get_db)
):
    """
    Monitor sequence synchronization across critical tables
    
    This endpoint checks if PostgreSQL sequences are properly synchronized
    with their corresponding tables. Out-of-sync sequences can cause
    duplicate key errors during bulk operations.
    
    Args:
        table_filter: Optional filter to check only specific table
        db: Database dependency
        
    Returns:
        Dictionary with health status of all or filtered sequences
        
    Example Response:
    {
        "overall_health": true,
        "sequences": [
            {
                "table": "holding_activity_log",
                "sequence": "holding_activity_log_id_seq", 
                "sequence_value": 2244,
                "table_max_id": 2243,
                "is_healthy": true,
                "gap": 0,
                "status": "OK",
                "severity": "LOW"
            }
        ],
        "checked_at": "2025-08-11T10:30:00Z",
        "total_sequences": 4,
        "healthy_sequences": 4
    }
    """
    try:
        # Extract the actual string value from the parameter
        filter_value = str(table_filter) if table_filter is not None else None
        filter_str = filter_value if filter_value and filter_value != 'None' else 'all'
        logger.info(f"🔍 SYSTEM: Checking sequence health (filter: {filter_str})")
        
        # Filter sequences if requested
        sequences_to_check = CRITICAL_SEQUENCES
        if filter_value and filter_value != 'None' and filter_value.strip():
            sequences_to_check = [
                (table, seq) for table, seq in CRITICAL_SEQUENCES 
                if filter_value.lower() in table.lower()
            ]
            
            if not sequences_to_check:
                raise HTTPException(
                    status_code=404, 
                    detail=f"No sequences found matching filter: {filter_value}"
                )
        
        results = []
        overall_healthy = True
        
        for table_name, sequence_name in sequences_to_check:
            logger.debug(f"🔍 SYSTEM: Checking {sequence_name} for table {table_name}")
            
            health_status = await SequenceManager.check_sequence_health(
                db, table_name, sequence_name
            )
            
            if not health_status.get('is_healthy', False):
                overall_healthy = False
            
            results.append(health_status)
        
        response = {
            'overall_health': overall_healthy,
            'sequences': results,
            'checked_at': datetime.utcnow().isoformat(),
            'total_sequences': len(results),
            'healthy_sequences': sum(1 for r in results if r.get('is_healthy', False)),
            'filter_applied': filter_value
        }
        
        # Log summary
        if overall_healthy:
            logger.info(f"✅ SYSTEM: All {len(results)} sequences are healthy")
        else:
            unhealthy_count = len(results) - response['healthy_sequences']
            logger.warning(f"⚠️ SYSTEM: {unhealthy_count}/{len(results)} sequences need attention")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ SYSTEM: Error checking sequence health: {e}")
        import traceback
        logger.error(f"❌ SYSTEM: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Health check failed: {str(e)}")


@router.post("/system/repair-sequences")
async def repair_sequences(
    table_filter: str = Query(None, description="Filter by specific table name"),
    dry_run: bool = Query(False, description="Preview repairs without executing"),
    db = Depends(get_db)
):
    """
    Automatically repair out-of-sync sequences
    
    This endpoint identifies and repairs sequences that are out of sync
    with their corresponding tables. Can be run in dry-run mode to preview
    repairs before execution.
    
    Args:
        table_filter: Optional filter to repair only specific table sequences
        dry_run: If true, preview repairs without executing them
        db: Database dependency
        
    Returns:
        Dictionary with repair results and summary
        
    Example Response:
    {
        "repair_completed": true,
        "dry_run": false,
        "sequences_repaired": 1,
        "results": [
            {
                "table": "holding_activity_log",
                "sequence": "holding_activity_log_id_seq",
                "old_value": 644,
                "new_value": 2244,
                "gap_fixed": 1600,
                "status": "REPAIRED"
            }
        ],
        "repaired_at": "2025-08-11T10:30:00Z"
    }
    """
    try:
        # Extract the actual string value from the parameter
        filter_value = str(table_filter) if table_filter is not None else None
        filter_str = filter_value if filter_value and filter_value != 'None' else 'all'
        logger.info(f"🔧 SYSTEM: {'Previewing' if dry_run else 'Executing'} sequence repairs (filter: {filter_str})")
        
        # Filter sequences if requested
        sequences_to_repair = CRITICAL_SEQUENCES
        if filter_value and filter_value != 'None' and filter_value.strip():
            sequences_to_repair = [
                (table, seq) for table, seq in CRITICAL_SEQUENCES
                if filter_value.lower() in table.lower()
            ]
            
            if not sequences_to_repair:
                raise HTTPException(
                    status_code=404,
                    detail=f"No sequences found matching filter: {filter_value}"
                )
        
        repair_results = []
        total_repaired = 0
        
        for table_name, sequence_name in sequences_to_repair:
            logger.debug(f"🔧 SYSTEM: {'Previewing' if dry_run else 'Repairing'} {sequence_name}")
            
            if dry_run:
                # Check what would be repaired without actually doing it
                health_status = await SequenceManager.check_sequence_health(
                    db, table_name, sequence_name
                )
                
                if not health_status.get('is_healthy', True):
                    repair_results.append({
                        'table': table_name,
                        'sequence': sequence_name,
                        'current_sequence_value': health_status.get('sequence_value', 0),
                        'table_max_id': health_status.get('table_max_id', 0),
                        'would_repair_to': health_status.get('table_max_id', 0) + 1,
                        'gap_to_fix': health_status.get('gap', 0),
                        'status': 'WOULD_REPAIR'
                    })
                    total_repaired += 1
                else:
                    repair_results.append({
                        'table': table_name,
                        'sequence': sequence_name,
                        'current_value': health_status.get('sequence_value', 0),
                        'table_max_id': health_status.get('table_max_id', 0),
                        'status': 'HEALTHY'
                    })
            else:
                # Actually repair the sequence
                repair_result = await SequenceManager.repair_sequence(
                    db, table_name, sequence_name
                )
                
                if repair_result.get('status') == 'REPAIRED':
                    total_repaired += 1
                
                repair_results.append(repair_result)
        
        response = {
            'repair_completed': not dry_run,
            'dry_run': dry_run,
            'sequences_repaired': total_repaired,
            'results': repair_results,
            'repaired_at': datetime.utcnow().isoformat(),
            'filter_applied': filter_value
        }
        
        # Log summary
        if dry_run:
            logger.info(f"🔍 SYSTEM: Dry run complete - {total_repaired} sequences would be repaired")
        else:
            logger.info(f"✅ SYSTEM: Repair complete - {total_repaired} sequences repaired")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ SYSTEM: Error repairing sequences: {e}")
        raise HTTPException(status_code=500, detail=f"Sequence repair failed: {str(e)}")


@router.get("/system/bulk-operation-stats")
async def get_bulk_operation_stats(
    days: int = Query(7, description="Number of days to analyze", ge=1, le=30),
    include_performance: bool = Query(True, description="Include performance metrics"),
    db = Depends(get_db)
):
    """
    Get comprehensive statistics about bulk operations and sequence usage
    
    This endpoint provides detailed insights into bulk operation patterns,
    sequence usage, performance metrics, and optimization opportunities.
    
    Args:
        days: Number of days to analyze (1-30)
        include_performance: Include detailed performance analysis
        db: Database dependency
        
    Returns:
        Dictionary with comprehensive bulk operation statistics
    """
    try:
        logger.info(f"📊 SYSTEM: Analyzing bulk operation stats for last {days} days (performance: {include_performance})")
        
        # Analyze activity log creation patterns
        activity_stats = await db.fetch(f"""
            SELECT 
                DATE(created_at) as creation_date,
                EXTRACT(HOUR FROM created_at) as hour,
                COUNT(*) as records_created,
                MIN(id) as min_id,
                MAX(id) as max_id,
                MAX(id) - MIN(id) + 1 as id_span,
                array_agg(DISTINCT activity_type) as activity_types,
                COUNT(DISTINCT portfolio_fund_id) as unique_funds,
                COUNT(DISTINCT product_id) as unique_products,
                SUM(amount) FILTER (WHERE amount > 0) as total_positive_amount,
                SUM(amount) FILTER (WHERE amount < 0) as total_negative_amount,
                AVG(amount) as avg_amount,
                STDDEV(amount) as stddev_amount
            FROM holding_activity_log 
            WHERE created_at >= CURRENT_DATE - INTERVAL '{days} days'
            GROUP BY DATE(created_at), EXTRACT(HOUR FROM created_at)
            HAVING COUNT(*) > 1  -- Focus on multi-record operations
            ORDER BY creation_date DESC, hour DESC
        """)
        
        # Identify bulk operation patterns and efficiency
        bulk_patterns = []
        total_records = 0
        total_bulk_operations = 0
        efficiency_scores = []
        hourly_distribution = {}
        
        for stat in activity_stats:
            stat_dict = dict(stat)
            total_records += stat_dict['records_created']
            
            # Calculate efficiency score (1.0 = perfect consecutive IDs, 0.0 = completely scattered)
            if stat_dict['records_created'] > 1:
                expected_span = stat_dict['records_created']
                actual_span = stat_dict['id_span']
                efficiency = expected_span / actual_span if actual_span > 0 else 0
                efficiency_scores.append(efficiency)
            else:
                efficiency = 1.0
                efficiency_scores.append(efficiency)
            
            # Track hourly distribution
            hour = int(stat_dict['hour'])
            if hour not in hourly_distribution:
                hourly_distribution[hour] = 0
            hourly_distribution[hour] += stat_dict['records_created']
            
            # Detect bulk operation characteristics
            is_bulk_pattern = (
                stat_dict['records_created'] >= 3 or  # Multiple records
                efficiency > 0.8  # High ID efficiency
            )
            
            if is_bulk_pattern:
                total_bulk_operations += 1
                bulk_patterns.append({
                    'date': stat_dict['creation_date'],
                    'hour': hour,
                    'records': stat_dict['records_created'],
                    'id_range': f"{stat_dict['min_id']}-{stat_dict['max_id']}",
                    'id_span': stat_dict['id_span'],
                    'efficiency': round(efficiency, 3),
                    'efficiency_rating': 'EXCELLENT' if efficiency >= 0.95 else 'GOOD' if efficiency >= 0.8 else 'FAIR' if efficiency >= 0.6 else 'POOR',
                    'activity_types': stat_dict['activity_types'],
                    'unique_funds': stat_dict['unique_funds'],
                    'unique_products': stat_dict['unique_products'],
                    'total_amount': round(float(stat_dict['total_positive_amount'] or 0) + float(stat_dict['total_negative_amount'] or 0), 2),
                    'avg_amount': round(float(stat_dict['avg_amount'] or 0), 2)
                })
        
        # Performance analysis
        performance_metrics = {}
        if include_performance:
            # Sequence usage analysis
            sequence_usage = await db.fetch(f"""
                SELECT 
                    'holding_activity_log' as table_name,
                    COUNT(*) as total_records,
                    MAX(id) as current_max_id,
                    MIN(id) as min_id,
                    MAX(id) - MIN(id) + 1 as total_id_span,
                    COUNT(*) / GREATEST(MAX(id) - MIN(id) + 1, 1.0) as id_density
                FROM holding_activity_log
                WHERE created_at >= CURRENT_DATE - INTERVAL '{days} days'
                
                UNION ALL
                
                SELECT 
                    'portfolio_fund_irr_values' as table_name,
                    COUNT(*) as total_records,
                    MAX(id) as current_max_id,
                    MIN(id) as min_id,
                    MAX(id) - MIN(id) + 1 as total_id_span,
                    COUNT(*) / GREATEST(MAX(id) - MIN(id) + 1, 1.0) as id_density
                FROM portfolio_fund_irr_values
                WHERE created_at >= CURRENT_DATE - INTERVAL '{days} days'
            """)
            
            performance_metrics = {
                'avg_efficiency': round(sum(efficiency_scores) / len(efficiency_scores), 3) if efficiency_scores else 0,
                'efficiency_distribution': {
                    'excellent': sum(1 for e in efficiency_scores if e >= 0.95),
                    'good': sum(1 for e in efficiency_scores if 0.8 <= e < 0.95),
                    'fair': sum(1 for e in efficiency_scores if 0.6 <= e < 0.8),
                    'poor': sum(1 for e in efficiency_scores if e < 0.6)
                },
                'peak_hours': sorted(hourly_distribution.items(), key=lambda x: x[1], reverse=True)[:5],
                'sequence_usage': [dict(row) for row in sequence_usage] if sequence_usage else []
            }
        
        # Get sequence health summary
        health_check = await _internal_sequence_health_check(db)
        
        # Generate optimization recommendations
        recommendations = []
        
        if total_bulk_operations > 10:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'Performance',
                'message': f"High bulk operation frequency detected ({total_bulk_operations} operations) - bulk endpoints are being used effectively"
            })
        
        if efficiency_scores and sum(efficiency_scores) / len(efficiency_scores) < 0.8:
            recommendations.append({
                'priority': 'MEDIUM',
                'category': 'Efficiency',
                'message': f"Average ID efficiency is {sum(efficiency_scores) / len(efficiency_scores):.1%} - consider using sequence reservation for better performance"
            })
        
        if not health_check['overall_health']:
            recommendations.append({
                'priority': 'HIGH',
                'category': 'Health',
                'message': "Sequence health issues detected - run repair-sequences endpoint"
            })
        
        if total_records > 1000:
            recommendations.append({
                'priority': 'INFO',
                'category': 'Scale',
                'message': f"High volume detected ({total_records} records) - monitoring sequence reservation performance"
            })
        
        # Peak usage analysis
        if hourly_distribution:
            peak_hour = max(hourly_distribution.items(), key=lambda x: x[1])
            if peak_hour[1] > total_records * 0.3:  # More than 30% of activity in one hour
                recommendations.append({
                    'priority': 'MEDIUM',
                    'category': 'Load Balancing',
                    'message': f"Peak usage at hour {peak_hour[0]}:00 ({peak_hour[1]} records) - consider load distribution"
                })
        
        response = {
            'analysis_period_days': days,
            'summary': {
                'total_activity_records': total_records,
                'bulk_operations_detected': total_bulk_operations,
                'avg_records_per_operation': round(total_records / max(total_bulk_operations, 1), 1),
                'analysis_timestamp': datetime.utcnow().isoformat()
            },
            'bulk_operation_patterns': bulk_patterns,
            'sequence_health_summary': {
                'overall_healthy': health_check['overall_health'],
                'healthy_sequences': health_check['healthy_sequences'],
                'total_sequences': health_check['total_sequences']
            },
            'recommendations': recommendations
        }
        
        # Add performance metrics if requested
        if include_performance:
            response['performance_metrics'] = performance_metrics
        
        logger.info(f"📊 SYSTEM: Analysis complete - {total_bulk_operations} bulk patterns, {total_records} total records")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ SYSTEM: Error analyzing bulk operation stats: {e}")
        import traceback
        logger.error(f"❌ SYSTEM: Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Statistics analysis failed: {str(e)}")


@router.get("/system/health")
async def system_health_check(db = Depends(get_db)):
    """
    Overall system health check
    
    Provides a quick overview of system health including database
    connectivity, sequence status, and basic performance metrics.
    
    Returns:
        Dictionary with overall system health status
    """
    try:
        start_time = datetime.utcnow()
        
        # Test database connectivity
        db_test = await db.fetchrow("SELECT 1 as test")
        db_healthy = db_test and db_test['test'] == 1
        
        # Quick sequence health check
        sequence_health = await _internal_sequence_health_check(db)
        
        # Calculate response time
        response_time_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
        
        overall_healthy = db_healthy and sequence_health['overall_health']
        
        response = {
            'status': 'healthy' if overall_healthy else 'degraded',
            'database_connectivity': 'ok' if db_healthy else 'error',
            'sequence_health': 'ok' if sequence_health['overall_health'] else 'warning',
            'response_time_ms': round(response_time_ms, 2),
            'checked_at': datetime.utcnow().isoformat(),
            'details': {
                'sequences_healthy': sequence_health['healthy_sequences'],
                'sequences_total': sequence_health['total_sequences']
            }
        }
        
        if overall_healthy:
            logger.info(f"✅ SYSTEM: Health check passed ({response_time_ms:.1f}ms)")
        else:
            logger.warning(f"⚠️ SYSTEM: Health check shows issues ({response_time_ms:.1f}ms)")
        
        return response
        
    except Exception as e:
        logger.error(f"❌ SYSTEM: Health check failed: {e}")
        return {
            'status': 'error',
            'error': str(e),
            'checked_at': datetime.utcnow().isoformat()
        }


@router.post("/system/performance-test")
async def run_performance_test(
    test_type: str = Query("bulk_activities", description="Type of test to run"),
    batch_size: int = Query(10, description="Number of records per batch", ge=1, le=100),
    num_batches: int = Query(5, description="Number of batches to test", ge=1, le=20),
    concurrent: bool = Query(False, description="Run batches concurrently"),
    cleanup: bool = Query(True, description="Clean up test data after completion"),
    db = Depends(get_db)
):
    """
    Run performance tests on bulk operations and sequence reservation
    
    This endpoint stress tests the bulk operation system to validate
    performance, concurrency handling, and sequence reservation efficiency.
    
    Args:
        test_type: Type of test ('bulk_activities', 'sequence_reservation', 'concurrent_load')
        batch_size: Number of records per batch (1-100)
        num_batches: Number of batches to test (1-20)  
        concurrent: Whether to run batches concurrently
        cleanup: Whether to clean up test data afterwards
        db: Database dependency
        
    Returns:
        Dictionary with detailed performance test results
        
    Example Response:
    {
        "test_completed": true,
        "test_type": "bulk_activities",
        "configuration": {
            "batch_size": 10,
            "num_batches": 5,
            "concurrent": false
        },
        "results": {
            "total_records_created": 50,
            "total_time_seconds": 2.34,
            "avg_batch_time_ms": 468,
            "throughput_records_per_second": 21.4,
            "sequence_efficiency": 1.0,
            "errors": 0
        }
    }
    """
    try:
        import asyncio
        import time
        from datetime import datetime, timezone
        
        logger.info(f"🧪 SYSTEM: Starting performance test - {test_type} ({num_batches} batches of {batch_size})")
        
        start_time = time.time()
        test_results = {
            'test_completed': False,
            'test_type': test_type,
            'configuration': {
                'batch_size': batch_size,
                'num_batches': num_batches,
                'concurrent': concurrent,
                'cleanup': cleanup
            },
            'results': {
                'total_records_created': 0,
                'total_time_seconds': 0,
                'batch_results': [],
                'sequence_efficiency': 0,
                'errors': 0,
                'error_details': []
            },
            'started_at': datetime.utcnow().isoformat()
        }
        
        created_ids = []
        
        if test_type == "bulk_activities":
            # Test bulk activity creation with sequence reservation
            
            async def create_test_batch(batch_num: int):
                batch_start = time.time()
                try:
                    # Generate test activity data
                    test_activities = []
                    for i in range(batch_size):
                        test_activities.append({
                            'portfolio_fund_id': 2,  # Use valid test fund
                            'product_id': 26,  # Use valid test product
                            'activity_type': 'test_performance',
                            'activity_timestamp': datetime.now(timezone.utc),
                            'amount': 100.0 + (batch_num * batch_size) + i,
                            'created_at': datetime.utcnow()
                        })
                    
                    # Use SequenceManager for bulk insert
                    from app.utils.sequence_manager import SequenceManager
                    
                    inserted_records = await SequenceManager.bulk_insert_with_reserved_ids(
                        db=db,
                        table_name='holding_activity_log',
                        data=test_activities,
                        sequence_name='holding_activity_log_id_seq'
                    )
                    
                    batch_time = time.time() - batch_start
                    batch_ids = [record['id'] for record in inserted_records]
                    created_ids.extend(batch_ids)
                    
                    # Calculate sequence efficiency for this batch
                    if len(batch_ids) > 1:
                        expected_span = len(batch_ids)
                        actual_span = max(batch_ids) - min(batch_ids) + 1
                        efficiency = expected_span / actual_span
                    else:
                        efficiency = 1.0
                    
                    return {
                        'batch_number': batch_num,
                        'records_created': len(inserted_records),
                        'time_seconds': round(batch_time, 3),
                        'time_ms': round(batch_time * 1000, 1),
                        'id_range': f"{min(batch_ids)}-{max(batch_ids)}" if batch_ids else "none",
                        'sequence_efficiency': round(efficiency, 3),
                        'throughput_per_sec': round(len(inserted_records) / batch_time, 1) if batch_time > 0 else 0,
                        'success': True
                    }
                    
                except Exception as e:
                    batch_time = time.time() - batch_start
                    test_results['results']['errors'] += 1
                    test_results['results']['error_details'].append(f"Batch {batch_num}: {str(e)}")
                    
                    return {
                        'batch_number': batch_num,
                        'records_created': 0,
                        'time_seconds': round(batch_time, 3),
                        'time_ms': round(batch_time * 1000, 1),
                        'id_range': "error",
                        'sequence_efficiency': 0,
                        'throughput_per_sec': 0,
                        'success': False,
                        'error': str(e)
                    }
            
            # Run batches
            if concurrent:
                logger.info(f"🔄 SYSTEM: Running {num_batches} batches concurrently...")
                tasks = [create_test_batch(i + 1) for i in range(num_batches)]
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            else:
                logger.info(f"🔄 SYSTEM: Running {num_batches} batches sequentially...")
                batch_results = []
                for i in range(num_batches):
                    result = await create_test_batch(i + 1)
                    batch_results.append(result)
            
            # Process results
            test_results['results']['batch_results'] = [
                r for r in batch_results if not isinstance(r, Exception)
            ]
            
            successful_batches = [r for r in test_results['results']['batch_results'] if r.get('success', False)]
            
            if successful_batches:
                test_results['results']['total_records_created'] = sum(r['records_created'] for r in successful_batches)
                test_results['results']['avg_batch_time_ms'] = round(
                    sum(r['time_ms'] for r in successful_batches) / len(successful_batches), 1
                )
                test_results['results']['sequence_efficiency'] = round(
                    sum(r['sequence_efficiency'] for r in successful_batches) / len(successful_batches), 3
                )
                test_results['results']['avg_throughput_per_sec'] = round(
                    sum(r['throughput_per_sec'] for r in successful_batches) / len(successful_batches), 1
                )
        
        elif test_type == "sequence_reservation":
            # Test pure sequence reservation performance
            from app.utils.sequence_manager import SequenceManager
            
            async def test_sequence_batch(batch_num: int):
                batch_start = time.time()
                try:
                    start_id, end_id = await SequenceManager.reserve_sequence_range(
                        db, 'holding_activity_log_id_seq', batch_size
                    )
                    
                    batch_time = time.time() - batch_start
                    
                    return {
                        'batch_number': batch_num,
                        'ids_reserved': batch_size,
                        'time_ms': round(batch_time * 1000, 1),
                        'id_range': f"{start_id}-{end_id}",
                        'throughput_per_sec': round(batch_size / batch_time, 1) if batch_time > 0 else 0,
                        'success': True
                    }
                    
                except Exception as e:
                    batch_time = time.time() - batch_start
                    test_results['results']['errors'] += 1
                    test_results['results']['error_details'].append(f"Batch {batch_num}: {str(e)}")
                    
                    return {
                        'batch_number': batch_num,
                        'ids_reserved': 0,
                        'time_ms': round(batch_time * 1000, 1),
                        'id_range': "error",
                        'throughput_per_sec': 0,
                        'success': False,
                        'error': str(e)
                    }
            
            # Run sequence reservation tests
            if concurrent:
                logger.info(f"🔄 SYSTEM: Running {num_batches} sequence reservation batches concurrently...")
                
                # Add small delays between concurrent operations to reduce contention
                async def test_sequence_batch_with_delay(batch_num: int):
                    # Add a small staggered delay to reduce concurrent contention
                    import asyncio
                    await asyncio.sleep(batch_num * 0.001)  # 1ms per batch number
                    return await test_sequence_batch(batch_num)
                
                tasks = [test_sequence_batch_with_delay(i + 1) for i in range(num_batches)]
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Convert exceptions to error results
                processed_results = []
                for i, result in enumerate(batch_results):
                    if isinstance(result, Exception):
                        test_results['results']['errors'] += 1
                        test_results['results']['error_details'].append(f"Batch {i + 1}: {str(result)}")
                        processed_results.append({
                            'batch_number': i + 1,
                            'ids_reserved': 0,
                            'time_ms': 0,
                            'id_range': "error",
                            'throughput_per_sec': 0,
                            'success': False,
                            'error': str(result)
                        })
                    else:
                        processed_results.append(result)
                
                batch_results = processed_results
            else:
                logger.info(f"🔄 SYSTEM: Running {num_batches} sequence reservation batches sequentially...")
                batch_results = []
                for i in range(num_batches):
                    result = await test_sequence_batch(i + 1)
                    batch_results.append(result)
            
            test_results['results']['batch_results'] = batch_results
            successful_batches = [r for r in batch_results if r.get('success', False)]
            
            if successful_batches:
                test_results['results']['total_records_created'] = sum(r['ids_reserved'] for r in successful_batches)
                test_results['results']['avg_batch_time_ms'] = round(
                    sum(r['time_ms'] for r in successful_batches) / len(successful_batches), 1
                )
        
        else:
            raise HTTPException(status_code=400, detail=f"Unknown test type: {test_type}")
        
        # Calculate overall metrics
        total_time = time.time() - start_time
        test_results['results']['total_time_seconds'] = round(total_time, 3)
        
        if test_results['results']['total_records_created'] > 0 and total_time > 0:
            test_results['results']['overall_throughput_per_sec'] = round(
                test_results['results']['total_records_created'] / total_time, 1
            )
        
        # Cleanup test data if requested
        if cleanup and created_ids and test_type == "bulk_activities":
            try:
                logger.info(f"🧹 SYSTEM: Cleaning up {len(created_ids)} test records...")
                
                # Delete in batches to avoid large queries
                cleanup_batches = [created_ids[i:i+50] for i in range(0, len(created_ids), 50)]
                cleaned_count = 0
                
                for batch in cleanup_batches:
                    placeholders = ','.join([f'${i+1}' for i in range(len(batch))])
                    await db.execute(f"DELETE FROM holding_activity_log WHERE id IN ({placeholders})", *batch)
                    cleaned_count += len(batch)
                
                test_results['results']['cleanup'] = {
                    'records_cleaned': cleaned_count,
                    'cleanup_successful': True
                }
                logger.info(f"✅ SYSTEM: Cleaned up {cleaned_count} test records")
                
            except Exception as cleanup_error:
                test_results['results']['cleanup'] = {
                    'records_cleaned': 0,
                    'cleanup_successful': False,
                    'cleanup_error': str(cleanup_error)
                }
                logger.error(f"❌ SYSTEM: Cleanup failed: {cleanup_error}")
        
        test_results['test_completed'] = True
        test_results['completed_at'] = datetime.utcnow().isoformat()
        
        logger.info(f"🎉 SYSTEM: Performance test completed - {test_results['results']['total_records_created']} records in {total_time:.2f}s")
        
        return test_results
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ SYSTEM: Performance test failed: {e}")
        raise HTTPException(status_code=500, detail=f"Performance test failed: {str(e)}")
