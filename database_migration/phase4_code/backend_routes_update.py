# =============================================================================
# UPDATED API ROUTES: backend/app/api/routes/client_groups.py  
# =============================================================================
# This file shows the updated client_groups routes to support advisor relationships
# Copy these changes to your actual backend/app/api/routes/client_groups.py file

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from typing import List, Optional
import logging

# Import your database and auth dependencies
from app.db.database import get_db
from app.utils.security import get_current_user

# Import the updated models (from the previous file)
from app.models.client_group import (
    ClientGroup, 
    ClientGroupCreate, 
    ClientGroupUpdate,
    AdvisorAssignment,
    AdvisorInfo,
    AdvisorSummary,
    AdvisorMigrationStatus
)

router = APIRouter()
logger = logging.getLogger(__name__)

# =============================================================================
# UPDATED BULK DATA ENDPOINT (Priority 1)
# =============================================================================

@router.get("/bulk_client_data", response_model=List[ClientGroup])
async def get_bulk_client_data(
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get bulk client data with advisor relationship information.
    Now uses client_group_complete_data view from Phase 3.
    """
    try:
        # Updated query to use the view created in Phase 3
        query = text("""
            SELECT DISTINCT
                client_group_id as id,
                client_group_name as name,
                type,
                client_group_status as status,
                created_at,
                
                -- New advisor relationship fields
                advisor_id,
                advisor_name,
                advisor_email,
                advisor_first_name,
                advisor_last_name,
                advisor_assignment_status,
                
                -- Legacy field for backward compatibility
                legacy_advisor_text as advisor
                
            FROM client_group_complete_data
            WHERE client_group_status != 'inactive'
            ORDER BY client_group_name
        """)
        
        result = await db.execute(query)
        rows = result.fetchall()
        
        # Convert to response model
        client_groups = []
        for row in rows:
            client_group_data = {
                "id": row.id,
                "name": row.name,
                "type": row.type,
                "status": row.status,
                "created_at": row.created_at,
                "advisor_id": row.advisor_id,
                "advisor_name": row.advisor_name,
                "advisor_email": row.advisor_email,
                "advisor_first_name": row.advisor_first_name,
                "advisor_last_name": row.advisor_last_name,
                "advisor_assignment_status": row.advisor_assignment_status,
                "advisor": row.advisor  # Legacy field
            }
            client_groups.append(ClientGroup(**client_group_data))
        
        logger.info(f"Retrieved {len(client_groups)} client groups with advisor information")
        return client_groups
        
    except Exception as e:
        logger.error(f"Error retrieving bulk client data: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve client data")

# =============================================================================
# NEW ADVISOR MANAGEMENT ENDPOINTS (Priority 1)
# =============================================================================

@router.get("/advisors", response_model=List[AdvisorInfo])
async def get_available_advisors(
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get list of available advisors for dropdown selection.
    Uses advisor_client_summary view from Phase 3.
    """
    try:
        query = text("""
            SELECT 
                advisor_id,
                first_name,
                last_name,
                full_name,
                email,
                client_groups_count,
                total_products_count
            FROM advisor_client_summary
            ORDER BY full_name
        """)
        
        result = await db.execute(query)
        rows = result.fetchall()
        
        advisors = []
        for row in rows:
            advisor_data = {
                "advisor_id": row.advisor_id,
                "first_name": row.first_name,
                "last_name": row.last_name,
                "full_name": row.full_name,
                "email": row.email,
                "client_groups_count": row.client_groups_count,
                "total_products_count": row.total_products_count
            }
            advisors.append(AdvisorInfo(**advisor_data))
        
        logger.info(f"Retrieved {len(advisors)} available advisors")
        return advisors
        
    except Exception as e:
        logger.error(f"Error retrieving advisors: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve advisors")

@router.put("/{client_group_id}/advisor", response_model=ClientGroup)
async def assign_advisor(
    client_group_id: int,
    advisor_assignment: AdvisorAssignment,
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Assign or unassign advisor to a client group.
    """
    try:
        # Validate client group exists
        check_query = text("SELECT id FROM client_groups WHERE id = :client_group_id")
        result = await db.execute(check_query, {"client_group_id": client_group_id})
        if not result.fetchone():
            raise HTTPException(status_code=404, detail="Client group not found")
        
        # Validate advisor exists if provided
        if advisor_assignment.advisor_id is not None:
            advisor_check = text("SELECT id FROM profiles WHERE id = :advisor_id")
            result = await db.execute(advisor_check, {"advisor_id": advisor_assignment.advisor_id})
            if not result.fetchone():
                raise HTTPException(status_code=404, detail="Advisor profile not found")
        
        # Update advisor assignment
        update_query = text("""
            UPDATE client_groups 
            SET advisor_id = :advisor_id
            WHERE id = :client_group_id
        """)
        
        await db.execute(update_query, {
            "advisor_id": advisor_assignment.advisor_id,
            "client_group_id": client_group_id
        })
        await db.commit()
        
        # Return updated client group with advisor information
        get_updated_query = text("""
            SELECT 
                client_group_id as id,
                client_group_name as name,
                type,
                client_group_status as status,
                created_at,
                advisor_id,
                advisor_name,
                advisor_email,
                advisor_first_name,
                advisor_last_name,
                advisor_assignment_status,
                legacy_advisor_text as advisor
            FROM client_group_complete_data
            WHERE client_group_id = :client_group_id
        """)
        
        result = await db.execute(get_updated_query, {"client_group_id": client_group_id})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Updated client group not found")
        
        updated_client = ClientGroup(
            id=row.id,
            name=row.name,
            type=row.type,
            status=row.status,
            created_at=row.created_at,
            advisor_id=row.advisor_id,
            advisor_name=row.advisor_name,
            advisor_email=row.advisor_email,
            advisor_first_name=row.advisor_first_name,
            advisor_last_name=row.advisor_last_name,
            advisor_assignment_status=row.advisor_assignment_status,
            advisor=row.advisor
        )
        
        action = "assigned" if advisor_assignment.advisor_id else "unassigned"
        logger.info(f"Advisor {action} for client group {client_group_id}")
        
        return updated_client
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Error assigning advisor: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to assign advisor")

@router.get("/advisor-summary", response_model=List[AdvisorSummary])
async def get_advisor_summary(
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get advisor workload summary with client assignments.
    """
    try:
        query = text("""
            SELECT 
                advisor_id,
                full_name,
                email,
                client_groups_count,
                total_products_count,
                client_group_names
            FROM advisor_client_summary
            ORDER BY client_groups_count DESC, full_name
        """)
        
        result = await db.execute(query)
        rows = result.fetchall()
        
        summaries = []
        for row in rows:
            summary_data = {
                "advisor_id": row.advisor_id,
                "full_name": row.full_name,
                "email": row.email,
                "client_groups_count": row.client_groups_count,
                "total_products_count": row.total_products_count,
                "client_group_names": row.client_group_names
            }
            summaries.append(AdvisorSummary(**summary_data))
        
        logger.info(f"Retrieved advisor summary for {len(summaries)} advisors")
        return summaries
        
    except Exception as e:
        logger.error(f"Error retrieving advisor summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve advisor summary")

@router.get("/migration-status", response_model=AdvisorMigrationStatus)
async def get_advisor_migration_status(
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get advisor migration status overview.
    """
    try:
        query = text("SELECT * FROM advisor_migration_status_overview")
        result = await db.execute(query)
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Migration status not available")
        
        status = AdvisorMigrationStatus(
            report_type=row.report_type,
            total_client_groups=row.total_client_groups,
            groups_with_advisor_profile=row.groups_with_advisor_profile,
            groups_with_legacy_advisor_only=row.groups_with_legacy_advisor_only,
            groups_with_no_advisor=row.groups_with_no_advisor,
            unique_advisors_assigned=row.unique_advisors_assigned,
            advisor_profiles_in_use=row.advisor_profiles_in_use
        )
        
        return status
        
    except Exception as e:
        logger.error(f"Error retrieving migration status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve migration status")

# =============================================================================
# UPDATED EXISTING ENDPOINTS (if needed)
# =============================================================================

@router.get("/{client_group_id}", response_model=ClientGroup)
async def get_client_group(
    client_group_id: int,
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Get individual client group with advisor information.
    Updated to use the new view.
    """
    try:
        query = text("""
            SELECT 
                client_group_id as id,
                client_group_name as name,
                type,
                client_group_status as status,
                created_at,
                advisor_id,
                advisor_name,
                advisor_email,
                advisor_first_name,
                advisor_last_name,
                advisor_assignment_status,
                legacy_advisor_text as advisor
            FROM client_group_complete_data
            WHERE client_group_id = :client_group_id
            LIMIT 1
        """)
        
        result = await db.execute(query, {"client_group_id": client_group_id})
        row = result.fetchone()
        
        if not row:
            raise HTTPException(status_code=404, detail="Client group not found")
        
        client_group = ClientGroup(
            id=row.id,
            name=row.name,
            type=row.type,
            status=row.status,
            created_at=row.created_at,
            advisor_id=row.advisor_id,
            advisor_name=row.advisor_name,
            advisor_email=row.advisor_email,
            advisor_first_name=row.advisor_first_name,
            advisor_last_name=row.advisor_last_name,
            advisor_assignment_status=row.advisor_assignment_status,
            advisor=row.advisor
        )
        
        return client_group
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving client group {client_group_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve client group")

# =============================================================================
# ENHANCED SEARCH ENDPOINT (Optional - can be added later)
# =============================================================================

@router.get("/search", response_model=List[ClientGroup])
async def search_client_groups(
    q: str = Query(..., description="Search query"),
    db = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Search client groups with advisor information.
    Now searches advisor names and emails too.
    """
    try:
        query = text("""
            SELECT DISTINCT
                client_group_id as id,
                client_group_name as name,
                type,
                client_group_status as status,
                created_at,
                advisor_id,
                advisor_name,
                advisor_email,
                advisor_first_name,
                advisor_last_name,
                advisor_assignment_status,
                legacy_advisor_text as advisor
            FROM client_group_complete_data
            WHERE client_group_status != 'inactive'
            AND (
                client_group_name ILIKE :search OR
                type ILIKE :search OR
                advisor_name ILIKE :search OR
                advisor_email ILIKE :search OR
                legacy_advisor_text ILIKE :search
            )
            ORDER BY client_group_name
            LIMIT 50
        """)
        
        search_param = f"%{q}%"
        result = await db.execute(query, {"search": search_param})
        rows = result.fetchall()
        
        client_groups = []
        for row in rows:
            client_group = ClientGroup(
                id=row.id,
                name=row.name,
                type=row.type,
                status=row.status,
                created_at=row.created_at,
                advisor_id=row.advisor_id,
                advisor_name=row.advisor_name,
                advisor_email=row.advisor_email,
                advisor_first_name=row.advisor_first_name,
                advisor_last_name=row.advisor_last_name,
                advisor_assignment_status=row.advisor_assignment_status,
                advisor=row.advisor
            )
            client_groups.append(client_group)
        
        logger.info(f"Search for '{q}' returned {len(client_groups)} results")
        return client_groups
        
    except Exception as e:
        logger.error(f"Error searching client groups: {str(e)}")
        raise HTTPException(status_code=500, detail="Search failed")

# =============================================================================
# USAGE EXAMPLES
# =============================================================================

"""
New API Endpoints Available:

1. GET /api/client_groups/advisors
   - Returns list of available advisors for dropdowns

2. PUT /api/client_groups/{id}/advisor
   - Assign advisor: {"advisor_id": 5}
   - Unassign advisor: {"advisor_id": null}

3. GET /api/client_groups/advisor-summary
   - Returns advisor workload summary

4. GET /api/client_groups/migration-status
   - Returns migration status overview

Updated endpoints:
- GET /api/client_groups/bulk_client_data (now includes advisor fields)
- GET /api/client_groups/{id} (now includes advisor fields) 
- GET /api/client_groups/search (now searches advisor names/emails)
""" 