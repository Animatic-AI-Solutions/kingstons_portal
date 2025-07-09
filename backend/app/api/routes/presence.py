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
        logger.info(f"👥 ConnectionManager: User {user_id} connected to page {page_identifier}. Total connections on page: {len(self.active_connections[page_identifier])}")
        logger.info(f"📊 ConnectionManager: Active pages: {list(self.active_connections.keys())}")
    
    def disconnect(self, websocket: WebSocket, page_identifier: str, user_id: int):
        if page_identifier in self.active_connections:
            original_count = len(self.active_connections[page_identifier])
            self.active_connections[page_identifier] = [
                (ws, uid) for ws, uid in self.active_connections[page_identifier] 
                if ws != websocket
            ]
            new_count = len(self.active_connections[page_identifier])
            logger.info(f"👥 ConnectionManager: User {user_id} disconnected from page {page_identifier}. Connections: {original_count} -> {new_count}")
            
            if not self.active_connections[page_identifier]:
                del self.active_connections[page_identifier]
                logger.info(f"🗑️ ConnectionManager: Removed empty page {page_identifier}")
        else:
            logger.warning(f"⚠️ ConnectionManager: Tried to disconnect user {user_id} from page {page_identifier} but page not found")
    
    async def broadcast_to_page(self, page_identifier: str, message: dict):
        """Send message to all users on a specific page"""
        logger.info(f"📡 ConnectionManager: Broadcasting to page {page_identifier}: {message}")
        
        if page_identifier in self.active_connections:
            connections = self.active_connections[page_identifier]
            logger.info(f"📡 ConnectionManager: Found {len(connections)} connections for page {page_identifier}")
            
            dead_connections = []
            successful_sends = 0
            
            for websocket, user_id in connections:
                try:
                    message_str = json.dumps(message)
                    await websocket.send_text(message_str)
                    successful_sends += 1
                    logger.debug(f"📤 ConnectionManager: Successfully sent message to user {user_id}")
                except Exception as e:
                    logger.warning(f"❌ ConnectionManager: Failed to send message to user {user_id}: {str(e)}")
                    dead_connections.append((websocket, user_id))
            
            logger.info(f"📊 ConnectionManager: Broadcast result - {successful_sends} successful, {len(dead_connections)} failed")
            
            # Remove dead connections
            for ws, uid in dead_connections:
                self.disconnect(ws, page_identifier, uid)
        else:
            logger.warning(f"⚠️ ConnectionManager: No connections found for page {page_identifier}")

manager = ConnectionManager()

@router.websocket("/ws/presence/{page_identifier}")
async def websocket_endpoint(websocket: WebSocket, page_identifier: str):
    """WebSocket endpoint for real-time presence tracking"""
    user_id = None
    
    try:
        logger.info(f"🔄 WebSocket connection attempt for page: {page_identifier}")
        await websocket.accept()
        logger.info(f"✅ WebSocket connection accepted for page: {page_identifier}")
        
        while True:
            # Receive messages from client
            logger.debug(f"⏳ Waiting for message from client on page: {page_identifier}")
            data = await websocket.receive_text()
            logger.info(f"📨 Received WebSocket message for page {page_identifier}: {data}")
            
            try:
                message = json.loads(data)
                logger.info(f"📋 Parsed message type: {message.get('type')} for page: {page_identifier}")
                
                # Handle different message types
                if message["type"] == "presence_enter":
                    user_id = message.get("user_id")
                    logger.info(f"🚪 User {user_id} entering page {page_identifier}")
                    if user_id:
                        await manager.connect(websocket, page_identifier, user_id)
                        await handle_presence_enter(message, page_identifier)
                        logger.info(f"✅ User {user_id} successfully entered page {page_identifier}")
                    else:
                        logger.warning(f"⚠️ No user_id provided in presence_enter message for page {page_identifier}")
                        
                elif message["type"] == "presence_exit":
                    user_id = message.get("user_id")
                    logger.info(f"🚪 User {user_id} exiting page {page_identifier}")
                    if user_id:
                        await handle_presence_exit(message, page_identifier)
                        logger.info(f"✅ User {user_id} successfully exited page {page_identifier}")
                        
                elif message["type"] == "heartbeat":
                    user_id = message.get("user_id")
                    logger.debug(f"💓 Heartbeat from user {user_id} on page {page_identifier}")
                    await handle_heartbeat(message, page_identifier)
                    
                else:
                    logger.warning(f"⚠️ Unknown message type: {message.get('type')} for page {page_identifier}")
                    
            except json.JSONDecodeError as e:
                logger.error(f"❌ JSON decode error for page {page_identifier}: {str(e)}, data: {data}")
                
    except WebSocketDisconnect:
        logger.info(f"🔌 WebSocket disconnected for page {page_identifier}, user: {user_id}")
        if user_id:
            manager.disconnect(websocket, page_identifier, user_id)
            await cleanup_user_presence(page_identifier, user_id)
    except Exception as e:
        logger.error(f"❌ WebSocket error for page {page_identifier}, user {user_id}: {str(e)}")
        if user_id:
            manager.disconnect(websocket, page_identifier, user_id)
            await cleanup_user_presence(page_identifier, user_id)

