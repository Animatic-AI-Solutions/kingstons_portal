#!/usr/bin/env python3
"""
Database Analysis Report for Kingston's Portal
==============================================

This script provides detailed analysis of the database structure including:
- Table relationships and foreign key mappings
- View dependencies and purposes
- Performance optimization insights
- Database health metrics
"""

import asyncio
import asyncpg
import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from collections import defaultdict

# Load environment variables
load_dotenv()

async def connect_to_database():
    """Connect to the database using existing configuration"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not found in environment variables")
        sys.exit(1)
    
    try:
        conn = await asyncpg.connect(database_url)
        return conn
    except Exception as e:
        print(f"ERROR: Failed to connect to database: {e}")
        sys.exit(1)

async def analyze_table_relationships(conn):
    """Analyze foreign key relationships between tables"""
    query = """
    SELECT 
        tc.table_name as source_table,
        kcu.column_name as source_column,
        ccu.table_name AS target_table,
        ccu.column_name AS target_column,
        tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
    """
    return await conn.fetch(query)

async def analyze_view_complexity(conn):
    """Analyze views and their complexity"""
    query = """
    SELECT 
        table_name as view_name,
        view_definition,
        LENGTH(view_definition) as definition_length,
        (LENGTH(view_definition) - LENGTH(REPLACE(LOWER(view_definition), 'join', ''))) / 4 as join_count,
        (LENGTH(view_definition) - LENGTH(REPLACE(LOWER(view_definition), 'select', ''))) / 6 as subquery_count
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY definition_length DESC
    """
    return await conn.fetch(query)

async def get_table_sizes(conn):
    """Get estimated table sizes and row counts"""
    query = """
    SELECT 
        schemaname,
        tablename,
        attname as column_name,
        n_distinct,
        correlation
    FROM pg_stats 
    WHERE schemaname = 'public'
    ORDER BY tablename, attname
    """
    return await conn.fetch(query)

async def analyze_index_usage(conn):
    """Analyze index usage and effectiveness"""
    query = """
    SELECT 
        schemaname,
        relname as tablename,
        indexrelname as indexname,
        idx_tup_read,
        idx_tup_fetch,
        idx_scan
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC
    """
    return await conn.fetch(query)

async def get_performance_views(conn):
    """Identify performance-optimized views"""
    performance_views = [
        'company_irr_cache',
        'analytics_dashboard_summary', 
        'fund_distribution_fast',
        'provider_distribution_fast',
        'client_group_complete_data',
        'latest_portfolio_fund_valuations',
        'latest_portfolio_irr_values'
    ]
    
    query = """
    SELECT 
        table_name as view_name,
        view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
        AND table_name = ANY($1)
    ORDER BY table_name
    """
    return await conn.fetch(query, performance_views)

def generate_analysis_report(relationships, views, table_stats, index_usage, performance_views):
    """Generate comprehensive analysis report"""
    
    report = f"""
# KINGSTON'S PORTAL - DATABASE ANALYSIS REPORT
Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## EXECUTIVE SUMMARY
This report provides detailed analysis of the Kingston's Portal database structure,
focusing on relationships, performance optimizations, and architectural insights.

## DATABASE ARCHITECTURE ANALYSIS

### Table Relationship Hierarchy
The database implements a sophisticated 5-level hierarchy for wealth management:

```
Client Groups (Root)
├── Product Owners (People)
├── Client Products (Financial Products)
│   ├── Portfolios (Investment Containers)
│   │   └── Portfolio Funds (Individual Fund Holdings)
│   │       ├── Portfolio Fund Valuations (Market Values)
│   │       ├── Portfolio Fund IRR Values (Performance)
│   │       └── Holding Activity Log (Transactions)
│   └── Provider Switch Log (Provider Changes)
└── Authentication & Session Management
```

