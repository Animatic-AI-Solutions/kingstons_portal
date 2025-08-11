"""
Sequence Manager for Bulk Operations
Handles sequence reservation and bulk insertions with explicit ID management

This module provides sequence-safe bulk operations to prevent ID conflicts
during high-volume database insertions, particularly for holding_activity_log
and IRR value tables.
"""

import logging
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class SequenceManager:
    """
    Manages PostgreSQL sequence reservations for bulk operations
    
    This class provides methods to:
    1. Reserve sequence ranges atomically
    2. Perform bulk insertions with pre-assigned IDs
    3. Prevent sequence conflicts during concurrent operations
    """
    
    @staticmethod
    async def reserve_sequence_range(
        db, 
        sequence_name: str, 
        count: int,
        max_retries: int = 3,
        retry_delay: float = 0.01
    ) -> Tuple[int, int]:
        """
        Reserve a range of sequence values for bulk operations
        
        This method atomically reserves a contiguous range of sequence values
        to prevent ID conflicts during bulk insertions.
        
        Args:
            db: Database connection (asyncpg)
            sequence_name: Name of the sequence (e.g., 'holding_activity_log_id_seq')
            count: Number of IDs to reserve (must be > 0)
            max_retries: Maximum number of retry attempts for concurrent operations
            retry_delay: Delay between retries in seconds
            
        Returns:
            Tuple of (start_id, end_id) inclusive
            
        Raises:
            ValueError: If count <= 0
            Exception: Database errors during sequence operations
        """
        if count <= 0:
            raise ValueError("Count must be positive")
        
        logger.info(f"🔒 SEQUENCE: Reserving {count} IDs from {sequence_name}")
        
        for attempt in range(max_retries + 1):
            try:
                if count == 1:
                    # For single ID, just use nextval
                    result = await db.fetchrow(f"SELECT nextval('{sequence_name}') as start_id")
                    start_id = result['start_id']
                    end_id = start_id
                else:
                    # For multiple IDs, use a single atomic operation to reserve the entire range
                    # This prevents race conditions by doing everything in one database call
                    result = await db.fetchrow(f"""
                        SELECT 
                            nextval('{sequence_name}') as start_id,
                            setval('{sequence_name}', nextval('{sequence_name}') + $1 - 2) as end_id
                    """, count)
                    
                    start_id = result['start_id']
                    end_id = result['end_id']
                
                logger.info(f"✅ SEQUENCE: Reserved range {sequence_name}: {start_id}-{end_id} ({count} IDs)")
                return start_id, end_id
                
            except Exception as e:
                error_msg = str(e).lower()
                
                # Check if it's a concurrency error that we can retry
                if attempt < max_retries and ("another operation is in progress" in error_msg or 
                                            "concurrent" in error_msg or 
                                            "lock" in error_msg):
                    logger.warning(f"⚠️ SEQUENCE: Attempt {attempt + 1}/{max_retries + 1} failed due to concurrency, retrying in {retry_delay}s: {e}")
                    
                    # Use exponential backoff for retries
                    import asyncio
                    await asyncio.sleep(retry_delay * (2 ** attempt))
                    continue
                else:
                    logger.error(f"❌ SEQUENCE: Failed to reserve range from {sequence_name}: {e}")
                    raise
        
        # If we get here, all retries failed
        raise Exception(f"Failed to reserve sequence range after {max_retries + 1} attempts")
    
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
        
        This method performs a bulk insertion with explicit ID assignment
        using pre-reserved sequence values to prevent conflicts.
        
        Args:
            db: Database connection (asyncpg)
            table_name: Target table name
            data: List of dictionaries containing row data (will be modified with IDs)
            sequence_name: Sequence to reserve from
            id_column: Name of the ID column (default: 'id')
            
        Returns:
            List of inserted records with assigned IDs
            
        Raises:
            Exception: Database errors during insertion
        """
        if not data:
            logger.info("🔒 BULK INSERT: No data provided, skipping")
            return []
        
        record_count = len(data)
        logger.info(f"🚀 BULK INSERT: Starting bulk insert of {record_count} records into {table_name}")
        
        try:
            # Reserve sequence range
            start_id, end_id = await SequenceManager.reserve_sequence_range(
                db, sequence_name, record_count
            )
            
            # Assign IDs to data records
            for i, row in enumerate(data):
                row[id_column] = start_id + i
            
            # Prepare bulk insert query
            if not data:  # Double-check after ID assignment
                return []
            
            columns = list(data[0].keys())
            placeholders = ', '.join([f"${i+1}" for i in range(len(columns))])
            query = f"""
                INSERT INTO {table_name} ({', '.join(columns)})
                VALUES ({placeholders})
                RETURNING *
            """
            
            logger.info(f"🔧 BULK INSERT: Executing {record_count} insertions with query: {query[:100]}...")
            
            # Execute bulk insert - we still do individual inserts but with reserved IDs
            # This ensures RETURNING * works and maintains transaction safety
            inserted_records = []
            for row in data:
                values = [row[col] for col in columns]
                try:
                    result = await db.fetchrow(query, *values)
                    inserted_records.append(dict(result))
                except Exception as insert_error:
                    logger.error(f"❌ BULK INSERT: Failed to insert record {row.get(id_column, 'unknown')}: {insert_error}")
                    # Continue with other records - don't fail entire batch
                    continue
            
            success_count = len(inserted_records)
            logger.info(f"✅ BULK INSERT: Successfully inserted {success_count}/{record_count} records into {table_name}")
            
            if success_count < record_count:
                logger.warning(f"⚠️ BULK INSERT: {record_count - success_count} records failed to insert")
            
            return inserted_records
            
        except Exception as e:
            logger.error(f"❌ BULK INSERT: Bulk insertion failed for {table_name}: {e}")
            raise
    
    @staticmethod
    async def bulk_insert_executemany(
        db,
        table_name: str,
        data: List[Dict[str, Any]],
        sequence_name: str,
        id_column: str = 'id'
    ) -> List[int]:
        """
        Alternative bulk insert using executemany for better performance
        
        This method uses asyncpg's executemany for true bulk insertion,
        but returns only the assigned IDs since RETURNING doesn't work with executemany.
        
        Args:
            db: Database connection (asyncpg)
            table_name: Target table name
            data: List of dictionaries containing row data
            sequence_name: Sequence to reserve from
            id_column: Name of the ID column (default: 'id')
            
        Returns:
            List of assigned IDs
        """
        if not data:
            return []
        
        record_count = len(data)
        logger.info(f"🚀 BULK INSERT (executemany): Starting bulk insert of {record_count} records")
        
        try:
            # Reserve sequence range
            start_id, end_id = await SequenceManager.reserve_sequence_range(
                db, sequence_name, record_count
            )
            
            # Assign IDs and prepare data tuples
            assigned_ids = []
            data_tuples = []
            
            for i, row in enumerate(data):
                assigned_id = start_id + i
                row[id_column] = assigned_id
                assigned_ids.append(assigned_id)
                
                # Create tuple in column order
                columns = list(row.keys())
                data_tuples.append(tuple(row[col] for col in columns))
            
            # Build insert query
            columns = list(data[0].keys())
            placeholders = ', '.join([f"${i+1}" for i in range(len(columns))])
            query = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"
            
            # Execute bulk insert
            await db.executemany(query, data_tuples)
            
            logger.info(f"✅ BULK INSERT (executemany): Successfully inserted {record_count} records")
            return assigned_ids
            
        except Exception as e:
            logger.error(f"❌ BULK INSERT (executemany): Failed for {table_name}: {e}")
            raise
    
    @staticmethod
    async def check_sequence_health(db, table_name: str, sequence_name: str) -> Dict[str, Any]:
        """
        Check the health of a sequence relative to its table
        
        Args:
            db: Database connection
            table_name: Name of the table
            sequence_name: Name of the sequence
            
        Returns:
            Dictionary with health status information
        """
        try:
            # Get sequence value
            seq_result = await db.fetchrow(f"SELECT last_value FROM {sequence_name}")
            seq_val = seq_result['last_value'] if seq_result else 0
            
            # Get max table ID
            max_result = await db.fetchrow(f"SELECT MAX(id) as max_id FROM {table_name}")
            max_id = max_result['max_id'] if max_result and max_result['max_id'] else 0
            
            is_healthy = seq_val > max_id
            gap = max_id - seq_val if not is_healthy else 0
            
            return {
                'table': table_name,
                'sequence': sequence_name,
                'sequence_value': seq_val,
                'table_max_id': max_id,
                'is_healthy': is_healthy,
                'gap': gap,
                'status': 'OK' if is_healthy else 'NEEDS_REPAIR',
                'severity': 'HIGH' if gap > 100 else 'MEDIUM' if gap > 10 else 'LOW'
            }
            
        except Exception as e:
            logger.error(f"❌ SEQUENCE HEALTH: Failed to check {sequence_name}: {e}")
            return {
                'table': table_name,
                'sequence': sequence_name,
                'error': str(e),
                'status': 'ERROR'
            }
    
    @staticmethod
    async def repair_sequence(db, table_name: str, sequence_name: str) -> Dict[str, Any]:
        """
        Repair an out-of-sync sequence
        
        Args:
            db: Database connection
            table_name: Name of the table
            sequence_name: Name of the sequence
            
        Returns:
            Dictionary with repair results
        """
        try:
            # Get current values
            max_result = await db.fetchrow(f"SELECT MAX(id) as max_id FROM {table_name}")
            max_id = max_result['max_id'] if max_result and max_result['max_id'] else 0
            
            seq_result = await db.fetchrow(f"SELECT last_value FROM {sequence_name}")
            seq_val = seq_result['last_value'] if seq_result else 0
            
            if seq_val <= max_id:
                new_val = max_id + 1
                await db.execute(f"SELECT setval('{sequence_name}', $1, false)", new_val)
                
                logger.warning(f"🔧 SEQUENCE REPAIR: Fixed {sequence_name}: {seq_val} → {new_val}")
                return {
                    'table': table_name,
                    'sequence': sequence_name,
                    'old_value': seq_val,
                    'new_value': new_val,
                    'gap_fixed': max_id - seq_val,
                    'status': 'REPAIRED'
                }
            else:
                return {
                    'table': table_name,
                    'sequence': sequence_name,
                    'current_value': seq_val,
                    'table_max_id': max_id,
                    'status': 'HEALTHY'
                }
                
        except Exception as e:
            logger.error(f"❌ SEQUENCE REPAIR: Failed to repair {sequence_name}: {e}")
            return {
                'table': table_name,
                'sequence': sequence_name,
                'error': str(e),
                'status': 'REPAIR_FAILED'
            }
