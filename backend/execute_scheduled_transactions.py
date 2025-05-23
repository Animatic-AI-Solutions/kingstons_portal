#!/usr/bin/env python3
"""
Cron job script for executing scheduled transactions.

This script should be run daily by a cron job to execute any pending scheduled transactions.
It makes an HTTP request to the scheduled transactions API endpoint.

Usage:
    python execute_scheduled_transactions.py [--date YYYY-MM-DD] [--url http://localhost:8000]

Example cron job (runs daily at 9 AM):
    0 9 * * * /usr/bin/python3 /path/to/execute_scheduled_transactions.py

Example cron job with custom URL:
    0 9 * * * /usr/bin/python3 /path/to/execute_scheduled_transactions.py --url http://your-api-server:8000
"""

import argparse
import requests
import sys
import logging
from datetime import date
import os

# Configure logging
log_filename = os.path.join(os.path.dirname(__file__), 'scheduled_transactions_cron.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_filename),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def execute_scheduled_transactions(api_url: str, target_date: str = None):
    """
    Execute scheduled transactions by calling the API endpoint.
    
    Args:
        api_url: Base URL of the API server
        target_date: Date to execute for (YYYY-MM-DD), defaults to today
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Construct the API endpoint URL
        endpoint = f"{api_url}/api/scheduled_transactions/execute_pending"
        
        # Prepare query parameters
        params = {}
        if target_date:
            params['target_date'] = target_date
        
        logger.info(f"Calling API endpoint: {endpoint}")
        if params:
            logger.info(f"With parameters: {params}")
        
        # Make the API request
        response = requests.post(endpoint, params=params, timeout=30)
        
        # Check if request was successful
        if response.status_code == 200:
            result = response.json()
            logger.info(f"Successfully executed scheduled transactions: {result}")
            return True
        else:
            logger.error(f"API request failed with status {response.status_code}: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Execute scheduled transactions via API')
    parser.add_argument(
        '--date', 
        type=str, 
        help='Date to execute for (YYYY-MM-DD), defaults to today'
    )
    parser.add_argument(
        '--url', 
        type=str, 
        default='http://localhost:8000',
        help='Base URL of the API server (default: http://localhost:8000)'
    )
    
    args = parser.parse_args()
    
    # Use provided date or default to today
    target_date = args.date or date.today().isoformat()
    
    logger.info(f"Starting scheduled transaction execution for date: {target_date}")
    logger.info(f"API URL: {args.url}")
    
    # Execute the scheduled transactions
    success = execute_scheduled_transactions(args.url, target_date)
    
    if success:
        logger.info("Scheduled transaction execution completed successfully")
        sys.exit(0)
    else:
        logger.error("Scheduled transaction execution failed")
        sys.exit(1)

if __name__ == "__main__":
    main() 