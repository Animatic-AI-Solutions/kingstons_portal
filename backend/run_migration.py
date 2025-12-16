"""
Script to run the special_relationships table migration
This recreates the table with the correct schema for the API
"""
import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def run_migration():
    print("Connecting to database...")
    conn = await asyncpg.connect(os.getenv('DATABASE_URL_PHASE2'))

    try:
        # Read the migration SQL file
        migration_file = '../database_migration_scripts/recreate_special_relationships_table.sql'
        print(f"Reading migration from {migration_file}")

        with open(migration_file, 'r') as f:
            sql = f.read()

        print("\n" + "="*60)
        print("WARNING: This will drop and recreate special_relationships table")
        print("="*60)

        # Check if table has data
        try:
            count = await conn.fetchval("SELECT COUNT(*) FROM special_relationships")
            if count > 0:
                print(f"\nTable currently has {count} rows")
                print("Data will be backed up to special_relationships_backup_old")
        except:
            print("\nTable doesn't exist or is empty")

        response = input("\nProceed with migration? (yes/no): ")

        if response.lower() != 'yes':
            print("Migration cancelled")
            return

        print("\nRunning migration...")

        # Execute migration
        await conn.execute(sql)

        print("\n✓ Migration completed successfully!")

        # Show new schema
        print("\nNew table schema:")
        columns = await conn.fetch("""
            SELECT column_name, data_type, character_maximum_length, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'special_relationships'
            ORDER BY ordinal_position
        """)

        for col in columns:
            nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
            max_len = f"({col['character_maximum_length']})" if col['character_maximum_length'] else ""
            print(f"  - {col['column_name']}: {col['data_type']}{max_len} {nullable}")

    except Exception as e:
        print(f"\n✗ Error during migration: {e}")
        raise
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
