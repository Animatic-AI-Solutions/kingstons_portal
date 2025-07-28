#!/usr/bin/env python3
"""
Debug script to test the ultra-fast IRR calculation directly
"""
import sys
import os
sys.path.append('.')

try:
    from app.db.database import get_db
    
    print("=== DEBUGGING ULTRA-FAST IRR CALCULATION ===")
    
    client = get_db()
    
    # Step 1: Test database views
    print("\n1. Testing database views...")
    
    # Test latest_portfolio_irr_values
    irr_result = client.table('latest_portfolio_irr_values').select('irr_value, portfolio_fund_id').limit(10).execute()
    print(f"   IRR values count: {len(irr_result.data) if irr_result.data else 0}")
    if irr_result.data:
        print(f"   Sample IRR data: {irr_result.data[:3]}")
    
    # Test latest_portfolio_fund_valuations
    val_result = client.table('latest_portfolio_fund_valuations').select('valuation, portfolio_fund_id').limit(10).execute()
    print(f"   Valuations count: {len(val_result.data) if val_result.data else 0}")
    if val_result.data:
        print(f"   Sample valuation data: {val_result.data[:3]}")
    
    # Step 2: Test the calculation logic
    print("\n2. Testing calculation logic...")
    
    # Create lookup
    valuations_lookup = {v['portfolio_fund_id']: v['valuation'] for v in val_result.data if v['valuation']}
    print(f"   Valuations lookup size: {len(valuations_lookup)}")
    
    # Test calculation
    total_weighted_irr = 0
    total_weights = 0
    valid_entries = 0
    
    for irr_entry in irr_result.data:
        if irr_entry['irr_value'] is not None:
            portfolio_fund_id = irr_entry['portfolio_fund_id']
            weight = valuations_lookup.get(portfolio_fund_id, 1.0)
            
            total_weighted_irr += irr_entry['irr_value'] * weight
            total_weights += weight
            valid_entries += 1
            
            if valid_entries <= 5:
                print(f"   Entry {valid_entries}: IRR={irr_entry['irr_value']}, Weight={weight}, Portfolio Fund ID={portfolio_fund_id}")
    
    print(f"   Valid entries processed: {valid_entries}")
    print(f"   Total weighted IRR: {total_weighted_irr}")
    print(f"   Total weights: {total_weights}")
    
    if total_weights > 0:
        ultra_fast_irr = (total_weighted_irr / total_weights) * 100
        print(f"   Calculated IRR: {ultra_fast_irr}%")
    else:
        print("   No weights - cannot calculate IRR")
        
    # Step 3: Test fallback calculation
    print("\n3. Testing fallback calculation...")
    
    total_current_value = sum(float(v['valuation'] or 0) for v in val_result.data)
    print(f"   Total current value: {total_current_value}")
    
    pf_result = client.table('portfolio_funds').select('amount_invested').eq('status', 'active').execute()
    total_invested = sum(float(pf['amount_invested'] or 0) for pf in pf_result.data)
    print(f"   Total invested: {total_invested}")
    
    if total_invested > 0:
        total_return = (total_current_value / total_invested) - 1
        approx_annual_irr = (total_return / 3) * 100
        print(f"   Fallback IRR approximation: {approx_annual_irr}%")
        
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    print(f"Traceback: {traceback.format_exc()}") 