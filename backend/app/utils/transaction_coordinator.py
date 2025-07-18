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
            
            # Phase 3: Trigger IRR recalculation for affected funds
            affected_funds = self._get_affected_funds(activities, valuations)
            if affected_funds:
                logger.info("🧮 Phase 3: Triggering IRR recalculations...")
                for fund_id, dates in affected_funds.items():
                    for date in dates:
                        await self._recalculate_irr(fund_id, date)
                        result["irr_calculations"] += 1
                logger.info(f"✅ Phase 3 Complete: {result['irr_calculations']} IRR calculations triggered")
            
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
                # Update existing activity
                result = self.db.table("holding_activity_log")\
                    .update(activity_data)\
                    .eq("id", activity_data['id'])\
                    .execute()
            else:
                # Insert new activity
                result = self.db.table("holding_activity_log")\
                    .insert(activity_data)\
                    .execute()
            
            if not result.data:
                raise Exception(f"Failed to save activity: {activity_data}")
                
            logger.info(f"📥 Activity saved: {activity_data['activity_type']} for fund {activity_data['portfolio_fund_id']}")
            
        except Exception as e:
            logger.error(f"❌ Failed to save activity: {str(e)}")
            raise
    
    async def _save_valuation(self, valuation_data: Dict[str, Any]) -> None:
        """Save a single valuation to the database"""
        try:
            # Check for existing valuation
            existing_valuation = self.db.table("portfolio_fund_valuations")\
                .select("*")\
                .eq("portfolio_fund_id", valuation_data['portfolio_fund_id'])\
                .eq("valuation_date", valuation_data['valuation_date'])\
                .execute()
            
            if existing_valuation.data:
                # Update existing valuation
                result = self.db.table("portfolio_fund_valuations")\
                    .update(valuation_data)\
                    .eq("id", existing_valuation.data[0]['id'])\
                    .execute()
            else:
                # Insert new valuation
                result = self.db.table("portfolio_fund_valuations")\
                    .insert(valuation_data)\
                    .execute()
            
            if not result.data:
                raise Exception(f"Failed to save valuation: {valuation_data}")
                
            logger.info(f"💰 Valuation saved: £{valuation_data['valuation']} for fund {valuation_data['portfolio_fund_id']} on {valuation_data['valuation_date']}")
            
        except Exception as e:
            logger.error(f"❌ Failed to save valuation: {str(e)}")
            raise
    
    async def _recalculate_irr(self, fund_id: int, date: str) -> None:
        """Trigger IRR recalculation for a specific fund and date"""
        try:
            logger.info(f"🧮 Recalculating IRR for fund {fund_id} on {date}")
            
            # Use the existing IRR calculation function
            irr_result = await calculate_single_portfolio_fund_irr(
                portfolio_fund_id=fund_id,
                irr_date=date,
                db=self.db
            )
            
            if irr_result.get("success"):
                logger.info(f"✅ IRR recalculated successfully for fund {fund_id}: {irr_result.get('irr_percentage', 0)}%")
            else:
                logger.warning(f"⚠️ IRR recalculation failed for fund {fund_id}: {irr_result.get('error', 'Unknown error')}")
                
        except Exception as e:
            logger.error(f"❌ IRR recalculation failed for fund {fund_id}: {str(e)}")
            # Don't raise - IRR calculation failure shouldn't fail the entire transaction
    
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