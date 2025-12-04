"""
Script to verify association counts and show deduplication logic
"""

import asyncio
import asyncpg
import os

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://kingstons_app:kp24DBS!!@localhost:5432/kingstons_portal')


async def check_counts():
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        print("Checking association counts...")
        print("=" * 80)
        print()

        # Count total product_owner_products associations
        total_pop = await conn.fetchval("""
            SELECT COUNT(*) FROM product_owner_products
        """)
        print(f"[1] Total rows in product_owner_products: {total_pop}")

        # Count unique client_group + product_owner combinations
        unique_associations = await conn.fetchval("""
            SELECT COUNT(DISTINCT (cp.client_id, pop.product_owner_id))
            FROM product_owner_products pop
            INNER JOIN client_products cp ON pop.product_id = cp.id
        """)
        print(f"[2] Unique (client_group, product_owner) pairs: {unique_associations}")

        # Show some examples of deduplication
        print()
        print("Example of deduplication (showing first 5 client groups):")
        print("-" * 80)

        examples = await conn.fetch("""
            SELECT
                cp.client_id,
                cg.name as client_group_name,
                pop.product_owner_id,
                po.firstname,
                po.surname,
                COUNT(*) as product_count
            FROM product_owner_products pop
            INNER JOIN client_products cp ON pop.product_id = cp.id
            INNER JOIN client_groups cg ON cp.client_id = cg.id
            INNER JOIN product_owners po ON pop.product_owner_id = po.id
            GROUP BY cp.client_id, cg.name, pop.product_owner_id, po.firstname, po.surname
            HAVING COUNT(*) > 1
            ORDER BY product_count DESC
            LIMIT 10
        """)

        if examples:
            print("Product owners with multiple products in same client group:")
            for ex in examples:
                print(f"  - Client Group {ex['client_id']} ({ex['client_group_name']})")
                print(f"    Product Owner: {ex['firstname']} {ex['surname']}")
                print(f"    On {ex['product_count']} different products")
                print()
        else:
            print("(No product owners with multiple products in same client group)")

        print("=" * 80)
        print(f"Deduplication: {total_pop} associations -> {unique_associations} unique pairs")
        print(f"Reduction: {total_pop - unique_associations} duplicates removed")

    except Exception as e:
        print(f"[ERROR] {str(e)}")
        raise
    finally:
        await conn.close()


if __name__ == '__main__':
    asyncio.run(check_counts())
