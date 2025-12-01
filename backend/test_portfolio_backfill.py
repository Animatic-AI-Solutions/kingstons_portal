"""
Test script to backfill portfolio valuations for a specific product's portfolio.

This script finds the portfolio linked to a specific product and backfills its portfolio valuations.

Usage:
    python test_portfolio_backfill.py --product-id 348 [--dry-run]
"""

import asyncio
import asyncpg
import os
import sys
from datetime import datetime
from typing import Optional

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import DATABASE_URL


async def find_portfolio_for_product(db, product_id: int):
    """Find the portfolio ID for a given product"""
    product = await db.fetchrow(
        "SELECT id, product_name, portfolio_id FROM client_products WHERE id = $1",
        product_id
    )

    if not product:
        print(f"[ERROR] Product {product_id} not found")
        return None

    portfolio_id = product['portfolio_id']
    product_name = product['product_name']

    print(f"[OK] Product {product_id} ({product_name}) -> Portfolio {portfolio_id}")
    return portfolio_id


async def get_portfolio_details(db, portfolio_id: int):
    """Get portfolio details"""
    portfolio = await db.fetchrow(
        "SELECT id, portfolio_name FROM portfolios WHERE id = $1",
        portfolio_id
    )

    if portfolio:
        print(f"   Portfolio Name: {portfolio['portfolio_name']}")

    # Get portfolio funds count
    funds = await db.fetch(
        "SELECT id FROM portfolio_funds WHERE portfolio_id = $1",
        portfolio_id
    )

    print(f"   Portfolio Funds: {len(funds)}")
    return funds


async def find_orphaned_irr_records(db, portfolio_id: int):
    """Find orphaned IRR records for this portfolio"""
    records = await db.fetch(
        """
        SELECT id, portfolio_id, date, irr_result, portfolio_valuation_id
        FROM portfolio_irr_values
        WHERE portfolio_id = $1
        ORDER BY date
        """,
        portfolio_id
    )

    orphaned = [r for r in records if r['portfolio_valuation_id'] is None]

    print(f"\n[DATA] Portfolio IRR Records:")
    print(f"   Total IRR records: {len(records)}")
    print(f"   Orphaned records (NULL valuation_id): {len(orphaned)}")
    print(f"   Linked records: {len(records) - len(orphaned)}")

    return orphaned


async def check_fund_valuations(db, fund_ids: list, date_obj):
    """Check what fund valuations exist for a given date"""
    valuations = await db.fetch(
        """
        SELECT portfolio_fund_id, valuation, valuation_date
        FROM portfolio_fund_valuations
        WHERE portfolio_fund_id = ANY($1::int[])
        AND valuation_date = $2
        """,
        fund_ids, date_obj
    )

    return valuations


async def backfill_single_record(db, irr_record, fund_ids, dry_run: bool):
    """Backfill a single orphaned IRR record"""
    irr_id = irr_record['id']
    portfolio_id = irr_record['portfolio_id']
    date_obj = irr_record['date']
    irr_result = irr_record['irr_result']

    print(f"\n{'='*80}")
    print(f"Processing IRR Record ID: {irr_id}")
    print(f"  Portfolio: {portfolio_id}")
    print(f"  Date: {date_obj}")
    print(f"  IRR: {irr_result}%")
    print(f"{'='*80}")

    # Check fund valuations
    fund_valuations = await check_fund_valuations(db, fund_ids, date_obj)

    print(f"\n[DATA] Fund Valuations on {date_obj}:")
    if not fund_valuations:
        print(f"   [ERROR] No fund valuations found!")
        return False

    print(f"   Found {len(fund_valuations)} fund valuations:")
    total_valuation = 0
    for fv in fund_valuations:
        val = float(fv['valuation'])
        total_valuation += val
        print(f"   * Fund {fv['portfolio_fund_id']}: £{val:,.2f}")

    print(f"\n   [MONEY] Total Portfolio Valuation: £{total_valuation:,.2f}")

    # Check if portfolio valuation already exists
    existing_pv = await db.fetchrow(
        "SELECT id, valuation FROM portfolio_valuations WHERE portfolio_id = $1 AND valuation_date = $2",
        portfolio_id, date_obj
    )

    print(f"\n[NOTE] Portfolio Valuation Record:")
    if existing_pv:
        print(f"   Exists: ID {existing_pv['id']}, Current Value: £{float(existing_pv['valuation']):,.2f}")
        if abs(float(existing_pv['valuation']) - total_valuation) > 0.01:
            print(f"   [WARNING]  Value mismatch! Will update to £{total_valuation:,.2f}")
            if not dry_run:
                await db.execute(
                    "UPDATE portfolio_valuations SET valuation = $1 WHERE id = $2",
                    total_valuation, existing_pv['id']
                )
                print(f"   [OK] Updated portfolio_valuation ID {existing_pv['id']}")
            else:
                print(f"   [DRY RUN] [DRY RUN] Would update portfolio_valuation ID {existing_pv['id']}")
        else:
            print(f"   [DONE] Value matches calculated total")

        valuation_id = existing_pv['id']
    else:
        print(f"   Does not exist - will create new record")
        if not dry_run:
            new_pv = await db.fetchrow(
                "INSERT INTO portfolio_valuations (portfolio_id, valuation_date, valuation) VALUES ($1, $2, $3) RETURNING id",
                portfolio_id, date_obj, total_valuation
            )
            valuation_id = new_pv['id']
            print(f"   [OK] Created portfolio_valuation ID {valuation_id}")
        else:
            valuation_id = -1
            print(f"   [DRY RUN] [DRY RUN] Would create new portfolio_valuation")

    # Link IRR to portfolio valuation
    print(f"\n[LINK] Linking IRR to Portfolio Valuation:")
    if not dry_run:
        await db.execute(
            "UPDATE portfolio_irr_values SET portfolio_valuation_id = $1 WHERE id = $2",
            valuation_id, irr_id
        )
        print(f"   [OK] Linked portfolio_irr_values ID {irr_id} to portfolio_valuation ID {valuation_id}")
    else:
        print(f"   [DRY RUN] [DRY RUN] Would link portfolio_irr_values ID {irr_id} to portfolio_valuation ID {valuation_id}")

    return True


