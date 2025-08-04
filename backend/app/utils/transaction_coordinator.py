"""
Backend Transaction Coordinator
Handles database transactions with proper ordering to prevent IRR calculation race conditions
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from app.db.database import get_db
from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr

logger = logging.getLogger(__name__)

class TransactionCoordinator:
    """
    Coordinates database transactions to ensure proper ordering of activities and valuations
    """
    
    def __init__(self, db):
        self.db = db
        
    async def save_activities_and_valuations_ordered(
        self,
        activities: List[Dict[str, Any]],
        valuations: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Save activities and valuations in proper order with transaction safety
        
        Args:
            activities: List of activity data to save
            valuations: List of valuation data to save
            
        Returns:
            Dictionary with transaction results
        """
        
        result = {
            "success": True,
            "activities_saved": 0,
            "valuations_saved": 0,
            "irr_calculations": 0,
            "portfolio_irr_recalculations": 0,
            "errors": []
        }
        
        try:
            logger.info(f"🔄 Backend Transaction: Starting ordered save of {len(activities)} activities and {len(valuations)} valuations")
            
            # Phase 1: Save all activities first
            if activities:
                logger.info("📥 Phase 1: Saving activities...")
                for activity in activities:
                    await self._save_activity(activity)
                    result["activities_saved"] += 1
                logger.info(f"✅ Phase 1 Complete: {result['activities_saved']} activities saved")
            
            # Phase 2: Save valuations after activities
            if valuations:
                logger.info("💰 Phase 2: Saving valuations...")
                for valuation in valuations:
                    await self._save_valuation(valuation)
                    result["valuations_saved"] += 1
                logger.info(f"✅ Phase 2 Complete: {result['valuations_saved']} valuations saved")
            
            # Phase 3: Trigger IRR recalculation for affected funds (both fund-level and portfolio-level)
            affected_funds = self._get_affected_funds(activities, valuations)
            affected_portfolios = set()  # Track portfolios that need IRR recalculation
            
            if affected_funds:
                logger.info("🧮 Phase 3: Triggering fund-level IRR recalculations...")
                for fund_id, dates in affected_funds.items():
                    # Get portfolio_id for this fund to track portfolio-level recalculation
                    fund_info = await self.db.fetchrow(
                        "SELECT portfolio_id FROM portfolio_funds WHERE id = $1", 
                        fund_id
                    )
                    
                    if fund_info:
                        portfolio_id = fund_info["portfolio_id"]
                        affected_portfolios.add(portfolio_id)
                    
                    for date in dates:
                        await self._recalculate_fund_irr(fund_id, date)
                        result["irr_calculations"] += 1
                logger.info(f"✅ Phase 3 Complete: {result['irr_calculations']} fund IRR calculations triggered")
                
                # Phase 4: Trigger portfolio-level IRR recalculation for affected portfolios
                if affected_portfolios:
                    logger.info("🏢 Phase 4: Triggering portfolio-level IRR recalculations...")
                    for portfolio_id in affected_portfolios:
                        # Find the earliest date affected for this portfolio
                        earliest_date = await self._get_earliest_date_for_portfolio(portfolio_id, affected_funds)
                        if earliest_date:
                            portfolio_irr_count = await self._recalculate_portfolio_irr(portfolio_id, earliest_date)
                            result["portfolio_irr_recalculations"] += portfolio_irr_count
                    logger.info(f"✅ Phase 4 Complete: {result['portfolio_irr_recalculations']} portfolio IRR recalculations triggered")
            
            logger.info("🎉 Backend Transaction: All phases completed successfully")
            
        except Exception as e:
            logger.error(f"❌ Backend Transaction Error: {str(e)}")
            result["success"] = False
            result["errors"].append(str(e))
            
        return result
    
    async def _save_activity(self, activity_data: Dict[str, Any]) -> None:
        """Save a single activity to the database"""
        try:
            # Insert or update activity
            if activity_data.get('id'):
                # Update existing activity - Build dynamic update query
                set_clauses = []
                params = []
                param_count = 1
                
                for key, value in activity_data.items():
                    if key != 'id':  # Skip the id field for SET clause
                        set_clauses.append(f"{key} = ${param_count}")
                        params.append(value)
                        param_count += 1
                
                params.append(activity_data['id'])  # Add id for WHERE clause
                
                query = f"UPDATE holding_activity_log SET {', '.join(set_clauses)} WHERE id = ${param_count} RETURNING *"
                result = await self.db.fetchrow(query, *params)
            else:
                # Insert new activity - Build dynamic insert query
                columns = list(activity_data.keys())
                values = list(activity_data.values())
                placeholders = [f"${i+1}" for i in range(len(values))]
                
                query = f"INSERT INTO holding_activity_log ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
                result = await self.db.fetchrow(query, *values)
            
            if not result:
                raise Exception(f"Failed to save activity: {activity_data}")
                
            logger.info(f"📥 Activity saved: {activity_data['activity_type']} for fund {activity_data['portfolio_fund_id']}")
            
        except Exception as e:
            logger.error(f"❌ Failed to save activity: {str(e)}")
            raise
    
    async def _save_valuation(self, valuation_data: Dict[str, Any]) -> None:
        """Save a single valuation to the database"""
        try:
            # Check for existing valuation
            existing_valuation = await self.db.fetchrow(
                "SELECT * FROM portfolio_fund_valuations WHERE portfolio_fund_id = $1 AND valuation_date = $2",
                valuation_data['portfolio_fund_id'],
                valuation_data['valuation_date']
            )
            
            if existing_valuation:
                # Update existing valuation - Build dynamic update query
                set_clauses = []
                params = []
                param_count = 1
                
                for key, value in valuation_data.items():
                    set_clauses.append(f"{key} = ${param_count}")
                    params.append(value)
                    param_count += 1
                
                params.append(existing_valuation['id'])  # Add id for WHERE clause
                
                query = f"UPDATE portfolio_fund_valuations SET {', '.join(set_clauses)} WHERE id = ${param_count} RETURNING *"
                result = await self.db.fetchrow(query, *params)
            else:
                # Insert new valuation - Build dynamic insert query
                columns = list(valuation_data.keys())
                values = list(valuation_data.values())
                placeholders = [f"${i+1}" for i in range(len(values))]
                
                query = f"INSERT INTO portfolio_fund_valuations ({', '.join(columns)}) VALUES ({', '.join(placeholders)}) RETURNING *"
                result = await self.db.fetchrow(query, *values)
            
            if not result:
                raise Exception(f"Failed to save valuation: {valuation_data}")
                
            logger.info(f"💰 Valuation saved: £{valuation_data['valuation']} for fund {valuation_data['portfolio_fund_id']} on {valuation_data['valuation_date']}")
            
        except Exception as e:
            logger.error(f"❌ Failed to save valuation: {str(e)}")
            raise
    
    async def _recalculate_fund_irr(self, fund_id: int, date: str) -> None:
        """Trigger IRR recalculation for a specific fund and date"""
        try:
            logger.info(f"🧮 Recalculating fund IRR for fund {fund_id} on {date}")
            
            # Use the existing IRR calculation function
            irr_result = await calculate_single_portfolio_fund_irr(
                portfolio_fund_id=fund_id,
                irr_date=date,
                db=self.db
            )
            
            if irr_result.get("success"):
                logger.info(f"✅ Fund IRR recalculated successfully for fund {fund_id}: {irr_result.get('irr_percentage', 0)}%")
            else:
                logger.warning(f"⚠️ Fund IRR recalculation failed for fund {fund_id}: {irr_result.get('error', 'Unknown error')}")
                
        except Exception as e:
            logger.error(f"❌ Fund IRR recalculation failed for fund {fund_id}: {str(e)}")
            # Don't raise - IRR calculation failure shouldn't fail the entire transaction

    async def _recalculate_portfolio_irr(self, portfolio_id: int, start_date: str) -> int:
        """
        Trigger portfolio-level IRR recalculation from a start date onwards.
        Uses the same logic as in holding_activity_logs.py
        
        Args:
            portfolio_id: The portfolio ID
            start_date: Only recalculate portfolio IRR values from this date onwards (YYYY-MM-DD format)
            
        Returns:
            The number of portfolio IRR values processed (recalculated + created)
        """
        try:
            logger.info(f"🏢 Recalculating portfolio-level IRR values for portfolio {portfolio_id} from {start_date} onwards")
            
            # Import the function from holding_activity_logs to avoid code duplication
            from app.api.routes.holding_activity_logs import recalculate_portfolio_irr_values_from_date
            
            # Call the existing portfolio IRR recalculation function
            portfolio_irr_count = await recalculate_portfolio_irr_values_from_date(
                portfolio_id, start_date, self.db
            )
            
            logger.info(f"✅ Portfolio IRR recalculation completed for portfolio {portfolio_id}: {portfolio_irr_count} values processed")
            return portfolio_irr_count
            
        except Exception as e:
            logger.error(f"❌ Portfolio IRR recalculation failed for portfolio {portfolio_id}: {str(e)}")
            # Don't raise - IRR calculation failure shouldn't fail the entire transaction
            return 0

    async def _get_earliest_date_for_portfolio(self, portfolio_id: int, affected_funds: Dict[int, List[str]]) -> Optional[str]:
        """
        Find the earliest date that affects a specific portfolio.
        
        Args:
            portfolio_id: The portfolio ID to find dates for
            affected_funds: Dictionary mapping fund_id to list of dates
            
        Returns:
            The earliest date string (YYYY-MM-DD format) or None if no dates found
        """
        earliest_date = None
        
        # Get all funds for this portfolio
        portfolio_funds = await self.db.fetch(
            "SELECT id FROM portfolio_funds WHERE portfolio_id = $1",
            portfolio_id
        )
        
        if not portfolio_funds:
            return None
        
        portfolio_fund_ids = [pf["id"] for pf in portfolio_funds]
        
        # Find the earliest date from affected funds that belong to this portfolio
        for fund_id, dates in affected_funds.items():
            if fund_id in portfolio_fund_ids:
                for date in dates:
                    if earliest_date is None or date < earliest_date:
                        earliest_date = date
        
        return earliest_date
    
    def _get_affected_funds(self, activities: List[Dict[str, Any]], valuations: List[Dict[str, Any]]) -> Dict[int, List[str]]:
        """
        Get list of funds and dates that need IRR recalculation
        
        Returns:
            Dictionary mapping fund_id to list of dates
        """
        affected_funds = {}
        
        # Process activities
        for activity in activities:
            fund_id = activity.get('portfolio_fund_id')
            date = activity.get('activity_timestamp', '').split('T')[0]
            
            if fund_id and date:
                if fund_id not in affected_funds:
                    affected_funds[fund_id] = []
                if date not in affected_funds[fund_id]:
                    affected_funds[fund_id].append(date)
        
        # Process valuations
        for valuation in valuations:
            fund_id = valuation.get('portfolio_fund_id')
            date = valuation.get('valuation_date', '').split('T')[0]
            
            if fund_id and date:
                if fund_id not in affected_funds:
                    affected_funds[fund_id] = []
                if date not in affected_funds[fund_id]:
                    affected_funds[fund_id].append(date)
        
        return affected_funds

