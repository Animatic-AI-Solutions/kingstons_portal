from fastapi import APIRouter, HTTPException, Depends, Query, Request
from typing import List, Optional
import logging
from datetime import datetime

from app.models.provider_switch_log import ProviderSwitchLog, ProviderSwitchLogCreate, ProviderSwitchLogUpdate
from app.db.database import get_db

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/provider_switch_log", response_model=ProviderSwitchLog)
async def create_provider_switch_log(provider_switch: ProviderSwitchLogCreate, db = Depends(get_db)):
    """
    What it does: Creates a new provider switch log entry.
    Why it's needed: Records the history of provider switches for tracking and analysis.
    How it works:
        1. Validates the input data using the ProviderSwitchLogCreate model
        2. Checks that the client_product_id and new_provider_id are valid
        3. Inserts the record in the provider_switch_log table
        4. Fetches provider names for the complete response
    Expected output: The created provider switch log entry with provider names
    """
    try:
        # Verify the client product exists
        client_product = await db.fetchrow("SELECT id FROM client_products WHERE id = $1", provider_switch.client_product_id)
        if not client_product:
            raise HTTPException(status_code=404, detail=f"Client product with ID {provider_switch.client_product_id} not found")
        
        # Verify the new provider exists
        new_provider = await db.fetchrow("SELECT id FROM available_providers WHERE id = $1", provider_switch.new_provider_id)
        if not new_provider:
            raise HTTPException(status_code=404, detail=f"Provider with ID {provider_switch.new_provider_id} not found")
        
        # Verify previous provider if provided
        if provider_switch.previous_provider_id:
            prev_provider = await db.fetchrow("SELECT id FROM available_providers WHERE id = $1", provider_switch.previous_provider_id)
            if not prev_provider:
                raise HTTPException(status_code=404, detail=f"Previous provider with ID {provider_switch.previous_provider_id} not found")
        
        # Create the provider switch log with dynamic INSERT
        if provider_switch.previous_provider_id:
            # Include previous_provider_id
            result = await db.fetchrow(
                """
                INSERT INTO provider_switch_log (client_product_id, switch_date, new_provider_id, previous_provider_id, description)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
                """,
                provider_switch.client_product_id,
                provider_switch.switch_date,
                provider_switch.new_provider_id,
                provider_switch.previous_provider_id,
                provider_switch.description
            )
        else:
            # Exclude previous_provider_id
            result = await db.fetchrow(
                """
                INSERT INTO provider_switch_log (client_product_id, switch_date, new_provider_id, description)
                VALUES ($1, $2, $3, $4)
                RETURNING *
                """,
                provider_switch.client_product_id,
                provider_switch.switch_date,
                provider_switch.new_provider_id,
                provider_switch.description
            )
        
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create provider switch log")
        
        created_log = dict(result)
        
        # Fetch provider names for the response
        new_provider_name = None
        previous_provider_name = None
        
        # Get new provider name
        new_provider_data = await db.fetchrow("SELECT name FROM available_providers WHERE id = $1", provider_switch.new_provider_id)
        if new_provider_data:
            new_provider_name = new_provider_data["name"]
        
        # Get previous provider name if provided
        if provider_switch.previous_provider_id:
            prev_provider_data = await db.fetchrow("SELECT name FROM available_providers WHERE id = $1", provider_switch.previous_provider_id)
            if prev_provider_data:
                previous_provider_name = prev_provider_data["name"]
        
        # Add provider names to the response
        response_data = {
            **created_log,
            "previous_provider_name": previous_provider_name,
            "new_provider_name": new_provider_name
        }
        
        logger.info(f"Created provider switch log: {response_data}")
        return response_data
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating provider switch log: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/provider_switch_log", response_model=List[ProviderSwitchLog])
async def get_provider_switch_logs(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Max number of records to return"),
    client_product_id: Optional[int] = None,
    db = Depends(get_db)
):
    """
    What it does: Retrieves a list of provider switch logs with optional filtering.
    Why it's needed: Allows viewing the history of provider switches.
    How it works:
        1. Builds a query to the 'provider_switch_log' table with optional filters
        2. Fetches provider names for all entries
        3. Returns the data as a list of ProviderSwitchLog objects
    Expected output: A JSON array of provider switch log objects
    """
    try:
        # Build dynamic query with optional filtering
        where_clause = ""
        params = []
        param_count = 0
        
        if client_product_id is not None:
            param_count += 1
            where_clause = f"WHERE client_product_id = ${param_count}"
            params.append(client_product_id)
        
        # Add pagination parameters
        param_count += 1
        limit_clause = f"LIMIT ${param_count}"
        params.append(limit)
        
        param_count += 1
        offset_clause = f"OFFSET ${param_count}"
        params.append(skip)
        
        query = f"""
            SELECT * FROM provider_switch_log 
            {where_clause}
            ORDER BY switch_date DESC
            {limit_clause} {offset_clause}
        """
        
        switch_logs = await db.fetch(query, *params)
        
        # If no logs found, return empty list
        if not switch_logs:
            return []
        
        # Gather all provider IDs for bulk fetching
        provider_ids = set()
        for log in switch_logs:
            if log["previous_provider_id"]:
                provider_ids.add(log["previous_provider_id"])
            if log["new_provider_id"]:
                provider_ids.add(log["new_provider_id"])
        
        # Fetch all providers at once using ANY()
        providers_map = {}
        if provider_ids:
            providers = await db.fetch("SELECT id, name FROM available_providers WHERE id = ANY($1::int[])", list(provider_ids))
            providers_map = {p["id"]: p["name"] for p in providers}
        
        # Add provider names to each log
        enhanced_logs = []
        for log in switch_logs:
            log_dict = dict(log)
            log_dict["previous_provider_name"] = providers_map.get(log["previous_provider_id"])
            log_dict["new_provider_name"] = providers_map.get(log["new_provider_id"])
            enhanced_logs.append(log_dict)
        
        return enhanced_logs
    
    except Exception as e:
        logger.error(f"Error fetching provider switch logs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/client_products/{client_product_id}/provider_switches", response_model=List[ProviderSwitchLog])
