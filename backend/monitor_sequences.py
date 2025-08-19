#!/usr/bin/env python3
"""
Database Sequence Monitor
Automatically detects and optionally fixes sequence drift issues.
Can be run as a scheduled task or integrated into the application startup.
"""

import asyncio
import asyncpg
import logging
from datetime import datetime
import sys

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def monitor_sequences(auto_fix=False, alert_only=False):
    """
    Monitor all database sequences for drift issues.
    
    Args:
        auto_fix (bool): If True, automatically fix sequences that are out of sync
        alert_only (bool): If True, only report issues without fixing
    """
    conn_str = 'postgresql://kingstons_app:KingstonApp2024!@192.168.0.223:5432/kingstons_portal'
    
    try:
        conn = await asyncpg.connect(conn_str)
        logger.info("Connected to database for sequence monitoring")
        
        # Get all tables with auto-increment sequences AND id column
        tables_with_sequences = await conn.fetch("""
            SELECT 
                schemaname,
                tablename,
                pg_get_serial_sequence(schemaname||'.'||tablename, 'id') as sequence_name
            FROM pg_tables t
            WHERE schemaname = 'public' 
            AND pg_get_serial_sequence(schemaname||'.'||tablename, 'id') IS NOT NULL
            AND EXISTS (
                SELECT 1 FROM information_schema.columns c 
                WHERE c.table_schema = t.schemaname 
                AND c.table_name = t.tablename 
                AND c.column_name = 'id'
            )
            ORDER BY tablename
        """)
        
        issues_found = []
        tables_checked = 0
        
        for row in tables_with_sequences:
            table_name = row['tablename']
            sequence_name = row['sequence_name'].split('.')[-1]  # Remove schema prefix
            
            try:
                # Get max ID from table
                max_id = await conn.fetchval(f"SELECT MAX(id) FROM {table_name}")
                
                if max_id is None:
                    logger.info(f"✓ {table_name}: Empty table, sequence OK")
                    tables_checked += 1
                    continue
                
                # Get current sequence value
                seq_val = await conn.fetchval(f"SELECT last_value FROM {sequence_name}")
                
                # Check if sequence is behind
                if max_id >= seq_val:
                    issue = {
                        'table': table_name,
                        'sequence': sequence_name,
                        'max_id': max_id,
                        'seq_value': seq_val,
                        'deficit': max_id - seq_val + 1
                    }
                    issues_found.append(issue)
                    
                    logger.warning(f"⚠️  {table_name}: MAX(id)={max_id}, Sequence={seq_val} (deficit: {issue['deficit']})")
                    
                    if auto_fix:
                        new_seq_val = max_id + 1
                        await conn.execute(f"ALTER SEQUENCE {sequence_name} RESTART WITH {new_seq_val}")
                        logger.info(f"✅ {table_name}: Sequence fixed! Set to {new_seq_val}")
                        
                else:
                    logger.info(f"✓ {table_name}: Sequence OK (MAX={max_id}, SEQ={seq_val})")
                
                tables_checked += 1
                
            except Exception as e:
                logger.error(f"❌ {table_name}: Error checking sequence - {e}")
        
        await conn.close()
        
        # Summary report
        logger.info(f"\n{'='*60}")
        logger.info(f"SEQUENCE MONITORING SUMMARY")
        logger.info(f"{'='*60}")
        logger.info(f"Tables checked: {tables_checked}")
        logger.info(f"Issues found: {len(issues_found)}")
        
        if issues_found:
            logger.warning(f"\nTables with sequence drift:")
            for issue in issues_found:
                logger.warning(f"  - {issue['table']}: {issue['deficit']} IDs behind")
            
            if not auto_fix and not alert_only:
                logger.info(f"\nTo auto-fix these issues, run:")
                logger.info(f"  python monitor_sequences.py --fix")
        else:
            logger.info(f"✅ All sequences are properly synchronized!")
        
        return len(issues_found)
        
    except Exception as e:
        logger.error(f"❌ Error during sequence monitoring: {e}")
        return -1

async def get_sequence_status():
    """Get a quick status report of all sequences"""
    conn_str = 'postgresql://kingstons_app:KingstonApp2024!@192.168.0.223:5432/kingstons_portal'
    
    try:
        conn = await asyncpg.connect(conn_str)
        
        # Get summary of all sequences
        result = await conn.fetch("""
            WITH sequence_info AS (
                SELECT 
                    schemaname,
                    tablename,
                    pg_get_serial_sequence(schemaname||'.'||tablename, 'id') as sequence_name
                FROM pg_tables 
                WHERE schemaname = 'public' 
                AND pg_get_serial_sequence(schemaname||'.'||tablename, 'id') IS NOT NULL
            )
            SELECT 
                tablename,
                (SELECT MAX(id) FROM pg_catalog.pg_get_expr(pg_attrdef.adbin, pg_attrdef.adrelid)) as max_id_estimate
            FROM sequence_info
            ORDER BY tablename
        """)
        
        await conn.close()
        return result
        
    except Exception as e:
        logger.error(f"Error getting sequence status: {e}")
        return []

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Monitor database sequences for drift")
    parser.add_argument('--fix', action='store_true', help='Automatically fix sequence issues')
    parser.add_argument('--alert-only', action='store_true', help='Only report issues, do not fix')
    parser.add_argument('--status', action='store_true', help='Show quick status of all sequences')
    
    args = parser.parse_args()
    
    if args.status:
        asyncio.run(get_sequence_status())
    else:
        issues = asyncio.run(monitor_sequences(auto_fix=args.fix, alert_only=args.alert_only))
        
        # Exit codes for scripting
        if issues > 0:
            sys.exit(1)  # Issues found
        elif issues == 0:
            sys.exit(0)  # All good
        else:
            sys.exit(2)  # Error occurred