"""
Migration script to populate client_group_product_owners junction table

This script creates associations between client groups and product owners based on
existing product ownership relationships. For each product owner that owns a product,
we create an association with the client group that owns that product.

Logic:
1. Get all client products with their product owners
2. For each product owner on each product:
   - Extract the client_group_id from the product
   - Create an association in client_group_product_owners
   - Skip duplicates (same product owner may be on multiple products for same client group)

Run this script once to populate the junction table with existing relationships.
"""

import asyncio
import asyncpg
import os
from datetime import datetime

# Database connection string from environment
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://kingstons_app:kp24DBS!!@localhost:5432/kingstons_portal')


async def migrate_product_owner_associations():
    """
    Main migration function that populates client_group_product_owners table
    """
    # Connect to database
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        print("[MIGRATION] Starting migration: Populating client_group_product_owners table...")
        print("-" * 80)

        # Step 1: Get all product-owner associations with their client groups
        query = """
            SELECT DISTINCT
                cp.client_id as client_group_id,
                pop.product_owner_id,
                po.firstname,
                po.surname,
                cg.name as client_group_name
            FROM product_owner_products pop
            INNER JOIN client_products cp ON pop.product_id = cp.id
            INNER JOIN product_owners po ON pop.product_owner_id = po.id
            INNER JOIN client_groups cg ON cp.client_id = cg.id
            ORDER BY cp.client_id, pop.product_owner_id
        """

        associations = await conn.fetch(query)
        print(f"[OK] Found {len(associations)} unique client_group <-> product_owner relationships")
        print()

        # Step 2: Check which associations already exist
        existing_query = """
            SELECT client_group_id, product_owner_id
            FROM client_group_product_owners
        """
        existing = await conn.fetch(existing_query)
        existing_set = {(row['client_group_id'], row['product_owner_id']) for row in existing}
        print(f"[EXISTING] Found {len(existing_set)} existing associations in client_group_product_owners")
        print()

        # Step 3: Insert new associations
        inserted_count = 0
        skipped_count = 0

        for assoc in associations:
            client_group_id = assoc['client_group_id']
            product_owner_id = assoc['product_owner_id']

            # Skip if already exists
            if (client_group_id, product_owner_id) in existing_set:
                skipped_count += 1
                print(f"[SKIP] Client Group {client_group_id} ({assoc['client_group_name']}) <-> "
                      f"Product Owner {product_owner_id} ({assoc['firstname']} {assoc['surname']}) - Already exists")
                continue

            # Insert new association
            insert_query = """
                INSERT INTO client_group_product_owners (client_group_id, product_owner_id, created_at)
                VALUES ($1, $2, $3)
                RETURNING id
            """

            result = await conn.fetchrow(
                insert_query,
                client_group_id,
                product_owner_id,
                datetime.utcnow()
            )

            inserted_count += 1
            print(f"[CREATE] Client Group {client_group_id} ({assoc['client_group_name']}) <-> "
                  f"Product Owner {product_owner_id} ({assoc['firstname']} {assoc['surname']}) - ID: {result['id']}")

        print()
        print("-" * 80)
        print(f"[COMPLETE] Migration complete!")
        print(f"   - Inserted: {inserted_count} new associations")
        print(f"   - Skipped: {skipped_count} existing associations")
        print(f"   - Total: {len(associations)} relationships found")
        print()

        # Step 4: Verify the results
        verify_query = """
            SELECT COUNT(*) as total
            FROM client_group_product_owners
        """
        total = await conn.fetchval(verify_query)
        print(f"[FINAL] Final count in client_group_product_owners: {total} associations")

    except Exception as e:
        print(f"[ERROR] Error during migration: {str(e)}")
        raise
    finally:
        await conn.close()


if __name__ == '__main__':
    asyncio.run(migrate_product_owner_associations())