async def get_provider_switches_for_product(
    client_product_id: int,
    db = Depends(get_db)
):
    """
    What it does: Retrieves all provider switches for a specific client product.
    Why it's needed: Shows the history of provider changes for a product.
    How it works:
        1. Checks that the client product exists
        2. Fetches all provider switch logs for the product
        3. Enhances the logs with provider names
    Expected output: A list of provider switch logs for the specified product
    """
    try:
        # Verify the client product exists
        client_product = await db.fetchrow("SELECT id FROM client_products WHERE id = $1", client_product_id)
        if not client_product:
            raise HTTPException(status_code=404, detail=f"Client product with ID {client_product_id} not found")
        
        # Fetch all provider switch logs for this product
        switch_logs = await db.fetch(
            "SELECT * FROM provider_switch_log WHERE client_product_id = $1 ORDER BY switch_date DESC",
            client_product_id
        )
        
        # If no logs found, return empty list
        if not switch_logs:
            return []
        
        # Gather all provider IDs for bulk fetching
        provider_ids = set()
        for log in switch_logs:
            if log["previous_provider_id"]:
                provider_ids.add(log["previous_provider_id"])
            if log["new_provider_id"]:
                provider_ids.add(log["new_provider_id"])
        
        # Fetch all providers at once using ANY()
        providers_map = {}
        if provider_ids:
            providers = await db.fetch("SELECT id, name FROM available_providers WHERE id = ANY($1::int[])", list(provider_ids))
            providers_map = {p["id"]: p["name"] for p in providers}
        
        # Add provider names to each log
        enhanced_logs = []
        for log in switch_logs:
            log_dict = dict(log)
            log_dict["previous_provider_name"] = providers_map.get(log["previous_provider_id"])
            log_dict["new_provider_name"] = providers_map.get(log["new_provider_id"])
            enhanced_logs.append(log_dict)
        
        return enhanced_logs
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching provider switches for product {client_product_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/provider_switch_log/{log_id}", response_model=ProviderSwitchLog)
async def get_provider_switch_log(log_id: int, db = Depends(get_db)):
    """
    What it does: Retrieves a specific provider switch log by ID.
    Why it's needed: Allows viewing the details of a specific provider switch.
    How it works:
        1. Fetches the provider switch log by ID
        2. Enhances it with provider names
    Expected output: The provider switch log with provider names
    """
    try:
        result = await db.fetchrow("SELECT * FROM provider_switch_log WHERE id = $1", log_id)
        
        if not result:
            raise HTTPException(status_code=404, detail=f"Provider switch log with ID {log_id} not found")
        
        log = dict(result)
        
        # Fetch provider names
        new_provider_name = None
        previous_provider_name = None
        
        # Get new provider name
        if log.get("new_provider_id"):
            new_provider_data = await db.fetchrow("SELECT name FROM available_providers WHERE id = $1", log["new_provider_id"])
            if new_provider_data:
                new_provider_name = new_provider_data["name"]
        
        # Get previous provider name if provided
        if log.get("previous_provider_id"):
            prev_provider_data = await db.fetchrow("SELECT name FROM available_providers WHERE id = $1", log["previous_provider_id"])
            if prev_provider_data:
                previous_provider_name = prev_provider_data["name"]
        
        # Add provider names to the response
        log["previous_provider_name"] = previous_provider_name
        log["new_provider_name"] = new_provider_name
        
        return log
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching provider switch log {log_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}") 