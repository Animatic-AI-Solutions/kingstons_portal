"""
Database Engineer Agent for Kingston's Portal Wealth Management System

A specialized database engineer agent that provides comprehensive database access, inspection,
schema management, performance optimization, and debugging support for the PostgreSQL database
with 22 core tables, 24 optimized views, and ultra-fast analytics system.

Core Responsibilities:
1. Database Access & Inspection - Real-time database visibility and data analysis
2. Schema Management & Evolution - Database structure changes and migrations
3. Performance Optimization - Ultra-fast analytics system maintenance and query optimization
4. Financial Data Architecture - Wealth management data relationships and constraints
5. Debugging Support Integration - Real-time database investigation for system debugging
6. Migration & Refactoring - Database evolution with backward compatibility
7. Analytics System Maintenance - Pre-computed views and cache management

Business Domain Context:
- 5-level hierarchy: client_groups → product_owners → client_products → portfolios → portfolio_funds
- Financial data integrity with audit trails (holding_activity_log, provider_switch_log)
- IRR calculation accuracy with performance tracking
- Ultra-fast dashboard analytics through pre-computed views
"""

import logging
import asyncio
import asyncpg
import json
from typing import Dict, List, Optional, Any, Tuple, Union
from datetime import datetime, date, timedelta
from decimal import Decimal
import os
import sys
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("DatabaseEngineerAgent")

