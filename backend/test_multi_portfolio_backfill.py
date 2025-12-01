"""
Test script to backfill portfolio valuations for multiple products' portfolios.

This script finds the portfolios linked to multiple products and backfills their portfolio valuations.

Usage:
    python test_multi_portfolio_backfill.py --product-ids 435 444 [--dry-run]
"""

import asyncio
import asyncpg
import os
import sys
from datetime import datetime
from typing import Optional, List, Set

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.database import DATABASE_URL


async def find_portfolios_for_products(db, product_ids: List[int]):
    """Find unique portfolio IDs for given products"""
    print("="*80)
    print("FINDING PORTFOLIOS FOR PRODUCTS")
    print("="*80)

    portfolio_map = {}
    unique_portfolios = set()

    for product_id in product_ids:
        product = await db.fetchrow(
            "SELECT id, product_name, portfolio_id FROM client_products WHERE id = $1",
            product_id
        )

        if not product:
            print(f"[ERROR] Product {product_id} not found")
            continue

        portfolio_id = product['portfolio_id']
        product_name = product['product_name']

        if portfolio_id:
            portfolio_map[product_id] = {
                'portfolio_id': portfolio_id,
                'product_name': product_name
            }
            unique_portfolios.add(portfolio_id)
            print(f"[OK] Product {product_id} ({product_name}) -> Portfolio {portfolio_id}")
        else:
            print(f"[WARNING] Product {product_id} ({product_name}) has no portfolio")

    print(f"\n[DATA] Found {len(unique_portfolios)} unique portfolio(s) across {len(product_ids)} products")
    return list(unique_portfolios), portfolio_map


async def get_portfolio_details(db, portfolio_id: int):
    """Get portfolio details"""
    portfolio = await db.fetchrow(
        "SELECT id, portfolio_name FROM portfolios WHERE id = $1",
        portfolio_id
    )

    if portfolio:
        print(f"\n--- Portfolio {portfolio_id}: {portfolio['portfolio_name']} ---")

    # Get portfolio funds count
    funds = await db.fetch(
        "SELECT id FROM portfolio_funds WHERE portfolio_id = $1",
        portfolio_id
    )

    # Get products using this portfolio
    products = await db.fetch(
        "SELECT id, product_name FROM client_products WHERE portfolio_id = $1",
        portfolio_id
    )

    print(f"   Portfolio Funds: {len(funds)}")
    print(f"   Products using this portfolio: {len(products)}")
    if products:
        for p in products:
            print(f"      * Product {p['id']}: {p['product_name']}")

    return funds, products


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
            print(f"   [WARNING] Value mismatch! Will update to £{total_valuation:,.2f}")
            if not dry_run:
                await db.execute(
                    "UPDATE portfolio_valuations SET valuation = $1 WHERE id = $2",
                    total_valuation, existing_pv['id']
                )
                print(f"   [OK] Updated portfolio_valuation ID {existing_pv['id']}")
            else:
                print(f"   [DRY RUN] Would update portfolio_valuation ID {existing_pv['id']}")
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
            print(f"   [DRY RUN] Would create new portfolio_valuation")

    # Link IRR to portfolio valuation
    print(f"\n[LINK] Linking IRR to Portfolio Valuation:")
    if not dry_run:
        await db.execute(
            "UPDATE portfolio_irr_values SET portfolio_valuation_id = $1 WHERE id = $2",
            valuation_id, irr_id
        )
        print(f"   [OK] Linked portfolio_irr_values ID {irr_id} to portfolio_valuation ID {valuation_id}")
    else:
        print(f"   [DRY RUN] Would link portfolio_irr_values ID {irr_id} to portfolio_valuation ID {valuation_id}")

    return True


async def main():
    """Main execution"""
    import argparse

    parser = argparse.ArgumentParser(description='Test portfolio valuation backfill for multiple products')
    parser.add_argument('--product-ids', type=int, nargs='+', required=True, help='Product IDs to test with')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')

    args = parser.parse_args()

    print("="*80)
    print("Multi-Portfolio Valuation Test Script")
    print("="*80)

    if args.dry_run:
        print("[DRY RUN] MODE - No changes will be made\n")
    else:
        print("[LIVE MODE] - Changes will be made to the database\n")

    # Connect to database
    db = await asyncpg.connect(DATABASE_URL)
    print(f"[OK] Connected to database\n")

    try:
        # Find portfolios for products
        portfolio_ids, portfolio_map = await find_portfolios_for_products(db, args.product_ids)

        if not portfolio_ids:
            print("\n[ERROR] No portfolios found for the given products!")
            return

        # Process each unique portfolio
        total_orphaned = 0
        total_processed = 0

        for portfolio_id in portfolio_ids:
            print(f"\n{'='*80}")
            print(f"PROCESSING PORTFOLIO {portfolio_id}")
            print(f"{'='*80}")

            # Get portfolio details
            funds, products = await get_portfolio_details(db, portfolio_id)
            fund_ids = [f['id'] for f in funds]

            # Find orphaned records
            orphaned_records = await find_orphaned_irr_records(db, portfolio_id)
            total_orphaned += len(orphaned_records)

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
                continue

            # Show orphaned records
            print(f"\n[LIST] Orphaned Records to Process:")
            for i, r in enumerate(orphaned_records, 1):
                print(f"   {i}. ID {r['id']} | Date: {r['date']} | IRR: {r['irr_result']}%")

            # Process each orphaned record
            print(f"\n{'='*80}")
            print(f"STARTING BACKFILL FOR PORTFOLIO {portfolio_id}")
            print(f"{'='*80}")

            success_count = 0
            for record in orphaned_records:
                result = await backfill_single_record(db, record, fund_ids, args.dry_run)
                if result:
                    success_count += 1
                    total_processed += 1

            print(f"\n[DATA] Portfolio {portfolio_id} Summary:")
            print(f"   Orphaned records: {len(orphaned_records)}")
            print(f"   Successfully processed: {success_count}")

        # Overall summary
        print(f"\n{'='*80}")
        print("OVERALL SUMMARY")
        print(f"{'='*80}")
        print(f"Products tested: {len(args.product_ids)}")
        print(f"Unique portfolios: {len(portfolio_ids)}")
        print(f"Total orphaned records found: {total_orphaned}")
        print(f"Total successfully processed: {total_processed}")

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
