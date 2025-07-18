"""
API endpoint for transaction coordination
Handles ordered saving of activities and valuations
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from pydantic import BaseModel, Field
import logging

from app.db.database import get_db
from app.utils.transaction_coordinator import TransactionCoordinator, TransactionValidator

logger = logging.getLogger(__name__)

router = APIRouter()

class ActivityData(BaseModel):
    id: int = None
    portfolio_fund_id: int = Field(..., description="Portfolio fund ID")
    account_holding_id: int = Field(..., description="Account holding ID")
    activity_type: str = Field(..., description="Type of activity")
    activity_timestamp: str = Field(..., description="Activity timestamp")
    amount: str = Field(..., description="Activity amount")

class ValuationData(BaseModel):
    id: int = None
    portfolio_fund_id: int = Field(..., description="Portfolio fund ID")
    valuation_date: str = Field(..., description="Valuation date")
    valuation: float = Field(..., description="Valuation amount")

class OrderedTransactionRequest(BaseModel):
    activities: List[ActivityData] = Field(default=[], description="List of activities to save")
    valuations: List[ValuationData] = Field(default=[], description="List of valuations to save")

class OrderedTransactionResponse(BaseModel):
    success: bool = Field(..., description="Whether the transaction was successful")
    activities_saved: int = Field(..., description="Number of activities saved")
    valuations_saved: int = Field(..., description="Number of valuations saved")
    irr_calculations: int = Field(..., description="Number of IRR calculations triggered")
    errors: List[str] = Field(default=[], description="List of errors if any")

@router.post("/transaction/ordered-save", response_model=OrderedTransactionResponse)
async def save_activities_and_valuations_ordered(
    request: OrderedTransactionRequest,
    db = Depends(get_db)
):
    """
    Save activities and valuations in proper order to prevent IRR calculation race conditions.
    
    This endpoint ensures that:
    1. Activities are saved before valuations
    2. IRR calculations have complete data when they run
    3. Race conditions are prevented
    
    Args:
        request: OrderedTransactionRequest containing activities and valuations
        db: Database dependency
        
    Returns:
        OrderedTransactionResponse with transaction results
    """
    try:
        logger.info(f"🔄 Ordered Transaction API: Received request with {len(request.activities)} activities and {len(request.valuations)} valuations")
        
        # Convert Pydantic models to dictionaries
        activities = [activity.dict() for activity in request.activities]
        valuations = [valuation.dict() for valuation in request.valuations]
        
        # Validate transaction data
        validation_errors = []
        validation_errors.extend(TransactionValidator.validate_activities(activities))
        validation_errors.extend(TransactionValidator.validate_valuations(valuations))
        validation_errors.extend(TransactionValidator.validate_ordering(activities, valuations))
        
        if validation_errors:
            logger.error(f"❌ Validation errors: {validation_errors}")
            raise HTTPException(
                status_code=400,
                detail=f"Validation failed: {'; '.join(validation_errors)}"
            )
        
        # Create transaction coordinator
        coordinator = TransactionCoordinator(db)
        
        # Execute ordered transaction
        result = await coordinator.save_activities_and_valuations_ordered(
            activities=activities,
            valuations=valuations
        )
        
        if not result["success"]:
            logger.error(f"❌ Transaction failed: {result['errors']}")
            raise HTTPException(
                status_code=500,
                detail=f"Transaction failed: {'; '.join(result['errors'])}"
            )
        
        logger.info(f"✅ Transaction completed: {result['activities_saved']} activities, {result['valuations_saved']} valuations, {result['irr_calculations']} IRR calculations")
        
        return OrderedTransactionResponse(
            success=result["success"],
            activities_saved=result["activities_saved"],
            valuations_saved=result["valuations_saved"],
            irr_calculations=result["irr_calculations"],
            errors=result["errors"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Unexpected error in ordered transaction: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@router.post("/transaction/validate-order")
async def validate_transaction_order(
    request: OrderedTransactionRequest,
    db = Depends(get_db)
):
    """
    Validate transaction order without actually saving data.
    Useful for testing and debugging.
    
    Args:
        request: OrderedTransactionRequest containing activities and valuations
        db: Database dependency
        
    Returns:
        Dictionary with validation results
    """
    try:
        logger.info(f"🔍 Validating transaction order for {len(request.activities)} activities and {len(request.valuations)} valuations")
        
        # Convert Pydantic models to dictionaries
        activities = [activity.dict() for activity in request.activities]
        valuations = [valuation.dict() for valuation in request.valuations]
        
        # Validate transaction data
        validation_errors = []
        validation_errors.extend(TransactionValidator.validate_activities(activities))
        validation_errors.extend(TransactionValidator.validate_valuations(valuations))
        validation_errors.extend(TransactionValidator.validate_ordering(activities, valuations))
        
        # Get affected funds for analysis
        coordinator = TransactionCoordinator(db)
        affected_funds = coordinator._get_affected_funds(activities, valuations)
        
        result = {
            "valid": len(validation_errors) == 0,
            "errors": validation_errors,
            "affected_funds": affected_funds,
            "activities_count": len(activities),
            "valuations_count": len(valuations),
            "overlapping_fund_dates": len(set(
                (a.get('portfolio_fund_id'), a.get('activity_timestamp', '').split('T')[0])
                for a in activities
            ).intersection(set(
                (v.get('portfolio_fund_id'), v.get('valuation_date', '').split('T')[0])
                for v in valuations
            )))
        }
        
        logger.info(f"✅ Validation complete: {result}")
        return result
        
    except Exception as e:
        logger.error(f"❌ Validation error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Validation error: {str(e)}"
        ) 