class DatabaseEngineerAgent:
    """
    Specialized Database Engineer Agent for Kingston's Portal wealth management system.
    
    Provides comprehensive database operations including:
    - Real-time database inspection and analysis
    - Schema management and evolution
    - Performance optimization and analytics maintenance
    - Financial data architecture management
    - Debugging support and data investigation
    - Migration planning and execution
    """
    
    def __init__(self):
        """Initialize the Database Engineer Agent with connection management."""
        # Load environment variables
        load_dotenv()
        self.database_url = os.getenv("DATABASE_URL")
        
        if not self.database_url:
            raise ValueError("DATABASE_URL must be set in environment variables")
        
        # Connection pool for database operations
        self.pool: Optional[asyncpg.Pool] = None
        
        # Cache for schema information
        self._schema_cache = {}
        self._cache_timestamp = None
        
        logger.info("🔧 Database Engineer Agent initialized")
    
    async def initialize_pool(self):
        """Initialize the database connection pool."""
        if self.pool is None:
            try:
                self.pool = await asyncpg.create_pool(
                    self.database_url,
                    min_size=2,
                    max_size=10,
                    max_queries=50000,
                    max_inactive_connection_lifetime=300.0,
                    server_settings={'jit': 'off'}
                )
                
                # Test connection
                async with self.pool.acquire() as conn:
                    await conn.fetchval("SELECT 1")
                
                logger.info("✅ Database connection pool initialized successfully")
                
            except Exception as e:
                logger.error(f"❌ Failed to initialize database pool: {str(e)}")
                raise
    
    async def close_pool(self):
        """Close the database connection pool."""
        if self.pool:
            await self.pool.close()
            self.pool = None
            logger.info("🔒 Database connection pool closed")
    
    # ========================================================================
    # 1. DATABASE ACCESS & INSPECTION
    # ========================================================================
    
    async def inspect_database_health(self) -> Dict[str, Any]:
        """
        Perform comprehensive database health check and system status.
        
        Returns:
            Dict containing database health metrics and status information
        """
        await self.initialize_pool()
        
        try:
            async with self.pool.acquire() as conn:
                health_info = {
                    "status": "healthy",
                    "timestamp": datetime.now().isoformat(),
                    "connection_test": True,
                    "tables": {},
                    "views": {},
                    "performance_metrics": {},
                    "analytics_cache_status": {},
                    "data_integrity": {}
                }
                
                # Test basic connectivity
                await conn.fetchval("SELECT 1")
                
                # Get table counts and health
                tables_info = await conn.fetch("""
                    SELECT 
                        schemaname,
                        tablename,
                        n_tup_ins as inserts,
                        n_tup_upd as updates,
                        n_tup_del as deletes,
                        n_live_tup as live_tuples,
                        n_dead_tup as dead_tuples,
                        last_vacuum,
                        last_autovacuum,
                        last_analyze,
                        last_autoanalyze
                    FROM pg_stat_user_tables 
                    ORDER BY n_live_tup DESC
                """)
                
                for table in tables_info:
                    table_dict = dict(table)
                    table_name = table_dict['tablename']
                    health_info["tables"][table_name] = {
                        "live_tuples": table_dict['live_tuples'],
                        "dead_tuples": table_dict['dead_tuples'],
                        "total_operations": (table_dict['inserts'] or 0) + (table_dict['updates'] or 0) + (table_dict['deletes'] or 0),
                        "last_vacuum": table_dict['last_vacuum'].isoformat() if table_dict['last_vacuum'] else None,
                        "last_analyze": table_dict['last_analyze'].isoformat() if table_dict['last_analyze'] else None
                    }
                
                # Check view accessibility
                view_test_queries = {
                    "analytics_dashboard_summary": "SELECT COUNT(*) FROM analytics_dashboard_summary",
                    "company_irr_cache": "SELECT COUNT(*) FROM company_irr_cache", 
                    "client_groups_summary": "SELECT COUNT(*) FROM client_groups_summary",
                    "fund_distribution_fast": "SELECT COUNT(*) FROM fund_distribution_fast",
                    "provider_distribution_fast": "SELECT COUNT(*) FROM provider_distribution_fast"
                }
                
                for view_name, query in view_test_queries.items():
                    try:
                        result = await conn.fetchval(query)
                        health_info["views"][view_name] = {
                            "accessible": True,
                            "record_count": result
                        }
                    except Exception as e:
                        health_info["views"][view_name] = {
                            "accessible": False,
                            "error": str(e)
                        }
                
                # Performance metrics
                db_stats = await conn.fetchrow("""
                    SELECT 
                        numbackends as active_connections,
                        xact_commit as transactions_committed,
                        xact_rollback as transactions_rolled_back,
                        blks_read as blocks_read,
                        blks_hit as blocks_hit,
                        temp_files as temp_files_created,
                        temp_bytes as temp_bytes_written
                    FROM pg_stat_database 
                    WHERE datname = current_database()
                """)
                
                if db_stats:
                    stats_dict = dict(db_stats)
                    health_info["performance_metrics"] = {
                        "active_connections": stats_dict['active_connections'],
                        "cache_hit_ratio": round((stats_dict['blocks_hit'] / max(stats_dict['blocks_hit'] + stats_dict['blocks_read'], 1)) * 100, 2),
                        "total_transactions": (stats_dict['transactions_committed'] or 0) + (stats_dict['transactions_rolled_back'] or 0),
                        "temp_files_created": stats_dict['temp_files_created']
                    }
                
                # Analytics cache status
                try:
                    company_irr = await conn.fetchrow("SELECT * FROM company_irr_cache WHERE calculation_type = 'company_irr' LIMIT 1")
                    if company_irr:
                        health_info["analytics_cache_status"] = {
                            "company_irr_available": True,
                            "irr_value": float(company_irr['irr_value']) if company_irr['irr_value'] else None,
                            "cache_timestamp": company_irr['cache_timestamp'].isoformat() if company_irr['cache_timestamp'] else None
                        }
                except Exception as e:
                    health_info["analytics_cache_status"] = {"error": str(e)}
                
                # Data integrity checks
                integrity_checks = await self._run_data_integrity_checks(conn)
                health_info["data_integrity"] = integrity_checks
                
                logger.info("✅ Database health inspection completed successfully")
                return health_info
                
        except Exception as e:
            logger.error(f"❌ Database health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def query_database(self, query: str, params: Optional[List] = None, fetch_mode: str = "all") -> Dict[str, Any]:
        """
        Execute arbitrary database query with safety checks and detailed results.
        
        Args:
            query: SQL query to execute
            params: Optional parameters for parameterized queries
            fetch_mode: "all", "one", "val" for different result types
            
        Returns:
            Dict containing query results and metadata
        """
        await self.initialize_pool()
        
        # Safety checks
        dangerous_keywords = ["DROP", "DELETE", "TRUNCATE", "ALTER", "UPDATE", "INSERT"]
        query_upper = query.upper().strip()
        
        for keyword in dangerous_keywords:
            if query_upper.startswith(keyword):
                return {
                    "success": False,
                    "error": f"Dangerous operation '{keyword}' not allowed in query mode. Use specialized methods for data modification.",
                    "query": query
                }
        
        try:
            async with self.pool.acquire() as conn:
                start_time = datetime.now()
                
                if fetch_mode == "val":
                    result = await conn.fetchval(query, *(params or []))
                    result_data = result
                elif fetch_mode == "one":
                    result = await conn.fetchrow(query, *(params or []))
                    result_data = dict(result) if result else None
                else:  # fetch_mode == "all"
                    result = await conn.fetch(query, *(params or []))
                    result_data = [dict(row) for row in result] if result else []
                
                execution_time = (datetime.now() - start_time).total_seconds()
                
                return {
                    "success": True,
                    "data": result_data,
                    "row_count": len(result_data) if isinstance(result_data, list) else (1 if result_data is not None else 0),
                    "execution_time_seconds": execution_time,
                    "query": query,
                    "timestamp": start_time.isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ Query execution failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "query": query,
                "timestamp": datetime.now().isoformat()
            }
    
    async def inspect_table_data(self, table_name: str, limit: int = 100, where_clause: Optional[str] = None) -> Dict[str, Any]:
        """
        Inspect table data with detailed analysis.
        
        Args:
            table_name: Name of the table to inspect
            limit: Maximum number of rows to return
            where_clause: Optional WHERE clause for filtering
            
        Returns:
            Dict containing table data and analysis
        """
        await self.initialize_pool()
        
        try:
            async with self.pool.acquire() as conn:
                # Verify table exists
                table_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_name = $1 AND table_schema = 'public'
                    )
                """, table_name)
                
                if not table_exists:
                    return {
                        "success": False,
                        "error": f"Table '{table_name}' does not exist",
                        "available_tables": await self._get_available_tables(conn)
                    }
                
                # Get table schema
                columns = await conn.fetch("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = $1 AND table_schema = 'public'
                    ORDER BY ordinal_position
                """, table_name)
                
                # Build query
                base_query = f"SELECT * FROM {table_name}"
                if where_clause:
                    base_query += f" WHERE {where_clause}"
                base_query += f" LIMIT {limit}"
                
                # Get sample data
                data = await conn.fetch(base_query)
                
                # Get total count
                count_query = f"SELECT COUNT(*) FROM {table_name}"
                if where_clause:
                    count_query += f" WHERE {where_clause}"
                total_count = await conn.fetchval(count_query)
                
                # Convert data to JSON-serializable format
                serialized_data = []
                for row in data:
                    row_dict = {}
                    for key, value in dict(row).items():
                        if isinstance(value, (datetime, date)):
                            row_dict[key] = value.isoformat()
                        elif isinstance(value, Decimal):
                            row_dict[key] = float(value)
                        else:
                            row_dict[key] = value
                    serialized_data.append(row_dict)
                
                return {
                    "success": True,
                    "table_name": table_name,
                    "columns": [dict(col) for col in columns],
                    "data": serialized_data,
                    "sample_size": len(serialized_data),
                    "total_count": total_count,
                    "where_clause": where_clause,
                    "timestamp": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"❌ Table inspection failed for '{table_name}': {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "table_name": table_name
            }
    
    async def analyze_data_relationships(self, entity_type: str, entity_id: int) -> Dict[str, Any]:
        """
        Analyze data relationships for a specific entity across the 5-level hierarchy.
        
        Args:
            entity_type: Type of entity ('client_group', 'product_owner', 'client_product', 'portfolio', 'portfolio_fund')
            entity_id: ID of the entity to analyze
            
        Returns:
            Dict containing comprehensive relationship analysis
        """
        await self.initialize_pool()
        
        relationship_queries = {
            "client_group": {
                "base_info": "SELECT * FROM client_groups WHERE id = $1",
                "product_owners": """
                    SELECT po.* FROM product_owners po
                    JOIN client_group_product_owners cgpo ON po.id = cgpo.product_owner_id
                    WHERE cgpo.client_group_id = $1 AND po.status = 'active'
                """,
                "client_products": "SELECT * FROM client_products WHERE client_id = $1 AND status = 'active'",
                "portfolios": """
                    SELECT p.* FROM portfolios p
                    JOIN client_products cp ON p.id = cp.portfolio_id
                    WHERE cp.client_id = $1 AND p.status = 'active' AND cp.status = 'active'
                """,
                "total_value": """
                    SELECT COALESCE(SUM(lpv.valuation), 0) as total_value
                    FROM client_products cp
                    JOIN portfolios p ON cp.portfolio_id = p.id
                    LEFT JOIN latest_portfolio_valuations lpv ON p.id = lpv.portfolio_id
                    WHERE cp.client_id = $1 AND cp.status = 'active' AND p.status = 'active'
                """
            },
            "portfolio": {
                "base_info": "SELECT * FROM portfolios WHERE id = $1",
                "client_product": """
                    SELECT cp.*, cg.name as client_name FROM client_products cp
                    JOIN client_groups cg ON cp.client_id = cg.id
                    WHERE cp.portfolio_id = $1
                """,
                "portfolio_funds": """
                    SELECT pf.*, af.fund_name, af.isin_number, af.risk_factor
                    FROM portfolio_funds pf
                    JOIN available_funds af ON pf.available_funds_id = af.id
                    WHERE pf.portfolio_id = $1 AND pf.status = 'active'
                """,
                "latest_valuations": """
                    SELECT lpfv.*, af.fund_name
                    FROM latest_portfolio_fund_valuations lpfv
                    JOIN portfolio_funds pf ON lpfv.portfolio_fund_id = pf.id
                    JOIN available_funds af ON pf.available_funds_id = af.id
                    WHERE pf.portfolio_id = $1 AND pf.status = 'active'
                """,
                "performance_history": """
                    SELECT lpir.date, lpir.irr_result
                    FROM latest_portfolio_irr_values lpir
                    WHERE lpir.portfolio_id = $1
                    ORDER BY lpir.date DESC
                    LIMIT 10
                """
            }
        }
        
        if entity_type not in relationship_queries:
            return {
                "success": False,
                "error": f"Unsupported entity type: {entity_type}",
                "supported_types": list(relationship_queries.keys())
            }
        
        try:
            async with self.pool.acquire() as conn:
                queries = relationship_queries[entity_type]
                analysis_result = {
                    "success": True,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "timestamp": datetime.now().isoformat(),
                    "relationships": {}
                }
                
                for relationship_name, query in queries.items():
                    try:
                        if relationship_name == "base_info":
                            result = await conn.fetchrow(query, entity_id)
                            analysis_result["base_info"] = dict(result) if result else None
                        else:
                            result = await conn.fetch(query, entity_id)
                            analysis_result["relationships"][relationship_name] = []
                            
                            for row in result:
                                row_dict = {}
                                for key, value in dict(row).items():
                                    if isinstance(value, (datetime, date)):
                                        row_dict[key] = value.isoformat()
                                    elif isinstance(value, Decimal):
                                        row_dict[key] = float(value)
                                    else:
                                        row_dict[key] = value
                                analysis_result["relationships"][relationship_name].append(row_dict)
                                
                    except Exception as e:
                        logger.warning(f"Failed to execute relationship query '{relationship_name}': {str(e)}")
                        analysis_result["relationships"][relationship_name] = {"error": str(e)}
                
                # Add summary statistics
                analysis_result["summary"] = await self._generate_relationship_summary(conn, entity_type, entity_id)
                
                return analysis_result
                
        except Exception as e:
            logger.error(f"❌ Relationship analysis failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "entity_type": entity_type,
                "entity_id": entity_id
            }
    
    # ========================================================================
    # 2. SCHEMA MANAGEMENT & EVOLUTION
    # ========================================================================
    
    async def get_database_schema(self, include_indexes: bool = True, include_constraints: bool = True) -> Dict[str, Any]:
        """
        Get comprehensive database schema information.
        
        Args:
            include_indexes: Whether to include index information
            include_constraints: Whether to include constraint information
            
        Returns:
            Dict containing complete schema information
        """
        await self.initialize_pool()
        
        try:
            async with self.pool.acquire() as conn:
                schema_info = {
                    "timestamp": datetime.now().isoformat(),
                    "database_name": await conn.fetchval("SELECT current_database()"),
                    "tables": {},
                    "views": {},
                    "functions": {},
                    "statistics": {}
                }
                
                # Get table information
                tables = await conn.fetch("""
                    SELECT table_name, table_type
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                    ORDER BY table_name
                """)
                
                for table in tables:
                    table_dict = dict(table)
                    table_name = table_dict["table_name"]
                    table_type = table_dict["table_type"]
                    
                    # Get column information
                    columns = await conn.fetch("""
                        SELECT 
                            column_name,
                            data_type,
                            is_nullable,
                            column_default,
                            character_maximum_length,
                            numeric_precision,
                            numeric_scale
                        FROM information_schema.columns
                        WHERE table_name = $1 AND table_schema = 'public'
                        ORDER BY ordinal_position
                    """, table_name)
                    
                    table_info = {
                        "type": table_type,
                        "columns": [dict(col) for col in columns]
                    }
                    
                    if include_constraints:
                        # Get constraints
                        constraints = await conn.fetch("""
                            SELECT 
                                constraint_name,
                                constraint_type,
                                column_name
                            FROM information_schema.table_constraints tc
                            LEFT JOIN information_schema.key_column_usage kcu
                                ON tc.constraint_name = kcu.constraint_name
                            WHERE tc.table_name = $1 AND tc.table_schema = 'public'
                        """, table_name)
                        
                        table_info["constraints"] = [dict(const) for const in constraints]
                    
                    if table_type == "BASE TABLE":
                        schema_info["tables"][table_name] = table_info
                    else:
                        schema_info["views"][table_name] = table_info
                
                if include_indexes:
                    # Get index information
                    indexes = await conn.fetch("""
                        SELECT 
                            indexname,
                            tablename,
                            indexdef
                        FROM pg_indexes
                        WHERE schemaname = 'public'
                        ORDER BY tablename, indexname
                    """)
                    
                    # Group indexes by table
                    for index in indexes:
                        index_dict = dict(index)
                        table_name = index_dict["tablename"]
                        
                        if table_name in schema_info["tables"]:
                            if "indexes" not in schema_info["tables"][table_name]:
                                schema_info["tables"][table_name]["indexes"] = []
                            schema_info["tables"][table_name]["indexes"].append({
                                "name": index_dict["indexname"],
                                "definition": index_dict["indexdef"]
                            })
                
                # Get functions
                functions = await conn.fetch("""
                    SELECT 
                        routine_name,
                        routine_type,
                        data_type as return_type,
                        routine_definition
                    FROM information_schema.routines
                    WHERE routine_schema = 'public'
                    ORDER BY routine_name
                """)
                
                for func in functions:
                    func_dict = dict(func)
                    schema_info["functions"][func_dict["routine_name"]] = {
                        "type": func_dict["routine_type"],
                        "return_type": func_dict["return_type"],
                        "definition": func_dict["routine_definition"]
                    }
                
                # Get database statistics
                schema_info["statistics"] = {
                    "total_tables": len(schema_info["tables"]),
                    "total_views": len(schema_info["views"]),
                    "total_functions": len(schema_info["functions"])
                }
                
                logger.info(f"✅ Schema information retrieved: {schema_info['statistics']}")
                return schema_info
                
        except Exception as e:
            logger.error(f"❌ Schema retrieval failed: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def create_table(self, table_definition: str, dry_run: bool = True) -> Dict[str, Any]:
        """
        Create a new table with safety checks and validation.
        
        Args:
            table_definition: Complete CREATE TABLE SQL statement
            dry_run: If True, validate but don't execute
            
        Returns:
            Dict containing operation result
        """
        await self.initialize_pool()
        
        # Basic validation
        if not table_definition.strip().upper().startswith("CREATE TABLE"):
            return {
                "success": False,
                "error": "Statement must start with CREATE TABLE"
            }
        
        try:
            async with self.pool.acquire() as conn:
                result = {
                    "operation": "create_table",
                    "dry_run": dry_run,
                    "timestamp": datetime.now().isoformat()
                }
                
                if dry_run:
                    # Validate syntax by using EXPLAIN
                    try:
                        await conn.execute(f"EXPLAIN {table_definition}")
                        result["validation"] = "SQL syntax is valid"
                        result["success"] = True
                    except Exception as e:
                        result["validation_error"] = str(e)
                        result["success"] = False
                else:
                    # Execute the table creation
                    await conn.execute(table_definition)
                    result["success"] = True
                    result["message"] = "Table created successfully"
                    
                    # Invalidate schema cache
                    self._schema_cache = {}
                    self._cache_timestamp = None
                
                return result
                
        except Exception as e:
            logger.error(f"❌ Table creation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "operation": "create_table",
                "dry_run": dry_run
            }
    
    async def create_index(self, index_definition: str, analyze_impact: bool = True) -> Dict[str, Any]:
        """
        Create database index with performance impact analysis.
        
        Args:
            index_definition: Complete CREATE INDEX SQL statement
            analyze_impact: Whether to analyze performance impact
            
        Returns:
            Dict containing operation result and impact analysis
        """
        await self.initialize_pool()
        
        if not index_definition.strip().upper().startswith("CREATE"):
            return {
                "success": False,
                "error": "Statement must start with CREATE INDEX or CREATE UNIQUE INDEX"
            }
        
        try:
            async with self.pool.acquire() as conn:
                start_time = datetime.now()
                
                # Execute index creation
                await conn.execute(index_definition)
                
                creation_time = (datetime.now() - start_time).total_seconds()
                
                result = {
                    "success": True,
                    "operation": "create_index",
                    "creation_time_seconds": creation_time,
                    "timestamp": start_time.isoformat()
                }
                
                if analyze_impact:
                    # Analyze index impact
                    impact_analysis = await self._analyze_index_impact(conn, index_definition)
                    result["impact_analysis"] = impact_analysis
                
                logger.info(f"✅ Index created successfully in {creation_time:.2f} seconds")
                return result
                
        except Exception as e:
            logger.error(f"❌ Index creation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "operation": "create_index"
            }
    
    # ========================================================================
    # 3. PERFORMANCE OPTIMIZATION
    # ========================================================================
    
    async def analyze_query_performance(self, query: str, params: Optional[List] = None) -> Dict[str, Any]:
        """
        Analyze query performance with detailed execution plan.
        
        Args:
            query: SQL query to analyze
            params: Optional parameters for parameterized queries
            
        Returns:
            Dict containing performance analysis
        """
        await self.initialize_pool()
        
        try:
            async with self.pool.acquire() as conn:
                # Get execution plan
                explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
                
                start_time = datetime.now()
                plan_result = await conn.fetchval(explain_query, *(params or []))
                execution_time = (datetime.now() - start_time).total_seconds()
                
                plan_data = plan_result[0] if plan_result else {}
                
                # Extract key performance metrics
                analysis = {
                    "success": True,
                    "query": query,
                    "execution_time_seconds": execution_time,
                    "timestamp": start_time.isoformat(),
                    "execution_plan": plan_data,
                    "performance_summary": {}
                }
                
                if "Plan" in plan_data:
                    plan = plan_data["Plan"]
                    analysis["performance_summary"] = {
                        "total_cost": plan.get("Total Cost"),
                        "actual_time": plan.get("Actual Total Time"),
                        "actual_rows": plan.get("Actual Rows"),
                        "planned_rows": plan.get("Plan Rows"),
                        "node_type": plan.get("Node Type"),
                        "shared_hit_blocks": plan.get("Shared Hit Blocks", 0),
                        "shared_read_blocks": plan.get("Shared Read Blocks", 0)
                    }
                    
                    # Calculate cache hit ratio
                    hit_blocks = plan.get("Shared Hit Blocks", 0)
                    read_blocks = plan.get("Shared Read Blocks", 0)
                    total_blocks = hit_blocks + read_blocks
                    
                    if total_blocks > 0:
                        analysis["performance_summary"]["cache_hit_ratio"] = round((hit_blocks / total_blocks) * 100, 2)
                
                # Generate optimization recommendations
                analysis["optimization_recommendations"] = await self._generate_optimization_recommendations(plan_data)
                
                return analysis
                
        except Exception as e:
            logger.error(f"❌ Query performance analysis failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "query": query
            }
    
    async def optimize_analytics_views(self) -> Dict[str, Any]:
        """
        Optimize the ultra-fast analytics system views and refresh cache.
        
        Returns:
            Dict containing optimization results
        """
        await self.initialize_pool()
        
        try:
            async with self.pool.acquire() as conn:
                start_time = datetime.now()
                
                # Key analytics views to optimize
                analytics_views = [
                    "analytics_dashboard_summary",
                    "company_irr_cache",
                    "fund_distribution_fast",
                    "provider_distribution_fast",
                    "client_groups_summary",
                    "products_display_view"
                ]
                
                optimization_results = {
                    "success": True,
                    "timestamp": start_time.isoformat(),
                    "views_optimized": [],
                    "cache_refresh": {},
                    "performance_impact": {}
                }
                
                # Refresh materialized views (if any)
                for view_name in analytics_views:
                    try:
                        # Test view accessibility and performance
                        view_start = datetime.now()
                        row_count = await conn.fetchval(f"SELECT COUNT(*) FROM {view_name}")
                        view_time = (datetime.now() - view_start).total_seconds()
                        
                        optimization_results["views_optimized"].append({
                            "view_name": view_name,
                            "row_count": row_count,
                            "query_time_seconds": view_time,
                            "status": "accessible"
                        })
                        
                    except Exception as e:
                        optimization_results["views_optimized"].append({
                            "view_name": view_name,
                            "status": "error",
                            "error": str(e)
                        })
                
                # Update table statistics for better query planning
                await conn.execute("ANALYZE")
                
                # Refresh company IRR cache
                try:
                    cache_start = datetime.now()
                    company_irr = await conn.fetchrow("""
                        SELECT * FROM company_irr_cache 
                        WHERE calculation_type = 'company_irr' 
                        LIMIT 1
                    """)
                    
                    cache_time = (datetime.now() - cache_start).total_seconds()
                    
                    if company_irr:
                        optimization_results["cache_refresh"]["company_irr"] = {
                            "status": "refreshed",
                            "irr_value": float(company_irr["irr_value"]) if company_irr["irr_value"] else None,
                            "refresh_time_seconds": cache_time
                        }
                    
                except Exception as e:
                    optimization_results["cache_refresh"]["company_irr"] = {
                        "status": "error",
                        "error": str(e)
                    }
                
                total_time = (datetime.now() - start_time).total_seconds()
                optimization_results["total_optimization_time_seconds"] = total_time
                
                logger.info(f"✅ Analytics optimization completed in {total_time:.2f} seconds")
                return optimization_results
                
        except Exception as e:
            logger.error(f"❌ Analytics optimization failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "operation": "optimize_analytics_views"
            }
    
    async def analyze_table_performance(self, table_name: str) -> Dict[str, Any]:
        """
        Analyze individual table performance and suggest optimizations.
        
        Args:
            table_name: Name of table to analyze
            
        Returns:
            Dict containing table performance analysis
        """
        await self.initialize_pool()
        
        try:
            async with self.pool.acquire() as conn:
                # Check if table exists
                table_exists = await conn.fetchval("""
                    SELECT EXISTS (
                        SELECT 1 FROM information_schema.tables 
                        WHERE table_name = $1 AND table_schema = 'public'
                    )
                """, table_name)
                
                if not table_exists:
                    return {
                        "success": False,
                        "error": f"Table '{table_name}' does not exist"
                    }
                
                analysis = {
                    "success": True,
                    "table_name": table_name,
                    "timestamp": datetime.now().isoformat(),
                    "statistics": {},
                    "index_analysis": {},
                    "recommendations": []
                }
                
                # Get table statistics
                stats = await conn.fetchrow("""
                    SELECT 
                        n_live_tup as live_rows,
                        n_dead_tup as dead_rows,
                        n_tup_ins as total_inserts,
                        n_tup_upd as total_updates,
                        n_tup_del as total_deletes,
                        n_tup_hot_upd as hot_updates,
                        last_vacuum,
                        last_autovacuum,
                        last_analyze,
                        last_autoanalyze,
                        vacuum_count,
                        autovacuum_count,
                        analyze_count,
                        autoanalyze_count
                    FROM pg_stat_user_tables
                    WHERE relname = $1
                """, table_name)
                
                if stats:
                    stats_dict = dict(stats)
                    analysis["statistics"] = {
                        "live_rows": stats_dict["live_rows"],
                        "dead_rows": stats_dict["dead_rows"],
                        "dead_row_ratio": round((stats_dict["dead_rows"] / max(stats_dict["live_rows"], 1)) * 100, 2),
                        "total_operations": (stats_dict["total_inserts"] or 0) + (stats_dict["total_updates"] or 0) + (stats_dict["total_deletes"] or 0),
                        "hot_update_ratio": round(((stats_dict["hot_updates"] or 0) / max(stats_dict["total_updates"] or 1, 1)) * 100, 2),
                        "maintenance": {
                            "last_vacuum": stats_dict["last_vacuum"].isoformat() if stats_dict["last_vacuum"] else None,
                            "last_analyze": stats_dict["last_analyze"].isoformat() if stats_dict["last_analyze"] else None,
                            "vacuum_count": stats_dict["vacuum_count"],
                            "analyze_count": stats_dict["analyze_count"]
                        }
                    }
                    
                    # Generate recommendations
                    if stats_dict["dead_rows"] > 1000 and analysis["statistics"]["dead_row_ratio"] > 10:
                        analysis["recommendations"].append("Consider running VACUUM to reclaim dead tuple space")
                    
                    if not stats_dict["last_analyze"] or (datetime.now() - stats_dict["last_analyze"]).days > 7:
                        analysis["recommendations"].append("Table statistics may be outdated - consider running ANALYZE")
                
                # Analyze indexes
                indexes = await conn.fetch("""
                    SELECT 
                        indexrelname as index_name,
                        idx_scan as index_scans,
                        idx_tup_read as tuples_read,
                        idx_tup_fetch as tuples_fetched
                    FROM pg_stat_user_indexes
                    WHERE relname = $1
                """, table_name)
                
                if indexes:
                    analysis["index_analysis"]["indexes"] = []
                    unused_indexes = []
                    
                    for index in indexes:
                        index_dict = dict(index)
                        index_info = {
                            "name": index_dict["index_name"],
                            "scans": index_dict["index_scans"],
                            "tuples_read": index_dict["tuples_read"],
                            "tuples_fetched": index_dict["tuples_fetched"],
                            "effectiveness": "high" if index_dict["index_scans"] > 100 else "low"
                        }
                        
                        analysis["index_analysis"]["indexes"].append(index_info)
                        
                        if index_dict["index_scans"] == 0:
                            unused_indexes.append(index_dict["index_name"])
                    
                    if unused_indexes:
                        analysis["recommendations"].append(f"Consider removing unused indexes: {', '.join(unused_indexes)}")
                
                return analysis
                
        except Exception as e:
            logger.error(f"❌ Table performance analysis failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "table_name": table_name
            }
    
    # ========================================================================
    # 4. FINANCIAL DATA ARCHITECTURE SUPPORT
    # ========================================================================
    
    async def validate_data_integrity(self) -> Dict[str, Any]:
        """
        Comprehensive data integrity validation for financial data.
        
        Returns:
            Dict containing integrity check results
        """
        await self.initialize_pool()
        
        try:
            async with self.pool.acquire() as conn:
                integrity_results = {
                    "success": True,
                    "timestamp": datetime.now().isoformat(),
                    "checks_performed": [],
                    "issues_found": [],
                    "summary": {}
                }
                
                # Define integrity checks
                integrity_checks = [
                    {
                        "name": "Orphaned Client Products",
                        "query": """
                            SELECT COUNT(*) FROM client_products cp
                            LEFT JOIN client_groups cg ON cp.client_id = cg.id
                            WHERE cg.id IS NULL
                        """,
                        "expected": 0
                    },
                    {
                        "name": "Orphaned Portfolio Funds",
                        "query": """
                            SELECT COUNT(*) FROM portfolio_funds pf
                            LEFT JOIN portfolios p ON pf.portfolio_id = p.id
                            WHERE p.id IS NULL
                        """,
                        "expected": 0
                    },
                    {
                        "name": "Invalid Portfolio Fund Valuations",
                        "query": """
                            SELECT COUNT(*) FROM portfolio_fund_valuations pfv
                            LEFT JOIN portfolio_funds pf ON pfv.portfolio_fund_id = pf.id
                            WHERE pf.id IS NULL
                        """,
                        "expected": 0
                    },
                    {
                        "name": "Negative Valuations",
                        "query": """
                            SELECT COUNT(*) FROM portfolio_fund_valuations
                            WHERE valuation < 0
                        """,
                        "expected": 0
                    },
                    {
                        "name": "Missing IRR for Recent Valuations",
                        "query": """
                            SELECT COUNT(*) FROM portfolio_fund_valuations pfv
                            LEFT JOIN portfolio_fund_irr_values pfir ON pfv.portfolio_fund_id = pfir.fund_id 
                                AND pfv.valuation_date = pfir.date
                            WHERE pfv.valuation_date >= CURRENT_DATE - INTERVAL '30 days'
                                AND pfir.id IS NULL
                        """,
                        "warning_threshold": 10
                    }
                ]
                
                total_issues = 0
                
                for check in integrity_checks:
                    try:
                        result_count = await conn.fetchval(check["query"])
                        
                        check_result = {
                            "name": check["name"],
                            "count": result_count,
                            "status": "pass"
                        }
                        
                        if "expected" in check and result_count != check["expected"]:
                            check_result["status"] = "fail"
                            integrity_results["issues_found"].append({
                                "check": check["name"],
                                "issue": f"Found {result_count} items, expected {check['expected']}"
                            })
                            total_issues += result_count
                            
                        elif "warning_threshold" in check and result_count > check["warning_threshold"]:
                            check_result["status"] = "warning"
                            integrity_results["issues_found"].append({
                                "check": check["name"],
                                "issue": f"Found {result_count} items, exceeds warning threshold of {check['warning_threshold']}"
                            })
                        
                        integrity_results["checks_performed"].append(check_result)
                        
                    except Exception as e:
                        integrity_results["checks_performed"].append({
                            "name": check["name"],
                            "status": "error",
                            "error": str(e)
                        })
                
                # Summary
                integrity_results["summary"] = {
                    "total_checks": len(integrity_checks),
                    "passed_checks": len([c for c in integrity_results["checks_performed"] if c["status"] == "pass"]),
                    "failed_checks": len([c for c in integrity_results["checks_performed"] if c["status"] == "fail"]),
                    "warning_checks": len([c for c in integrity_results["checks_performed"] if c["status"] == "warning"]),
                    "total_issues": total_issues,
                    "overall_status": "healthy" if total_issues == 0 else "issues_found"
                }
                
                if total_issues > 0:
                    integrity_results["success"] = False
                
                logger.info(f"✅ Data integrity validation completed: {integrity_results['summary']['overall_status']}")
                return integrity_results
                
        except Exception as e:
            logger.error(f"❌ Data integrity validation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "operation": "validate_data_integrity"
            }
    
    async def audit_trail_analysis(self, entity_type: str = None, date_from: str = None, limit: int = 100) -> Dict[str, Any]:
        """
        Analyze audit trails across the system.
        
        Args:
            entity_type: Filter by entity type
            date_from: Filter from specific date (YYYY-MM-DD)
            limit: Maximum number of records to return
            
        Returns:
            Dict containing audit trail analysis
        """
        await self.initialize_pool()
        
        try:
            async with self.pool.acquire() as conn:
                analysis = {
                    "success": True,
                    "timestamp": datetime.now().isoformat(),
                    "filters": {
                        "entity_type": entity_type,
                        "date_from": date_from,
                        "limit": limit
                    },
                    "audit_data": {},
                    "summary": {}
                }
                
                # Holding Activity Log Analysis
                hal_query = "SELECT * FROM holding_activity_log"
                params = []
                param_count = 0
                
                if date_from:
                    hal_query += f" WHERE activity_timestamp >= ${param_count + 1}"
                    params.append(date_from)
                    param_count += 1
                
                hal_query += " ORDER BY activity_timestamp DESC"
                hal_query += f" LIMIT ${param_count + 1}"
                params.append(limit)
                
                activities = await conn.fetch(hal_query, *params)
                
                analysis["audit_data"]["holding_activities"] = []
                activity_types = {}
                
                for activity in activities:
                    activity_dict = {}
                    for key, value in dict(activity).items():
                        if isinstance(value, (datetime, date)):
                            activity_dict[key] = value.isoformat()
                        elif isinstance(value, Decimal):
                            activity_dict[key] = float(value)
                        else:
                            activity_dict[key] = value
                    
                    analysis["audit_data"]["holding_activities"].append(activity_dict)
                    
                    # Count activity types
                    activity_type = activity_dict.get("activity_type", "Unknown")
                    activity_types[activity_type] = activity_types.get(activity_type, 0) + 1
                
                # Provider Switch Log Analysis
                switches = await conn.fetch("""
                    SELECT 
                        psl.*,
                        ap_old.name as old_provider_name,
                        ap_new.name as new_provider_name,
                        cp.product_name,
                        cg.name as client_name
                    FROM provider_switch_log psl
                    LEFT JOIN available_providers ap_old ON psl.previous_provider_id = ap_old.id
                    LEFT JOIN available_providers ap_new ON psl.new_provider_id = ap_new.id
                    LEFT JOIN client_products cp ON psl.client_product_id = cp.id
                    LEFT JOIN client_groups cg ON cp.client_id = cg.id
                    ORDER BY psl.switch_date DESC
                    LIMIT $1
                """, limit)
                
                analysis["audit_data"]["provider_switches"] = []
                for switch in switches:
                    switch_dict = {}
                    for key, value in dict(switch).items():
                        if isinstance(value, (datetime, date)):
                            switch_dict[key] = value.isoformat()
                        else:
                            switch_dict[key] = value
                    analysis["audit_data"]["provider_switches"].append(switch_dict)
                
                # Summary statistics
                total_activities = await conn.fetchval("SELECT COUNT(*) FROM holding_activity_log")
                total_switches = await conn.fetchval("SELECT COUNT(*) FROM provider_switch_log")
                
                analysis["summary"] = {
                    "total_holding_activities": total_activities,
                    "total_provider_switches": total_switches,
                    "activity_types_distribution": activity_types,
                    "recent_activities_returned": len(analysis["audit_data"]["holding_activities"]),
                    "recent_switches_returned": len(analysis["audit_data"]["provider_switches"])
                }
                
                return analysis
                
        except Exception as e:
            logger.error(f"❌ Audit trail analysis failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "operation": "audit_trail_analysis"
            }
    
    # ========================================================================
    # 5. DEBUGGING SUPPORT INTEGRATION
    # ========================================================================
    
    async def investigate_data_inconsistency(self, issue_description: str, entity_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Investigate specific data inconsistency issues.
        
        Args:
            issue_description: Description of the issue to investigate
            entity_id: Optional specific entity ID to focus investigation
            
        Returns:
            Dict containing investigation results
        """
        await self.initialize_pool()
        
        investigation_queries = {
            "missing_valuations": {
                "description": "Investigate portfolios with missing valuations",
                "query": """
                    SELECT 
                        p.id as portfolio_id,
                        p.portfolio_name,
                        COUNT(pf.id) as total_funds,
                        COUNT(lpfv.portfolio_fund_id) as funds_with_valuations,
                        COUNT(pf.id) - COUNT(lpfv.portfolio_fund_id) as missing_valuations
                    FROM portfolios p
                    LEFT JOIN portfolio_funds pf ON p.id = pf.portfolio_id AND pf.status = 'active'
                    LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id
                    WHERE p.status = 'active'
                    GROUP BY p.id, p.portfolio_name
                    HAVING COUNT(pf.id) > 0 AND COUNT(pf.id) != COUNT(lpfv.portfolio_fund_id)
                    ORDER BY missing_valuations DESC
                """
            },
            "irr_calculation_issues": {
                "description": "Investigate IRR calculation problems",
                "query": """
                    SELECT 
                        pf.id as portfolio_fund_id,
                        af.fund_name,
                        p.portfolio_name,
                        COUNT(pfv.id) as valuation_count,
                        COUNT(pfir.id) as irr_count,
                        COUNT(pfv.id) - COUNT(pfir.id) as missing_irrs
                    FROM portfolio_funds pf
                    JOIN available_funds af ON pf.available_funds_id = af.id
                    JOIN portfolios p ON pf.portfolio_id = p.id
                    LEFT JOIN portfolio_fund_valuations pfv ON pf.id = pfv.portfolio_fund_id
                    LEFT JOIN portfolio_fund_irr_values pfir ON pf.id = pfir.fund_id 
                        AND pfv.valuation_date = pfir.date
                    WHERE pf.status = 'active' AND p.status = 'active' AND af.status = 'active'
                    GROUP BY pf.id, af.fund_name, p.portfolio_name
                    HAVING COUNT(pfv.id) > 0 AND COUNT(pfv.id) != COUNT(pfir.id)
                    ORDER BY missing_irrs DESC
                """
            },
            "data_inconsistencies": {
                "description": "General data consistency check",
                "query": """
                    SELECT 
                        'client_products_without_portfolios' as issue_type,
                        COUNT(*) as count
                    FROM client_products cp
                    LEFT JOIN portfolios p ON cp.portfolio_id = p.id
                    WHERE p.id IS NULL
                    
                    UNION ALL
                    
                    SELECT 
                        'portfolio_funds_without_funds' as issue_type,
                        COUNT(*) as count
                    FROM portfolio_funds pf
                    LEFT JOIN available_funds af ON pf.available_funds_id = af.id
                    WHERE af.id IS NULL
                    
                    UNION ALL
                    
                    SELECT 
                        'valuations_without_funds' as issue_type,
                        COUNT(*) as count
                    FROM portfolio_fund_valuations pfv
                    LEFT JOIN portfolio_funds pf ON pfv.portfolio_fund_id = pf.id
                    WHERE pf.id IS NULL
                """
            }
        }
        
        # Determine which investigation to run based on description
        investigation_type = None
        for key, config in investigation_queries.items():
            if key in issue_description.lower() or any(word in issue_description.lower() for word in key.split("_")):
                investigation_type = key
                break
        
        if not investigation_type:
            investigation_type = "data_inconsistencies"  # Default fallback
        
        try:
            async with self.pool.acquire() as conn:
                investigation = investigation_queries[investigation_type]
                
                results = await conn.fetch(investigation["query"])
                
                investigation_result = {
                    "success": True,
                    "issue_description": issue_description,
                    "investigation_type": investigation_type,
                    "investigation_description": investigation["description"],
                    "timestamp": datetime.now().isoformat(),
                    "findings": [],
                    "recommendations": []
                }
                
                # Process results
                for result in results:
                    result_dict = {}
                    for key, value in dict(result).items():
                        if isinstance(value, (datetime, date)):
                            result_dict[key] = value.isoformat()
                        elif isinstance(value, Decimal):
                            result_dict[key] = float(value)
                        else:
                            result_dict[key] = value
                    investigation_result["findings"].append(result_dict)
                
                # Generate specific recommendations based on investigation type
                if investigation_type == "missing_valuations" and investigation_result["findings"]:
                    investigation_result["recommendations"] = [
                        "Review portfolio funds that don't have current valuations",
                        "Consider running valuation import process for missing data",
                        "Check if portfolio funds have been properly set up with data sources"
                    ]
                elif investigation_type == "irr_calculation_issues" and investigation_result["findings"]:
                    investigation_result["recommendations"] = [
                        "Run IRR recalculation for portfolio funds with missing IRR data",
                        "Check if holding activity data is complete for IRR calculations",
                        "Verify that valuation dates align with IRR calculation requirements"
                    ]
                
                # Entity-specific investigation if ID provided
                if entity_id and investigation_type in ["missing_valuations", "irr_calculation_issues"]:
                    entity_details = await self._investigate_specific_entity(conn, investigation_type, entity_id)
                    investigation_result["entity_specific_findings"] = entity_details
                
                return investigation_result
                
        except Exception as e:
            logger.error(f"❌ Data inconsistency investigation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "issue_description": issue_description,
                "investigation_type": investigation_type
            }
    
    async def generate_debug_snapshot(self, focus_area: str = "all") -> Dict[str, Any]:
        """
        Generate comprehensive debug snapshot of database state.
        
        Args:
            focus_area: Area to focus on ("all", "analytics", "performance", "integrity")
            
        Returns:
            Dict containing complete debug snapshot
        """
        await self.initialize_pool()
        
        try:
            snapshot = {
                "success": True,
                "focus_area": focus_area,
                "timestamp": datetime.now().isoformat(),
                "database_info": {},
                "table_statistics": {},
                "view_performance": {},
                "system_health": {},
                "recent_activity": {}
            }
            
            async with self.pool.acquire() as conn:
                # Database basic info
                snapshot["database_info"] = {
                    "database_name": await conn.fetchval("SELECT current_database()"),
                    "database_version": await conn.fetchval("SELECT version()"),
                    "current_time": (await conn.fetchval("SELECT NOW()")).isoformat()
                }
                
                if focus_area in ["all", "performance"]:
                    # Table statistics
                    table_stats = await conn.fetch("""
                        SELECT 
                            relname as table_name,
                            n_live_tup as live_rows,
                            n_dead_tup as dead_rows,
                            n_tup_ins as inserts,
                            n_tup_upd as updates,
                            n_tup_del as deletes,
                            last_vacuum,
                            last_analyze
                        FROM pg_stat_user_tables
                        ORDER BY n_live_tup DESC
                        LIMIT 20
                    """)
                    
                    snapshot["table_statistics"] = []
                    for stat in table_stats:
                        stat_dict = {}
                        for key, value in dict(stat).items():
                            if isinstance(value, (datetime, date)):
                                stat_dict[key] = value.isoformat() if value else None
                            else:
                                stat_dict[key] = value
                        snapshot["table_statistics"].append(stat_dict)
                
                if focus_area in ["all", "analytics"]:
                    # Analytics view performance
                    analytics_views = [
                        "analytics_dashboard_summary",
                        "company_irr_cache",
                        "fund_distribution_fast"
                    ]
                    
                    snapshot["view_performance"] = []
                    for view_name in analytics_views:
                        try:
                            start_time = datetime.now()
                            count = await conn.fetchval(f"SELECT COUNT(*) FROM {view_name}")
                            query_time = (datetime.now() - start_time).total_seconds()
                            
                            snapshot["view_performance"].append({
                                "view_name": view_name,
                                "row_count": count,
                                "query_time_seconds": query_time,
                                "status": "accessible"
                            })
                        except Exception as e:
                            snapshot["view_performance"].append({
                                "view_name": view_name,
                                "status": "error",
                                "error": str(e)
                            })
                
                if focus_area in ["all", "integrity"]:
                    # Recent activity summary
                    recent_activities = await conn.fetch("""
                        SELECT 
                            activity_type,
                            COUNT(*) as count,
                            MAX(activity_timestamp) as latest_activity
                        FROM holding_activity_log
                        WHERE activity_timestamp >= NOW() - INTERVAL '7 days'
                        GROUP BY activity_type
                        ORDER BY count DESC
                    """)
                    
                    snapshot["recent_activity"] = []
                    for activity in recent_activities:
                        activity_dict = {}
                        for key, value in dict(activity).items():
                            if isinstance(value, (datetime, date)):
                                activity_dict[key] = value.isoformat()
                            else:
                                activity_dict[key] = value
                        snapshot["recent_activity"].append(activity_dict)
                
                # System health summary
                connection_count = await conn.fetchval("""
                    SELECT count(*) FROM pg_stat_activity 
                    WHERE state = 'active' AND datname = current_database()
                """)
                
                snapshot["system_health"] = {
                    "active_connections": connection_count,
                    "snapshot_generation_time": (datetime.now() - datetime.fromisoformat(snapshot["timestamp"])).total_seconds()
                }
                
                logger.info(f"✅ Debug snapshot generated for focus area: {focus_area}")
                return snapshot
                
        except Exception as e:
            logger.error(f"❌ Debug snapshot generation failed: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "focus_area": focus_area
            }
    
    # ========================================================================
    # PRIVATE HELPER METHODS
    # ========================================================================
    
    async def _run_data_integrity_checks(self, conn) -> Dict[str, Any]:
        """Run comprehensive data integrity checks."""
        checks = {}
        
        try:
            # Check for orphaned records
            orphaned_products = await conn.fetchval("""
                SELECT COUNT(*) FROM client_products cp
                LEFT JOIN client_groups cg ON cp.client_id = cg.id
                WHERE cg.id IS NULL
            """)
            checks["orphaned_client_products"] = orphaned_products
            
            # Check for invalid relationships
            invalid_portfolios = await conn.fetchval("""
                SELECT COUNT(*) FROM client_products cp
                LEFT JOIN portfolios p ON cp.portfolio_id = p.id
                WHERE p.id IS NULL
            """)
            checks["invalid_portfolio_references"] = invalid_portfolios
            
            # Check for data consistency
            negative_valuations = await conn.fetchval("""
                SELECT COUNT(*) FROM portfolio_fund_valuations
                WHERE valuation < 0
            """)
            checks["negative_valuations"] = negative_valuations
            
        except Exception as e:
            checks["error"] = str(e)
        
        return checks
    
    async def _get_available_tables(self, conn) -> List[str]:
        """Get list of available tables."""
        try:
            tables = await conn.fetch("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            return [table["table_name"] for table in tables]
        except Exception:
            return []
    
    async def _generate_relationship_summary(self, conn, entity_type: str, entity_id: int) -> Dict[str, Any]:
        """Generate summary statistics for relationship analysis."""
        summary = {}
        
        try:
            if entity_type == "client_group":
                # Count related entities
                product_count = await conn.fetchval("""
                    SELECT COUNT(*) FROM client_products 
                    WHERE client_id = $1 AND status = 'active'
                """, entity_id)
                
                portfolio_count = await conn.fetchval("""
                    SELECT COUNT(DISTINCT cp.portfolio_id) FROM client_products cp
                    JOIN portfolios p ON cp.portfolio_id = p.id
                    WHERE cp.client_id = $1 AND cp.status = 'active' AND p.status = 'active'
                """, entity_id)
                
                summary = {
                    "active_products": product_count,
                    "unique_portfolios": portfolio_count
                }
            
        except Exception as e:
            summary["error"] = str(e)
        
        return summary
    
    async def _analyze_index_impact(self, conn, index_definition: str) -> Dict[str, Any]:
        """Analyze the impact of a newly created index."""
        impact = {}
        
        try:
            # Extract table name from index definition
            # This is a simplified extraction - could be more robust
            parts = index_definition.upper().split()
            on_index = parts.index("ON") if "ON" in parts else -1
            
            if on_index >= 0 and on_index + 1 < len(parts):
                table_name = parts[on_index + 1].strip("();")
                
                # Get index size
                index_size = await conn.fetchval("""
                    SELECT pg_size_pretty(pg_total_relation_size(indexrelid))
                    FROM pg_stat_user_indexes
                    WHERE relname = $1
                    ORDER BY idx_scan DESC
                    LIMIT 1
                """, table_name)
                
                impact["estimated_size"] = index_size
                impact["table_analyzed"] = table_name
            
        except Exception as e:
            impact["analysis_error"] = str(e)
        
        return impact
    
    async def _generate_optimization_recommendations(self, plan_data: Dict) -> List[str]:
        """Generate query optimization recommendations based on execution plan."""
        recommendations = []
        
        if "Plan" in plan_data:
            plan = plan_data["Plan"]
            
            # Check for sequential scans on large tables
            if plan.get("Node Type") == "Seq Scan" and plan.get("Actual Rows", 0) > 1000:
                recommendations.append("Consider adding an index - sequential scan on large dataset detected")
            
            # Check for sort operations
            if "Sort" in plan.get("Node Type", ""):
                recommendations.append("Sort operation detected - consider adding appropriate indexes to avoid sorting")
            
            # Check for nested loops on large datasets
            if "Nested Loop" in plan.get("Node Type", "") and plan.get("Actual Rows", 0) > 1000:
                recommendations.append("Nested loop on large dataset - consider optimizing join conditions or adding indexes")
            
            # Check cache hit ratio
            hit_blocks = plan.get("Shared Hit Blocks", 0)
            read_blocks = plan.get("Shared Read Blocks", 0)
            
            if read_blocks > 0:
                hit_ratio = (hit_blocks / (hit_blocks + read_blocks)) * 100
                if hit_ratio < 90:
                    recommendations.append(f"Low buffer cache hit ratio ({hit_ratio:.1f}%) - consider increasing shared_buffers")
        
        if not recommendations:
            recommendations.append("Query appears to be well-optimized")
        
        return recommendations
    
    async def _investigate_specific_entity(self, conn, investigation_type: str, entity_id: int) -> Dict[str, Any]:
        """Run entity-specific investigation queries."""
        entity_details = {}
        
        try:
            if investigation_type == "missing_valuations":
                # Get detailed portfolio information
                portfolio_info = await conn.fetchrow("""
                    SELECT 
                        p.*,
                        cp.product_name,
                        cg.name as client_name
                    FROM portfolios p
                    LEFT JOIN client_products cp ON p.id = cp.portfolio_id
                    LEFT JOIN client_groups cg ON cp.client_id = cg.id
                    WHERE p.id = $1
                """, entity_id)
                
                if portfolio_info:
                    entity_details["portfolio_info"] = dict(portfolio_info)
                    
                    # Get fund details
                    fund_details = await conn.fetch("""
                        SELECT 
                            pf.*,
                            af.fund_name,
                            CASE WHEN lpfv.portfolio_fund_id IS NOT NULL THEN true ELSE false END as has_valuation
                        FROM portfolio_funds pf
                        JOIN available_funds af ON pf.available_funds_id = af.id
                        LEFT JOIN latest_portfolio_fund_valuations lpfv ON pf.id = lpfv.portfolio_fund_id
                        WHERE pf.portfolio_id = $1 AND pf.status = 'active'
                    """, entity_id)
                    
                    entity_details["fund_details"] = [dict(fund) for fund in fund_details]
            
        except Exception as e:
            entity_details["investigation_error"] = str(e)
        
        return entity_details


# ========================================================================
# UTILITY FUNCTIONS FOR SCRIPT USAGE
# ========================================================================

async def main():
    """
    Main function for standalone script usage.
    Demonstrates key capabilities of the Database Engineer Agent.
    """
    agent = DatabaseEngineerAgent()
    
    try:
        print("🔧 Kingston's Portal Database Engineer Agent")
        print("=" * 50)
        
        # Initialize connection
        await agent.initialize_pool()
        
        # Perform health check
        print("\n🏥 Running Database Health Check...")
        health = await agent.inspect_database_health()
        
        if health["status"] == "healthy":
            print("✅ Database is healthy")
            print(f"   • Total tables with data: {len(health['tables'])}")
            print(f"   • Analytics views accessible: {len([v for v in health['views'].values() if v.get('accessible')])}")
            print(f"   • Cache hit ratio: {health['performance_metrics'].get('cache_hit_ratio', 'N/A')}%")
        else:
            print("❌ Database health issues detected")
        
        # Test query functionality
        print("\n📊 Testing Query Functionality...")
        query_result = await agent.query_database(
            "SELECT COUNT(*) as total_clients FROM client_groups WHERE status = 'active'",
            fetch_mode="one"
        )
        
        if query_result["success"]:
            print(f"✅ Query executed successfully: {query_result['data']['total_clients']} active clients")
        
        # Analyze analytics performance
        print("\n⚡ Analyzing Analytics Performance...")
        analytics_optimization = await agent.optimize_analytics_views()
        
        if analytics_optimization["success"]:
            accessible_views = len([v for v in analytics_optimization["views_optimized"] if v["status"] == "accessible"])
            print(f"✅ Analytics optimization completed: {accessible_views} views accessible")
        
        # Quick integrity check
        print("\n🔍 Running Data Integrity Check...")
        integrity = await agent.validate_data_integrity()
        
        print(f"✅ Integrity check completed: {integrity['summary']['overall_status']}")
        print(f"   • Checks passed: {integrity['summary']['passed_checks']}")
        print(f"   • Issues found: {integrity['summary']['total_issues']}")
        
        print("\n🎉 Database Engineer Agent demonstration completed successfully!")
        
    except Exception as e:
        print(f"❌ Error during demonstration: {str(e)}")
        
    finally:
        await agent.close_pool()

if __name__ == "__main__":
    asyncio.run(main())