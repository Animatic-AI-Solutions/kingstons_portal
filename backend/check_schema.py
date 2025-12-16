import asyncio
import asyncpg
import os
from dotenv import load_dotenv

load_dotenv()

async def check_schema():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL_PHASE2'))

    # Check if table exists
    exists = await conn.fetchval("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'special_relationships'
        )
    """)

    print(f"Table exists: {exists}")

    if exists:
        # Get current schema
        columns = await conn.fetch("""
            SELECT column_name, data_type, is_nullable, character_maximum_length
            FROM information_schema.columns
            WHERE table_name = 'special_relationships'
            ORDER BY ordinal_position
        """)

        print("\nCurrent schema:")
        for col in columns:
            print(f"  {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']}, max_length: {col['character_maximum_length']})")

    await conn.close()

asyncio.run(check_schema())