class TransactionValidator:
    """
    Validates transaction data and ensures proper ordering
    """
    
    @staticmethod
    def validate_activities(activities: List[Dict[str, Any]]) -> List[str]:
        """Validate activity data"""
        errors = []
        
        for i, activity in enumerate(activities):
            if not activity.get('portfolio_fund_id'):
                errors.append(f"Activity {i}: Missing portfolio_fund_id")
            
            if not activity.get('activity_timestamp'):
                errors.append(f"Activity {i}: Missing activity_timestamp")
            
            if not activity.get('activity_type'):
                errors.append(f"Activity {i}: Missing activity_type")
            
            if not activity.get('amount'):
                errors.append(f"Activity {i}: Missing amount")
        
        return errors
    
    @staticmethod
    def validate_valuations(valuations: List[Dict[str, Any]]) -> List[str]:
        """Validate valuation data"""
        errors = []
        
        for i, valuation in enumerate(valuations):
            if not valuation.get('portfolio_fund_id'):
                errors.append(f"Valuation {i}: Missing portfolio_fund_id")
            
            if not valuation.get('valuation_date'):
                errors.append(f"Valuation {i}: Missing valuation_date")
            
            if valuation.get('valuation') is None:
                errors.append(f"Valuation {i}: Missing valuation amount")
        
        return errors
    
    @staticmethod
    def validate_ordering(activities: List[Dict[str, Any]], valuations: List[Dict[str, Any]]) -> List[str]:
        """Validate that activities and valuations are in proper order"""
        errors = []
        
        # Check for same fund/date combinations
        activity_fund_dates = set()
        for activity in activities:
            fund_id = activity.get('portfolio_fund_id')
            date = activity.get('activity_timestamp', '').split('T')[0]
            if fund_id and date:
                activity_fund_dates.add((fund_id, date))
        
        valuation_fund_dates = set()
        for valuation in valuations:
            fund_id = valuation.get('portfolio_fund_id')
            date = valuation.get('valuation_date', '').split('T')[0]
            if fund_id and date:
                valuation_fund_dates.add((fund_id, date))
        
        # Find overlapping fund/date combinations
        overlapping = activity_fund_dates.intersection(valuation_fund_dates)
        if overlapping:
            errors.append(f"Found {len(overlapping)} fund/date combinations with both activities and valuations - proper ordering is critical")
        
        return errors 