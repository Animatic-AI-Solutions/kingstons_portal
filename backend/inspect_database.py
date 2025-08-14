#!/usr/bin/env python3
"""
Database Inspector Script for Kingstons Portal
Provides easy database inspection without dealing with terminal SQL formatting issues.
"""

import asyncio
import asyncpg
import os
import sys
from datetime import datetime, date
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional

class DatabaseInspector:
    def __init__(self):
        load_dotenv()
        self.database_url = os.getenv('DATABASE_URL')
        if not self.database_url:
            raise ValueError("DATABASE_URL not found in environment variables")
        
    async def connect(self):
        """Establish database connection"""
        try:
            self.conn = await asyncpg.connect(self.database_url)
            print(f"✅ Connected to database successfully")
        except Exception as e:
            print(f"❌ Failed to connect to database: {e}")
            raise

    async def disconnect(self):
        """Close database connection"""
        if hasattr(self, 'conn'):
            await self.conn.close()
            print("🔌 Database connection closed")

    async def show_irr_tables(self):
        """Show all IRR-related tables and views"""
        print("\n" + "="*60)
        print("📋 IRR-RELATED TABLES AND VIEWS")
        print("="*60)
        
        tables = await self.conn.fetch("""
            SELECT table_name, table_type, 
                   CASE 
                       WHEN table_type = 'VIEW' THEN '👁️ '
                       ELSE '📊 '
                   END as icon
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND (table_name LIKE '%irr%' OR table_name LIKE '%historical%')
            ORDER BY table_type DESC, table_name
        """)
        
        for table in tables:
            print(f"  {table['icon']} {table['table_name']} ({table['table_type']})")
        
        return [t['table_name'] for t in tables]

    async def show_table_structure(self, table_name: str):
        """Show structure of a specific table"""
        print(f"\n🔍 STRUCTURE OF {table_name.upper()}")
        print("-" * 50)
        
        columns = await self.conn.fetch("""
            SELECT column_name, data_type, is_nullable, column_default,
                   CASE 
                       WHEN column_name LIKE '%id%' AND column_name != 'id' THEN '🔗 '
                       WHEN column_name = 'id' THEN '🆔 '
                       WHEN data_type = 'timestamp with time zone' THEN '⏰ '
                       WHEN data_type = 'date' THEN '📅 '
                       WHEN data_type = 'numeric' THEN '💰 '
                       ELSE '📝 '
                   END as icon
            FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = $1
            ORDER BY ordinal_position
        """, table_name)
        
        for col in columns:
            nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
            default = f" DEFAULT {col['column_default']}" if col['column_default'] else ""
            print(f"  {col['icon']} {col['column_name']:<20} {col['data_type']:<20} {nullable}{default}")

    async def show_sample_data(self, table_name: str, limit: int = 5):
        """Show sample data from a table"""
        print(f"\n📊 SAMPLE DATA FROM {table_name.upper()} (LIMIT {limit})")
        print("-" * 80)
        
        try:
            rows = await self.conn.fetch(f"SELECT * FROM {table_name} LIMIT $1", limit)
            
            if not rows:
                print("  ⚠️ No data found in this table")
                return
            
            # Get column names
            columns = list(rows[0].keys())
            
            # Print header
            header = " | ".join(f"{col[:15]:<15}" for col in columns)
            print(f"  {header}")
            print("  " + "-" * len(header))
            
            # Print rows
            for i, row in enumerate(rows, 1):
                values = []
                for col in columns:
                    value = row[col]
                    if value is None:
                        values.append("NULL".ljust(15))
                    elif isinstance(value, (datetime, date)):
                        values.append(str(value)[:15].ljust(15))
                    elif isinstance(value, (int, float)):
                        values.append(str(value)[:15].ljust(15))
                    else:
                        values.append(str(value)[:15].ljust(15))
                
                row_str = " | ".join(values)
                print(f"  {row_str}")
            
        except Exception as e:
            print(f"  ❌ Error querying {table_name}: {e}")

    async def count_records(self, table_name: str):
        """Count total records in a table"""
        try:
            count = await self.conn.fetchval(f"SELECT COUNT(*) FROM {table_name}")
            return count
        except Exception as e:
            print(f"  ❌ Error counting records in {table_name}: {e}")
            return 0

    async def show_portfolio_irr_summary(self):
        """Show summary of portfolio IRR data"""
        print("\n" + "="*60)
        print("💰 PORTFOLIO IRR DATA SUMMARY")
        print("="*60)
        
        # Count total records
        total_count = await self.count_records("portfolio_irr_values")
        print(f"📊 Total stored portfolio IRRs: {total_count}")
        
        # Show date range
        try:
            date_range = await self.conn.fetchrow("""
                SELECT MIN(date) as earliest_date, MAX(date) as latest_date,
                       COUNT(DISTINCT portfolio_id) as unique_portfolios
                FROM portfolio_irr_values
            """)
            
            if date_range['earliest_date']:
                print(f"📅 Date range: {date_range['earliest_date']} to {date_range['latest_date']}")
                print(f"🏠 Unique portfolios with IRR data: {date_range['unique_portfolios']}")
            
            # Show recent entries
            print(f"\n🕐 Most recent 10 IRR entries:")
            recent = await self.conn.fetch("""
                SELECT portfolio_id, date, irr_result, created_at
                FROM portfolio_irr_values 
                ORDER BY created_at DESC 
                LIMIT 10
            """)
            
            for entry in recent:
                print(f"  📈 Portfolio {entry['portfolio_id']}: {entry['irr_result']:.2f}% on {entry['date']} (saved: {entry['created_at'].strftime('%Y-%m-%d %H:%M')})")
            
        except Exception as e:
            print(f"❌ Error analyzing portfolio IRR data: {e}")

    async def check_product_portfolio_mapping(self):
        """Check how products map to portfolios"""
        print("\n" + "="*60)
        print("🔗 PRODUCT ↔ PORTFOLIO MAPPING")
        print("="*60)
        
        try:
            # Show product to portfolio mapping
            mappings = await self.conn.fetch("""
                SELECT cp.id as product_id, cp.product_name, cp.portfolio_id,
                       CASE WHEN piv.portfolio_id IS NOT NULL THEN '✅' ELSE '❌' END as has_irr_data
                FROM client_products cp
                LEFT JOIN (
                    SELECT DISTINCT portfolio_id 
                    FROM portfolio_irr_values
                ) piv ON cp.portfolio_id = piv.portfolio_id
                WHERE cp.portfolio_id IS NOT NULL
                ORDER BY cp.id
                LIMIT 15
            """)
            
            print("Product ID | Product Name              | Portfolio | Has IRR")
            print("-" * 65)
            
            for mapping in mappings:
                product_name = mapping['product_name'][:25] if mapping['product_name'] else 'Unknown'
                print(f"{mapping['product_id']:<10} | {product_name:<25} | {mapping['portfolio_id']:<9} | {mapping['has_irr_data']}")
            
            # Summary stats
            stats = await self.conn.fetchrow("""
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(portfolio_id) as products_with_portfolio,
                    COUNT(CASE WHEN piv.portfolio_id IS NOT NULL THEN 1 END) as products_with_irr_data
                FROM client_products cp
                LEFT JOIN (
                    SELECT DISTINCT portfolio_id 
                    FROM portfolio_irr_values
                ) piv ON cp.portfolio_id = piv.portfolio_id
            """)
            
            print(f"\n📊 Summary:")
            print(f"  • Total products: {stats['total_products']}")
            print(f"  • Products with portfolios: {stats['products_with_portfolio']}")
            print(f"  • Products with IRR data: {stats['products_with_irr_data']}")
            
        except Exception as e:
            print(f"❌ Error checking product-portfolio mapping: {e}")

    async def query_custom(self, sql: str):
        """Execute custom SQL query"""
        print(f"\n🔍 CUSTOM QUERY RESULTS")
        print("-" * 50)
        print(f"SQL: {sql}")
        print("-" * 50)
        
        try:
            if sql.strip().upper().startswith('SELECT'):
                rows = await self.conn.fetch(sql)
                
                if not rows:
                    print("  ⚠️ No results found")
                    return
                
                # Print results in a formatted way
                columns = list(rows[0].keys())
                
                # Print header
                header = " | ".join(f"{col[:20]:<20}" for col in columns)
                print(f"  {header}")
                print("  " + "-" * len(header))
                
                # Print rows (limit to 20 for readability)
                for i, row in enumerate(rows[:20], 1):
                    values = []
                    for col in columns:
                        value = row[col]
                        if value is None:
                            values.append("NULL".ljust(20))
                        else:
                            values.append(str(value)[:20].ljust(20))
                    
                    row_str = " | ".join(values)
                    print(f"  {row_str}")
                
                if len(rows) > 20:
                    print(f"  ... and {len(rows) - 20} more rows")
                    
            else:
                result = await self.conn.execute(sql)
                print(f"  ✅ Query executed: {result}")
                
        except Exception as e:
            print(f"  ❌ Query error: {e}")

    async def run_inspection(self, mode: str = "full"):
        """Run the database inspection"""
        try:
            await self.connect()
            
            if mode == "full" or mode == "tables":
                irr_tables = await self.show_irr_tables()
                
            if mode == "full" or mode == "structure":
                # Show structure of key tables
                key_tables = ['portfolio_irr_values', 'client_products']
                for table in key_tables:
                    await self.show_table_structure(table)
                    
            if mode == "full" or mode == "data":
                # Show sample data
                await self.show_sample_data('portfolio_irr_values', 10)
                await self.show_sample_data('client_products', 5)
                
            if mode == "full" or mode == "summary":
                await self.show_portfolio_irr_summary()
                await self.check_product_portfolio_mapping()
                
        finally:
            await self.disconnect()

