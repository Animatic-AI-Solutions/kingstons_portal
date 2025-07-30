import os
import sys
import logging
import asyncpg
from typing import Optional, Dict, Any, List
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("postgresql")

# Load environment variables
load_dotenv()

# PostgreSQL connection settings
DATABASE_CONFIG = {
    "host": os.getenv("POSTGRES_HOST", "localhost"),
    "port": int(os.getenv("POSTGRES_PORT", "5432")),
    "database": os.getenv("POSTGRES_DB", "kingstons_portal"),
    "user": os.getenv("POSTGRES_USER", "kingstons_app"),
    "password": os.getenv("POSTGRES_PASSWORD", "KingstonApp2024!"),
    "min_size": 5,
    "max_size": 20,
    "command_timeout": 60,
}

# Global connection pool
_connection_pool: Optional[asyncpg.Pool] = None

async def init_db_pool():
    """Initialize the PostgreSQL connection pool"""
    global _connection_pool
    
    if _connection_pool is None:
        try:
            logger.info("Creating PostgreSQL connection pool...")
            _connection_pool = await asyncpg.create_pool(**DATABASE_CONFIG)
            logger.info("PostgreSQL connection pool created successfully")
            
            # Test the connection
            async with _connection_pool.acquire() as conn:
                result = await conn.fetchval("SELECT version()")
                logger.info(f"PostgreSQL connection test successful: {result}")
                
        except Exception as e:
            logger.error(f"Failed to create PostgreSQL connection pool: {str(e)}")
            raise
    
    return _connection_pool

async def close_db_pool():
    """Close the PostgreSQL connection pool"""
    global _connection_pool
    
    if _connection_pool:
        logger.info("Closing PostgreSQL connection pool...")
        await _connection_pool.close()
        _connection_pool = None
        logger.info("PostgreSQL connection pool closed")

@asynccontextmanager
async def get_db_connection():
    """Get a database connection from the pool"""
    if _connection_pool is None:
        await init_db_pool()
    
    async with _connection_pool.acquire() as connection:
        yield connection

class PostgreSQLClient:
    """
    PostgreSQL client that mimics Supabase client interface for easier migration
    """
    
    def __init__(self):
        self.pool = None
    
    async def ensure_pool(self):
        """Ensure connection pool is initialized"""
        if self.pool is None:
            self.pool = await init_db_pool()
        return self.pool
    
    def table(self, table_name: str):
        """Return a table query builder (mimics Supabase interface)"""
        return PostgreSQLTable(table_name, self)
    
    async def rpc(self, function_name: str, params: Dict[str, Any] = None):
        """Call a PostgreSQL function (mimics Supabase RPC)"""
        await self.ensure_pool()
        
        if params is None:
            params = {}
        
        # Convert params to PostgreSQL function call format
        param_placeholders = []
        param_values = []
        
        for i, (key, value) in enumerate(params.items(), 1):
            param_placeholders.append(f"${i}")
            param_values.append(value)
        
        query = f"SELECT * FROM {function_name}({', '.join(param_placeholders)})"
        
        async with get_db_connection() as conn:
            try:
                rows = await conn.fetch(query, *param_values)
                return {"data": [dict(row) for row in rows], "error": None}
            except Exception as e:
                logger.error(f"RPC call failed: {str(e)}")
                return {"data": None, "error": str(e)}

