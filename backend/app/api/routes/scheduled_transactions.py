from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from typing import List, Optional
from datetime import datetime, date, timedelta
from app.db.database import get_db
from app.api.routes.auth import get_current_user
from app.models.scheduled_transaction import (
    ScheduledTransactionCreate, 
    ScheduledTransactionUpdate, 
    ScheduledTransaction,
    ScheduledTransactionExecution,
    ScheduledTransactionExecutionCreate,
    UpcomingScheduledTransaction
)
from app.utils.scheduled_transaction_service import (
    validate_scheduled_transaction_data,
    calculate_next_execution_date,
    should_execute_transaction,
    create_activity_log_entry
)
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/scheduled_transactions", response_model=ScheduledTransaction)
async def create_scheduled_transaction(
    transaction: ScheduledTransactionCreate,
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new scheduled transaction.
    """
    try:
        # Convert to dict for validation
        transaction_data = transaction.model_dump()
        
        # Add the created_by field with the current user's profile ID
        transaction_data['created_by'] = current_user.get("id") if current_user else None
        
        # Validate and prepare data
        validated_data = validate_scheduled_transaction_data(transaction_data, db)
        
        # Create the scheduled transaction
        result = db.table("scheduled_transactions").insert(validated_data).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to create scheduled transaction")
        
        logger.info(f"Created scheduled transaction {result.data[0]['id']} for portfolio fund {transaction.portfolio_fund_id} by user {current_user.get('id') if current_user else 'unknown'}")
        return result.data[0]
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating scheduled transaction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/scheduled_transactions", response_model=List[ScheduledTransaction])
async def get_scheduled_transactions(
    portfolio_fund_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    db = Depends(get_db)
):
    """
    Get scheduled transactions with optional filtering.
    """
    try:
        query = db.table("scheduled_transactions").select("*")
        
        if portfolio_fund_id is not None:
            query = query.eq("portfolio_fund_id", portfolio_fund_id)
        
        if status is not None:
            query = query.eq("status", status)
        
        if transaction_type is not None:
            query = query.eq("transaction_type", transaction_type)
        
        # Order by next execution date (soonest first)
        result = query.order("next_execution_date", desc=False).execute()
        
        return result.data
    
    except Exception as e:
        logger.error(f"Error getting scheduled transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/scheduled_transactions/upcoming", response_model=List[UpcomingScheduledTransaction])
async def get_upcoming_scheduled_transactions(
    days_ahead: int = Query(7, description="Number of days ahead to look for upcoming transactions"),
    limit: int = Query(10, description="Maximum number of transactions to return"),
    db = Depends(get_db)
):
    """
    Get upcoming scheduled transactions for the next N days.
    Returns transactions with portfolio fund and client details.
    """
    try:
        # Calculate the date range
        today = datetime.now().date()
        end_date = today + timedelta(days=days_ahead)
        
        # First, get the basic scheduled transactions
        transactions_result = db.table("scheduled_transactions") \
            .select("*") \
            .eq("status", "active") \
            .gte("next_execution_date", today.isoformat()) \
            .lte("next_execution_date", end_date.isoformat()) \
            .order("next_execution_date", desc=False) \
            .limit(limit) \
            .execute()
        
        if not transactions_result.data:
            logger.info(f"No upcoming transactions found for next {days_ahead} days")
            return []
        
        # Transform the data by fetching related information for each transaction
        upcoming_transactions = []
        for transaction in transactions_result.data:
            portfolio_fund_id = transaction.get('portfolio_fund_id')
            
            # Initialize default values
            fund_name = None
            fund_code = None  # Will use isin_number instead
            client_name = None
            client_type = None
            product_name = None
            client_product_id = None
            client_group_id = None
            
            if portfolio_fund_id:
                try:
                    # Get portfolio fund details
                    portfolio_fund_result = db.table("portfolio_funds") \
                        .select("*") \
                        .eq("id", portfolio_fund_id) \
                        .execute()
                    
                    if portfolio_fund_result.data:
                        portfolio_fund = portfolio_fund_result.data[0]
                        portfolio_id = portfolio_fund.get('portfolio_id')
                        available_funds_id = portfolio_fund.get('available_funds_id')
                        
                        # Get fund information
                        if available_funds_id:
                            fund_result = db.table("available_funds") \
                                .select("fund_name, isin_number") \
                                .eq("id", available_funds_id) \
                                .execute()
                            
                            if fund_result.data:
                                fund_info = fund_result.data[0]
                                fund_name = fund_info.get('fund_name')
                                fund_code = fund_info.get('isin_number')  # Use isin_number as fund_code
                        
                        # Get client product information using portfolio_id
                        if portfolio_id:
                            client_product_result = db.table("client_products") \
                                .select("*") \
                                .eq("portfolio_id", portfolio_id) \
                                .execute()
                            
                            if client_product_result.data:
                                client_product = client_product_result.data[0]
                                product_name = client_product.get('product_name')
                                client_product_id = client_product.get('id')
                                client_id = client_product.get('client_id')
                                
                                # Get client group information
                                if client_id:
                                    client_result = db.table("client_groups") \
                                        .select("name, type") \
                                        .eq("id", client_id) \
                                        .execute()
                                    
                                    if client_result.data:
                                        client_info = client_result.data[0]
                                        client_name = client_info.get('name')
                                        client_type = client_info.get('type')
                                        client_group_id = client_id
                
                except Exception as e:
                    logger.warning(f"Could not fetch details for portfolio_fund_id {portfolio_fund_id}: {e}")
                    # Continue with null values
            
            upcoming_transactions.append({
                'id': transaction['id'],
                'transaction_type': transaction['transaction_type'],
                'amount': transaction['amount'],
                'next_execution_date': transaction['next_execution_date'],
                'execution_day': transaction['execution_day'],
                'is_recurring': transaction['is_recurring'],
                'recurrence_interval': transaction['recurrence_interval'],
                'description': transaction.get('description'),
                'fund_name': fund_name,
                'fund_code': fund_code,
                'client_name': client_name,
                'client_type': client_type,
                'product_name': product_name,
                'portfolio_fund_id': portfolio_fund_id,
                'client_product_id': client_product_id,
                'client_group_id': client_group_id
            })
        
        logger.info(f"Retrieved {len(upcoming_transactions)} upcoming transactions for next {days_ahead} days")
        return upcoming_transactions
    
    except Exception as e:
        logger.error(f"Error getting upcoming scheduled transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/scheduled_transactions/{transaction_id}", response_model=ScheduledTransaction)
async def get_scheduled_transaction(
    transaction_id: int,
    db = Depends(get_db)
):
    """
    Get a specific scheduled transaction by ID.
    """
    try:
        result = db.table("scheduled_transactions") \
            .select("*") \
            .eq("id", transaction_id) \
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Scheduled transaction not found")
        
        return result.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting scheduled transaction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.patch("/scheduled_transactions/{transaction_id}", response_model=ScheduledTransaction)
async def update_scheduled_transaction(
    transaction_id: int,
    transaction_update: ScheduledTransactionUpdate,
    db = Depends(get_db)
):
    """
    Update a scheduled transaction.
    """
    try:
        # Get existing transaction
        existing_result = db.table("scheduled_transactions") \
            .select("*") \
            .eq("id", transaction_id) \
            .execute()
        
        if not existing_result.data or len(existing_result.data) == 0:
            raise HTTPException(status_code=404, detail="Scheduled transaction not found")
        
        existing_transaction = existing_result.data[0]
        
        # Prepare update data
        update_data = {}
        update_fields = transaction_update.model_dump(exclude_unset=True)
        
        for field, value in update_fields.items():
            # Convert Decimal to float for JSON serialization
            if field == 'amount' and value is not None:
                update_data[field] = float(value)
            else:
                update_data[field] = value
        
        # If execution_day is updated, recalculate next_execution_date
        if 'execution_day' in update_data:
            new_execution_day = update_data['execution_day']
            recurrence_interval = existing_transaction.get('recurrence_interval')
            
            new_next_execution = calculate_next_execution_date(
                new_execution_day,
                recurrence_interval
            )
            update_data['next_execution_date'] = new_next_execution.isoformat()
        
        # Always update the updated_at timestamp
        update_data['updated_at'] = datetime.now().isoformat()
        
        # Perform update
        result = db.table("scheduled_transactions") \
            .update(update_data) \
            .eq("id", transaction_id) \
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to update scheduled transaction")
        
        logger.info(f"Updated scheduled transaction {transaction_id}")
        return result.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating scheduled transaction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/scheduled_transactions/{transaction_id}")
async def delete_scheduled_transaction(
    transaction_id: int,
    db = Depends(get_db)
):
    """
    Cancel/delete a scheduled transaction.
    """
    try:
        # Check if transaction exists
        existing_result = db.table("scheduled_transactions") \
            .select("id") \
            .eq("id", transaction_id) \
            .execute()
        
        if not existing_result.data or len(existing_result.data) == 0:
            raise HTTPException(status_code=404, detail="Scheduled transaction not found")
        
        # Update status to cancelled instead of deleting
        result = db.table("scheduled_transactions") \
            .update({
                "status": "cancelled",
                "updated_at": datetime.now().isoformat()
            }) \
            .eq("id", transaction_id) \
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=500, detail="Failed to cancel scheduled transaction")
        
        logger.info(f"Cancelled scheduled transaction {transaction_id}")
        return {"message": "Scheduled transaction cancelled successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cancelling scheduled transaction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/scheduled_transactions/{transaction_id}/pause")
async def pause_scheduled_transaction(
    transaction_id: int,
    db = Depends(get_db)
):
    """
    Pause a scheduled transaction.
    """
    try:
        result = db.table("scheduled_transactions") \
            .update({
                "status": "paused",
                "updated_at": datetime.now().isoformat()
            }) \
            .eq("id", transaction_id) \
            .eq("status", "active") \
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Active scheduled transaction not found")
        
        logger.info(f"Paused scheduled transaction {transaction_id}")
        return {"message": "Scheduled transaction paused successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error pausing scheduled transaction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/scheduled_transactions/{transaction_id}/resume")
async def resume_scheduled_transaction(
    transaction_id: int,
    db = Depends(get_db)
):
    """
    Resume a paused scheduled transaction.
    """
    try:
        result = db.table("scheduled_transactions") \
            .update({
                "status": "active",
                "updated_at": datetime.now().isoformat()
            }) \
            .eq("id", transaction_id) \
            .eq("status", "paused") \
            .execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Paused scheduled transaction not found")
        
        logger.info(f"Resumed scheduled transaction {transaction_id}")
        return {"message": "Scheduled transaction resumed successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resuming scheduled transaction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/scheduled_transactions/{transaction_id}/executions", response_model=List[ScheduledTransactionExecution])
async def get_transaction_executions(
    transaction_id: int,
    db = Depends(get_db)
):
    """
    Get execution history for a scheduled transaction.
    """
    try:
        result = db.table("scheduled_transaction_executions") \
            .select("*") \
            .eq("scheduled_transaction_id", transaction_id) \
            .order("execution_date", desc=True) \
            .execute()
        
        return result.data
    
    except Exception as e:
        logger.error(f"Error getting transaction executions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.post("/scheduled_transactions/execute_pending")
async def execute_pending_transactions(
    target_date: Optional[str] = Query(None, description="Date to execute for (YYYY-MM-DD), defaults to today"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db = Depends(get_db)
):
    """
    Execute all pending scheduled transactions for a given date.
    This endpoint is typically called by a cron job or background scheduler.
    """
    try:
        if target_date:
            execution_date = datetime.strptime(target_date, "%Y-%m-%d").date()
        else:
            execution_date = date.today()
        
        # Get all active transactions that are due for execution
        result = db.table("scheduled_transactions") \
            .select("*") \
            .eq("status", "active") \
            .lte("next_execution_date", execution_date.isoformat()) \
            .execute()
        
        if not result.data:
            return {"message": f"No pending transactions found for {execution_date}", "executed": 0}
        
        executed_count = 0
        failed_count = 0
        
        for transaction in result.data:
            try:
                if should_execute_transaction(transaction, execution_date):
                    # Execute the transaction
                    background_tasks.add_task(execute_single_transaction, transaction, execution_date, db)
                    executed_count += 1
            except Exception as e:
                logger.error(f"Error executing transaction {transaction['id']}: {e}")
                failed_count += 1
        
        logger.info(f"Scheduled {executed_count} transactions for execution on {execution_date}")
        return {
            "message": f"Scheduled {executed_count} transactions for execution",
            "executed": executed_count,
            "failed": failed_count,
            "execution_date": execution_date.isoformat()
        }
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
    except Exception as e:
        logger.error(f"Error executing pending transactions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

async def execute_single_transaction(transaction: dict, execution_date: date, db):
    """
    Execute a single scheduled transaction (background task).
    """
    transaction_id = transaction['id']
    try:
        # Create activity log entry
        activity_log_id = create_activity_log_entry(db, transaction, execution_date)
        
        # Create execution log entry
        execution_data = {
            'scheduled_transaction_id': transaction_id,
            'execution_date': execution_date.isoformat(),
            'execution_timestamp': datetime.now().isoformat(),
            'status': 'success',
            'executed_amount': float(transaction['amount']),
            'activity_log_id': activity_log_id
        }
        
        db.table("scheduled_transaction_executions").insert(execution_data).execute()
        
        # Update transaction
        update_data = {
            'last_executed_date': execution_date.isoformat(),
            'total_executions': transaction.get('total_executions', 0) + 1,
            'updated_at': datetime.now().isoformat()
        }
        
        # Calculate next execution date if recurring
        if transaction['is_recurring']:
            next_execution = calculate_next_execution_date(
                transaction['execution_day'],
                transaction['recurrence_interval'],
                execution_date
            )
            update_data['next_execution_date'] = next_execution.isoformat()
            
            # Check if max executions reached
            if (transaction.get('max_executions') and 
                update_data['total_executions'] >= transaction['max_executions']):
                update_data['status'] = 'completed'
        else:
            # One-time transaction - mark as completed
            update_data['status'] = 'completed'
        
        db.table("scheduled_transactions") \
            .update(update_data) \
            .eq("id", transaction_id) \
            .execute()
        
        logger.info(f"Successfully executed scheduled transaction {transaction_id}")
        
    except Exception as e:
        logger.error(f"Failed to execute scheduled transaction {transaction_id}: {e}")
        
        # Log the failure
        failure_data = {
            'scheduled_transaction_id': transaction_id,
            'execution_date': execution_date.isoformat(),
            'execution_timestamp': datetime.now().isoformat(),
            'status': 'failed',
            'executed_amount': float(transaction['amount']),
            'error_message': str(e)
        }
        
        try:
            db.table("scheduled_transaction_executions").insert(failure_data).execute()
        except Exception as log_error:
            logger.error(f"Failed to log execution failure for transaction {transaction_id}: {log_error}") 