def print_usage():
    """Print usage information"""
    print("🔍 DATABASE INSPECTOR FOR KINGSTONS PORTAL")
    print("=" * 50)
    print("Usage: python inspect_database.py [mode] [custom_sql]")
    print("\nModes:")
    print("  full      - Complete inspection (default)")
    print("  tables    - Show IRR-related tables only")
    print("  structure - Show table structures")
    print("  data      - Show sample data")
    print("  summary   - Show IRR data summary")
    print("  query     - Execute custom SQL (provide as second argument)")
    print("\nExamples:")
    print("  python inspect_database.py")
    print("  python inspect_database.py summary")
    print("  python inspect_database.py query \"SELECT COUNT(*) FROM portfolio_irr_values\"")

async def main():
    """Main function"""
    if len(sys.argv) > 1 and sys.argv[1] in ['-h', '--help', 'help']:
        print_usage()
        return
    
    inspector = DatabaseInspector()
    
    try:
        mode = sys.argv[1] if len(sys.argv) > 1 else "full"
        
        if mode == "query" and len(sys.argv) > 2:
            await inspector.connect()
            await inspector.query_custom(sys.argv[2])
            await inspector.disconnect()
        else:
            await inspector.run_inspection(mode)
            
    except Exception as e:
        print(f"❌ Inspection failed: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)