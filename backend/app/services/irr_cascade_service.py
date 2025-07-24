"""
IRR Cascade Service

This service implements comprehensive IRR calculation, recalculation, and deletion logic
to maintain data integrity across portfolio fund and portfolio level IRRs.

Core Principles:
1. Valuation deletion cascades to IRR deletion with completeness checks
2. Activity changes trigger batch recalculation of all affected IRRs  
3. Valuation creation/edit triggers IRR calculation with completeness validation
4. Historical changes recalculate all future IRRs from change date onwards
"""

import logging
from typing import List, Dict, Set, Optional, Tuple
from datetime import datetime, date

logger = logging.getLogger(__name__)

class IRRCascadeService:
    """
    Centralized service for managing IRR calculation, recalculation, and deletion cascades.
    """
    
    def __init__(self, db):
        self.db = db
    
    # ========================================================================
    # 1. VALUATION DELETION CASCADE
    # ========================================================================
    
    async def handle_fund_valuation_deletion(self, valuation_id: int) -> Dict:
        """
        Handle complete IRR cascade when a portfolio fund valuation is deleted.
        
        Flow:
        1. Get valuation details (fund_id, portfolio_id, date)
        2. Delete portfolio fund IRR for same date
        3. Check if portfolio still has complete valuations for that date
        4. If not complete, delete portfolio valuation and portfolio IRR
        5. Delete the original fund valuation
        
        Args:
            valuation_id: The fund valuation ID to delete
            
        Returns:
            Dict with deletion summary and actions taken
        """
        logger.info(f"🗑️ [IRR CASCADE] Starting fund valuation deletion cascade for valuation {valuation_id}")
        
        try:
            # Step 1: Get valuation details before deletion
            valuation_details = await self._get_fund_valuation_details(valuation_id)
            if not valuation_details:
                raise ValueError(f"Fund valuation {valuation_id} not found")
            
            fund_id = valuation_details["portfolio_fund_id"]
            portfolio_id = valuation_details["portfolio_id"]
            valuation_date = valuation_details["valuation_date"]
            
            logger.info(f"🗑️ [IRR CASCADE] Valuation details: fund_id={fund_id}, portfolio_id={portfolio_id}, date={valuation_date}")
            
            # Step 2: Delete portfolio fund IRR for this date
            fund_irr_deleted = await self._delete_fund_irr_by_date(fund_id, valuation_date)
            
            # Step 3: Check if portfolio still has complete valuations after this deletion
            will_be_complete = await self._check_portfolio_completeness_after_deletion(
                portfolio_id, valuation_date, fund_id
            )
            
            portfolio_irr_deleted = False
            portfolio_valuation_deleted = False
            
            # Step 4: If not complete, delete portfolio IRR and valuation
            if not will_be_complete:
                portfolio_irr_deleted = await self._delete_portfolio_irr_by_date(portfolio_id, valuation_date)
                portfolio_valuation_deleted = await self._delete_portfolio_valuation_by_date(portfolio_id, valuation_date)
            
            # Step 5: Delete the original fund valuation
            fund_valuation_deleted = await self._delete_fund_valuation(valuation_id)
            
            result = {
                "success": True,
                "valuation_deleted": fund_valuation_deleted,
                "fund_irr_deleted": fund_irr_deleted,
                "portfolio_irr_deleted": portfolio_irr_deleted,
                "portfolio_valuation_deleted": portfolio_valuation_deleted,
                "completeness_maintained": will_be_complete,
                "portfolio_id": portfolio_id,
                "date": valuation_date
            }
            
            logger.info(f"🗑️ [IRR CASCADE] ✅ Deletion cascade completed: {result}")
            return result
            
        except Exception as e:
            logger.error(f"🗑️ [IRR CASCADE] ❌ Error in deletion cascade: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # ========================================================================
    # 2. ACTIVITY CHANGES IMPACT
    # ========================================================================
    
    async def handle_activity_changes_batch(self, portfolio_id: int, affected_dates: List[str]) -> Dict:
        """
        Handle IRR recalculation after batch activity changes.
        
        Flow:
        1. Collect all unique affected dates
        2. For each date, recalculate ALL portfolio fund IRRs
        3. For each date, recalculate portfolio IRR (if complete)
        4. Process dates in chronological order for consistency
        
        Args:
            portfolio_id: The portfolio affected by activity changes
            affected_dates: List of dates (YYYY-MM-DD) affected by activity changes
            
        Returns:
            Dict with recalculation summary
        """
        logger.info(f"🔄 [IRR CASCADE] Starting batch IRR recalculation for portfolio {portfolio_id}, dates: {affected_dates}")
        
        try:
            # Step 1: Deduplicate and sort dates chronologically
            unique_dates = sorted(list(set(affected_dates)))
            logger.info(f"🔄 [IRR CASCADE] Processing {len(unique_dates)} unique dates: {unique_dates}")
            
            fund_irrs_recalculated = 0
            portfolio_irrs_recalculated = 0
            
            # Step 2: For each affected date, recalculate all IRRs
            for affected_date in unique_dates:
                logger.info(f"🔄 [IRR CASCADE] Processing date {affected_date}")
                
                # Step 2a: Recalculate ALL portfolio fund IRRs for this date
                fund_count = await self._recalculate_all_fund_irrs_for_date(portfolio_id, affected_date)
                fund_irrs_recalculated += fund_count
                
                # Step 2b: Recalculate portfolio IRR for this date (if complete)
                portfolio_recalc = await self._recalculate_portfolio_irr_for_date(portfolio_id, affected_date)
                if portfolio_recalc:
                    portfolio_irrs_recalculated += 1
            
            result = {
                "success": True,
                "portfolio_id": portfolio_id,
                "dates_processed": len(unique_dates),
                "fund_irrs_recalculated": fund_irrs_recalculated,
                "portfolio_irrs_recalculated": portfolio_irrs_recalculated,
                "processed_dates": unique_dates
            }
            
            logger.info(f"🔄 [IRR CASCADE] ✅ Batch recalculation completed: {result}")
            return result
            
        except Exception as e:
            logger.error(f"🔄 [IRR CASCADE] ❌ Error in batch recalculation: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # ========================================================================
    # 3. VALUATION CREATION/EDIT FLOW
    # ========================================================================
    
    async def handle_fund_valuation_creation_edit(self, portfolio_fund_id: int, valuation_date: str) -> Dict:
        """
        Handle IRR calculation when a portfolio fund valuation is created or edited.
        
        Flow:
        1. Calculate/recalculate portfolio fund IRR for this date
        2. Check if ALL active portfolio funds now have valuations for this date
        3. If complete, calculate/recalculate portfolio IRR
        4. If not complete but portfolio IRR exists, delete it
        
        Args:
            portfolio_fund_id: The portfolio fund that had valuation created/edited
            valuation_date: The date of the valuation (YYYY-MM-DD)
            
        Returns:
            Dict with calculation summary
        """
        logger.info(f"📈 [IRR CASCADE] Starting valuation creation/edit flow for fund {portfolio_fund_id}, date {valuation_date}")
        
        try:
            # Step 1: Get portfolio ID
            portfolio_id = await self._get_portfolio_id_by_fund(portfolio_fund_id)
            if not portfolio_id:
                raise ValueError(f"Could not find portfolio for fund {portfolio_fund_id}")
            
            # Step 2: Calculate/recalculate portfolio fund IRR
            fund_irr_calculated = await self._calculate_and_store_fund_irr(portfolio_fund_id, valuation_date)
            
            # Step 3: Check portfolio completeness for this date
            is_complete = await self._check_portfolio_completeness(portfolio_id, valuation_date)
            
            portfolio_irr_calculated = False
            portfolio_irr_deleted = False
            
            if is_complete:
                # Step 4a: Portfolio is complete - calculate/recalculate portfolio IRR
                portfolio_irr_calculated = await self._calculate_and_store_portfolio_irr(portfolio_id, valuation_date)
            else:
                # Step 4b: Portfolio not complete - delete portfolio IRR if it exists
                portfolio_irr_deleted = await self._delete_portfolio_irr_by_date(portfolio_id, valuation_date)
            
            result = {
                "success": True,
                "portfolio_fund_id": portfolio_fund_id,
                "portfolio_id": portfolio_id,
                "valuation_date": valuation_date,
                "fund_irr_calculated": fund_irr_calculated,
                "portfolio_complete": is_complete,
                "portfolio_irr_calculated": portfolio_irr_calculated,
                "portfolio_irr_deleted": portfolio_irr_deleted
            }
            
            logger.info(f"📈 [IRR CASCADE] ✅ Valuation flow completed: {result}")
            return result
            
        except Exception as e:
            logger.error(f"📈 [IRR CASCADE] ❌ Error in valuation flow: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # ========================================================================
    # 4. HISTORICAL CHANGES IMPACT
    # ========================================================================
    
    async def handle_historical_changes(self, portfolio_id: int, start_date: str) -> Dict:
        """
        Handle IRR recalculation for historical changes - recalculate all IRRs from date onwards.
        
        Flow:
        1. Find all dates with IRRs from start_date onwards
        2. Recalculate all fund IRRs for these dates
        3. Recalculate all portfolio IRRs for these dates
        
        Args:
            portfolio_id: The portfolio affected by historical changes
            start_date: Start date for recalculation (YYYY-MM-DD)
            
        Returns:
            Dict with recalculation summary
        """
        logger.info(f"⏰ [IRR CASCADE] Starting historical recalculation for portfolio {portfolio_id} from {start_date}")
        
        try:
            # Step 1: Find all dates with existing IRRs from start_date onwards
            affected_dates = await self._find_irr_dates_from_date(portfolio_id, start_date)
            
            if not affected_dates:
                logger.info(f"⏰ [IRR CASCADE] No IRR dates found from {start_date} onwards")
                return {"success": True, "dates_processed": 0, "message": "No IRRs to recalculate"}
            
            # Step 2: Use batch recalculation for all affected dates
            result = await self.handle_activity_changes_batch(portfolio_id, affected_dates)
            
            # Update result context for historical changes
            if result.get("success"):
                result["type"] = "historical_recalculation" 
                result["start_date"] = start_date
                logger.info(f"⏰ [IRR CASCADE] ✅ Historical recalculation completed from {start_date}")
            
            return result
            
        except Exception as e:
            logger.error(f"⏰ [IRR CASCADE] ❌ Error in historical recalculation: {str(e)}")
            return {"success": False, "error": str(e)}
    
    # ========================================================================
    # PRIVATE HELPER METHODS
    # ========================================================================
    
    async def _get_fund_valuation_details(self, valuation_id: int) -> Optional[Dict]:
        """Get fund valuation details including portfolio_id"""
        try:
            result = self.db.table("portfolio_fund_valuations")\
                .select("portfolio_fund_id, valuation_date")\
                .eq("id", valuation_id)\
                .execute()
            
            if not result.data:
                return None
            
            valuation_data = result.data[0]
            
            # Get portfolio_id from portfolio_funds
            portfolio_result = self.db.table("portfolio_funds")\
                .select("portfolio_id")\
                .eq("id", valuation_data["portfolio_fund_id"])\
                .execute()
            
            if not portfolio_result.data:
                return None
            
            return {
                "portfolio_fund_id": valuation_data["portfolio_fund_id"],
                "portfolio_id": portfolio_result.data[0]["portfolio_id"],
                "valuation_date": valuation_data["valuation_date"].split('T')[0] if 'T' in str(valuation_data["valuation_date"]) else str(valuation_data["valuation_date"])
            }
            
        except Exception as e:
            logger.error(f"Error getting fund valuation details: {str(e)}")
            return None
    
    async def _delete_fund_irr_by_date(self, fund_id: int, date: str) -> bool:
        """Delete portfolio fund IRR for specific date"""
        try:
            result = self.db.table("portfolio_fund_irr_values")\
                .delete()\
                .eq("fund_id", fund_id)\
                .eq("date", date)\
                .execute()
            
            deleted_count = len(result.data) if result.data else 0
            logger.info(f"🗑️ Deleted {deleted_count} fund IRR records for fund {fund_id} on {date}")
            return deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error deleting fund IRR: {str(e)}")
            return False
    
    async def _check_portfolio_completeness_after_deletion(self, portfolio_id: int, date: str, excluding_fund_id: int) -> bool:
        """Check if portfolio will still be complete after deleting a specific fund's valuation"""
        try:
            # Get all active portfolio funds for this portfolio (excluding the one being deleted)
            active_funds = self.db.table("portfolio_funds")\
                .select("id")\
                .eq("portfolio_id", portfolio_id)\
                .is_("end_date", "null")\
                .neq("id", excluding_fund_id)\
                .execute()
            
            if not active_funds.data:
                return False  # No other active funds, so portfolio won't be complete
            
            # Check if all remaining active funds have valuations for this date
            fund_ids = [f["id"] for f in active_funds.data]
            
            valuations = self.db.table("portfolio_fund_valuations")\
                .select("portfolio_fund_id")\
                .in_("portfolio_fund_id", fund_ids)\
                .eq("valuation_date", date)\
                .execute()
            
            funds_with_valuations = len(set([v["portfolio_fund_id"] for v in valuations.data])) if valuations.data else 0
            
            is_complete = funds_with_valuations == len(fund_ids)
            logger.info(f"📊 Portfolio {portfolio_id} completeness check for {date} (excluding fund {excluding_fund_id}): {funds_with_valuations}/{len(fund_ids)} = {is_complete}")
            
            return is_complete
            
        except Exception as e:
            logger.error(f"Error checking portfolio completeness: {str(e)}")
            return False
    
    async def _delete_portfolio_irr_by_date(self, portfolio_id: int, date: str) -> bool:
        """Delete portfolio IRR for specific date"""
        try:
            result = self.db.table("portfolio_irr_values")\
                .delete()\
                .eq("portfolio_id", portfolio_id)\
                .eq("date", date)\
                .execute()
            
            deleted_count = len(result.data) if result.data else 0
            logger.info(f"🗑️ Deleted {deleted_count} portfolio IRR records for portfolio {portfolio_id} on {date}")
            return deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error deleting portfolio IRR: {str(e)}")
            return False
    
    async def _delete_portfolio_valuation_by_date(self, portfolio_id: int, date: str) -> bool:
        """Delete portfolio valuation for specific date"""
        try:
            result = self.db.table("portfolio_valuations")\
                .delete()\
                .eq("portfolio_id", portfolio_id)\
                .eq("valuation_date", date)\
                .execute()
            
            deleted_count = len(result.data) if result.data else 0
            logger.info(f"🗑️ Deleted {deleted_count} portfolio valuation records for portfolio {portfolio_id} on {date}")
            return deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error deleting portfolio valuation: {str(e)}")
            return False
    
    async def _delete_fund_valuation(self, valuation_id: int) -> bool:
        """Delete the original fund valuation"""
        try:
            result = self.db.table("portfolio_fund_valuations")\
                .delete()\
                .eq("id", valuation_id)\
                .execute()
            
            deleted_count = len(result.data) if result.data else 0
            logger.info(f"🗑️ Deleted fund valuation {valuation_id}")
            return deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error deleting fund valuation: {str(e)}")
            return False
    
    async def _recalculate_all_fund_irrs_for_date(self, portfolio_id: int, date: str) -> int:
        """Recalculate all portfolio fund IRRs for a specific date"""
        try:
            # Get all portfolio funds for this portfolio that have valuations on this date
            funds_with_valuations = self.db.table("portfolio_fund_valuations")\
                .select("portfolio_fund_id")\
                .eq("valuation_date", date)\
                .execute()
            
            if not funds_with_valuations.data:
                logger.info(f"📊 No fund valuations found for portfolio {portfolio_id} on {date}")
                return 0
            
            # Get portfolio funds that belong to this portfolio
            portfolio_funds = self.db.table("portfolio_funds")\
                .select("id")\
                .eq("portfolio_id", portfolio_id)\
                .execute()
            
            portfolio_fund_ids = [pf["id"] for pf in portfolio_funds.data] if portfolio_funds.data else []
            
            # Filter to only funds that belong to this portfolio and have valuations
            relevant_fund_ids = [
                v["portfolio_fund_id"] for v in funds_with_valuations.data 
                if v["portfolio_fund_id"] in portfolio_fund_ids
            ]
            
            recalculated_count = 0
            
            # Recalculate IRR for each relevant fund
            for fund_id in relevant_fund_ids:
                success = await self._calculate_and_store_fund_irr(fund_id, date)
                if success:
                    recalculated_count += 1
            
            logger.info(f"📊 Recalculated {recalculated_count} fund IRRs for portfolio {portfolio_id} on {date}")
            return recalculated_count
            
        except Exception as e:
            logger.error(f"Error recalculating fund IRRs: {str(e)}")
            return 0
    
    async def _recalculate_portfolio_irr_for_date(self, portfolio_id: int, date: str) -> bool:
        """Recalculate portfolio IRR for a specific date if portfolio is complete"""
        try:
            # Check if portfolio is complete for this date
            is_complete = await self._check_portfolio_completeness(portfolio_id, date)
            
            if is_complete:
                # Portfolio is complete - calculate/update portfolio IRR
                return await self._calculate_and_store_portfolio_irr(portfolio_id, date)
            else:
                # Portfolio not complete - delete portfolio IRR if it exists
                await self._delete_portfolio_irr_by_date(portfolio_id, date)
                logger.info(f"📊 Portfolio {portfolio_id} not complete on {date}, portfolio IRR deleted")
                return False
                
        except Exception as e:
            logger.error(f"Error recalculating portfolio IRR: {str(e)}")
            return False
    
    async def _get_portfolio_id_by_fund(self, portfolio_fund_id: int) -> Optional[int]:
        """Get portfolio ID from portfolio fund ID"""
        try:
            result = self.db.table("portfolio_funds")\
                .select("portfolio_id")\
                .eq("id", portfolio_fund_id)\
                .execute()
            
            return result.data[0]["portfolio_id"] if result.data else None
            
        except Exception as e:
            logger.error(f"Error getting portfolio ID: {str(e)}")
            return None
    
    async def _calculate_and_store_fund_irr(self, portfolio_fund_id: int, date: str) -> bool:
        """Calculate and store portfolio fund IRR for specific date"""
        try:
            # Import IRR calculation function
            from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr
            
            # Calculate IRR
            irr_result = await calculate_single_portfolio_fund_irr(
                portfolio_fund_id=portfolio_fund_id,
                irr_date=date,
                db=self.db
            )
            
            if not irr_result.get("success"):
                logger.warning(f"📊 Failed to calculate fund IRR for fund {portfolio_fund_id} on {date}")
                return False
            
            irr_percentage = irr_result.get("irr_percentage", 0.0)
            
            # Get fund valuation ID for this date
            valuation_result = self.db.table("portfolio_fund_valuations")\
                .select("id")\
                .eq("portfolio_fund_id", portfolio_fund_id)\
                .eq("valuation_date", date)\
                .execute()
            
            fund_valuation_id = valuation_result.data[0]["id"] if valuation_result.data else None
            
            # Check if IRR already exists for this fund and date
            existing_irr = self.db.table("portfolio_fund_irr_values")\
                .select("id")\
                .eq("fund_id", portfolio_fund_id)\
                .eq("date", date)\
                .execute()
            
            if existing_irr.data:
                # Update existing IRR
                self.db.table("portfolio_fund_irr_values")\
                    .update({"irr_result": float(irr_percentage)})\
                    .eq("id", existing_irr.data[0]["id"])\
                    .execute()
                logger.info(f"📊 Updated fund IRR for fund {portfolio_fund_id} on {date}: {irr_percentage}%")
            else:
                # Create new IRR record
                irr_data = {
                    "fund_id": portfolio_fund_id,
                    "irr_result": float(irr_percentage),
                    "date": date,
                    "fund_valuation_id": fund_valuation_id
                }
                
                self.db.table("portfolio_fund_irr_values").insert(irr_data).execute()
                logger.info(f"📊 Created fund IRR for fund {portfolio_fund_id} on {date}: {irr_percentage}%")
            
            return True
            
        except Exception as e:
            logger.error(f"Error calculating fund IRR: {str(e)}")
            return False
    
    async def _check_portfolio_completeness(self, portfolio_id: int, date: str) -> bool:
        """Check if all active portfolio funds have valuations for specific date"""
        try:
            # Get all active portfolio funds
            active_funds = self.db.table("portfolio_funds")\
                .select("id")\
                .eq("portfolio_id", portfolio_id)\
                .is_("end_date", "null")\
                .execute()
            
            if not active_funds.data:
                return False
            
            fund_ids = [f["id"] for f in active_funds.data]
            
            # Check valuations for this date
            valuations = self.db.table("portfolio_fund_valuations")\
                .select("portfolio_fund_id")\
                .in_("portfolio_fund_id", fund_ids)\
                .eq("valuation_date", date)\
                .execute()
            
            funds_with_valuations = len(set([v["portfolio_fund_id"] for v in valuations.data])) if valuations.data else 0
            
            is_complete = funds_with_valuations == len(fund_ids)
            logger.info(f"📊 Portfolio {portfolio_id} completeness for {date}: {funds_with_valuations}/{len(fund_ids)} = {is_complete}")
            
            return is_complete
            
        except Exception as e:
            logger.error(f"Error checking portfolio completeness: {str(e)}")
            return False
    
    async def _calculate_and_store_portfolio_irr(self, portfolio_id: int, date: str) -> bool:
        """Calculate and store portfolio IRR for specific date"""
        try:
            # Import portfolio IRR calculation function
            from app.api.routes.holding_activity_logs import calculate_multiple_portfolio_funds_irr
            
            # Get all portfolio fund IDs for this portfolio
            portfolio_funds = self.db.table("portfolio_funds")\
                .select("id")\
                .eq("portfolio_id", portfolio_id)\
                .execute()
            
            if not portfolio_funds.data:
                return False
            
            fund_ids = [pf["id"] for pf in portfolio_funds.data]
            
            # Calculate portfolio IRR
            irr_result = await calculate_multiple_portfolio_funds_irr(
                portfolio_fund_ids=fund_ids,
                irr_date=date,
                db=self.db
            )
            
            if not irr_result.get("success"):
                logger.warning(f"📊 Failed to calculate portfolio IRR for portfolio {portfolio_id} on {date}")
                return False
            
            irr_percentage = irr_result.get("irr_percentage", 0.0)
            
            # Get portfolio valuation ID for this date
            valuation_result = self.db.table("portfolio_valuations")\
                .select("id")\
                .eq("portfolio_id", portfolio_id)\
                .eq("valuation_date", date)\
                .execute()
            
            portfolio_valuation_id = valuation_result.data[0]["id"] if valuation_result.data else None
            
            # Check if portfolio IRR already exists
            existing_irr = self.db.table("portfolio_irr_values")\
                .select("id")\
                .eq("portfolio_id", portfolio_id)\
                .eq("date", date)\
                .execute()
            
            if existing_irr.data:
                # Update existing portfolio IRR
                self.db.table("portfolio_irr_values")\
                    .update({"irr_result": float(irr_percentage)})\
                    .eq("id", existing_irr.data[0]["id"])\
                    .execute()
                logger.info(f"📊 Updated portfolio IRR for portfolio {portfolio_id} on {date}: {irr_percentage}%")
            else:
                # Create new portfolio IRR record
                irr_data = {
                    "portfolio_id": portfolio_id,
                    "irr_result": float(irr_percentage),
                    "date": date,
                    "portfolio_valuation_id": portfolio_valuation_id
                }
                
                self.db.table("portfolio_irr_values").insert(irr_data).execute()
                logger.info(f"📊 Created portfolio IRR for portfolio {portfolio_id} on {date}: {irr_percentage}%")
            
            return True
            
        except Exception as e:
            logger.error(f"Error calculating portfolio IRR: {str(e)}")
            return False
    
    async def _find_irr_dates_from_date(self, portfolio_id: int, start_date: str) -> List[str]:
        """Find all dates with IRRs from start_date onwards"""
        try:
            # Get fund IRR dates
            fund_irr_dates = self.db.table("portfolio_fund_irr_values")\
                .select("date")\
                .gte("date", start_date)\
                .execute()
            
            # Get portfolio IRR dates
            portfolio_irr_dates = self.db.table("portfolio_irr_values")\
                .select("date")\
                .eq("portfolio_id", portfolio_id)\
                .gte("date", start_date)\
                .execute()
            
            # Combine and deduplicate dates
            all_dates = set()
            
            if fund_irr_dates.data:
                for record in fund_irr_dates.data:
                    date_str = record["date"].split('T')[0] if 'T' in str(record["date"]) else str(record["date"])
                    all_dates.add(date_str)
            
            if portfolio_irr_dates.data:
                for record in portfolio_irr_dates.data:
                    date_str = record["date"].split('T')[0] if 'T' in str(record["date"]) else str(record["date"])
                    all_dates.add(date_str)
            
            return sorted(list(all_dates))
            
        except Exception as e:
            logger.error(f"Error finding IRR dates: {str(e)}")
            return [] 