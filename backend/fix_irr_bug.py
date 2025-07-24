#!/usr/bin/env python3
"""
Fix script for the portfolio IRR valuation_id bug.

This script repairs orphaned portfolio_irr_values records by:
1. Linking them to existing portfolio valuations where available
2. Creating missing portfolio valuations where needed
3. Updating the IRR creation logic to prevent future issues
"""

import os
import sys
from datetime import datetime
import logging
from typing import List, Dict, Any
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_db_connection():
    """Get Supabase database connection"""
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        logger.error("Missing SUPABASE_URL or SUPABASE_KEY environment variables")
        logger.error("Please set your environment variables in the .env file")
        sys.exit(1)
    
    return create_client(supabase_url, supabase_key)

def fix_orphaned_irr_with_existing_valuations(db: Client, dry_run: bool = True) -> Dict[str, Any]:
    """
    Fix orphaned IRR records that have corresponding portfolio valuations
    """
    logger.info("🔧 Fixing orphaned IRR records with existing portfolio valuations...")
    
    # Get orphaned IRR records
    orphaned_records = db.table("portfolio_irr_values")\
        .select("*")\
        .is_("portfolio_valuation_id", "null")\
        .execute()
    
    fixed_count = 0
    skip_count = 0
    error_count = 0
    
    for record in orphaned_records.data:
        try:
            portfolio_id = record["portfolio_id"]
            irr_date = record["date"][:10]  # Extract YYYY-MM-DD
            
            # Look for existing portfolio valuation
            valuation_result = db.table("portfolio_valuations")\
                .select("id")\
                .eq("portfolio_id", portfolio_id)\
                .eq("valuation_date", irr_date)\
                .execute()
            
            if valuation_result.data:
                valuation_id = valuation_result.data[0]["id"]
                
                if not dry_run:
                    # Update the IRR record with the valuation ID
                    update_result = db.table("portfolio_irr_values")\
                        .update({"portfolio_valuation_id": valuation_id})\
                        .eq("id", record["id"])\
                        .execute()
                    
                    if update_result.data:
                        logger.info(f"✅ Fixed IRR record {record['id']} -> portfolio_valuation {valuation_id}")
                        fixed_count += 1
                    else:
                        logger.error(f"❌ Failed to update IRR record {record['id']}")
                        error_count += 1
                else:
                    logger.info(f"🔄 Would fix IRR record {record['id']} -> portfolio_valuation {valuation_id}")
                    fixed_count += 1
            else:
                skip_count += 1
                
        except Exception as e:
            logger.error(f"❌ Error fixing IRR record {record['id']}: {str(e)}")
            error_count += 1
    
    logger.info(f"📊 Fix summary: {fixed_count} fixed, {skip_count} skipped (no valuation), {error_count} errors")
    
    return {
        "fixed_count": fixed_count,
        "skip_count": skip_count,
        "error_count": error_count
    }