### Core Entity Relationships
"""

    # Analyze relationships
    relationship_map = defaultdict(list)
    for rel in relationships:
        relationship_map[rel['source_table']].append({
            'target_table': rel['target_table'],
            'source_column': rel['source_column'],
            'target_column': rel['target_column']
        })

    report += "\n#### Foreign Key Relationships by Table:\n"
    for source_table in sorted(relationship_map.keys()):
        report += f"\n**{source_table}:**\n"
        for rel in relationship_map[source_table]:
            report += f"- `{rel['source_column']}` → `{rel['target_table']}.{rel['target_column']}`\n"

    # View analysis
    report += f"\n## VIEW ARCHITECTURE ANALYSIS\n\n"
    report += f"Total Views: {len(views)}\n\n"
    
    # Categorize views by complexity
    simple_views = [v for v in views if v['join_count'] <= 2]
    complex_views = [v for v in views if v['join_count'] > 2 and v['join_count'] <= 5]
    very_complex_views = [v for v in views if v['join_count'] > 5]
    
    report += f"### View Complexity Distribution:\n"
    report += f"- Simple views (≤2 joins): {len(simple_views)}\n"
    report += f"- Complex views (3-5 joins): {len(complex_views)}\n"
    report += f"- Very complex views (>5 joins): {len(very_complex_views)}\n\n"

    report += "### Most Complex Views:\n"
    for view in sorted(views, key=lambda x: x['join_count'], reverse=True)[:10]:
        report += f"- `{view['view_name']}`: {view['join_count']} joins, {view['definition_length']} chars\n"

    # Performance views analysis
    report += f"\n## PERFORMANCE OPTIMIZATION ANALYSIS\n\n"
    report += f"### Ultra-Fast Analytics Views:\n"
    report += "These views are specifically designed for sub-second dashboard performance:\n\n"
    
    for pview in performance_views:
        report += f"**{pview['view_name']}:**\n"
        # Analyze the view definition for key features
        definition = pview['view_definition'].lower()
        if 'cache' in pview['view_name']:
            report += "- Purpose: Pre-computed IRR calculations with 24-hour cache validity\n"
        elif 'dashboard' in pview['view_name']:
            report += "- Purpose: Aggregated KPIs for instant dashboard loading\n"
        elif 'fast' in pview['view_name']:
            report += "- Purpose: Pre-computed distribution analytics\n"
        elif 'latest' in pview['view_name']:
            report += "- Purpose: Most recent data optimization\n"
        
        # Count aggregations and joins
        agg_count = definition.count('sum(') + definition.count('count(') + definition.count('avg(') + definition.count('max(') + definition.count('min(')
        join_count = definition.count('join')
        
        report += f"- Aggregations: {agg_count}\n"
        report += f"- Joins: {join_count}\n"
        report += f"- Definition length: {len(pview['view_definition'])} characters\n\n"

    # Index analysis
    if index_usage:
        report += f"### Index Usage Analysis:\n"
        report += "Top 10 most used indexes:\n\n"
        
        sorted_indexes = sorted(index_usage, key=lambda x: x['idx_scan'] or 0, reverse=True)[:10]
        for idx in sorted_indexes:
            report += f"- `{idx['indexname']}` on `{idx['tablename']}`: {idx['idx_scan'] or 0} scans\n"

    # Key architectural insights
    report += f"\n## KEY ARCHITECTURAL INSIGHTS\n\n"
    
    report += "### 1. Template-Based Portfolio Management\n"
    report += "The system uses versioned portfolio templates (`template_portfolio_generations`) allowing:\n"
    report += "- Portfolio evolution without affecting historical data\n"
    report += "- Consistent portfolio structures across clients\n"
    report += "- Easy portfolio rebalancing and updates\n\n"
    
    report += "### 2. Comprehensive Audit Trail\n"
    report += "Every financial transaction is logged in `holding_activity_log` providing:\n"
    report += "- Complete transaction history for IRR calculations\n"
    report += "- Regulatory compliance and audit capabilities\n"
    report += "- Data integrity and reconciliation support\n\n"
    
    report += "### 3. Performance Optimization Strategy\n"
    report += "The database implements multiple performance optimization techniques:\n"
    report += "- Pre-computed aggregation views for instant dashboard loading\n"
    report += "- Intelligent caching with 24-hour validity periods\n"
    report += "- Bulk data retrieval patterns through optimized views\n"
    report += "- Strategic indexing on frequently queried columns\n\n"
    
    report += "### 4. Flexible Client-Product Relationships\n"
    report += "The many-to-many relationship structure allows:\n"
    report += "- Multiple product owners per client group (families, trusts)\n"
    report += "- Shared ownership of financial products\n"
    report += "- Complex beneficiary and ownership structures\n\n"

    # Recommendations
    report += f"## RECOMMENDATIONS FOR FUTURE DEVELOPMENT\n\n"
    
    report += "### 1. Monitoring and Alerting\n"
    report += "- Implement view refresh monitoring for performance views\n"
    report += "- Set up alerts for cache invalidation and refresh failures\n"
    report += "- Monitor index usage and identify unused indexes\n\n"
    
    report += "### 2. Data Archival Strategy\n"
    report += "- Consider partitioning large transaction tables by date\n"
    report += "- Implement data archival for historical valuations\n"
    report += "- Optimize storage for long-term data retention\n\n"
    
    report += "### 3. Security Enhancements\n"
    report += "- Implement row-level security for multi-tenant scenarios\n"
    report += "- Add audit logging for schema changes\n"
    report += "- Consider encryption for sensitive financial data\n\n"
    
    report += "### 4. Performance Optimization\n"
    report += "- Regular VACUUM and ANALYZE operations\n"
    report += "- Monitor and optimize slow queries\n"
    report += "- Consider materialized views for complex calculations\n\n"

    return report

async def main():
    """Main function to generate database analysis"""
    print("Kingston's Portal Database Analysis Generator")
    print("=" * 50)
    
    # Connect to database
    conn = await connect_to_database()
    
    try:
        print("🔍 Analyzing table relationships...")
        relationships = await analyze_table_relationships(conn)
        
        print("📊 Analyzing view complexity...")
        views = await analyze_view_complexity(conn)
        
        print("📈 Analyzing table statistics...")
        table_stats = await get_table_sizes(conn)
        
        print("🎯 Analyzing index usage...")
        index_usage = await analyze_index_usage(conn)
        
        print("⚡ Analyzing performance views...")
        performance_views = await get_performance_views(conn)
        
        print("📝 Generating analysis report...")
        report_content = generate_analysis_report(
            relationships, views, table_stats, index_usage, performance_views
        )
        
        # Write to file
        output_file = "database_analysis_report.md"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(report_content)
        
        print(f"✅ Analysis report generated successfully!")
        print(f"📄 Output file: {output_file}")
        print(f"🔗 Foreign key relationships: {len(relationships)}")
        print(f"👁️  Views analyzed: {len(views)}")
        print(f"⚡ Performance views: {len(performance_views)}")
        
    except Exception as e:
        print(f"❌ Error generating analysis: {e}")
        raise
    finally:
        await conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    asyncio.run(main())
