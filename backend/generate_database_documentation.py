#!/usr/bin/env python3
"""
Database Documentation Generator for Kingston's Portal
======================================================

This script connects to the PostgreSQL database and generates comprehensive
documentation of all database components including:
- Tables with columns, data types, and constraints
- Views and materialized views
- Functions and procedures
- Indexes
- Triggers
- Sequences
- Foreign key relationships

The output is a complete SQL script that documents the entire database structure.
"""

import asyncio
import asyncpg
import os
import sys
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def connect_to_database():
    """Connect to the database using existing configuration"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL not found in environment variables")
        print("Please ensure your .env file contains the DATABASE_URL")
        sys.exit(1)
    
    try:
        conn = await asyncpg.connect(database_url)
        print("✓ Successfully connected to database")
        return conn
    except Exception as e:
        print(f"ERROR: Failed to connect to database: {e}")
        sys.exit(1)

async def get_database_info(conn):
    """Get basic database information"""
    query = """
    SELECT 
        current_database() as database_name,
        current_user as current_user,
        version() as postgres_version,
        current_setting('server_version') as server_version
    """
    return await conn.fetchrow(query)

async def get_tables_info(conn):
    """Get all tables with their columns, data types, and constraints"""
    query = """
    SELECT 
        t.table_name,
        t.table_type,
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.numeric_precision,
        c.numeric_scale,
        c.is_nullable,
        c.column_default,
        c.ordinal_position,
        CASE 
            WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY'
            WHEN fk.column_name IS NOT NULL THEN 'FOREIGN KEY'
            ELSE NULL
        END as key_type,
        fk.foreign_table_name,
        fk.foreign_column_name
    FROM information_schema.tables t
    LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
    LEFT JOIN (
        SELECT 
            kcu.column_name,
            kcu.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY'
    ) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
    LEFT JOIN (
        SELECT 
            kcu.column_name,
            kcu.table_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
    ) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
    WHERE t.table_schema = 'public' 
        AND t.table_type IN ('BASE TABLE', 'VIEW')
    ORDER BY t.table_name, c.ordinal_position
    """
    return await conn.fetch(query)

async def get_views_info(conn):
    """Get all views and their definitions"""
    query = """
    SELECT 
        table_name as view_name,
        view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name
    """
    return await conn.fetch(query)

async def get_functions_info(conn):
    """Get all functions and procedures"""
    query = """
    SELECT 
        p.proname as function_name,
        pg_get_function_result(p.oid) as return_type,
        pg_get_function_arguments(p.oid) as arguments,
        pg_get_functiondef(p.oid) as function_definition,
        CASE 
            WHEN p.prokind = 'f' THEN 'FUNCTION'
            WHEN p.prokind = 'p' THEN 'PROCEDURE'
            WHEN p.prokind = 'a' THEN 'AGGREGATE'
            WHEN p.prokind = 'w' THEN 'WINDOW'
            ELSE 'OTHER'
        END as function_type
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
        AND p.proname NOT LIKE 'pg_%'
    ORDER BY p.proname
    """
    return await conn.fetch(query)

async def get_indexes_info(conn):
    """Get all indexes"""
    query = """
    SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname
    """
    return await conn.fetch(query)

async def get_triggers_info(conn):
    """Get all triggers"""
    query = """
    SELECT 
        t.trigger_name,
        t.event_manipulation,
        t.event_object_table,
        t.action_timing,
        t.action_statement,
        pg_get_triggerdef(tr.oid) as trigger_definition
    FROM information_schema.triggers t
    JOIN pg_trigger tr ON tr.tgname = t.trigger_name
    JOIN pg_class c ON c.oid = tr.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
    ORDER BY t.event_object_table, t.trigger_name
    """
    return await conn.fetch(query)

async def get_sequences_info(conn):
    """Get all sequences"""
    query = """
    SELECT 
        sequence_name,
        data_type,
        start_value,
        minimum_value,
        maximum_value,
        increment,
        cycle_option
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
    ORDER BY sequence_name
    """
    return await conn.fetch(query)

async def get_constraints_info(conn):
    """Get all constraints"""
    query = """
    SELECT 
        tc.constraint_name,
        tc.table_name,
        tc.constraint_type,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        rc.update_rule,
        rc.delete_rule,
        cc.check_clause
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.constraint_column_usage ccu 
        ON ccu.constraint_name = tc.constraint_name
    LEFT JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
    LEFT JOIN information_schema.check_constraints cc 
        ON tc.constraint_name = cc.constraint_name
    WHERE tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name
    """
    return await conn.fetch(query)

def generate_sql_documentation(db_info, tables, views, functions, indexes, triggers, sequences, constraints):
    """Generate comprehensive SQL documentation"""
    
    sql_content = f"""-- ============================================================================
-- KINGSTON'S PORTAL - DATABASE STRUCTURE DOCUMENTATION
-- ============================================================================
-- Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
-- Database: {db_info['database_name']}
-- PostgreSQL Version: {db_info['postgres_version']}
-- Current User: {db_info['current_user']}
-- ============================================================================

