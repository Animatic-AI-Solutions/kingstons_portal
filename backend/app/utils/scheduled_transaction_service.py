"""
Service functions for scheduled transactions system
"""
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from typing import Optional
import logging
from decimal import Decimal

logger = logging.getLogger(__name__)

def calculate_next_execution_date(
    execution_day: int, 
    recurrence_interval: Optional[str] = None, 
    from_date: Optional[date] = None
) -> date:
    """
    Calculate the next execution date for a scheduled transaction.
    
    Args:
        execution_day: Day of month to execute (1-31)
        recurrence_interval: 'monthly', 'quarterly', 'annually', or None for one-time
        from_date: Base date to calculate from (default: today)
    
    Returns:
        Next execution date
    """
    if from_date is None:
        from_date = date.today()
    
    if not recurrence_interval:
        # One-time transaction - schedule for the next occurrence of execution_day
        if from_date.day <= execution_day:
            # This month
            try:
                return from_date.replace(day=execution_day)
            except ValueError:
                # execution_day doesn't exist in this month (e.g., Feb 31)
                # Move to next month
                pass
        
        # Next month
        next_month = from_date + relativedelta(months=1)
        try:
            return next_month.replace(day=execution_day)
        except ValueError:
            # Handle end-of-month cases (e.g., execution_day=31 in February)
            # Use last day of month
            next_month_end = next_month + relativedelta(months=1) - timedelta(days=1)
            return next_month_end.replace(day=min(execution_day, next_month_end.day))
    
    # Recurring transaction
    if recurrence_interval == 'monthly':
        if from_date.day < execution_day:
            # This month
            try:
                return from_date.replace(day=execution_day)
            except ValueError:
                # execution_day doesn't exist in this month
                # Use last day of month instead
                next_month_start = from_date.replace(day=1) + relativedelta(months=1)
                month_end = next_month_start - timedelta(days=1)
                return month_end
        
        # Next month
        next_month = from_date + relativedelta(months=1)
        try:
            return next_month.replace(day=execution_day)
        except ValueError:
            # Handle end-of-month cases
            next_month_start = next_month.replace(day=1) + relativedelta(months=1)
            month_end = next_month_start - timedelta(days=1)
            return month_end
    
    elif recurrence_interval == 'quarterly':
        # Next quarter
        next_quarter = from_date + relativedelta(months=3)
        try:
            return next_quarter.replace(day=execution_day)
        except ValueError:
            # Handle end-of-month cases
            quarter_end = next_quarter + relativedelta(months=1) - timedelta(days=1)
            return quarter_end.replace(day=min(execution_day, quarter_end.day))
    
    elif recurrence_interval == 'annually':
        # Next year
        next_year = from_date + relativedelta(years=1)
        try:
            return next_year.replace(day=execution_day)
        except ValueError:
            # Handle leap year edge cases
            year_end = next_year + relativedelta(months=1) - timedelta(days=1)
            return year_end.replace(day=min(execution_day, year_end.day))
    
    raise ValueError(f"Invalid recurrence_interval: {recurrence_interval}")

def map_transaction_type_to_activity_type(transaction_type: str) -> str:
    """
    Map scheduled transaction types to activity log types.
    
    Args:
        transaction_type: One of 'Investment', 'RegularInvestment', 'Withdrawal', 'RegularWithdrawal'
    
    Returns:
        Activity type for holding_activity_log
    """
    mapping = {
        'Investment': 'Investment',
        'RegularInvestment': 'RegularInvestment',
        'Withdrawal': 'Withdrawal',
        'RegularWithdrawal': 'RegularWithdrawal'  # Regular withdrawals are now stored as 'RegularWithdrawal' in activity log
    }
    
    return mapping.get(transaction_type, transaction_type)