async def main():
    """Main execution"""
    import argparse

    parser = argparse.ArgumentParser(description='Test portfolio valuation backfill for a specific product')
    parser.add_argument('--product-id', type=int, required=True, help='Product ID to test with')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')

    args = parser.parse_args()

    print("="*80)
    print("Portfolio Valuation Test Script")
    print("="*80)

    if args.dry_run:
        print("[DRY RUN] MODE - No changes will be made\n")
    else:
        print("[LIVE MODE] - Changes will be made to the database\n")

    # Connect to database
    db = await asyncpg.connect(DATABASE_URL)
    print(f"[OK] Connected to database\n")

    try:
        # Find portfolio for product
        portfolio_id = await find_portfolio_for_product(db, args.product_id)
        if not portfolio_id:
            return

        print()

        # Get portfolio details
        funds = await get_portfolio_details(db, portfolio_id)
        fund_ids = [f['id'] for f in funds]

        # Find orphaned records
        orphaned_records = await find_orphaned_irr_records(db, portfolio_id)

        if not orphaned_records:
            print("\n[OK] No orphaned records found for this portfolio!")

            # Show existing linked records
            all_records = await db.fetch(
                "SELECT id, date, irr_result, portfolio_valuation_id FROM portfolio_irr_values WHERE portfolio_id = $1 ORDER BY date",
                portfolio_id
            )
            if all_records:
                print(f"\n[LIST] All Portfolio IRR Records ({len(all_records)}):")
                for r in all_records:
                    status = "[DONE] Linked" if r['portfolio_valuation_id'] else "[FAIL] Orphaned"
                    print(f"   {status} | ID {r['id']} | Date: {r['date']} | IRR: {r['irr_result']}% | Valuation ID: {r['portfolio_valuation_id']}")
            return

        # Show orphaned records
        print(f"\n[LIST] Orphaned Records to Process:")
        for i, r in enumerate(orphaned_records, 1):
            print(f"   {i}. ID {r['id']} | Date: {r['date']} | IRR: {r['irr_result']}%")

        # Process each orphaned record
        print(f"\n{'='*80}")
        print("STARTING BACKFILL")
        print(f"{'='*80}")

        success_count = 0
        for record in orphaned_records:
            result = await backfill_single_record(db, record, fund_ids, args.dry_run)
            if result:
                success_count += 1

        # Summary
        print(f"\n{'='*80}")
        print("SUMMARY")
        print(f"{'='*80}")
        print(f"Orphaned records found: {len(orphaned_records)}")
        print(f"Successfully processed: {success_count}")

        if args.dry_run:
            print("\n[DRY RUN] DRY RUN COMPLETE - No changes were made")
            print("Run without --dry-run to apply changes")
        else:
            print("\n[OK] BACKFILL COMPLETE")

    except Exception as e:
        print(f"\n[ERROR] Error: {str(e)}")
        import traceback
        traceback.print_exc()

    finally:
        await db.close()
        print("\n[OK] Disconnected from database")


if __name__ == "__main__":
    asyncio.run(main())
