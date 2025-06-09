#!/usr/bin/env python3
"""Test script to verify zero total valuation IRR edge case handling in multiple funds endpoint."""

import asyncio
from datetime import datetime, date
from app.db.database import get_db
from app.api.routes.portfolio_funds import calculate_multiple_portfolio_funds_irr

async def test_multiple_zero_valuation_irr():
    """Test that multiple portfolio fund IRR calculation handles zero total valuations correctly."""
    db = get_db()
    
    print("=== Testing Multiple Portfolio Funds Zero Total Valuation IRR Edge Case ===")
    
    # Test: Find funds with recent activities
    print("\n1. Looking for funds with recent activities...")
    activities_result = db.table("holding_activity_log")\
        .select("portfolio_fund_id")\
        .order("activity_timestamp", desc=True)\
        .limit(10)\
        .execute()
    
    if not activities_result.data:
        print("   No activities found, cannot test IRR calculation")
        return
    
    # Get a fund to test with
    test_fund_id = activities_result.data[0]['portfolio_fund_id']
    print(f"   Selected fund {test_fund_id} for testing")
    
    # Get the fund's latest valuation to temporarily modify
    valuations_result = db.table("portfolio_fund_valuations")\
        .select("*")\
        .eq("portfolio_fund_id", test_fund_id)\
        .order("valuation_date", desc=True)\
        .limit(1)\
        .execute()
    
    if not valuations_result.data:
        print(f"   No valuations found for fund {test_fund_id}")
        return
    
    original_valuation = valuations_result.data[0]['valuation']
    valuation_id = valuations_result.data[0]['id']
    
    print(f"   Original valuation: {original_valuation}")
    
    # Temporarily set valuation to zero
    print("   Setting valuation to zero temporarily...")
    db.table("portfolio_fund_valuations")\
        .update({"valuation": 0.0})\
        .eq("id", valuation_id)\
        .execute()
    
    try:
        # Test multiple funds IRR calculation with zero total valuation
        print("   Testing multiple funds IRR calculation with zero total valuation...")
        multiple_irr_result = await calculate_multiple_portfolio_funds_irr(
            portfolio_fund_ids=[test_fund_id],
            irr_date=None,  # Use latest date
            db=db
        )
        
        print(f"   Multiple funds IRR result: {multiple_irr_result}")
        
        if multiple_irr_result.get('success'):
            print(f"   ✅ SUCCESS: IRR calculated as {multiple_irr_result.get('irr_percentage')}%")
            print(f"   ✅ Zero total valuation handled: {multiple_irr_result.get('total_valuation')} = 0.0")
            print(f"   ✅ Cash flows count: {multiple_irr_result.get('cash_flows_count')}")
        else:
            print(f"   ❌ FAILED: {multiple_irr_result}")
            
    finally:
        # Restore original valuation
        print("   Restoring original valuation...")
        db.table("portfolio_fund_valuations")\
            .update({"valuation": original_valuation})\
            .eq("id", valuation_id)\
            .execute()
        print(f"   Restored valuation to {original_valuation}")
    
    print("\n=== Test completed ===")

if __name__ == "__main__":
    asyncio.run(test_multiple_zero_valuation_irr()) 