def get_account_holding_id(db, portfolio_fund_id: int) -> Optional[int]:
    """
    Get the account holding ID (client_product_id) for a portfolio fund.
    
    Args:
        db: Database connection
        portfolio_fund_id: ID of the portfolio fund
    
    Returns:
        client_product_id or None if not found
    """
    try:
        # Get the portfolio_id from portfolio_funds
        portfolio_fund_result = db.table("portfolio_funds") \
            .select("portfolio_id") \
            .eq("id", portfolio_fund_id) \
            .execute()
        
        if not portfolio_fund_result.data:
            return None
        
        portfolio_id = portfolio_fund_result.data[0]["portfolio_id"]
        
        # Get the client_product_id from client_products
        client_product_result = db.table("client_products") \
            .select("id") \
            .eq("portfolio_id", portfolio_id) \
            .execute()
        
        if not client_product_result.data:
            return None
        
        return client_product_result.data[0]["id"]
    
    except Exception as e:
        logger.error(f"Error getting account holding ID for portfolio fund {portfolio_fund_id}: {e}")
        return None

def create_activity_log_entry(db, scheduled_transaction, execution_date: date) -> Optional[int]:
    """
    Create a holding activity log entry for an executed scheduled transaction.
    
    Args:
        db: Database connection
        scheduled_transaction: The scheduled transaction being executed
        execution_date: Date of execution
    
    Returns:
        ID of created activity log entry or None if failed
    """
    try:
        # Get the account holding ID
        account_holding_id = get_account_holding_id(db, scheduled_transaction['portfolio_fund_id'])
        if not account_holding_id:
            raise Exception(f"Could not find account holding ID for portfolio fund {scheduled_transaction['portfolio_fund_id']}")
        
        # Map transaction type to activity type
        activity_type = map_transaction_type_to_activity_type(scheduled_transaction['transaction_type'])
        
        # Create activity log entry
        activity_data = {
            'product_id': account_holding_id,
            'portfolio_fund_id': scheduled_transaction['portfolio_fund_id'],
            'activity_timestamp': execution_date.isoformat(),
            'activity_type': activity_type,
            'amount': float(scheduled_transaction['amount']),  # Ensure it's a float for JSON serialization
            'created_at': datetime.now().isoformat()
        }
        
        result = db.table("holding_activity_log").insert(activity_data).execute()
        
        if result.data and len(result.data) > 0:
            return result.data[0]['id']
        
        return None
    
    except Exception as e:
        logger.error(f"Error creating activity log entry: {e}")
        raise

def should_execute_transaction(scheduled_transaction, target_date: date) -> bool:
    """
    Determine if a scheduled transaction should be executed on the target date.
    
    Args:
        scheduled_transaction: The scheduled transaction record
        target_date: Date to check for execution
    
    Returns:
        True if transaction should be executed
    """
    if scheduled_transaction['status'] != 'active':
        return False
    
    next_execution = scheduled_transaction['next_execution_date']
    if isinstance(next_execution, str):
        next_execution = datetime.strptime(next_execution, "%Y-%m-%d").date()
    
    if next_execution > target_date:
        return False
    
    # Check if max executions reached
    if (scheduled_transaction.get('max_executions') and 
        scheduled_transaction.get('total_executions', 0) >= scheduled_transaction['max_executions']):
        return False
    
    return True

def validate_scheduled_transaction_data(data: dict, db) -> dict:
    """
    Validate scheduled transaction data before creation.
    
    Args:
        data: Transaction data to validate
        db: Database connection
    
    Returns:
        Validated data with calculated next_execution_date
    
    Raises:
        ValueError: If validation fails
    """
    # Validate portfolio fund exists
    portfolio_fund_result = db.table("portfolio_funds") \
        .select("id") \
        .eq("id", data['portfolio_fund_id']) \
        .execute()
    
    if not portfolio_fund_result.data:
        raise ValueError("Portfolio fund not found")
    
    # Calculate next execution date
    next_execution_date = calculate_next_execution_date(
        data['execution_day'],
        data.get('recurrence_interval')
    )
    
    # Add calculated fields
    validated_data = data.copy()
    validated_data['next_execution_date'] = next_execution_date.isoformat()
    validated_data['status'] = 'active'
    validated_data['total_executions'] = 0
    validated_data['created_at'] = datetime.now().isoformat()
    validated_data['updated_at'] = datetime.now().isoformat()
    
    # Convert Decimal amount to float for JSON serialization
    if 'amount' in validated_data:
        validated_data['amount'] = float(validated_data['amount'])
    
    return validated_data 