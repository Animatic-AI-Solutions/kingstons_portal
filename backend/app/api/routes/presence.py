from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json
import logging
from app.db.database import get_db
from app.api.routes.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        # Store connections by page_identifier -> list of (websocket, user_id)
        self.active_connections: Dict[str, List[tuple]] = {}
    
    async def connect(self, websocket: WebSocket, page_identifier: str, user_id: int):
        # Don't accept again - already accepted in main handler
        if page_identifier not in self.active_connections:
            self.active_connections[page_identifier] = []
        self.active_connections[page_identifier].append((websocket, user_id))
    
    def disconnect(self, websocket: WebSocket, page_identifier: str, user_id: int):
        if page_identifier in self.active_connections:
            self.active_connections[page_identifier] = [
                (ws, uid) for ws, uid in self.active_connections[page_identifier] 
                if ws != websocket
            ]
            
            if not self.active_connections[page_identifier]:
                del self.active_connections[page_identifier]
    
    async def broadcast_to_page(self, page_identifier: str, message: dict):
        """Send message to all users on a specific page"""
        
        if page_identifier in self.active_connections:
            connections = self.active_connections[page_identifier]
            dead_connections = []
            
            for websocket, user_id in connections:
                try:
                    message_str = json.dumps(message)
                    await websocket.send_text(message_str)
                except Exception as e:
                    logger.warning(f"Failed to send message to user {user_id}: {str(e)}")
                    dead_connections.append((websocket, user_id))
            
            # Remove dead connections
            for ws, uid in dead_connections:
                self.disconnect(ws, page_identifier, uid)

manager = ConnectionManager()

@router.websocket("/ws/presence/{page_identifier}")
async def websocket_endpoint(websocket: WebSocket, page_identifier: str):
    """WebSocket endpoint for real-time presence tracking"""
    user_id = None
    
    try:
        await websocket.accept()
        
        while True:
            # Receive messages from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                
                # Handle different message types
                if message["type"] == "presence_enter":
                    user_id = message.get("user_id")
                    if user_id:
                        await manager.connect(websocket, page_identifier, user_id)
                        await handle_presence_enter(message, page_identifier)
                        
                elif message["type"] == "presence_exit":
                    user_id = message.get("user_id")
                    if user_id:
                        await handle_presence_exit(message, page_identifier)
                        
                elif message["type"] == "heartbeat":
                    user_id = message.get("user_id")
                    await handle_heartbeat(message, page_identifier)
                    
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode error for page {page_identifier}: {str(e)}, data: {data}")
                
    except WebSocketDisconnect:
        if user_id:
            manager.disconnect(websocket, page_identifier, user_id)
            await cleanup_user_presence(page_identifier, user_id)
    except Exception as e:
        logger.error(f"WebSocket error for page {page_identifier}, user {user_id}: {str(e)}")
        if user_id:
            manager.disconnect(websocket, page_identifier, user_id)
            await cleanup_user_presence(page_identifier, user_id)

async def handle_presence_enter(message: dict, page_identifier: str):
    """Handle user entering a page"""
    try:
        user_id = message.get("user_id")
        user_info = message.get("user_info", {})
        
        db = get_db()
        
        # Insert or update presence record
        presence_data = {
            "user_id": user_id,
            "page_identifier": page_identifier,
            "entered_at": datetime.utcnow().isoformat(),
            "last_seen": datetime.utcnow().isoformat(),
            "user_info": user_info
        }
        
        # Upsert presence record
        result = db.table("user_page_presence").upsert(presence_data, on_conflict="user_id,page_identifier").execute()
        
        # Get all current users on this page
        current_users = await get_page_users(page_identifier)
        
        # Broadcast to all users on this page
        broadcast_message = {
            "type": "presence_update",
            "users": current_users
        }
        await manager.broadcast_to_page(page_identifier, broadcast_message)
        
    except Exception as e:
        logger.error(f"Error handling presence enter: {str(e)}")

