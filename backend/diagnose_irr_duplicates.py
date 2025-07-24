#!/usr/bin/env python3
"""
IRR Duplicate Diagnosis and Fix Script

This script identifies and fixes IRR duplication issues caused by inconsistent
IRR management between the legacy system and the new IRR Cascade Service.

Root Cause: Multiple IRR creation pathways:
1. IRRCascadeService (correct) - updates existing IRRs
2. Legacy functions (problematic) - creates new IRRs without proper checks

Usage:
    python diagnose_irr_duplicates.py --action diagnose
    python diagnose_irr_duplicates.py --action fix --dry-run
    python diagnose_irr_duplicates.py --action fix
"""

import asyncio
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Tuple
import os
import sys

# Add the backend directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import get_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IRRDuplicateDiagnostic:
    """Diagnostic and fix utility for IRR duplicate issues"""
    
    def __init__(self, db):
        self.db = db
    
    async def diagnose_duplicates(self) -> Dict:
        """
        Diagnose IRR duplicate issues in the database
        
        Returns:
            Dict containing diagnosis results
        """
        logger.info("🔍 [IRR DIAGNOSIS] Starting IRR duplicate analysis...")
        
        results = {
            "duplicate_fund_irrs": [],
            "duplicate_portfolio_irrs": [],
            "orphaned_fund_irrs": [],
            "orphaned_portfolio_irrs": [],
            "summary": {}
        }
        
        # 1. Find duplicate portfolio fund IRRs (same fund_id + date)
        duplicate_fund_irrs = self.db.from_("portfolio_fund_irr_values")\
            .select("fund_id, date, COUNT(*) as count")\
            .group_by("fund_id, date")\
            .having("COUNT(*) > 1")\
            .execute()
        
        if duplicate_fund_irrs.data:
            results["duplicate_fund_irrs"] = duplicate_fund_irrs.data
            logger.warning(f"🚨 Found {len(duplicate_fund_irrs.data)} duplicate fund IRR groups")
            
            for dup in duplicate_fund_irrs.data:
                logger.warning(f"   - Fund {dup['fund_id']} on {dup['date']}: {dup['count']} records")
        
        # 2. Find duplicate portfolio IRRs (same portfolio_id + date)
        duplicate_portfolio_irrs = self.db.from_("portfolio_irr_values")\
            .select("portfolio_id, date, COUNT(*) as count")\
            .group_by("portfolio_id, date")\
            .having("COUNT(*) > 1")\
            .execute()
        
        if duplicate_portfolio_irrs.data:
            results["duplicate_portfolio_irrs"] = duplicate_portfolio_irrs.data
            logger.warning(f"🚨 Found {len(duplicate_portfolio_irrs.data)} duplicate portfolio IRR groups")
        
        # 3. Find orphaned fund IRRs (no corresponding valuation)
        orphaned_fund_irrs = self.db.from_("portfolio_fund_irr_values")\
            .select("portfolio_fund_irr_values.id, portfolio_fund_irr_values.fund_id, portfolio_fund_irr_values.date")\
            .left_join("portfolio_fund_valuations", "portfolio_fund_irr_values.fund_valuation_id", "portfolio_fund_valuations.id")\
            .is_("portfolio_fund_valuations.id", "null")\
            .not_.is_("portfolio_fund_irr_values.fund_valuation_id", "null")\
            .execute()
        
        if orphaned_fund_irrs.data:
            results["orphaned_fund_irrs"] = orphaned_fund_irrs.data
            logger.warning(f"🚨 Found {len(orphaned_fund_irrs.data)} orphaned fund IRR records")
        
        # 4. Find orphaned portfolio IRRs (no corresponding valuation)
        orphaned_portfolio_irrs = self.db.from_("portfolio_irr_values")\
            .select("portfolio_irr_values.id, portfolio_irr_values.portfolio_id, portfolio_irr_values.date")\
            .left_join("portfolio_valuations", "portfolio_irr_values.portfolio_valuation_id", "portfolio_valuations.id")\
            .is_("portfolio_valuations.id", "null")\
            .not_.is_("portfolio_irr_values.portfolio_valuation_id", "null")\
            .execute()
        
        if orphaned_portfolio_irrs.data:
            results["orphaned_portfolio_irrs"] = orphaned_portfolio_irrs.data
            logger.warning(f"🚨 Found {len(orphaned_portfolio_irrs.data)} orphaned portfolio IRR records")
        
        # Summary
        results["summary"] = {
            "duplicate_fund_irr_groups": len(results["duplicate_fund_irrs"]),
            "duplicate_portfolio_irr_groups": len(results["duplicate_portfolio_irrs"]),
            "orphaned_fund_irrs": len(results["orphaned_fund_irrs"]),
            "orphaned_portfolio_irrs": len(results["orphaned_portfolio_irrs"]),
            "total_issues": (
                len(results["duplicate_fund_irrs"]) + 
                len(results["duplicate_portfolio_irrs"]) + 
                len(results["orphaned_fund_irrs"]) + 
                len(results["orphaned_portfolio_irrs"])
            )
        }
        
        logger.info(f"✅ [IRR DIAGNOSIS] Analysis complete: {results['summary']}")
        return results
    
    async def fix_duplicates(self, dry_run: bool = True) -> Dict:
        """
        Fix IRR duplicate issues
        
        Args:
            dry_run: If True, only simulate fixes without making changes
            
        Returns:
            Dict containing fix results
        """
        logger.info(f"🔧 [IRR FIX] Starting IRR duplicate fix (dry_run={dry_run})...")
        
        if dry_run:
            logger.info("🧪 [DRY RUN] No actual changes will be made")
        
        fix_results = {
            "fund_irrs_merged": 0,
            "portfolio_irrs_merged": 0,
            "orphaned_records_deleted": 0,
            "errors": []
        }
        
        try:
            # 1. Fix duplicate fund IRRs - keep most recent, delete others
            duplicate_fund_irrs = self.db.from_("portfolio_fund_irr_values")\
                .select("fund_id, date, COUNT(*) as count")\
                .group_by("fund_id, date")\
                .having("COUNT(*) > 1")\
                .execute()
            
            for dup_group in duplicate_fund_irrs.data or []:
                fund_id = dup_group["fund_id"]
                date = dup_group["date"]
                
                # Get all records for this fund+date combination
                all_records = self.db.table("portfolio_fund_irr_values")\
                    .select("*")\
                    .eq("fund_id", fund_id)\
                    .eq("date", date)\
                    .order("id", desc=True)\
                    .execute()
                
                if all_records.data and len(all_records.data) > 1:
                    # Keep the most recent record (highest ID)
                    keep_record = all_records.data[0]
                    delete_records = all_records.data[1:]
                    
                    logger.info(f"🔧 Fund {fund_id} on {date}: keeping record {keep_record['id']}, deleting {len(delete_records)} duplicates")
                    
                    if not dry_run:
                        for delete_record in delete_records:
                            self.db.table("portfolio_fund_irr_values")\
                                .delete()\
                                .eq("id", delete_record["id"])\
                                .execute()
                    
                    fix_results["fund_irrs_merged"] += len(delete_records)
            
            # 2. Fix duplicate portfolio IRRs
            duplicate_portfolio_irrs = self.db.from_("portfolio_irr_values")\
                .select("portfolio_id, date, COUNT(*) as count")\
                .group_by("portfolio_id, date")\
                .having("COUNT(*) > 1")\
                .execute()
            
            for dup_group in duplicate_portfolio_irrs.data or []:
                portfolio_id = dup_group["portfolio_id"]
                date = dup_group["date"]
                
                # Get all records for this portfolio+date combination
                all_records = self.db.table("portfolio_irr_values")\
                    .select("*")\
                    .eq("portfolio_id", portfolio_id)\
                    .eq("date", date)\
                    .order("id", desc=True)\
                    .execute()
                
                if all_records.data and len(all_records.data) > 1:
                    # Keep the most recent record
                    keep_record = all_records.data[0]
                    delete_records = all_records.data[1:]
                    
                    logger.info(f"🔧 Portfolio {portfolio_id} on {date}: keeping record {keep_record['id']}, deleting {len(delete_records)} duplicates")
                    
                    if not dry_run:
                        for delete_record in delete_records:
                            self.db.table("portfolio_irr_values")\
                                .delete()\
                                .eq("id", delete_record["id"])\
                                .execute()
                    
                    fix_results["portfolio_irrs_merged"] += len(delete_records)
            
            # 3. Delete orphaned records
            orphaned_fund_irrs = self.db.from_("portfolio_fund_irr_values")\
                .select("portfolio_fund_irr_values.id")\
                .left_join("portfolio_fund_valuations", "portfolio_fund_irr_values.fund_valuation_id", "portfolio_fund_valuations.id")\
                .is_("portfolio_fund_valuations.id", "null")\
                .not_.is_("portfolio_fund_irr_values.fund_valuation_id", "null")\
                .execute()
            
            if orphaned_fund_irrs.data:
                logger.info(f"🔧 Deleting {len(orphaned_fund_irrs.data)} orphaned fund IRR records")
                
                if not dry_run:
                    for orphaned in orphaned_fund_irrs.data:
                        self.db.table("portfolio_fund_irr_values")\
                            .delete()\
                            .eq("id", orphaned["id"])\
                            .execute()
                
                fix_results["orphaned_records_deleted"] += len(orphaned_fund_irrs.data)
            
            # Similar for orphaned portfolio IRRs
            orphaned_portfolio_irrs = self.db.from_("portfolio_irr_values")\
                .select("portfolio_irr_values.id")\
                .left_join("portfolio_valuations", "portfolio_irr_values.portfolio_valuation_id", "portfolio_valuations.id")\
                .is_("portfolio_valuations.id", "null")\
                .not_.is_("portfolio_irr_values.portfolio_valuation_id", "null")\
                .execute()
            
            if orphaned_portfolio_irrs.data:
                logger.info(f"🔧 Deleting {len(orphaned_portfolio_irrs.data)} orphaned portfolio IRR records")
                
                if not dry_run:
                    for orphaned in orphaned_portfolio_irrs.data:
                        self.db.table("portfolio_irr_values")\
                            .delete()\
                            .eq("id", orphaned["id"])\
                            .execute()
                
                fix_results["orphaned_records_deleted"] += len(orphaned_portfolio_irrs.data)
            
        except Exception as e:
            error_msg = f"Error during fix operation: {str(e)}"
            logger.error(error_msg)
            fix_results["errors"].append(error_msg)
        
        logger.info(f"✅ [IRR FIX] Fix complete: {fix_results}")
        return fix_results

    async def create_fix_report(self) -> str:
        """Create a comprehensive report of the IRR issues and recommended fixes"""
        
        diagnosis = await self.diagnose_duplicates()
        
        report = f"""
# IRR Duplicate Issues - Diagnostic Report
Generated: {datetime.now().isoformat()}

## 🚨 CRITICAL ISSUE IDENTIFIED

**Root Cause**: Dual IRR management systems running in parallel:
1. **IRRCascadeService** (correct) - properly updates existing IRRs
2. **Legacy functions** (problematic) - creates new IRRs without proper duplicate checking

## 📊 Current State Analysis

### Duplicate Fund IRRs (same fund_id + date)
- **Groups with duplicates**: {diagnosis['summary']['duplicate_fund_irr_groups']}
- **Action needed**: Merge duplicates, keep most recent calculation

### Duplicate Portfolio IRRs (same portfolio_id + date)  
- **Groups with duplicates**: {diagnosis['summary']['duplicate_portfolio_irr_groups']}
- **Action needed**: Merge duplicates, keep most recent calculation

### Orphaned IRR Records
- **Orphaned fund IRRs**: {diagnosis['summary']['orphaned_fund_irrs']}
- **Orphaned portfolio IRRs**: {diagnosis['summary']['orphaned_portfolio_irrs']}
- **Action needed**: Delete records with invalid valuation references

### Total Issues Detected: {diagnosis['summary']['total_issues']}

## 🛠️ IMMEDIATE ACTION REQUIRED

### Step 1: Data Cleanup
```bash
# Run dry-run first to see what would be fixed
python diagnose_irr_duplicates.py --action fix --dry-run

# Apply fixes after reviewing dry-run results
python diagnose_irr_duplicates.py --action fix
```

### Step 2: Code Fix - Replace Legacy IRR Functions
**Priority: HIGH** - The following files need immediate updates:

1. **holding_activity_logs.py** - Replace direct IRR insertions with cascade service
2. **portfolio_funds.py** - Ensure all IRR operations use cascade service  
3. **Any other files** - Audit all `portfolio_fund_irr_values.insert()` calls

### Step 3: Database Constraints (Recommended)
Add unique constraints to prevent future duplicates:
```sql
-- Prevent duplicate fund IRRs
ALTER TABLE portfolio_fund_irr_values 
ADD CONSTRAINT unique_fund_irr_per_date 
UNIQUE (fund_id, date);

-- Prevent duplicate portfolio IRRs  
ALTER TABLE portfolio_irr_values 
ADD CONSTRAINT unique_portfolio_irr_per_date 
UNIQUE (portfolio_id, date);
```

## 🔧 TECHNICAL SOLUTION

### Replace Problematic Code Pattern:
```python
# ❌ PROBLEMATIC (creates duplicates):
existing_check = db.table("portfolio_fund_irr_values")\\
    .select("id")\\
    .eq("fund_id", fund_id)\\
    .eq("date", date)\\
    .execute()

if not existing_check.data:
    # Race condition possible here!
    db.table("portfolio_fund_irr_values").insert(irr_data).execute()

# ✅ CORRECT (via IRR Cascade Service):
irr_service = IRRCascadeService(db)
await irr_service.handle_fund_valuation_creation_edit(fund_id, date)
```

## 📈 MONITORING

After fixes are applied, implement monitoring:
1. Daily duplicate detection queries
2. Orphaned record alerts  
3. IRR calculation performance metrics

## ⚠️ RISK ASSESSMENT

**High Risk**: Data integrity issues affecting financial calculations
**Impact**: Incorrect IRR values, inconsistent reporting
**Urgency**: Immediate action required

---
*This report was generated automatically. Review all recommendations before implementation.*
"""
        
        return report