async def handle_presence_enter(message: dict, page_identifier: str):
    """Handle user entering a page"""
    try:
        user_id = message.get("user_id")
        user_info = message.get("user_info", {})
        
        logger.info(f"🎯 handle_presence_enter: Processing user {user_id} entering page {page_identifier}")
        logger.info(f"🎯 handle_presence_enter: User info: {user_info}")
        
        db = get_db()
        logger.info(f"🎯 handle_presence_enter: Got database connection")
        
        # Insert or update presence record
        presence_data = {
            "user_id": user_id,
            "page_identifier": page_identifier,
            "entered_at": datetime.utcnow().isoformat(),
            "last_seen": datetime.utcnow().isoformat(),
            "user_info": user_info
        }
        
        logger.info(f"🎯 handle_presence_enter: Upserting presence data: {presence_data}")
        
        # Upsert presence record
        result = db.table("user_page_presence").upsert(presence_data, on_conflict="user_id,page_identifier").execute()
        logger.info(f"🎯 handle_presence_enter: Database upsert result: {result}")
        
        # Get all current users on this page
        logger.info(f"🎯 handle_presence_enter: Getting all users on page {page_identifier}")
        current_users = await get_page_users(page_identifier)
        logger.info(f"🎯 handle_presence_enter: Current users on page: {current_users}")
        
        # Broadcast to all users on this page
        broadcast_message = {
            "type": "presence_update",
            "users": current_users
        }
        logger.info(f"🎯 handle_presence_enter: Broadcasting message: {broadcast_message}")
        await manager.broadcast_to_page(page_identifier, broadcast_message)
        
        logger.info(f"✅ handle_presence_enter: User {user_id} successfully entered page {page_identifier}")
        
    except Exception as e:
        logger.error(f"❌ handle_presence_enter: Error handling presence enter: {str(e)}")

async def handle_presence_exit(message: dict, page_identifier: str):
    """Handle user leaving a page"""
    try:
        user_id = message.get("user_id")
        await cleanup_user_presence(page_identifier, user_id)
        
        logger.info(f"User {user_id} left page {page_identifier}")
        
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
        logger.info(f"🔍 get_page_users: Querying users for page {page_identifier}")
        db = get_db()
        logger.info(f"🔍 get_page_users: Got database connection")
        
        result = db.table("user_page_presence").select("*").eq("page_identifier", page_identifier).execute()
        logger.info(f"🔍 get_page_users: Database query result: {result}")
        logger.info(f"🔍 get_page_users: Raw data from database: {result.data}")
        
        users = []
        for record in result.data:
            user_data = {
                "user_id": record["user_id"],
                "user_info": record["user_info"],
                "entered_at": record["entered_at"],
                "last_seen": record["last_seen"]
            }
            users.append(user_data)
            logger.info(f"🔍 get_page_users: Processed user record: {user_data}")
        
        logger.info(f"🔍 get_page_users: Returning {len(users)} users for page {page_identifier}: {users}")
        return users
        
    except Exception as e:
        logger.error(f"❌ get_page_users: Error getting page users: {str(e)}")
        return []

# Test endpoint for debugging
@router.get("/presence/debug/status")
async def debug_status():
    """Debug endpoint to check presence system status"""
    try:
        active_pages = list(manager.active_connections.keys())
        total_connections = sum(len(connections) for connections in manager.active_connections.values())
        
        return {
            "status": "operational",
            "active_pages": active_pages,
            "total_connections": total_connections,
            "connection_details": {
                page: len(connections) for page, connections in manager.active_connections.items()
            }
        }
    except Exception as e:
        logger.error(f"Error in debug status: {str(e)}")
        return {"status": "error", "error": str(e)}

# REST endpoints for fallback/polling
@router.get("/presence/{page_identifier}")
async def get_presence(
    page_identifier: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get current users on a page (REST fallback)"""
    try:
        logger.info(f"🔍 REST endpoint: Getting presence for page {page_identifier}, user {current_user.get('id')}")
        users = await get_page_users(page_identifier)
        logger.info(f"🔍 REST endpoint: Returning {len(users)} users for page {page_identifier}")
        return {"users": users}
    except Exception as e:
        logger.error(f"❌ REST endpoint: Error getting presence: {str(e)}")
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
        
        if result.data:
            logger.info(f"Cleaned up {len(result.data)} stale presence records")
        
    except Exception as e:
        logger.error(f"Error cleaning up presence: {str(e)}") 