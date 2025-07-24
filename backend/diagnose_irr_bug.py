#!/usr/bin/env python3
"""
Diagnostic script for the portfolio IRR valuation_id bug.

This script analyzes orphaned portfolio_irr_values records that don't have 
a corresponding portfolio_valuation_id and provides insights into the scope
and patterns of the issue.
"""

import os
import sys
from datetime import datetime, timedelta
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

def analyze_orphaned_irr_records(db: Client) -> Dict[str, Any]:
    """
    Analyze portfolio IRR records that don't have a portfolio_valuation_id
    """
    logger.info("🔍 Analyzing orphaned portfolio IRR records...")
    
    # Query 1: Find all orphaned IRR records
    orphaned_records = db.table("portfolio_irr_values")\
        .select("*")\
        .is_("portfolio_valuation_id", "null")\
        .order("created_at", desc=True)\
        .execute()
    
    orphaned_count = len(orphaned_records.data) if orphaned_records.data else 0
    logger.info(f"📊 Found {orphaned_count} orphaned portfolio IRR records")
    
    if orphaned_count == 0:
        return {"orphaned_count": 0, "analysis": "No orphaned records found"}
    
    # Query 2: Get total IRR records for comparison
    total_records = db.table("portfolio_irr_values")\
        .select("id", count="exact")\
        .execute()
    
    total_count = total_records.count if total_records.count else 0
    orphaned_percentage = (orphaned_count / total_count * 100) if total_count > 0 else 0
    
    logger.info(f"📊 Total portfolio IRR records: {total_count}")
    logger.info(f"📊 Orphaned percentage: {orphaned_percentage:.2f}%")
    
    # Analyze patterns in orphaned records
    analysis = {
        "orphaned_count": orphaned_count,
        "total_count": total_count,
        "orphaned_percentage": round(orphaned_percentage, 2),
        "affected_portfolios": set(),
        "date_patterns": {},
        "recent_records": [],
        "creation_patterns": {}
    }
    
    # Analyze by portfolio
    for record in orphaned_records.data:
        portfolio_id = record["portfolio_id"]
        analysis["affected_portfolios"].add(portfolio_id)
        
        # Analyze date patterns
        irr_date = record["date"][:10]  # Extract YYYY-MM-DD
        if irr_date not in analysis["date_patterns"]:
            analysis["date_patterns"][irr_date] = 0
        analysis["date_patterns"][irr_date] += 1
        
        # Track recent records (last 30 days)
        created_at = datetime.fromisoformat(record["created_at"].replace('Z', '+00:00'))
        if created_at > datetime.now().replace(tzinfo=created_at.tzinfo) - timedelta(days=30):
            analysis["recent_records"].append({
                "id": record["id"],
                "portfolio_id": portfolio_id,
                "date": irr_date,
                "created_at": record["created_at"],
                "irr_result": record["irr_result"]
            })
        
        # Track creation date patterns
        created_date = created_at.date().isoformat()
        if created_date not in analysis["creation_patterns"]:
            analysis["creation_patterns"][created_date] = 0
        analysis["creation_patterns"][created_date] += 1
    
    analysis["affected_portfolios"] = list(analysis["affected_portfolios"])
    
    logger.info(f"📊 Affected portfolios: {len(analysis['affected_portfolios'])}")
    logger.info(f"📊 Recent orphaned records (last 30 days): {len(analysis['recent_records'])}")
    
    return analysis

def check_missing_portfolio_valuations(db: Client, analysis: Dict[str, Any]) -> Dict[str, Any]:
    """
    Check if portfolio valuations exist for the dates where IRR records are orphaned
    """
    logger.info("🔍 Checking for missing portfolio valuations...")
    
    # Get a sample of orphaned records to check
    orphaned_sample = db.table("portfolio_irr_values")\
        .select("portfolio_id, date")\
        .is_("portfolio_valuation_id", "null")\
        .limit(100)\
        .execute()
    
    missing_valuations = []
    existing_valuations = []
    
    for record in orphaned_sample.data:
        portfolio_id = record["portfolio_id"]
        irr_date = record["date"][:10]  # Extract YYYY-MM-DD
        
        # Check if portfolio valuation exists for this portfolio and date
        valuation_check = db.table("portfolio_valuations")\
            .select("id, valuation")\
            .eq("portfolio_id", portfolio_id)\
            .eq("valuation_date", irr_date)\
            .execute()
        
        if valuation_check.data:
            existing_valuations.append({
                "portfolio_id": portfolio_id,
                "date": irr_date,
                "valuation_id": valuation_check.data[0]["id"],
                "valuation": valuation_check.data[0]["valuation"]
            })
        else:
            missing_valuations.append({
                "portfolio_id": portfolio_id,
                "date": irr_date
            })
    
    logger.info(f"📊 Sampled {len(orphaned_sample.data)} orphaned records")
    logger.info(f"📊 Found {len(existing_valuations)} cases where portfolio valuation EXISTS but IRR record is orphaned")
    logger.info(f"📊 Found {len(missing_valuations)} cases where portfolio valuation is genuinely MISSING")
    
    return {
        "existing_valuations_count": len(existing_valuations),
        "missing_valuations_count": len(missing_valuations),
        "existing_valuations": existing_valuations[:10],  # Sample for display
        "missing_valuations": missing_valuations[:10]     # Sample for display
    }