-- This file contains the complete structure of the Kingston's Portal database
-- including all tables, views, functions, indexes, triggers, sequences, and constraints.
-- It serves as comprehensive documentation for the database architecture.

-- ============================================================================
-- TABLE OF CONTENTS
-- ============================================================================
-- 1. SEQUENCES
-- 2. TABLES
-- 3. VIEWS
-- 4. FUNCTIONS AND PROCEDURES
-- 5. INDEXES
-- 6. TRIGGERS
-- 7. CONSTRAINTS
-- ============================================================================

"""

    # Group tables by name
    tables_dict = {}
    for row in tables:
        table_name = row['table_name']
        if table_name not in tables_dict:
            tables_dict[table_name] = {
                'table_type': row['table_type'],
                'columns': []
            }
        
        if row['column_name']:  # Only add if column exists
            column_info = {
                'name': row['column_name'],
                'data_type': row['data_type'],
                'max_length': row['character_maximum_length'],
                'precision': row['numeric_precision'],
                'scale': row['numeric_scale'],
                'nullable': row['is_nullable'],
                'default': row['column_default'],
                'position': row['ordinal_position'],
                'key_type': row['key_type'],
                'foreign_table': row['foreign_table_name'],
                'foreign_column': row['foreign_column_name']
            }
            tables_dict[table_name]['columns'].append(column_info)

    # 1. SEQUENCES
    sql_content += "\n-- ============================================================================\n"
    sql_content += "-- 1. SEQUENCES\n"
    sql_content += "-- ============================================================================\n\n"
    
    for seq in sequences:
        sql_content += f"-- Sequence: {seq['sequence_name']}\n"
        sql_content += f"CREATE SEQUENCE IF NOT EXISTS {seq['sequence_name']}\n"
        sql_content += f"    START WITH {seq['start_value']}\n"
        sql_content += f"    INCREMENT BY {seq['increment']}\n"
        sql_content += f"    MINVALUE {seq['minimum_value']}\n"
        sql_content += f"    MAXVALUE {seq['maximum_value']}\n"
        sql_content += f"    {'CYCLE' if seq['cycle_option'] == 'YES' else 'NO CYCLE'};\n\n"

    # 2. TABLES
    sql_content += "\n-- ============================================================================\n"
    sql_content += "-- 2. TABLES\n"
    sql_content += "-- ============================================================================\n\n"
    
    # Separate base tables from views
    base_tables = {name: info for name, info in tables_dict.items() if info['table_type'] == 'BASE TABLE'}
    
    for table_name, table_info in sorted(base_tables.items()):
        sql_content += f"-- Table: {table_name}\n"
        sql_content += f"CREATE TABLE {table_name} (\n"
        
        columns = sorted(table_info['columns'], key=lambda x: x['position'])
        column_lines = []
        
        for col in columns:
            col_def = f"    {col['name']} {col['data_type']}"
            
            # Add length/precision
            if col['max_length']:
                col_def += f"({col['max_length']})"
            elif col['precision'] and col['scale']:
                col_def += f"({col['precision']},{col['scale']})"
            elif col['precision']:
                col_def += f"({col['precision']})"
            
            # Add nullable
            if col['nullable'] == 'NO':
                col_def += " NOT NULL"
            
            # Add default
            if col['default']:
                col_def += f" DEFAULT {col['default']}"
            
            # Add key type comment
            comment = ""
            if col['key_type'] == 'PRIMARY KEY':
                comment = " -- PRIMARY KEY"
            elif col['key_type'] == 'FOREIGN KEY':
                comment = f" -- FOREIGN KEY -> {col['foreign_table']}.{col['foreign_column']}"
            
            column_lines.append(col_def + comment)
        
        sql_content += ",\n".join(column_lines)
        sql_content += "\n);\n\n"

    # 3. VIEWS
    sql_content += "\n-- ============================================================================\n"
    sql_content += "-- 3. VIEWS\n"
    sql_content += "-- ============================================================================\n\n"
    
    for view in views:
        sql_content += f"-- View: {view['view_name']}\n"
        sql_content += f"CREATE OR REPLACE VIEW {view['view_name']} AS\n"
        sql_content += f"{view['view_definition']};\n\n"

    # 4. FUNCTIONS AND PROCEDURES
    sql_content += "\n-- ============================================================================\n"
    sql_content += "-- 4. FUNCTIONS AND PROCEDURES\n"
    sql_content += "-- ============================================================================\n\n"
    
    for func in functions:
        sql_content += f"-- {func['function_type']}: {func['function_name']}\n"
        sql_content += f"-- Arguments: {func['arguments'] or 'None'}\n"
        sql_content += f"-- Returns: {func['return_type'] or 'void'}\n"
        sql_content += f"{func['function_definition']};\n\n"

    # 5. INDEXES
    sql_content += "\n-- ============================================================================\n"
    sql_content += "-- 5. INDEXES\n"
    sql_content += "-- ============================================================================\n\n"
    
    current_table = None
    for idx in indexes:
        if current_table != idx['tablename']:
            current_table = idx['tablename']
            sql_content += f"-- Indexes for table: {current_table}\n"
        
        sql_content += f"{idx['indexdef']};\n"
    sql_content += "\n"

    # 6. TRIGGERS
    sql_content += "\n-- ============================================================================\n"
    sql_content += "-- 6. TRIGGERS\n"
    sql_content += "-- ============================================================================\n\n"
    
    current_table = None
    for trigger in triggers:
        if current_table != trigger['event_object_table']:
            current_table = trigger['event_object_table']
            sql_content += f"-- Triggers for table: {current_table}\n"
        
        sql_content += f"-- Trigger: {trigger['trigger_name']}\n"
        sql_content += f"-- Event: {trigger['event_manipulation']} {trigger['action_timing']}\n"
        sql_content += f"{trigger['trigger_definition']};\n\n"

    # 7. CONSTRAINTS
    sql_content += "\n-- ============================================================================\n"
    sql_content += "-- 7. CONSTRAINTS SUMMARY\n"
    sql_content += "-- ============================================================================\n\n"
    
    # Group constraints by table and type
    constraints_by_table = {}
    for constraint in constraints:
        table_name = constraint['table_name']
        if table_name not in constraints_by_table:
            constraints_by_table[table_name] = {
                'PRIMARY KEY': [],
                'FOREIGN KEY': [],
                'UNIQUE': [],
                'CHECK': []
            }
        
        constraint_type = constraint['constraint_type']
        if constraint_type in constraints_by_table[table_name]:
            constraints_by_table[table_name][constraint_type].append(constraint)

    for table_name, constraint_types in sorted(constraints_by_table.items()):
        sql_content += f"-- Constraints for table: {table_name}\n"
        
        for constraint_type, constraint_list in constraint_types.items():
            if constraint_list:
                sql_content += f"--   {constraint_type}:\n"
                for constraint in constraint_list:
                    if constraint_type == 'FOREIGN KEY':
                        sql_content += f"--     {constraint['constraint_name']}: {constraint['column_name']} -> {constraint['foreign_table_name']}.{constraint['foreign_column_name']}\n"
                    elif constraint_type == 'CHECK':
                        sql_content += f"--     {constraint['constraint_name']}: {constraint['check_clause']}\n"
                    else:
                        sql_content += f"--     {constraint['constraint_name']}: {constraint['column_name']}\n"
        sql_content += "\n"

    # Add summary statistics
    sql_content += "\n-- ============================================================================\n"
    sql_content += "-- DATABASE STATISTICS SUMMARY\n"
    sql_content += "-- ============================================================================\n"
    sql_content += f"-- Total Tables: {len(base_tables)}\n"
    sql_content += f"-- Total Views: {len(views)}\n"
    sql_content += f"-- Total Functions/Procedures: {len(functions)}\n"
    sql_content += f"-- Total Indexes: {len(indexes)}\n"
    sql_content += f"-- Total Triggers: {len(triggers)}\n"
    sql_content += f"-- Total Sequences: {len(sequences)}\n"
    sql_content += "-- ============================================================================\n"

    return sql_content

async def main():
    """Main function to generate database documentation"""
    print("Kingston's Portal Database Documentation Generator")
    print("=" * 55)
    
    # Connect to database
    conn = await connect_to_database()
    
    try:
        print("📊 Gathering database information...")
        db_info = await get_database_info(conn)
        
        print("📋 Extracting tables and columns...")
        tables = await get_tables_info(conn)
        
        print("👁️  Extracting views...")
        views = await get_views_info(conn)
        
        print("⚙️  Extracting functions and procedures...")
        functions = await get_functions_info(conn)
        
        print("🔍 Extracting indexes...")
        indexes = await get_indexes_info(conn)
        
        print("⚡ Extracting triggers...")
        triggers = await get_triggers_info(conn)
        
        print("🔢 Extracting sequences...")
        sequences = await get_sequences_info(conn)
        
        print("🔗 Extracting constraints...")
        constraints = await get_constraints_info(conn)
        
        print("📝 Generating SQL documentation...")
        sql_content = generate_sql_documentation(
            db_info, tables, views, functions, indexes, triggers, sequences, constraints
        )
        
        # Write to file
        output_file = "database_structure_documentation.sql"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        
        print(f"✅ Documentation generated successfully!")
        print(f"📄 Output file: {output_file}")
        print(f"📊 Database: {db_info['database_name']}")
        print(f"📋 Tables: {len(set(row['table_name'] for row in tables if row['table_name']))}")
        print(f"👁️  Views: {len(views)}")
        print(f"⚙️  Functions: {len(functions)}")
        print(f"🔍 Indexes: {len(indexes)}")
        print(f"⚡ Triggers: {len(triggers)}")
        print(f"🔢 Sequences: {len(sequences)}")
        
    except Exception as e:
        print(f"❌ Error generating documentation: {e}")
        raise
    finally:
        await conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    asyncio.run(main())