async def main():
    """Main function to run the diagnostic tool"""
    parser = argparse.ArgumentParser(description="IRR Duplicate Diagnosis and Fix Tool")
    parser.add_argument("--action", choices=["diagnose", "fix", "report"], required=True,
                       help="Action to perform")
    parser.add_argument("--dry-run", action="store_true", 
                       help="For fix action: only simulate changes without applying them")
    
    args = parser.parse_args()
    
    # Get database connection
    db = next(get_db())
    diagnostic = IRRDuplicateDiagnostic(db)
    
    if args.action == "diagnose":
        results = await diagnostic.diagnose_duplicates()
        print("\n" + "="*50)
        print("IRR DUPLICATE DIAGNOSIS RESULTS")
        print("="*50)
        print(f"Duplicate fund IRR groups: {results['summary']['duplicate_fund_irr_groups']}")
        print(f"Duplicate portfolio IRR groups: {results['summary']['duplicate_portfolio_irr_groups']}")
        print(f"Orphaned fund IRRs: {results['summary']['orphaned_fund_irrs']}")
        print(f"Orphaned portfolio IRRs: {results['summary']['orphaned_portfolio_irrs']}")
        print(f"TOTAL ISSUES: {results['summary']['total_issues']}")
        
        if results['summary']['total_issues'] > 0:
            print("\n🚨 ISSUES DETECTED - Run with --action fix to resolve")
        else:
            print("\n✅ No IRR duplicate issues detected")
    
    elif args.action == "fix":
        fix_results = await diagnostic.fix_duplicates(dry_run=args.dry_run)
        print("\n" + "="*50)
        print(f"IRR DUPLICATE FIX RESULTS (dry_run={args.dry_run})")
        print("="*50)
        print(f"Fund IRRs merged: {fix_results['fund_irrs_merged']}")
        print(f"Portfolio IRRs merged: {fix_results['portfolio_irrs_merged']}")
        print(f"Orphaned records deleted: {fix_results['orphaned_records_deleted']}")
        
        if fix_results['errors']:
            print(f"Errors: {len(fix_results['errors'])}")
            for error in fix_results['errors']:
                print(f"  - {error}")
        
        if args.dry_run:
            print("\n🧪 This was a dry run - no actual changes made")
            print("Run without --dry-run to apply fixes")
        else:
            print("\n✅ Fixes applied successfully")
    
    elif args.action == "report":
        report = await diagnostic.create_fix_report()
        
        # Save report to file
        report_filename = f"irr_duplicate_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        with open(report_filename, 'w') as f:
            f.write(report)
        
        print(f"📄 Comprehensive report saved to: {report_filename}")
        print("\nKey findings:")
        diagnosis = await diagnostic.diagnose_duplicates()
        print(f"  - Total issues detected: {diagnosis['summary']['total_issues']}")
        print(f"  - Duplicate fund IRR groups: {diagnosis['summary']['duplicate_fund_irr_groups']}")
        print(f"  - Duplicate portfolio IRR groups: {diagnosis['summary']['duplicate_portfolio_irr_groups']}")

if __name__ == "__main__":
    asyncio.run(main()) 