async def handle_presence_exit(message: dict, page_identifier: str):
    """Handle user leaving a page"""
    try:
        user_id = message.get("user_id")
        await cleanup_user_presence(page_identifier, user_id)
        
    except Exception as e:
        logger.error(f"Error handling presence exit: {str(e)}")

async def handle_heartbeat(message: dict, page_identifier: str):
    """Handle heartbeat to keep presence alive"""
    try:
        user_id = message.get("user_id")
        if user_id:
            db = get_db()
            
            # Update last_seen timestamp
            db.table("user_page_presence").update({
                "last_seen": datetime.utcnow().isoformat()
            }).eq("user_id", user_id).eq("page_identifier", page_identifier).execute()
            
    except Exception as e:
        logger.error(f"Error handling heartbeat: {str(e)}")

async def cleanup_user_presence(page_identifier: str, user_id: int):
    """Clean up user presence when they leave"""
    try:
        db = get_db()
        
        # Remove presence record
        db.table("user_page_presence").delete().eq("user_id", user_id).eq("page_identifier", page_identifier).execute()
        
        # Get updated user list
        current_users = await get_page_users(page_identifier)
        
        # Broadcast to remaining users
        await manager.broadcast_to_page(page_identifier, {
            "type": "presence_update",
            "users": current_users
        })
        
    except Exception as e:
        logger.error(f"Error cleaning up presence: {str(e)}")

async def get_page_users(page_identifier: str) -> List[dict]:
    """Get all users currently on a page"""
    try:
        db = get_db()
        
        result = db.table("user_page_presence").select("*").eq("page_identifier", page_identifier).execute()
        
        users = []
        for record in result.data:
            user_data = {
                "user_id": record["user_id"],
                "user_info": record["user_info"],
                "entered_at": record["entered_at"],
                "last_seen": record["last_seen"]
            }
            users.append(user_data)
        
        return users
        
    except Exception as e:
        logger.error(f"Error getting page users: {str(e)}")
        return []


# REST endpoints for fallback/polling
@router.get("/presence/{page_identifier}")
async def get_presence(
    page_identifier: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get current users on a page (REST fallback)"""
    try:
        users = await get_page_users(page_identifier)
        return {"users": users}
    except Exception as e:
        logger.error(f"Error getting presence: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get presence")

@router.post("/presence/{page_identifier}/enter")
async def enter_page(
    page_identifier: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Mark user as entering a page (REST fallback)"""
    try:
        user_info = {
            "name": f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip(),
            "avatar": current_user.get('profile_picture_url', '/images/Companylogo2.png')
        }
        
        presence_data = {
            "user_id": current_user["id"],
            "page_identifier": page_identifier,
            "entered_at": datetime.utcnow().isoformat(),
            "last_seen": datetime.utcnow().isoformat(),
            "user_info": user_info
        }
        
        result = db.table("user_page_presence").upsert(presence_data, on_conflict="user_id,page_identifier").execute()
        
        return {"message": "Presence recorded", "user_id": current_user["id"]}
        
    except Exception as e:
        logger.error(f"Error recording presence: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to record presence")

@router.delete("/presence/{page_identifier}/exit")
async def exit_page(
    page_identifier: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Mark user as leaving a page (REST fallback)"""
    try:
        db.table("user_page_presence").delete().eq("user_id", current_user["id"]).eq("page_identifier", page_identifier).execute()
        
        return {"message": "Presence removed"}
        
    except Exception as e:
        logger.error(f"Error removing presence: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to remove presence")

# Cleanup task function
async def cleanup_stale_presence():
    """Remove stale presence records (older than 2 minutes)"""
    try:
        db = get_db()
        cutoff_time = datetime.utcnow() - timedelta(minutes=2)
        
        result = db.table("user_page_presence").delete().lt("last_seen", cutoff_time.isoformat()).execute()
        
    except Exception as e:
        logger.error(f"Error cleaning up presence: {str(e)}") 