def create_missing_portfolio_valuations(db: Client, dry_run: bool = True) -> Dict[str, Any]:
    """
    Create missing portfolio valuations for orphaned IRR records
    """
    logger.info("📊 Creating missing portfolio valuations...")
    
    # Get orphaned IRR records that still don't have valuations
    orphaned_records = db.table("portfolio_irr_values")\
        .select("*")\
        .is_("portfolio_valuation_id", "null")\
        .execute()
    
    created_count = 0
    error_count = 0
    
    for record in orphaned_records.data:
        try:
            portfolio_id = record["portfolio_id"]
            irr_date = record["date"][:10]  # Extract YYYY-MM-DD
            
            # Check if valuation already exists (might have been created by previous fix)
            valuation_check = db.table("portfolio_valuations")\
                .select("id")\
                .eq("portfolio_id", portfolio_id)\
                .eq("valuation_date", irr_date)\
                .execute()
            
            if not valuation_check.data:
                # Calculate portfolio valuation by summing fund valuations
                fund_valuations = db.table("portfolio_fund_valuations")\
                    .select("valuation, portfolio_fund_id")\
                    .eq("valuation_date", irr_date)\
                    .execute()
                
                # Get portfolio funds for this portfolio
                portfolio_funds = db.table("portfolio_funds")\
                    .select("id")\
                    .eq("portfolio_id", portfolio_id)\
                    .execute()
                
                portfolio_fund_ids = [pf["id"] for pf in portfolio_funds.data]
                
                # Sum valuations for funds in this portfolio
                total_valuation = 0
                for fv in fund_valuations.data:
                    if fv["portfolio_fund_id"] in portfolio_fund_ids:
                        total_valuation += float(fv["valuation"])
                
                if total_valuation > 0:
                    valuation_data = {
                        "portfolio_id": portfolio_id,
                        "valuation_date": irr_date,
                        "valuation": total_valuation
                    }
                    
                    if not dry_run:
                        # Create the portfolio valuation
                        valuation_result = db.table("portfolio_valuations")\
                            .insert(valuation_data)\
                            .execute()
                        
                        if valuation_result.data:
                            valuation_id = valuation_result.data[0]["id"]
                            
                            # Update the IRR record with the new valuation ID
                            update_result = db.table("portfolio_irr_values")\
                                .update({"portfolio_valuation_id": valuation_id})\
                                .eq("id", record["id"])\
                                .execute()
                            
                            if update_result.data:
                                logger.info(f"✅ Created valuation {valuation_id} and linked IRR record {record['id']}")
                                created_count += 1
                            else:
                                logger.error(f"❌ Created valuation but failed to link IRR record {record['id']}")
                                error_count += 1
                        else:
                            logger.error(f"❌ Failed to create portfolio valuation for portfolio {portfolio_id}")
                            error_count += 1
                    else:
                        logger.info(f"🔄 Would create valuation for portfolio {portfolio_id}, date {irr_date}, value {total_valuation}")
                        created_count += 1
                else:
                    logger.warning(f"⚠️ No fund valuations found for portfolio {portfolio_id} on {irr_date}")
                    
        except Exception as e:
            logger.error(f"❌ Error creating valuation for IRR record {record['id']}: {str(e)}")
            error_count += 1
    
    logger.info(f"📊 Creation summary: {created_count} created, {error_count} errors")
    
    return {
        "created_count": created_count,
        "error_count": error_count
    }

def add_validation_to_irr_creation(dry_run: bool = True):
    """
    Provide code patches to prevent future orphaned IRR records
    """
    logger.info("🔒 Generating validation patches for IRR creation logic...")
    
    patch1 = """
# PATCH 1: holding_activity_logs.py around line 448-460
# BEFORE:
portfolio_valuation_id = portfolio_valuation_result.data[0]["id"] if portfolio_valuation_result.data else None

portfolio_irr_data = {
    "portfolio_id": portfolio_id,
    "irr_result": float(portfolio_irr_percentage),
    "date": common_date,
    "portfolio_valuation_id": portfolio_valuation_id
}

db.table("portfolio_irr_values").insert(portfolio_irr_data).execute()

# AFTER:
portfolio_valuation_id = portfolio_valuation_result.data[0]["id"] if portfolio_valuation_result.data else None

# VALIDATION: Don't create IRR without portfolio valuation
if portfolio_valuation_id is None:
    logger.warning(f"No portfolio valuation found for portfolio {portfolio_id} on {common_date}. Creating portfolio valuation first...")
    
    # Calculate portfolio valuation by summing fund valuations
    total_valuation = await calculate_portfolio_valuation_for_date(portfolio_id, common_date, db)
    
    if total_valuation > 0:
        portfolio_valuation_data = {
            "portfolio_id": portfolio_id,
            "valuation_date": common_date,
            "valuation": total_valuation
        }
        
        valuation_create_result = db.table("portfolio_valuations").insert(portfolio_valuation_data).execute()
        if valuation_create_result.data:
            portfolio_valuation_id = valuation_create_result.data[0]["id"]
            logger.info(f"Created missing portfolio valuation {portfolio_valuation_id} for portfolio {portfolio_id}")
        else:
            logger.error(f"Failed to create portfolio valuation for portfolio {portfolio_id} on {common_date}")
            continue  # Skip IRR creation if we can't create valuation
    else:
        logger.error(f"Cannot calculate portfolio valuation for portfolio {portfolio_id} on {common_date} - no fund valuations found")
        continue  # Skip IRR creation

portfolio_irr_data = {
    "portfolio_id": portfolio_id,
    "irr_result": float(portfolio_irr_percentage),
    "date": common_date,
    "portfolio_valuation_id": portfolio_valuation_id  # Now guaranteed to be not None
}

db.table("portfolio_irr_values").insert(portfolio_irr_data).execute()
"""
    
    patch2 = """
# PATCH 2: Add helper function to calculate portfolio valuation
async def calculate_portfolio_valuation_for_date(portfolio_id: int, date: str, db) -> float:
    '''
    Calculate total portfolio valuation for a specific date by summing fund valuations
    '''
    try:
        # Get all portfolio funds for this portfolio
        portfolio_funds = db.table("portfolio_funds")\\
            .select("id")\\
            .eq("portfolio_id", portfolio_id)\\
            .execute()
        
        if not portfolio_funds.data:
            return 0.0
        
        fund_ids = [pf["id"] for pf in portfolio_funds.data]
        
        # Get fund valuations for this date
        fund_valuations = db.table("portfolio_fund_valuations")\\
            .select("valuation")\\
            .in_("portfolio_fund_id", fund_ids)\\
            .eq("valuation_date", date)\\
            .execute()
        
        total_valuation = sum(float(fv["valuation"]) for fv in fund_valuations.data)
        return total_valuation
        
    except Exception as e:
        logger.error(f"Error calculating portfolio valuation for {portfolio_id} on {date}: {str(e)}")
        return 0.0
"""
    
    if not dry_run:
        logger.info("💾 Writing patches to fix_irr_patches.txt...")
        with open("fix_irr_patches.txt", "w") as f:
            f.write("IRR CREATION VALIDATION PATCHES\n")
            f.write("=" * 50 + "\n\n")
            f.write(patch1)
            f.write("\n\n")
            f.write(patch2)
        logger.info("✅ Patches written to fix_irr_patches.txt")
    else:
        logger.info("🔄 Would write validation patches to fix_irr_patches.txt")

