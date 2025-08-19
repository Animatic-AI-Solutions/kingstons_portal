"""
Sequence Manager Utility
Integrates sequence monitoring into the FastAPI application
"""

import asyncio
import logging
from typing import List, Dict, Optional
from app.db.database import get_db

logger = logging.getLogger(__name__)

class SequenceManager:
    """Manages database sequence synchronization"""
    
    def __init__(self):
        self.critical_tables = [
            'client_products',
            'product_owner_products', 
            'client_group_product_owners',
            'portfolios',
            'portfolio_funds',
            'product_owners',
            'client_groups'
        ]
    
    async def check_sequences(self, auto_fix: bool = False) -> Dict[str, any]:
        """
        Check all sequences for drift issues
        
        Args:
            auto_fix: If True, automatically fix sequences that are out of sync
            
        Returns:
            Dict with check results
        """
        results = {
            'checked': 0,
            'issues': [],
            'fixed': 0,
            'errors': []
        }
        
        try:
            async for db in get_db():
                # Get all tables with sequences
                tables_with_sequences = await db.fetch("""
                    SELECT 
                        tablename,
                        pg_get_serial_sequence('public.'||tablename, 'id') as sequence_name
                    FROM pg_tables 
                    WHERE schemaname = 'public' 
                    AND pg_get_serial_sequence('public.'||tablename, 'id') IS NOT NULL
                    ORDER BY tablename
                """)
                
                for row in tables_with_sequences:
                    table_name = row['tablename']
                    sequence_name = row['sequence_name'].split('.')[-1]
                    
                    try:
                        # Get max ID from table
                        max_id_result = await db.fetch_one(f"SELECT MAX(id) FROM {table_name}")
                        max_id = max_id_result[0] if max_id_result and max_id_result[0] else 0
                        
                        if max_id == 0:
                            results['checked'] += 1
                            continue
                        
                        # Get current sequence value
                        seq_result = await db.fetch_one(f"SELECT last_value FROM {sequence_name}")
                        seq_val = seq_result[0] if seq_result else 0
                        
                        # Check if sequence is behind
                        if max_id >= seq_val:
                            issue = {
                                'table': table_name,
                                'sequence': sequence_name,
                                'max_id': max_id,
                                'seq_value': seq_val,
                                'deficit': max_id - seq_val + 1
                            }
                            results['issues'].append(issue)
                            
                            logger.warning(f"Sequence drift detected: {table_name} (MAX={max_id}, SEQ={seq_val})")
                            
                            if auto_fix:
                                new_seq_val = max_id + 1
                                await db.execute(f"ALTER SEQUENCE {sequence_name} RESTART WITH {new_seq_val}")
                                results['fixed'] += 1
                                logger.info(f"Fixed sequence for {table_name}: set to {new_seq_val}")
                        
                        results['checked'] += 1
                        
                    except Exception as e:
                        error_msg = f"Error checking {table_name}: {str(e)}"
                        results['errors'].append(error_msg)
                        logger.error(error_msg)
                
                break  # Exit the async generator
                
        except Exception as e:
            error_msg = f"Database connection error: {str(e)}"
            results['errors'].append(error_msg)
            logger.error(error_msg)
        
        return results
    
    async def check_critical_sequences(self) -> bool:
        """
        Quick check of critical tables only
        Returns True if all critical sequences are OK
        """
        try:
            async for db in get_db():
                for table_name in self.critical_tables:
                    try:
                        # Check if table exists
                        table_exists = await db.fetch_one(
                            "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = $1)",
                            table_name
                        )
                        
                        if not table_exists[0]:
                            continue
                        
                        # Get max ID and sequence value
                        max_id_result = await db.fetch_one(f"SELECT MAX(id) FROM {table_name}")
                        max_id = max_id_result[0] if max_id_result and max_id_result[0] else 0
                        
                        if max_id == 0:
                            continue
                        
                        sequence_name = f"{table_name}_id_seq"
                        seq_result = await db.fetch_one(f"SELECT last_value FROM {sequence_name}")
                        seq_val = seq_result[0] if seq_result else 0
                        
                        if max_id >= seq_val:
                            logger.warning(f"Critical sequence drift: {table_name} (MAX={max_id}, SEQ={seq_val})")
                            return False
                    
                    except Exception as e:
                        logger.error(f"Error checking critical sequence {table_name}: {e}")
                        return False
                
                break  # Exit the async generator
                
            return True
            
        except Exception as e:
            logger.error(f"Error checking critical sequences: {e}")
            return False

# Global instance
sequence_manager = SequenceManager()