from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional, List, Dict, Any
import logging
from ...db.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/search")
async def global_search(
    query: str = Query(..., description="Search query string"),
    limit: int = Query(20, description="Maximum number of results to return (function has built-in limit of 50)"),
    db = Depends(get_db)
):
    """
    Global search across all entities (client groups, products, funds, providers, portfolios)
    Uses the global_search_entities database function for efficient searching
    Function signature: global_search_entities(search_term text)
    Returns: entity_type, entity_id, entity_name, entity_description, relevance_score
    """
    try:
        logger.info(f"Performing global search with query: '{query}'")
        
        # Call the database function with single parameter
        result = await db.fetch(
            "SELECT * FROM global_search_entities($1)",
            query
        )
        
        # Process the results - AsyncPG returns Record objects
        search_results = []
        if result:
            for row in result:
                search_results.append({
                    "entity_type": row.get("entity_type"),
                    "entity_id": row.get("entity_id"), 
                    "name": row.get("entity_name"),  # Map entity_name to name
                    "description": row.get("entity_description"),  # Map entity_description to description
                    "relevance_score": row.get("relevance_score"),  # Include relevance score
                    "additional_info": f"Score: {row.get('relevance_score')}"  # Convert score to additional_info
                })
        
        # Apply client-side limit if user requested fewer results than function's built-in limit of 50
        if limit and limit < len(search_results):
            search_results = search_results[:limit]
        
        logger.info(f"Found {len(search_results)} results for query: '{query}'")
        
        return {
            "query": query,
            "total_results": len(search_results),
            "results": search_results
        }
        
    except Exception as e:
        logger.error(f"Error performing global search: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}") 