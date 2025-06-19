#!/usr/bin/env python3
"""
Debug script to test IRR recalculation for funds with zero valuation.
This script will help identify why the cash fund isn't getting its IRR recalculated.
"""

import asyncio
import sys
import os
import logging
from datetime import datetime, date

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.db.database import get_db
from app.api.routes.holding_activity_logs import recalculate_irr_after_activity_change
from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr

# Set up logging to see debug messages
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('debug_irr_recalculation.log')
    ]
)

logger = logging.getLogger(__name__)

async def debug_irr_recalculation():
    """
    Debug IRR recalculation for all funds in a portfolio to identify zero valuation issues.
    """
    
    try:
        # Get database connection
        db = next(get_db())
        
        # Portfolio ID from the logs (you can adjust this)
        portfolio_id = 71
        
        logger.info(f"🔍 DEBUG: Starting IRR recalculation debug for portfolio {portfolio_id}")
        
        # Get all portfolio funds
        portfolio_funds = db.table("portfolio_funds")\
            .select("id, available_funds_id, status")\
            .eq("portfolio_id", portfolio_id)\
            .execute()
        
        if not portfolio_funds.data:
            logger.error(f"No portfolio funds found for portfolio {portfolio_id}")
            return
        
        logger.info(f"🔍 DEBUG: Found {len(portfolio_funds.data)} portfolio funds")
        
        # Get fund details for each portfolio fund
        for pf in portfolio_funds.data:
            portfolio_fund_id = pf["id"]
            available_funds_id = pf["available_funds_id"]
            status = pf["status"]
            
            # Get fund name
            fund_details = db.table("available_funds")\
                .select("fund_name, isin_number")\
                .eq("id", available_funds_id)\
                .execute()
            
            fund_name = "Unknown"
            isin = "Unknown"
            if fund_details.data:
                fund_name = fund_details.data[0]["fund_name"]
                isin = fund_details.data[0]["isin_number"]
            
            # Get current valuation
            latest_valuation = db.table("portfolio_fund_valuations")\
                .select("valuation, valuation_date")\
                .eq("portfolio_fund_id", portfolio_fund_id)\
                .order("valuation_date", desc=True)\
                .limit(1)\
                .execute()
            
            current_valuation = 0
            valuation_date = "N/A"
            if latest_valuation.data:
                current_valuation = latest_valuation.data[0]["valuation"]
                valuation_date = latest_valuation.data[0]["valuation_date"]
            
            # Get activity count
            activity_count = db.table("holding_activity_log")\
                .select("id")\
                .eq("portfolio_fund_id", portfolio_fund_id)\
                .execute()
            
            logger.info(f"🔍 DEBUG: Fund {portfolio_fund_id} - {fund_name} ({isin})")
            logger.info(f"🔍 DEBUG:   Status: {status}")
            logger.info(f"🔍 DEBUG:   Current valuation: £{current_valuation} as of {valuation_date}")
            logger.info(f"🔍 DEBUG:   Activities: {len(activity_count.data)}")
            
            # Check if this is likely the cash fund (zero valuation)
            if current_valuation == 0:
                logger.warning(f"🔍 DEBUG: ⚠️  ZERO VALUATION FUND DETECTED: {fund_name}")
                
                # Test IRR recalculation for this specific fund
                logger.info(f"🔍 DEBUG: Testing IRR recalculation for zero valuation fund...")
                
                # Test with a recent date
                test_date = "2024-12-01"  # Adjust as needed
                
                try:
                    # Test direct IRR calculation
                    logger.info(f"🔍 DEBUG: Testing direct IRR calculation for fund {portfolio_fund_id}...")
                    irr_result = await calculate_single_portfolio_fund_irr(
                        portfolio_fund_id=portfolio_fund_id,
                        irr_date=test_date,
                        db=db
                    )
                    logger.info(f"🔍 DEBUG: Direct IRR calculation result: {irr_result}")
                    
                    # Test IRR recalculation after activity change
                    logger.info(f"🔍 DEBUG: Testing IRR recalculation after activity change for fund {portfolio_fund_id}...")
                    recalc_result = await recalculate_irr_after_activity_change(
                        portfolio_fund_id=portfolio_fund_id,
                        db=db,
                        activity_date=test_date
                    )
                    logger.info(f"🔍 DEBUG: IRR recalculation result: {recalc_result}")
                    
                except Exception as e:
                    logger.error(f"🔍 DEBUG: ❌ Error testing IRR for fund {portfolio_fund_id}: {str(e)}")
                    import traceback
                    logger.error(f"🔍 DEBUG: Traceback: {traceback.format_exc()}")
            
            logger.info(f"🔍 DEBUG: ---")
        
        logger.info(f"🔍 DEBUG: ✅ IRR recalculation debug completed")
        
    except Exception as e:
        logger.error(f"🔍 DEBUG: ❌ Error in debug script: {str(e)}")
        import traceback
        logger.error(f"🔍 DEBUG: Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    logger.info("🔍 DEBUG: Starting IRR recalculation debug script")
    asyncio.run(debug_irr_recalculation())
    logger.info("🔍 DEBUG: Debug script completed") 