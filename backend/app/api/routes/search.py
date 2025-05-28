from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional, List, Dict, Any
import logging
from ...db.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/search")
async def global_search(
    query: str = Query(..., description="Search query string"),
    limit: int = Query(20, description="Maximum number of results to return"),
    db = Depends(get_db)
):
    """
    Global search across all entities (client groups, products, funds, providers, portfolios)
    Uses the global_search_entities database function for efficient searching
    """
    try:
        logger.info(f"Performing global search with query: '{query}', limit: {limit}")
        
        # Call the database function using Supabase RPC
        # Pass the limit as a parameter to the function
        result = db.rpc('global_search_entities', {
            'search_query': query,
            'result_limit': limit
        }).execute()
        
        # Process the results
        search_results = []
        if result.data:
            for row in result.data:
                search_results.append({
                    "entity_type": row.get("entity_type"),
                    "entity_id": row.get("entity_id"),
                    "name": row.get("name"),
                    "description": row.get("description"),
                    "additional_info": row.get("additional_info")
                })
        
        logger.info(f"Found {len(search_results)} results for query: '{query}'")
        
        return {
            "query": query,
            "total_results": len(search_results),
            "results": search_results
        }
        
    except Exception as e:
        logger.error(f"Error performing global search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}") 