class PostgreSQLTable:
    """
    Table query builder that mimics Supabase table interface
    """
    
    def __init__(self, table_name: str, client: PostgreSQLClient):
        self.table_name = table_name
        self.client = client
        self._select_fields = "*"
        self._where_conditions = []
        self._order_by = []
        self._limit_value = None
        self._offset_value = None
    
    def select(self, fields: str = "*"):
        """Select specific fields"""
        self._select_fields = fields
        return self
    
    def eq(self, column: str, value: Any):
        """Add equality condition"""
        self._where_conditions.append((column, "=", value))
        return self
    
    def neq(self, column: str, value: Any):
        """Add not equal condition"""
        self._where_conditions.append((column, "!=", value))
        return self
    
    def gt(self, column: str, value: Any):
        """Add greater than condition"""
        self._where_conditions.append((column, ">", value))
        return self
    
    def gte(self, column: str, value: Any):
        """Add greater than or equal condition"""
        self._where_conditions.append((column, ">=", value))
        return self
    
    def lt(self, column: str, value: Any):
        """Add less than condition"""
        self._where_conditions.append((column, "<", value))
        return self
    
    def lte(self, column: str, value: Any):
        """Add less than or equal condition"""
        self._where_conditions.append((column, "<=", value))
        return self
    
    def like(self, column: str, pattern: str):
        """Add LIKE condition"""
        self._where_conditions.append((column, "LIKE", pattern))
        return self
    
    def ilike(self, column: str, pattern: str):
        """Add ILIKE condition (case insensitive)"""
        self._where_conditions.append((column, "ILIKE", pattern))
        return self
    
    def is_(self, column: str, value: Any):
        """Add IS condition (for NULL checks)"""
        self._where_conditions.append((column, "IS", value))
        return self
    
    def in_(self, column: str, values: List[Any]):
        """Add IN condition"""
        self._where_conditions.append((column, "IN", values))
        return self
    
    def order(self, column: str, desc: bool = False):
        """Add ORDER BY clause"""
        direction = "DESC" if desc else "ASC"
        self._order_by.append(f"{column} {direction}")
        return self
    
    def limit(self, count: int):
        """Add LIMIT clause"""
        self._limit_value = count
        return self
    
    def offset(self, count: int):
        """Add OFFSET clause"""
        self._offset_value = count
        return self
    
    def _build_query(self) -> tuple:
        """Build the SQL query and parameters"""
        query_parts = [f"SELECT {self._select_fields} FROM {self.table_name}"]
        params = []
        param_counter = 1
        
        # WHERE conditions
        if self._where_conditions:
            where_clauses = []
            for column, operator, value in self._where_conditions:
                if operator == "IN":
                    placeholders = []
                    for v in value:
                        placeholders.append(f"${param_counter}")
                        params.append(v)
                        param_counter += 1
                    where_clauses.append(f"{column} IN ({', '.join(placeholders)})")
                else:
                    where_clauses.append(f"{column} {operator} ${param_counter}")
                    params.append(value)
                    param_counter += 1
            
            query_parts.append(f"WHERE {' AND '.join(where_clauses)}")
        
        # ORDER BY
        if self._order_by:
            query_parts.append(f"ORDER BY {', '.join(self._order_by)}")
        
        # LIMIT
        if self._limit_value is not None:
            query_parts.append(f"LIMIT ${param_counter}")
            params.append(self._limit_value)
            param_counter += 1
        
        # OFFSET
        if self._offset_value is not None:
            query_parts.append(f"OFFSET ${param_counter}")
            params.append(self._offset_value)
            param_counter += 1
        
        return " ".join(query_parts), params
    
    async def execute(self):
        """Execute the query and return results in Supabase format"""
        await self.client.ensure_pool()
        query, params = self._build_query()
        
        async with get_db_connection() as conn:
            try:
                rows = await conn.fetch(query, *params)
                return {"data": [dict(row) for row in rows], "error": None, "count": len(rows)}
            except Exception as e:
                logger.error(f"Query execution failed: {str(e)}")
                logger.error(f"Query: {query}")
                logger.error(f"Params: {params}")
                return {"data": None, "error": str(e), "count": 0}
    
    async def insert(self, data: Dict[str, Any]):
        """Insert data into the table"""
        await self.client.ensure_pool()
        
        columns = list(data.keys())
        placeholders = [f"${i+1}" for i in range(len(columns))]
        values = list(data.values())
        
        query = f"""
        INSERT INTO {self.table_name} ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
        RETURNING *
        """
        
        async with get_db_connection() as conn:
            try:
                row = await conn.fetchrow(query, *values)
                return {"data": [dict(row)] if row else [], "error": None}
            except Exception as e:
                logger.error(f"Insert failed: {str(e)}")
                return {"data": None, "error": str(e)}
    
    async def update(self, data: Dict[str, Any]):
        """Update data in the table"""
        await self.client.ensure_pool()
        
        if not self._where_conditions:
            return {"data": None, "error": "Update requires WHERE conditions"}
        
        # Build SET clause
        set_clauses = []
        params = []
        param_counter = 1
        
        for column, value in data.items():
            set_clauses.append(f"{column} = ${param_counter}")
            params.append(value)
            param_counter += 1
        
        # Build WHERE clause
        where_clauses = []
        for column, operator, value in self._where_conditions:
            where_clauses.append(f"{column} {operator} ${param_counter}")
            params.append(value)
            param_counter += 1
        
        query = f"""
        UPDATE {self.table_name}
        SET {', '.join(set_clauses)}
        WHERE {' AND '.join(where_clauses)}
        RETURNING *
        """
        
        async with get_db_connection() as conn:
            try:
                rows = await conn.fetch(query, *params)
                return {"data": [dict(row) for row in rows], "error": None}
            except Exception as e:
                logger.error(f"Update failed: {str(e)}")
                return {"data": None, "error": str(e)}
    
    async def delete(self):
        """Delete data from the table"""
        await self.client.ensure_pool()
        
        if not self._where_conditions:
            return {"data": None, "error": "Delete requires WHERE conditions"}
        
        # Build WHERE clause
        where_clauses = []
        params = []
        param_counter = 1
        
        for column, operator, value in self._where_conditions:
            where_clauses.append(f"{column} {operator} ${param_counter}")
            params.append(value)
            param_counter += 1
        
        query = f"""
        DELETE FROM {self.table_name}
        WHERE {' AND '.join(where_clauses)}
        RETURNING *
        """
        
        async with get_db_connection() as conn:
            try:
                rows = await conn.fetch(query, *params)
                return {"data": [dict(row) for row in rows], "error": None}
            except Exception as e:
                logger.error(f"Delete failed: {str(e)}")
                return {"data": None, "error": str(e)}

# Global PostgreSQL client instance
_postgresql_client: Optional[PostgreSQLClient] = None

async def get_postgresql_client():
    """Get the global PostgreSQL client instance"""
    global _postgresql_client
    
    if _postgresql_client is None:
        _postgresql_client = PostgreSQLClient()
    
    return _postgresql_client

async def get_db():
    """
    FastAPI dependency to get database client
    Compatible with existing Supabase-based code
    """
    return await get_postgresql_client()