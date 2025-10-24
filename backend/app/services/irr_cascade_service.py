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
import math
from typing import List, Dict, Set, Optional, Tuple
from datetime import datetime, date

logger = logging.getLogger(__name__)

def safe_irr_value(value, default=0.0):
    """
    Safely validate an IRR value to ensure it can be JSON serialized and stored in database.
    Returns the validated float value or raises an error for critical failures.
    """
    if value is None:
        logger.warning(f"IRR value is None, using default: {default}")
        return default
    
    try:
        float_val = float(value)
        # Check for JSON-incompatible float values that corrupt the database
        if math.isnan(float_val) or math.isinf(float_val):
            error_msg = f"CRITICAL: IRR calculation produced invalid value {float_val}. This would corrupt the database."
            logger.error(error_msg)
            raise ValueError(error_msg)
        return float_val
    except (ValueError, TypeError) as e:
        error_msg = f"CRITICAL: Could not convert IRR value {value} to valid float: {str(e)}"
        logger.error(error_msg)
        raise ValueError(error_msg)

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
                logger.warning(f"🗑️ [CASCADE] Portfolio {portfolio_id} will be incomplete on {valuation_date} after deleting fund {fund_id} valuation - cascading deletion")
                portfolio_irr_deleted = await self._delete_portfolio_irr_by_date(portfolio_id, valuation_date)
                portfolio_valuation_deleted = await self._delete_portfolio_valuation_by_date(portfolio_id, valuation_date)
                logger.info(f"🗑️ [CASCADE] Cascade deletion completed: IRR deleted={portfolio_irr_deleted}, Valuation deleted={portfolio_valuation_deleted}")
            else:
                logger.info(f"✅ [CASCADE] Portfolio {portfolio_id} remains complete on {valuation_date} after deleting fund {fund_id} valuation - no cascade needed")
            
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
        
        FIXED: Activity changes affect all valuation dates on or after the activity date,
        not just the activity date itself.
        
        Flow:
        1. For each activity date, find all valuation dates on or after that date
        2. Recalculate IRRs for all affected valuation dates
        3. Process dates in chronological order for consistency
        
        Args:
            portfolio_id: The portfolio affected by activity changes
            affected_dates: List of dates (YYYY-MM-DD) affected by activity changes
            
        Returns:
            Dict with recalculation summary
        """
        logger.info(f"🔄 [IRR CASCADE] Starting batch IRR recalculation for portfolio {portfolio_id}, activity dates: {affected_dates}")
        
        try:
            # Step 1: Find the earliest activity date
            unique_activity_dates = sorted(list(set(affected_dates)))
            earliest_activity_date = unique_activity_dates[0] if unique_activity_dates else None
            
            if not earliest_activity_date:
                logger.warning(f"🔄 [IRR CASCADE] No activity dates provided")
                return {"success": True, "dates_processed": 0, "fund_irrs_recalculated": 0, "portfolio_irrs_recalculated": 0}
            
            logger.info(f"🔄 [IRR CASCADE] Activity dates: {unique_activity_dates}, earliest: {earliest_activity_date}")
            
            # Step 2: Find all valuation dates affected by these activity changes
            # Activities affect all valuation dates on or after the earliest activity date
            affected_valuation_dates = await self._find_valuation_dates_from_date(portfolio_id, earliest_activity_date)
            
            if not affected_valuation_dates:
                logger.info(f"🔄 [IRR CASCADE] No fund valuations found on or after {earliest_activity_date}")
                return {"success": True, "dates_processed": 0, "fund_irrs_recalculated": 0, "portfolio_irrs_recalculated": 0, "message": "No valuations affected"}
            
            logger.info(f"🔄 [IRR CASCADE] Found {len(affected_valuation_dates)} valuation dates to recalculate: {affected_valuation_dates}")
            
            fund_irrs_recalculated = 0
            portfolio_irrs_recalculated = 0
            
            # Step 3: For each affected valuation date, recalculate IRRs
            for valuation_date in affected_valuation_dates:
                logger.info(f"🔄 [IRR CASCADE] Processing valuation date {valuation_date}")
                
                # Step 3a: Recalculate ALL portfolio fund IRRs for this valuation date
                fund_count = await self._recalculate_all_fund_irrs_for_date(portfolio_id, valuation_date)
                fund_irrs_recalculated += fund_count
                
                # Step 3b: Recalculate portfolio IRR for this valuation date (if complete)
                portfolio_recalc = await self._recalculate_portfolio_irr_for_date(portfolio_id, valuation_date)
                if portfolio_recalc:
                    portfolio_irrs_recalculated += 1
            
            result = {
                "success": True,
                "portfolio_id": portfolio_id,
                "dates_processed": len(affected_valuation_dates),
                "fund_irrs_recalculated": fund_irrs_recalculated,
                "portfolio_irrs_recalculated": portfolio_irrs_recalculated,
                "processed_dates": affected_valuation_dates,
                "activity_dates": unique_activity_dates,
                "earliest_activity_date": earliest_activity_date
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
        logger.info(f"📈 [IRR CASCADE] ==================== VALUATION CREATION/EDIT FLOW ====================")
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
            # Get fund valuation details
            result = await self.db.fetchrow(
                "SELECT portfolio_fund_id, valuation_date FROM portfolio_fund_valuations WHERE id = $1",
                valuation_id
            )
            
            if not result:
                return None
            
            valuation_data = dict(result)
            
            # Get portfolio_id from portfolio_funds
            portfolio_result = await self.db.fetchrow(
                "SELECT portfolio_id FROM portfolio_funds WHERE id = $1",
                valuation_data["portfolio_fund_id"]
            )
            
            if not portfolio_result:
                return None
            
            return {
                "portfolio_fund_id": valuation_data["portfolio_fund_id"],
                "portfolio_id": portfolio_result["portfolio_id"],
                "valuation_date": valuation_data["valuation_date"].split('T')[0] if 'T' in str(valuation_data["valuation_date"]) else str(valuation_data["valuation_date"])
            }
            
        except Exception as e:
            logger.error(f"Error getting fund valuation details: {str(e)}")
            return None
    
    async def _delete_fund_irr_by_date(self, fund_id: int, date: str) -> bool:
        """Delete portfolio fund IRR for specific date"""
        try:
            # Convert string date to date object for PostgreSQL comparison
            from datetime import datetime
            if isinstance(date, str):
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            else:
                date_obj = date
                
            # Delete fund IRR records
            deleted_count_str = await self.db.execute(
                "DELETE FROM portfolio_fund_irr_values WHERE fund_id = $1 AND date = $2",
                int(fund_id), date_obj
            )
            
            # Parse the delete count from the returned string (e.g., "DELETE 1" -> 1)
            deleted_count = int(deleted_count_str.split()[-1]) if deleted_count_str and isinstance(deleted_count_str, str) else 0
            logger.info(f"🗑️ Deleted {deleted_count} fund IRR records for fund {fund_id} on {date}")
            return deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error deleting fund IRR: {str(e)}")
            return False
    
    async def _check_portfolio_completeness_after_deletion(self, portfolio_id: int, date: str, excluding_fund_id: int) -> bool:
        """Check if portfolio will still be complete after deleting a specific fund's valuation"""
        try:
            # FIXED: Get ALL active portfolio funds (including the one being deleted)
            # We need to check if ALL active funds will have valuations AFTER the deletion
            all_active_funds = await self.db.fetch(
                "SELECT id FROM portfolio_funds WHERE portfolio_id = $1 AND status = $2",
                int(portfolio_id), "active"
            )
            
            if not all_active_funds:
                logger.info(f"🔍 No active funds found in portfolio {portfolio_id}")
                return False
            
            # Ensure all fund IDs are integers
            all_fund_ids = [int(f["id"]) for f in all_active_funds]
            excluding_fund_id = int(excluding_fund_id)  # Ensure excluding_fund_id is also an integer
            logger.info(f"🔍 Portfolio {portfolio_id} has {len(all_fund_ids)} active funds: {all_fund_ids}")
            
            # Convert string date to date object for PostgreSQL comparison
            from datetime import datetime
            if isinstance(date, str):
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            else:
                date_obj = date
            
            # Get current valuations for this date (BEFORE deletion)
            current_valuations = await self.db.fetch(
                "SELECT portfolio_fund_id FROM portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[]) AND valuation_date = $2",
                all_fund_ids, date_obj
            )
            
            # Ensure all portfolio_fund_ids from database are integers
            current_funds_with_valuations = set([int(v["portfolio_fund_id"]) for v in current_valuations]) if current_valuations else set()
            
            # Simulate what will happen AFTER deleting the specified fund's valuation
            funds_with_valuations_after_deletion = current_funds_with_valuations.copy()
            if excluding_fund_id in funds_with_valuations_after_deletion:
                funds_with_valuations_after_deletion.remove(excluding_fund_id)
            
            # Check if ALL active funds will have valuations after the deletion
            is_complete = len(funds_with_valuations_after_deletion) == len(all_fund_ids)
            
            logger.info(f"📊 Portfolio {portfolio_id} completeness check for {date}:")
            logger.info(f"   • Total active funds: {len(all_fund_ids)}")
            logger.info(f"   • Funds with valuations before deletion: {len(current_funds_with_valuations)}")
            logger.info(f"   • Funds with valuations after deleting fund {excluding_fund_id}: {len(funds_with_valuations_after_deletion)}")
            logger.info(f"   • Will be complete: {is_complete}")
            
            if not is_complete:
                missing_funds = [f for f in all_fund_ids if f not in funds_with_valuations_after_deletion]
                logger.info(f"🚨 Portfolio {portfolio_id} will be incomplete on {date}: missing valuations for funds {missing_funds}")
            
            return is_complete
            
        except Exception as e:
            logger.error(f"Error checking portfolio completeness: {str(e)}")
            return False
    
    async def _delete_portfolio_irr_by_date(self, portfolio_id: int, date: str) -> bool:
        """Delete portfolio IRR for specific date with enhanced debugging and format handling"""
        try:
            # Convert string date to date object for PostgreSQL comparison
            from datetime import datetime
            if isinstance(date, str):
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            else:
                date_obj = date
                
            # ENHANCED DEBUG: Check ALL portfolio IRR records to see what exists
            all_records = await self.db.fetch(
                "SELECT id, irr_result, date, created_at FROM portfolio_irr_values WHERE portfolio_id = $1",
                int(portfolio_id)
            )
            
            logger.info(f"🔍 [PORTFOLIO IRR DELETE] Portfolio {portfolio_id} has {len(all_records)} total IRR records")
            
            if all_records:
                for record in all_records:
                    # Ensure record ID is treated as integer for consistent logging
                    record_id = int(record['id']) if record['id'] is not None else 'N/A'
                    logger.info(f"🔍 [PORTFOLIO IRR DELETE] All records - ID {record_id}: IRR={record.get('irr_result', 'N/A')}%, Date='{record['date']}'")
            
            # Check what records exist for the specific date
            check_result = await self.db.fetch(
                "SELECT id, irr_result, date, created_at FROM portfolio_irr_values WHERE portfolio_id = $1 AND date = $2",
                int(portfolio_id), date_obj
            )
            
            logger.info(f"🔍 [PORTFOLIO IRR DELETE] Targeting date '{date}': found {len(check_result)} exact matches")
            
            if check_result:
                for record in check_result:
                    # Ensure record ID is treated as integer for consistent logging
                    record_id = int(record['id']) if record['id'] is not None else 'N/A'
                    logger.info(f"🔍 [PORTFOLIO IRR DELETE] Target match - ID {record_id}: IRR={record.get('irr_result', 'N/A')}%, Date='{record['date']}'")
            
            # Delete the portfolio IRRs using the date object
            deleted_count_str = await self.db.execute(
                "DELETE FROM portfolio_irr_values WHERE portfolio_id = $1 AND date = $2",
                int(portfolio_id), date_obj
            )
            
            # Parse the delete count from the returned string (e.g., "DELETE 1" -> 1)
            deleted_count = int(deleted_count_str.split()[-1]) if deleted_count_str and isinstance(deleted_count_str, str) else 0
            logger.info(f"🗑️ Deleted {deleted_count} portfolio IRR records for portfolio {portfolio_id} on '{date}'")
            
            # ENHANCED DEBUG: Double-check that records are actually gone
            verify_result = await self.db.fetch(
                "SELECT id, irr_result, date FROM portfolio_irr_values WHERE portfolio_id = $1",
                int(portfolio_id)
            )
            
            remaining_total = len(verify_result)
            logger.info(f"🔍 [PORTFOLIO IRR DELETE] After deletion, portfolio {portfolio_id} has {remaining_total} total IRR records remaining")
            
            if verify_result:
                for record in verify_result:
                    # Ensure record ID is treated as integer for consistent logging
                    record_id = int(record['id']) if record['id'] is not None else 'N/A'
                    logger.info(f"🔍 [PORTFOLIO IRR DELETE] Remaining record ID {record_id}: IRR={record.get('irr_result', 'N/A')}%, Date='{record['date']}'")
            
            return deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error deleting portfolio IRR: {str(e)}")
            return False
    
    async def _delete_portfolio_valuation_by_date(self, portfolio_id: int, date: str) -> bool:
        """Delete portfolio valuation for specific date"""
        try:
            # Convert string date to date object for PostgreSQL comparison
            from datetime import datetime
            if isinstance(date, str):
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            else:
                date_obj = date
                
            # First, check if any portfolio valuations exist for this date
            check_result = await self.db.fetch(
                "SELECT id, valuation_date FROM portfolio_valuations WHERE portfolio_id = $1 AND valuation_date = $2",
                int(portfolio_id), date_obj
            )
            
            logger.info(f"🔍 [PORTFOLIO VALUATION] Checking portfolio {portfolio_id} on {date}: found {len(check_result)} records")
            
            if check_result:
                for record in check_result:
                    # Ensure record ID is treated as integer for consistent logging
                    record_id = int(record['id']) if record['id'] is not None else 'N/A'
                    logger.info(f"🔍 [PORTFOLIO VALUATION] Found record ID {record_id} with date {record['valuation_date']}")
            
            # Delete the portfolio valuations
            deleted_count_str = await self.db.execute(
                "DELETE FROM portfolio_valuations WHERE portfolio_id = $1 AND valuation_date = $2",
                int(portfolio_id), date_obj
            )
            
            # Parse the delete count from the returned string (e.g., "DELETE 0" -> 0)
            deleted_count = int(deleted_count_str.split()[-1]) if deleted_count_str and isinstance(deleted_count_str, str) else 0
            logger.info(f"🗑️ Deleted {deleted_count} portfolio valuation records for portfolio {portfolio_id} on {date}")
            
            if deleted_count == 0 and check_result:
                logger.warning(f"⚠️ [PORTFOLIO VALUATION] Found {len(check_result)} records but deleted 0 - possible date format mismatch")
            
            return deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error deleting portfolio valuation: {str(e)}")
            return False
    
    async def _delete_fund_valuation(self, valuation_id: int) -> bool:
        """Delete the original fund valuation"""
        try:
            deleted_count_str = await self.db.execute(
                "DELETE FROM portfolio_fund_valuations WHERE id = $1",
                int(valuation_id)
            )
            
            # Parse the delete count from the returned string (e.g., "DELETE 1" -> 1)
            deleted_count = int(deleted_count_str.split()[-1]) if deleted_count_str and isinstance(deleted_count_str, str) else 0
            logger.info(f"🗑️ Deleted fund valuation {valuation_id}")
            return deleted_count > 0
            
        except Exception as e:
            logger.error(f"Error deleting fund valuation: {str(e)}")
            return False
    
    async def _recalculate_all_fund_irrs_for_date(self, portfolio_id: int, date: str) -> int:
        """Recalculate all portfolio fund IRRs for a specific date"""
        try:
            logger.info(f"🔍 [BATCH IRR CALC] ========== RECALCULATING ALL FUND IRRs FOR DATE ==========")
            logger.info(f"🔍 [BATCH IRR CALC] Portfolio ID: {portfolio_id}, Date: {date}")

            # Convert string date to date object for PostgreSQL comparison
            from datetime import datetime
            if isinstance(date, str):
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            else:
                date_obj = date

            logger.info(f"🔍 [BATCH IRR CALC] Converted date to date_obj: {date_obj}")

            # Get all portfolio funds for this portfolio that have valuations on this date
            funds_with_valuations = await self.db.fetch(
                "SELECT portfolio_fund_id FROM portfolio_fund_valuations WHERE valuation_date = $1",
                date_obj
            )

            logger.info(f"🔍 [BATCH IRR CALC] Found {len(funds_with_valuations)} funds with valuations on {date}")

            if not funds_with_valuations:
                logger.info(f"📊 No fund valuations found for portfolio {portfolio_id} on {date}")
                return 0

            # Get portfolio funds that belong to this portfolio
            portfolio_funds = await self.db.fetch(
                "SELECT id FROM portfolio_funds WHERE portfolio_id = $1",
                portfolio_id
            )

            logger.info(f"🔍 [BATCH IRR CALC] Portfolio {portfolio_id} has {len(portfolio_funds)} total funds")

            # Ensure all IDs are integers for consistent type comparison
            portfolio_fund_ids = [int(pf["id"]) for pf in portfolio_funds] if portfolio_funds else []

            # Filter to only funds that belong to this portfolio and have valuations
            logger.info(f"🔍 [BATCH IRR CALC] Funds with valuations on {date}: {[int(v['portfolio_fund_id']) for v in funds_with_valuations]}")
            logger.info(f"🔍 [BATCH IRR CALC] Portfolio fund IDs: {portfolio_fund_ids}")

            relevant_fund_ids = [
                int(v["portfolio_fund_id"]) for v in funds_with_valuations
                if int(v["portfolio_fund_id"]) in portfolio_fund_ids
            ]

            logger.info(f"🔍 [BATCH IRR CALC] Relevant fund IDs for IRR calculation: {relevant_fund_ids}")
            logger.info(f"🔍 [BATCH IRR CALC] Expected 8 funds, got {len(relevant_fund_ids)} funds")

            if 1536 not in relevant_fund_ids:
                logger.warning(f"🔍 [BATCH IRR CALC] ⚠️ Cash fund (1536) is MISSING from relevant_fund_ids!")
                logger.warning(f"🔍 [BATCH IRR CALC] ⚠️ Checking if 1536 has valuation on {date}...")
                cash_valuation_check = await self.db.fetch(
                    "SELECT id, valuation FROM portfolio_fund_valuations WHERE portfolio_fund_id = 1536 AND valuation_date = $1",
                    date_obj
                )
                logger.warning(f"🔍 [BATCH IRR CALC] ⚠️ Cash valuation check result: {cash_valuation_check}")

            recalculated_count = 0

            # Recalculate IRR for each relevant fund
            for fund_id in relevant_fund_ids:
                logger.info(f"🔍 [BATCH IRR CALC] Processing fund {fund_id} for date {date}")
                success = await self._calculate_and_store_fund_irr(fund_id, date)
                if success:
                    recalculated_count += 1
                    logger.info(f"🔍 [BATCH IRR CALC] ✅ Successfully calculated IRR for fund {fund_id}")
                else:
                    logger.warning(f"🔍 [BATCH IRR CALC] ❌ Failed to calculate IRR for fund {fund_id}")
            
            # FIXED: Invalidate IRR cache for recalculated funds to prevent stale cached results
            if recalculated_count > 0:
                try:
                    from app.utils.irr_cache import get_irr_cache
                    irr_cache = get_irr_cache()
                    invalidated_count = await irr_cache.invalidate_portfolio_funds(relevant_fund_ids)
                    logger.info(f"🗑️ Invalidated {invalidated_count} IRR cache entries for {recalculated_count} recalculated funds")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to invalidate IRR cache: {str(e)}")
            
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
            result = await self.db.fetchrow(
                "SELECT portfolio_id FROM portfolio_funds WHERE id = $1",
                portfolio_fund_id
            )
            
            return result["portfolio_id"] if result else None
            
        except Exception as e:
            logger.error(f"Error getting portfolio ID: {str(e)}")
            return None
    
    async def _calculate_and_store_fund_irr(self, portfolio_fund_id: int, date: str) -> bool:
        """Calculate and store portfolio fund IRR for specific date"""
        try:
            logger.info(f"🔍 [FUND IRR CALC] ========== CALCULATING FUND IRR ==========")
            logger.info(f"🔍 [FUND IRR CALC] Fund ID: {portfolio_fund_id}, Date: {date}")

            # Convert string date to date object for PostgreSQL comparison
            from datetime import datetime
            if isinstance(date, str):
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            else:
                date_obj = date

            logger.info(f"🔍 [FUND IRR CALC] Converted date to date_obj: {date_obj}")

            # Import IRR calculation function
            from app.api.routes.portfolio_funds import calculate_single_portfolio_fund_irr
            
                         # Calculate IRR with cache bypass for fresh calculation
            logger.info(f"🔍 [FUND IRR CALC] Calling calculate_single_portfolio_fund_irr with bypass_cache=True")

            irr_result = await calculate_single_portfolio_fund_irr(
                portfolio_fund_id=portfolio_fund_id,
                irr_date=date,
                bypass_cache=True,  # Force fresh calculation during cascade operations
                db=self.db
             )

            logger.info(f"🔍 [FUND IRR CALC] IRR calculation returned: {irr_result}")

            if not irr_result.get("success"):
                logger.warning(f"📊 Failed to calculate fund IRR for fund {portfolio_fund_id} on {date}")
                logger.warning(f"📊 Failure details: {irr_result}")
                return False
            
            irr_percentage = safe_irr_value(irr_result.get("irr_percentage", 0.0))

            logger.info(f"🔍 [FUND IRR CALC] Calculated IRR percentage: {irr_percentage}%")

            # Get fund valuation ID for this date
            logger.info(f"🔍 [FUND IRR CALC] Looking for fund valuation with fund_id={portfolio_fund_id}, date={date_obj}")

            valuation_result = await self.db.fetchrow(
                "SELECT id FROM portfolio_fund_valuations WHERE portfolio_fund_id = $1 AND valuation_date = $2",
                portfolio_fund_id, date_obj
            )

            fund_valuation_id = valuation_result["id"] if valuation_result else None
            logger.info(f"🔍 [FUND IRR CALC] Fund valuation ID: {fund_valuation_id}")

            # Check if IRR already exists for this fund and date
            logger.info(f"🔍 [FUND IRR CALC] Checking for existing IRR record with fund_id={portfolio_fund_id}, date={date_obj}")

            existing_irr = await self.db.fetchrow(
                "SELECT id FROM portfolio_fund_irr_values WHERE fund_id = $1 AND date = $2",
                portfolio_fund_id, date_obj
            )

            if existing_irr:
                logger.info(f"🔍 [FUND IRR CALC] Found existing IRR record with ID: {existing_irr['id']}")
            else:
                logger.info(f"🔍 [FUND IRR CALC] No existing IRR record found - will create new one")
            
            if existing_irr:
                # Update existing IRR
                logger.info(f"🔍 [FUND IRR CALC] Updating existing IRR ID {existing_irr['id']} with value {irr_percentage}%")

                await self.db.execute(
                    "UPDATE portfolio_fund_irr_values SET irr_result = $1, fund_valuation_id = $2 WHERE id = $3",
                    irr_percentage, fund_valuation_id, existing_irr["id"]
                )
                logger.info(f"📊 ✅ Updated fund IRR for fund {portfolio_fund_id} on {date}: {irr_percentage}%")
            else:
                # Create new IRR record
                logger.info(f"🔍 [FUND IRR CALC] Creating new IRR record: fund_id={portfolio_fund_id}, irr={irr_percentage}%, date={date_obj}, valuation_id={fund_valuation_id}")

                try:
                    await self.db.execute(
                        "INSERT INTO portfolio_fund_irr_values (fund_id, irr_result, date, fund_valuation_id) VALUES ($1, $2, $3, $4)",
                        portfolio_fund_id, irr_percentage, date_obj, fund_valuation_id
                    )
                    logger.info(f"📊 ✅ Created fund IRR for fund {portfolio_fund_id} on {date}: {irr_percentage}%")
                except Exception as insert_error:
                    if "duplicate key" in str(insert_error).lower():
                        # Race condition - record was inserted by another process, try to update
                        logger.warning(f"Race condition detected, attempting update for fund {portfolio_fund_id} on {date}")
                        await self.db.execute(
                            "UPDATE portfolio_fund_irr_values SET irr_result = $1, fund_valuation_id = $2 WHERE fund_id = $3 AND date = $4",
                            irr_percentage, fund_valuation_id, portfolio_fund_id, date_obj
                        )
                        logger.info(f"📊 Updated fund IRR (race condition) for fund {portfolio_fund_id} on {date}: {irr_percentage}%")
                    else:
                        raise insert_error
            
            # FIXED: Invalidate IRR cache for this fund to prevent stale cached results
            try:
                from app.utils.irr_cache import get_irr_cache
                irr_cache = get_irr_cache()
                await irr_cache.invalidate_portfolio_funds([portfolio_fund_id])
                logger.debug(f"🗑️ Invalidated IRR cache for fund {portfolio_fund_id}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to invalidate IRR cache for fund {portfolio_fund_id}: {str(e)}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error calculating fund IRR: {str(e)}")
            return False
    
    async def _check_portfolio_completeness(self, portfolio_id: int, date: str) -> bool:
        """Check if all active portfolio funds have valuations for specific date"""
        try:
            # Get all active portfolio funds
            # FIXED: Use consistent "active" status filtering instead of end_date check
            active_funds = await self.db.fetch(
                "SELECT id FROM portfolio_funds WHERE portfolio_id = $1 AND status = $2",
                int(portfolio_id), "active"
            )
            
            if not active_funds:
                logger.info(f"🔍 No active funds found in portfolio {portfolio_id}")
                return False
            
            # Ensure fund IDs are integers for consistent type comparison
            fund_ids = [int(f["id"]) for f in active_funds]
            
            # Check valuations for this date
            # Convert string date to date object for PostgreSQL comparison
            from datetime import datetime
            if isinstance(date, str):
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            else:
                date_obj = date
                
            valuations = await self.db.fetch(
                "SELECT portfolio_fund_id FROM portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[]) AND valuation_date = $2",
                fund_ids, date_obj
            )
            
            # Ensure portfolio_fund_ids are integers for consistent type comparison
            funds_with_valuations = len(set([int(v["portfolio_fund_id"]) for v in valuations])) if valuations else 0
            
            is_complete = funds_with_valuations == len(fund_ids)
            logger.info(f"📊 Portfolio {portfolio_id} completeness for {date}: {funds_with_valuations}/{len(fund_ids)} = {is_complete}")
            
            return is_complete
            
        except Exception as e:
            logger.error(f"Error checking portfolio completeness: {str(e)}")
            return False
    
    async def _calculate_and_store_portfolio_irr(self, portfolio_id: int, date: str) -> bool:
        """Calculate and store portfolio IRR for specific date"""
        try:
            # Convert string date to date object for PostgreSQL comparison
            from datetime import datetime
            if isinstance(date, str):
                date_obj = datetime.strptime(date, '%Y-%m-%d').date()
            else:
                date_obj = date
            # Import portfolio IRR calculation function
            from app.api.routes.portfolio_funds import calculate_multiple_portfolio_funds_irr
            
            # Get all portfolio fund IDs for this portfolio
            portfolio_funds = await self.db.fetch(
                "SELECT id FROM portfolio_funds WHERE portfolio_id = $1",
                portfolio_id
            )
            
            if not portfolio_funds:
                return False
            
            fund_ids = [int(pf["id"]) for pf in portfolio_funds]
            
            # FIXED: Clear ALL cache BEFORE calculation to ensure fresh data is used
            try:
                from app.utils.irr_cache import get_irr_cache
                irr_cache = get_irr_cache()
                
                # First try targeted invalidation
                invalidated_count = await irr_cache.invalidate_portfolio_funds(fund_ids)
                
                # If targeted invalidation didn't work, clear all cache entries
                if invalidated_count == 0:
                    logger.warning(f"⚠️ Targeted cache invalidation found 0 entries, clearing entire cache for portfolio {portfolio_id}")
                    cleared_count = await irr_cache.clear_all()
                    logger.info(f"🗑️ Pre-calculation: Cleared {cleared_count} total cache entries to ensure fresh calculation")
                else:
                    logger.debug(f"🗑️ Pre-calculation: Invalidated {invalidated_count} targeted IRR cache entries for portfolio {portfolio_id}")
                    
            except Exception as e:
                logger.warning(f"⚠️ Failed to clear IRR cache for portfolio {portfolio_id}: {str(e)}")
            
                         # Calculate portfolio IRR with cache bypass for fresh calculation
            irr_result = await calculate_multiple_portfolio_funds_irr(
                portfolio_fund_ids=fund_ids,
                irr_date=date,
                bypass_cache=True,  # Force fresh calculation during cascade operations
                db=self.db
            )
            
            if not irr_result.get("success"):
                logger.warning(f"📊 Failed to calculate portfolio IRR for portfolio {portfolio_id} on {date}")
                return False
            
            irr_percentage = safe_irr_value(irr_result.get("irr_percentage", 0.0))
            
            # Get portfolio valuation ID for this date
            valuation_result = await self.db.fetchrow(
                "SELECT id FROM portfolio_valuations WHERE portfolio_id = $1 AND valuation_date = $2",
                portfolio_id, date_obj
            )
            
            portfolio_valuation_id = valuation_result["id"] if valuation_result else None
            
            # Check if portfolio IRR already exists for this date
            existing_irr = await self.db.fetchrow(
                "SELECT id FROM portfolio_irr_values WHERE portfolio_id = $1 AND date = $2",
                portfolio_id, date_obj
            )

            if existing_irr:
                # Update existing record
                await self.db.execute(
                    "UPDATE portfolio_irr_values SET irr_result = $1, portfolio_valuation_id = $2 WHERE id = $3",
                    irr_percentage, portfolio_valuation_id, existing_irr["id"]
                )
                logger.info(f"📊 Updated portfolio IRR for portfolio {portfolio_id} on {date}: {irr_percentage}%")
            else:
                # Insert new record (with duplicate handling)
                try:
                    await self.db.execute(
                        "INSERT INTO portfolio_irr_values (portfolio_id, irr_result, date, portfolio_valuation_id) VALUES ($1, $2, $3, $4)",
                        portfolio_id, irr_percentage, date_obj, portfolio_valuation_id
                    )
                    logger.info(f"📊 Inserted portfolio IRR for portfolio {portfolio_id} on {date}: {irr_percentage}%")
                except Exception as insert_error:
                    # If duplicate key error (race condition), try to update instead
                    if "duplicate key" in str(insert_error).lower() or "unique constraint" in str(insert_error).lower():
                        logger.warning(f"⚠️ Duplicate portfolio IRR detected (race condition), updating instead for portfolio {portfolio_id} on {date}")
                        existing_irr = await self.db.fetchrow(
                            "SELECT id FROM portfolio_irr_values WHERE portfolio_id = $1 AND date = $2",
                            portfolio_id, date_obj
                        )
                        if existing_irr:
                            await self.db.execute(
                                "UPDATE portfolio_irr_values SET irr_result = $1, portfolio_valuation_id = $2 WHERE id = $3",
                                irr_percentage, portfolio_valuation_id, existing_irr["id"]
                            )
                            logger.info(f"📊 Updated portfolio IRR after race condition for portfolio {portfolio_id} on {date}: {irr_percentage}%")
                    else:
                        raise insert_error
            
            return True
            
        except Exception as e:
            logger.error(f"Error calculating portfolio IRR: {str(e)}")
            return False
    
    async def _find_valuation_dates_from_date(self, portfolio_id: int, start_date: str) -> List[str]:
        """Find all fund valuation dates for this portfolio from start_date onwards"""
        try:
            # Get all portfolio funds for this portfolio
            portfolio_funds = await self.db.fetch(
                "SELECT id FROM portfolio_funds WHERE portfolio_id = $1",
                portfolio_id
            )
            
            if not portfolio_funds:
                logger.info(f"🔍 No portfolio funds found for portfolio {portfolio_id}")
                return []
            
            fund_ids = [int(pf["id"]) for pf in portfolio_funds]
            
            # Get all valuation dates for these funds from start_date onwards
            # Convert string date to date object for PostgreSQL comparison
            from datetime import datetime
            if isinstance(start_date, str):
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            else:
                start_date_obj = start_date
                
            valuations = await self.db.fetch(
                "SELECT valuation_date FROM portfolio_fund_valuations WHERE portfolio_fund_id = ANY($1::int[]) AND valuation_date >= $2",
                fund_ids, start_date_obj
            )
            
            if not valuations:
                logger.info(f"🔍 No fund valuations found for portfolio {portfolio_id} from {start_date} onwards")
                return []
            
            # Deduplicate and sort dates
            unique_dates = set()
            for record in valuations:
                date_str = record["valuation_date"].split('T')[0] if 'T' in str(record["valuation_date"]) else str(record["valuation_date"])
                unique_dates.add(date_str)
            
            sorted_dates = sorted(list(unique_dates))
            logger.info(f"🔍 Found {len(sorted_dates)} unique valuation dates for portfolio {portfolio_id} from {start_date}: {sorted_dates}")
            
            return sorted_dates
            
        except Exception as e:
            logger.error(f"Error finding valuation dates: {str(e)}")
            return []
 
    async def _find_irr_dates_from_date(self, portfolio_id: int, start_date: str) -> List[str]:
        """Find all dates with IRRs from start_date onwards"""
        try:
            # Convert string date to date object for PostgreSQL comparison
            from datetime import datetime
            if isinstance(start_date, str):
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
            else:
                start_date_obj = start_date
                
            # Get fund IRR dates
            fund_irr_dates = await self.db.fetch(
                "SELECT date FROM portfolio_fund_irr_values WHERE date >= $1",
                start_date_obj
            )
            
            # Get portfolio IRR dates
            portfolio_irr_dates = await self.db.fetch(
                "SELECT date FROM portfolio_irr_values WHERE portfolio_id = $1 AND date >= $2",
                portfolio_id, start_date_obj
            )
            
            # Combine and deduplicate dates
            all_dates = set()
            
            if fund_irr_dates:
                for record in fund_irr_dates:
                    date_str = record["date"].split('T')[0] if 'T' in str(record["date"]) else str(record["date"])
                    all_dates.add(date_str)
            
            if portfolio_irr_dates:
                for record in portfolio_irr_dates:
                    date_str = record["date"].split('T')[0] if 'T' in str(record["date"]) else str(record["date"])
                    all_dates.add(date_str)
            
            return sorted(list(all_dates))
            
        except Exception as e:
            logger.error(f"Error finding IRR dates: {str(e)}")
            return [] 