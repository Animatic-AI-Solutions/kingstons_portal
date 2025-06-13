#!/usr/bin/env python3
"""
Script to apply the historical IRR view fixes to the database.
This fixes the issue where historical IRR data wasn't being returned due to 
incorrect JOIN conditions in the database views.
"""

import os
import sys
from supabase import create_client, Client

def apply_view_fixes():
    """Apply the database view fixes"""
    
    # Get Supabase credentials from environment
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_ANON_KEY")
    
    if not url or not key:
        print("Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set")
        return False
    
    try:
        # Create Supabase client
        supabase: Client = create_client(url, key)
        
        print("🔧 Applying historical IRR view fixes...")
        
        # Fix portfolio_historical_irr view
        portfolio_view_sql = """
        CREATE OR REPLACE VIEW public.portfolio_historical_irr AS
        SELECT 
            piv.id AS irr_id,
            piv.portfolio_id,
            piv.irr_result,
            piv.date AS irr_date,
            piv.portfolio_valuation_id,
            -- Portfolio details
            p.portfolio_name,
            p.status AS portfolio_status,
            -- Product details
            cp.id AS product_id,
            cp.product_name,
            cp.client_id,
            cp.provider_id,
            cp.status AS product_status,
            -- Provider details
            ap.name AS provider_name,
            ap.theme_color AS provider_theme_color,
            -- Client group details
            cg.name AS client_group_name
        FROM portfolio_irr_values piv
        LEFT JOIN portfolios p ON p.id = piv.portfolio_id
        LEFT JOIN client_products cp ON cp.portfolio_id = piv.portfolio_id AND cp.status = 'active'
        LEFT JOIN available_providers ap ON ap.id = cp.provider_id
        LEFT JOIN client_groups cg ON cg.id = cp.client_id
        ORDER BY piv.portfolio_id, piv.date DESC;
        """
        
        print("📊 Updating portfolio_historical_irr view...")
        result = supabase.rpc('exec_sql', {'sql': portfolio_view_sql}).execute()
        print("✅ Portfolio historical IRR view updated successfully")
        
        # Fix fund_historical_irr view
        fund_view_sql = """
        CREATE OR REPLACE VIEW public.fund_historical_irr AS
        SELECT 
            pfiv.id AS irr_id,
            pfiv.fund_id AS portfolio_fund_id,
            pfiv.irr_result,
            pfiv.date AS irr_date,
            pfiv.fund_valuation_id,
            -- Portfolio fund details
            pf.portfolio_id,
            pf.available_funds_id,
            pf.status AS fund_status,
            pf.start_date AS fund_start_date,
            pf.end_date AS fund_end_date,
            pf.target_weighting,
            -- Available fund details
            af.fund_name,
            af.isin_number,
            af.risk_factor,
            af.fund_cost,
            -- Portfolio details
            p.portfolio_name,
            p.status AS portfolio_status,
            -- Product details
            cp.id AS product_id,
            cp.product_name,
            cp.client_id,
            cp.provider_id,
            cp.status AS product_status,
            -- Provider details
            ap.name AS provider_name,
            ap.theme_color AS provider_theme_color,
            -- Client group details
            cg.name AS client_group_name
        FROM portfolio_fund_irr_values pfiv
        LEFT JOIN portfolio_funds pf ON pf.id = pfiv.fund_id
        LEFT JOIN available_funds af ON af.id = pf.available_funds_id
        LEFT JOIN portfolios p ON p.id = pf.portfolio_id
        LEFT JOIN client_products cp ON cp.portfolio_id = pf.portfolio_id AND cp.status = 'active'
        LEFT JOIN available_providers ap ON ap.id = cp.provider_id
        LEFT JOIN client_groups cg ON cg.id = cp.client_id
        ORDER BY pfiv.fund_id, pfiv.date DESC;
        """
        
        print("📊 Updating fund_historical_irr view...")
        result = supabase.rpc('exec_sql', {'sql': fund_view_sql}).execute()
        print("✅ Fund historical IRR view updated successfully")
        
        print("🎉 All historical IRR view fixes applied successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error applying view fixes: {str(e)}")
        return False

if __name__ == "__main__":
    success = apply_view_fixes()
    sys.exit(0 if success else 1) 