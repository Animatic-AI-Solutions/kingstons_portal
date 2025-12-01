"""
Backfill script to populate orphaned portfolio IRR records with portfolio valuations.

This script:
1. Finds all portfolio_irr_values records with NULL portfolio_valuation_id
2. For each record, calculates the portfolio valuation by summing fund valuations on that date
3. Creates or updates the portfolio_valuation record
4. Links the portfolio_irr_value to the portfolio_valuation

Usage:
    python backfill_portfolio_valuations.py [--dry-run] [--limit N]

Options:
    --dry-run    Show what would be done without making changes
    --limit N    Only process N records (useful for testing)
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


class PortfolioValuationBackfill:
    def __init__(self, dry_run: bool = False, limit: Optional[int] = None):
        self.dry_run = dry_run
        self.limit = limit
        self.db = None
        self.stats = {
            'orphaned_records': 0,
            'valuations_created': 0,
            'valuations_updated': 0,
            'links_updated': 0,
            'errors': 0,
            'zero_valuations': 0
        }

    async def connect(self):
        """Connect to the database"""
        self.db = await asyncpg.connect(DATABASE_URL)
        print(f"[OK] Connected to database")

    async def disconnect(self):
        """Disconnect from the database"""
        if self.db:
            await self.db.close()
            print(f"[OK] Disconnected from database")

    async def find_orphaned_records(self):
        """Find all portfolio_irr_values with NULL portfolio_valuation_id"""
        query = """
            SELECT id, portfolio_id, date, irr_result
            FROM portfolio_irr_values
            WHERE portfolio_valuation_id IS NULL
            ORDER BY portfolio_id, date
        """

        if self.limit:
            query += f" LIMIT {self.limit}"

        records = await self.db.fetch(query)
        self.stats['orphaned_records'] = len(records)

        print(f"\n[DATA] Found {len(records)} orphaned portfolio IRR records")
        return records

    async def get_portfolio_funds(self, portfolio_id: int):
        """Get all portfolio fund IDs for a portfolio"""
        funds = await self.db.fetch(
            "SELECT id FROM portfolio_funds WHERE portfolio_id = $1",
            portfolio_id
        )
        return [f['id'] for f in funds]

    async def calculate_portfolio_valuation(self, portfolio_id: int, date_obj) -> float:
        """Calculate portfolio valuation by summing fund valuations on the given date"""
        # Get all portfolio funds
        fund_ids = await self.get_portfolio_funds(portfolio_id)

        if not fund_ids:
            print(f"  [WARNING]  No portfolio funds found for portfolio {portfolio_id}")
            return 0.0

        # Get fund valuations for this date
        fund_valuations = await self.db.fetch(
            """
            SELECT portfolio_fund_id, valuation
            FROM portfolio_fund_valuations
            WHERE portfolio_fund_id = ANY($1::int[])
            AND valuation_date = $2
            """,
            fund_ids, date_obj
        )

        if not fund_valuations:
            print(f"  [WARNING]  No fund valuations found for portfolio {portfolio_id} on {date_obj}")
            return 0.0

        total = sum(float(fv['valuation']) for fv in fund_valuations)
        print(f"  [DONE] Calculated valuation: £{total:,.2f} from {len(fund_valuations)} funds")

        return total

    async def create_or_update_portfolio_valuation(self, portfolio_id: int, date_obj, valuation: float) -> Optional[int]:
        """Create or update portfolio_valuation record, return the ID"""

        # Check if portfolio valuation already exists
        existing = await self.db.fetchrow(
            "SELECT id FROM portfolio_valuations WHERE portfolio_id = $1 AND valuation_date = $2",
            portfolio_id, date_obj
        )

        if existing:
            # Update existing record
            if not self.dry_run:
                await self.db.execute(
                    "UPDATE portfolio_valuations SET valuation = $1 WHERE id = $2",
                    valuation, existing['id']
                )
            print(f"  [DONE] {'Would update' if self.dry_run else 'Updated'} existing portfolio_valuation ID {existing['id']}")
            self.stats['valuations_updated'] += 1
            return existing['id']
        else:
            # Create new record
            if not self.dry_run:
                new_record = await self.db.fetchrow(
                    "INSERT INTO portfolio_valuations (portfolio_id, valuation_date, valuation) VALUES ($1, $2, $3) RETURNING id",
                    portfolio_id, date_obj, valuation
                )
                valuation_id = new_record['id']
            else:
                valuation_id = -1  # Placeholder for dry run

            print(f"  [DONE] {'Would create' if self.dry_run else 'Created'} new portfolio_valuation ID {valuation_id if not self.dry_run else 'N/A (dry run)'}")
            self.stats['valuations_created'] += 1
            return valuation_id

    async def link_irr_to_valuation(self, irr_id: int, valuation_id: int):
        """Update portfolio_irr_values to link to portfolio_valuation"""
        if not self.dry_run:
            await self.db.execute(
                "UPDATE portfolio_irr_values SET portfolio_valuation_id = $1 WHERE id = $2",
                valuation_id, irr_id
            )
        print(f"  [DONE] {'Would link' if self.dry_run else 'Linked'} portfolio_irr_values ID {irr_id} to portfolio_valuation ID {valuation_id}")
        self.stats['links_updated'] += 1

    async def process_orphaned_record(self, record):
        """Process a single orphaned portfolio IRR record"""
        irr_id = record['id']
        portfolio_id = record['portfolio_id']
        date_obj = record['date']
        irr_result = record['irr_result']

        print(f"\n[PROCESS] Processing portfolio_irr_values ID {irr_id}")
        print(f"  Portfolio: {portfolio_id}, Date: {date_obj}, IRR: {irr_result}%")

        try:
            # Calculate portfolio valuation
            valuation = await self.calculate_portfolio_valuation(portfolio_id, date_obj)

            if valuation == 0:
                print(f"  [WARNING]  Portfolio valuation is £0 - will create record anyway for consistency")
                self.stats['zero_valuations'] += 1

            # Create or update portfolio valuation
            valuation_id = await self.create_or_update_portfolio_valuation(
                portfolio_id, date_obj, valuation
            )

            if valuation_id:
                # Link the IRR record to the valuation
                await self.link_irr_to_valuation(irr_id, valuation_id)

        except Exception as e:
            print(f"  [ERROR] Error processing record: {str(e)}")
            self.stats['errors'] += 1

    async def run(self):
        """Main execution function"""
        print("=" * 80)
        print("Portfolio Valuation Backfill Script")
        print("=" * 80)

        if self.dry_run:
            print("[DRY RUN] DRY RUN MODE - No changes will be made")

        if self.limit:
            print(f"[DATA] Processing limit: {self.limit} records")

        try:
            await self.connect()

            # Find orphaned records
            orphaned_records = await self.find_orphaned_records()

            if not orphaned_records:
                print("\n[OK] No orphaned records found!")
                return

            # Process each record
            for i, record in enumerate(orphaned_records, 1):
                print(f"\n{'-' * 80}")
                print(f"Processing record {i} of {len(orphaned_records)}")
                await self.process_orphaned_record(record)

            # Print summary
            print("\n" + "=" * 80)
            print("SUMMARY")
            print("=" * 80)
            print(f"Orphaned records found:        {self.stats['orphaned_records']}")
            print(f"Portfolio valuations created:  {self.stats['valuations_created']}")
            print(f"Portfolio valuations updated:  {self.stats['valuations_updated']}")
            print(f"IRR links updated:             {self.stats['links_updated']}")
            print(f"Zero valuations encountered:   {self.stats['zero_valuations']}")
            print(f"Errors:                        {self.stats['errors']}")

            if self.dry_run:
                print("\n[DRY RUN] DRY RUN COMPLETE - No changes were made")
                print("Run without --dry-run to apply changes")
            else:
                print("\n[OK] BACKFILL COMPLETE")

        except Exception as e:
            print(f"\n[ERROR] Fatal error: {str(e)}")
            import traceback
            traceback.print_exc()
        finally:
            await self.disconnect()


async def main():
    """Parse arguments and run the backfill"""
    import argparse

    parser = argparse.ArgumentParser(
        description='Backfill portfolio valuations for orphaned portfolio IRR records'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be done without making changes'
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Only process N records (useful for testing)'
    )

    args = parser.parse_args()

    backfill = PortfolioValuationBackfill(
        dry_run=args.dry_run,
        limit=args.limit
    )

    await backfill.run()


if __name__ == "__main__":
    asyncio.run(main())