def main():
    """Main fix function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Fix portfolio IRR valuation_id bug")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
    parser.add_argument("--fix-existing", action="store_true", help="Fix orphaned IRR records with existing valuations")
    parser.add_argument("--create-missing", action="store_true", help="Create missing portfolio valuations")
    parser.add_argument("--generate-patches", action="store_true", help="Generate code patches")
    parser.add_argument("--all", action="store_true", help="Run all fixes")
    
    args = parser.parse_args()
    
    if not any([args.fix_existing, args.create_missing, args.generate_patches, args.all]):
        logger.error("Please specify at least one action: --fix-existing, --create-missing, --generate-patches, or --all")
        sys.exit(1)
    
    dry_run = args.dry_run
    
    if dry_run:
        logger.info("🔄 Running in DRY RUN mode - no changes will be made")
    else:
        logger.info("⚠️ Running in LIVE mode - changes will be made to the database")
        response = input("Are you sure you want to proceed? (yes/no): ")
        if response.lower() != "yes":
            logger.info("❌ Aborted by user")
            sys.exit(0)
    
    logger.info("🚀 Starting portfolio IRR bug fix...")
    logger.info("=" * 60)
    
    try:
        results = {}
        
        if args.fix_existing or args.all:
            db = get_db_connection()
            results["fix_existing"] = fix_orphaned_irr_with_existing_valuations(db, dry_run)
        
        if args.create_missing or args.all:
            if "db" not in locals():
                db = get_db_connection()
            results["create_missing"] = create_missing_portfolio_valuations(db, dry_run)
        
        if args.generate_patches or args.all:
            add_validation_to_irr_creation(dry_run)
            results["patches_generated"] = True
        
        # Final summary
        logger.info("\n" + "=" * 60)
        logger.info("📋 FIX SUMMARY")
        logger.info("=" * 60)
        
        if "fix_existing" in results:
            fix_stats = results["fix_existing"]
            logger.info(f"🔧 Fixed existing: {fix_stats['fixed_count']} records")
        
        if "create_missing" in results:
            create_stats = results["create_missing"]
            logger.info(f"📊 Created missing: {create_stats['created_count']} valuations")
        
        if results.get("patches_generated"):
            logger.info("🔒 Generated validation patches")
        
        if dry_run:
            logger.info("\n🔄 This was a DRY RUN - no actual changes were made")
            logger.info("Run again without --dry-run to apply the fixes")
        else:
            logger.info("\n✅ Fix complete!")
        
    except Exception as e:
        logger.error(f"❌ Error during fix: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 