def check_irr_creation_sources(db: Client) -> Dict[str, Any]:
    """
    Analyze when orphaned IRR records were created to identify the source
    """
    logger.info("🔍 Analyzing IRR creation timing patterns...")
    
    # Get recent orphaned records with creation timestamps
    recent_orphaned = db.table("portfolio_irr_values")\
        .select("*")\
        .is_("portfolio_valuation_id", "null")\
        .gte("created_at", (datetime.now() - timedelta(days=7)).isoformat())\
        .order("created_at", desc=True)\
        .execute()
    
    logger.info(f"📊 Found {len(recent_orphaned.data)} orphaned records created in the last 7 days")
    
    creation_analysis = {
        "recent_orphaned_count": len(recent_orphaned.data),
        "creation_timeline": [],
        "potential_triggers": []
    }
    
    for record in recent_orphaned.data:
        creation_analysis["creation_timeline"].append({
            "id": record["id"],
            "portfolio_id": record["portfolio_id"],
            "created_at": record["created_at"],
            "irr_date": record["date"][:10],
            "irr_result": record["irr_result"]
        })
    
    return creation_analysis

def main():
    """Main diagnostic function"""
    logger.info("🚀 Starting portfolio IRR bug diagnosis...")
    logger.info("=" * 60)
    
    try:
        # Get database connection
        db = get_db_connection()
        logger.info("✅ Connected to database")
        
        # Run analyses
        analysis = analyze_orphaned_irr_records(db)
        valuation_analysis = check_missing_portfolio_valuations(db, analysis)
        creation_analysis = check_irr_creation_sources(db)
        
        # Generate report
        logger.info("\n" + "=" * 60)
        logger.info("📋 DIAGNOSTIC REPORT SUMMARY")
        logger.info("=" * 60)
        
        logger.info(f"🔸 Orphaned IRR Records: {analysis['orphaned_count']}")
        logger.info(f"🔸 Total IRR Records: {analysis['total_count']}")
        logger.info(f"🔸 Orphaned Percentage: {analysis['orphaned_percentage']}%")
        logger.info(f"🔸 Affected Portfolios: {len(analysis['affected_portfolios'])}")
        logger.info(f"🔸 Recent Orphaned (30 days): {len(analysis['recent_records'])}")
        
        logger.info("\n📊 VALUATION ANALYSIS:")
        logger.info(f"🔸 IRR records with EXISTING portfolio valuations: {valuation_analysis['existing_valuations_count']}")
        logger.info(f"🔸 IRR records with MISSING portfolio valuations: {valuation_analysis['missing_valuations_count']}")
        
        if valuation_analysis['existing_valuations_count'] > 0:
            logger.info("⚠️  CRITICAL: Found IRR records that should have valuation_id but don't!")
            logger.info("   This indicates a bug in the IRR creation logic.")
        
        logger.info("\n📅 RECENT CREATION PATTERNS:")
        logger.info(f"🔸 Orphaned records created in last 7 days: {creation_analysis['recent_orphaned_count']}")
        
        if analysis['recent_records']:
            logger.info("\n🔍 RECENT ORPHANED RECORDS (sample):")
            for record in analysis['recent_records'][:5]:
                logger.info(f"   Portfolio {record['portfolio_id']}, Date: {record['date']}, IRR: {record['irr_result']}%")
        
        # Recommendations
        logger.info("\n" + "=" * 60)
        logger.info("💡 RECOMMENDATIONS")
        logger.info("=" * 60)
        
        if valuation_analysis['existing_valuations_count'] > 0:
            logger.info("1. 🔧 FIX ORPHANED RECORDS: Update orphaned IRR records to link to existing portfolio valuations")
            logger.info("2. 🛠️  UPDATE IRR CREATION LOGIC: Ensure portfolio_valuation_id is always set when valuation exists")
        
        if valuation_analysis['missing_valuations_count'] > 0:
            logger.info("3. 📊 CREATE MISSING VALUATIONS: Create portfolio valuations for dates where IRR exists but valuation doesn't")
        
        logger.info("4. 🔒 ADD VALIDATION: Prevent future IRR records from being created without portfolio_valuation_id")
        logger.info("5. 📈 MONITOR: Set up monitoring to catch this issue early")
        
        logger.info("\n✅ Diagnosis complete!")
        
    except Exception as e:
        logger.error(f"❌ Error during diagnosis: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main() 