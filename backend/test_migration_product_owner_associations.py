"""
TEST SCRIPT - Dry run of migration to populate client_group_product_owners junction table

This script DOES NOT make any changes to the database. It only reports what would be created.
Safe to run multiple times to preview the migration.

Logic:
1. Get all client products with their product owners
2. For each product owner on each product:
   - Extract the client_group_id from the product
   - Report what association would be created
   - Check for duplicates

Run this to verify the migration before running the actual migration script.
"""

import asyncio
import asyncpg
import os

# Database connection string from environment
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://kingstons_app:kp24DBS!!@localhost:5432/kingstons_portal')


async def test_migration():
    """
    Test migration function - READ ONLY, no changes made
    """
    # Connect to database
    conn = await asyncpg.connect(DATABASE_URL)

    try:
        print("[TEST MODE] Dry run of migration (no changes will be made)")
        print("=" * 80)
        print()

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
        print(f"[EXISTING] Currently {len(existing_set)} associations exist in client_group_product_owners")
        print()

        # Step 3: Show what would be inserted
        print("[PREVIEW] What would be created:")
        print("-" * 80)

        would_insert_count = 0
        would_skip_count = 0

        for assoc in associations:
            client_group_id = assoc['client_group_id']
            product_owner_id = assoc['product_owner_id']

            # Check if already exists
            if (client_group_id, product_owner_id) in existing_set:
                would_skip_count += 1
                print(f"[SKIP] Client Group {client_group_id} ({assoc['client_group_name']}) <-> "
                      f"Owner {product_owner_id} ({assoc['firstname']} {assoc['surname']}) [Already exists]")
            else:
                would_insert_count += 1
                print(f"[CREATE] Client Group {client_group_id} ({assoc['client_group_name']}) <-> "
                      f"Owner {product_owner_id} ({assoc['firstname']} {assoc['surname']})")

        print()
        print("=" * 80)
        print(f"[SUMMARY] DRY RUN - NO CHANGES MADE:")
        print(f"   - Would insert: {would_insert_count} new associations")
        print(f"   - Would skip: {would_skip_count} existing associations")
        print(f"   - Total relationships found: {len(associations)}")
        print()
        print(f"[RESULT] After migration, there would be {len(existing_set) + would_insert_count} total associations")
        print()

        if would_insert_count > 0:
            print("[READY] Ready to run actual migration with migrate_product_owner_associations.py")
        else:
            print("[INFO] All associations already exist - no migration needed")

    except Exception as e:
        print(f"[ERROR] Error during test: {str(e)}")
        raise
    finally:
        await conn.close()


if __name__ == '__main__':
    asyncio.run(test_migration())
