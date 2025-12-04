"""
Check if client_group_product_owners has the required unique constraint
"""

import asyncio
import asyncpg
import os

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://kingstons_app:kp24DBS!!@localhost:5432/kingstons_portal')


async def check_constraints():
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        # Check for unique constraints and indexes
        constraints = await conn.fetch("""
            SELECT
                tc.constraint_name,
                tc.constraint_type,
                kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.table_name = 'client_group_product_owners'
                AND tc.table_schema = 'public'
            ORDER BY tc.constraint_name, kcu.ordinal_position;
        """)

        print("Constraints on client_group_product_owners table:")
        print("=" * 80)
        if constraints:
            for c in constraints:
                print(f"  - {c['constraint_name']}: {c['constraint_type']} on column {c['column_name']}")
        else:
            print("  (No constraints found)")

        print()

        # Check for indexes
        indexes = await conn.fetch("""
            SELECT
                indexname,
                indexdef
            FROM pg_indexes
            WHERE tablename = 'client_group_product_owners'
                AND schemaname = 'public';
        """)

        print("Indexes on client_group_product_owners table:")
        print("=" * 80)
        if indexes:
            for idx in indexes:
                print(f"  - {idx['indexname']}")
                print(f"    Definition: {idx['indexdef']}")
                print()
        else:
            print("  (No indexes found)")

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        raise
    finally:
        await conn.close()


if __name__ == '__main__':
    asyncio.run(check_constraints())
