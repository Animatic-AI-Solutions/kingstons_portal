from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import json
import logging
from app.db.database import get_db
from app.api.routes.auth import get_current_user
logger = logging.getLogger(__name__)
router = APIRouter()

class ConnectionManager:

    def __init__(self):
        self.active_connections: Dict[str, List[tuple]] = {}

    async def connect(self, websocket: WebSocket, page_identifier: str, user_id: int):
        if page_identifier not in self.active_connections:
            self.active_connections[page_identifier] = []
        self.active_connections[page_identifier].append((websocket, user_id))

    def disconnect(self, websocket: WebSocket, page_identifier: str, user_id: int):
        if page_identifier in self.active_connections:
            self.active_connections[page_identifier] = [(ws, uid) for ws, uid in self.active_connections[page_identifier] if ws != websocket]
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
                    logger.warning(f'Failed to send message to user {user_id}: {str(e)}')
                    dead_connections.append((websocket, user_id))
            for ws, uid in dead_connections:
                self.disconnect(ws, page_identifier, uid)
manager = ConnectionManager()

@router.websocket('/ws/presence/{page_identifier}')
async def websocket_endpoint(websocket: WebSocket, page_identifier: str):
    """WebSocket endpoint for real-time presence tracking"""
    user_id = None
    try:
        await websocket.accept()
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message['type'] == 'presence_enter':
                    user_id = message.get('user_id')
                    if user_id:
                        await manager.connect(websocket, page_identifier, user_id)
                        await handle_presence_enter(message, page_identifier)
                elif message['type'] == 'presence_exit':
                    user_id = message.get('user_id')
                    if user_id:
                        await handle_presence_exit(message, page_identifier)
                elif message['type'] == 'heartbeat':
                    user_id = message.get('user_id')
                    await handle_heartbeat(message, page_identifier)
            except json.JSONDecodeError as e:
                logger.error(f'JSON decode error for page {page_identifier}: {str(e)}, data: {data}')
    except WebSocketDisconnect:
        if user_id:
            manager.disconnect(websocket, page_identifier, user_id)
            await cleanup_user_presence(page_identifier, user_id)
    except Exception as e:
        logger.error(f'WebSocket error for page {page_identifier}, user {user_id}: {str(e)}')
        if user_id:
            manager.disconnect(websocket, page_identifier, user_id)
            await cleanup_user_presence(page_identifier, user_id)

async def handle_presence_enter(message: dict, page_identifier: str):
    """Handle user entering a page"""
    try:
        user_id = message.get('user_id')
        user_info = message.get('user_info', {})
        from app.db.database import get_db_sync
        pool = get_db_sync()
        async with pool.acquire() as db:
            current_time = datetime.utcnow()
            presence_data = {'user_id': user_id, 'page_identifier': page_identifier, 'entered_at': current_time, 'last_seen': current_time, 'user_info': user_info}
            result = await db.execute('\n            INSERT INTO user_page_presence (user_id, page_identifier, entered_at, last_seen, user_info)\n            VALUES ($1, $2, $3, $4, $5)\n            ON CONFLICT (user_id, page_identifier) \n            DO UPDATE SET \n                last_seen = EXCLUDED.last_seen,\n                user_info = EXCLUDED.user_info\n        ', presence_data['user_id'], presence_data['page_identifier'], presence_data['entered_at'], presence_data['last_seen'], json.dumps(presence_data['user_info']))
        current_users = await get_page_users(page_identifier)
        broadcast_message = {'type': 'presence_update', 'users': current_users}
        await manager.broadcast_to_page(page_identifier, broadcast_message)
    except Exception as e:
        logger.error(f'Error handling presence enter: {str(e)}')

async def handle_presence_exit(message: dict, page_identifier: str):
    """Handle user leaving a page"""
    try:
        user_id = message.get('user_id')
        await cleanup_user_presence(page_identifier, user_id)
    except Exception as e:
        logger.error(f'Error handling presence exit: {str(e)}')

async def handle_heartbeat(message: dict, page_identifier: str):
    """Handle heartbeat to keep presence alive"""
    try:
        user_id = message.get('user_id')
        if user_id:
            from app.db.database import get_db_sync
            pool = get_db_sync()
            async with pool.acquire() as db:
                await db.execute('\n                    UPDATE user_page_presence \n                    SET last_seen = $1 \n                    WHERE user_id = $2 AND page_identifier = $3\n                ', datetime.utcnow(), user_id, page_identifier)
    except Exception as e:
        logger.error(f'Error handling heartbeat: {str(e)}')

async def cleanup_user_presence(page_identifier: str, user_id: int):
    """Clean up user presence when they leave"""
    try:
        from app.db.database import get_db_sync
        pool = get_db_sync()
        async with pool.acquire() as db:
            await db.execute('\n                DELETE FROM user_page_presence \n                WHERE user_id = $1 AND page_identifier = $2\n            ', user_id, page_identifier)
        current_users = await get_page_users(page_identifier)
        await manager.broadcast_to_page(page_identifier, {'type': 'presence_update', 'users': current_users})
    except Exception as e:
        logger.error(f'Error cleaning up presence: {str(e)}')

async def get_page_users(page_identifier: str) -> List[dict]:
    """Get all users currently on a page"""
    try:
        from app.db.database import get_db_sync
        pool = get_db_sync()
        async with pool.acquire() as db:
            result = await db.fetch('\n                SELECT * FROM user_page_presence WHERE page_identifier = $1\n            ', page_identifier)
        users = []
        for record_row in result:
            record = dict(record_row)
            user_data = {'user_id': record['user_id'], 'user_info': record['user_info'], 'entered_at': record['entered_at'].isoformat() if record['entered_at'] else None, 'last_seen': record['last_seen'].isoformat() if record['last_seen'] else None}
            users.append(user_data)
        return users
    except Exception as e:
        logger.error(f'Error getting page users: {str(e)}')
        return []

@router.get('/presence/{page_identifier}')
async def get_presence(page_identifier: str, current_user: dict=Depends(get_current_user), db=Depends(get_db)):
    """Get current users on a page (REST fallback)"""
    try:
        users = await get_page_users(page_identifier)
        return {'users': users}
    except Exception as e:
        logger.error(f'Error getting presence: {str(e)}')
        raise HTTPException(status_code=500, detail='Failed to get presence')

@router.post('/presence/{page_identifier}/enter')
async def enter_page(page_identifier: str, current_user: dict=Depends(get_current_user), db=Depends(get_db)):
    """Mark user as entering a page (REST fallback)"""
    try:
        user_info = {'name': f"{current_user.get('first_name', '')} {current_user.get('last_name', '')}".strip(), 'avatar': current_user.get('profile_picture_url', '/images/Companylogo2.png')}
        current_time = datetime.utcnow()
        presence_data = {'user_id': current_user['id'], 'page_identifier': page_identifier, 'entered_at': current_time, 'last_seen': current_time, 'user_info': user_info}
        result = await db.execute('\n            INSERT INTO user_page_presence (user_id, page_identifier, entered_at, last_seen, user_info)\n            VALUES ($1, $2, $3, $4, $5)\n            ON CONFLICT (user_id, page_identifier) \n            DO UPDATE SET \n                last_seen = EXCLUDED.last_seen,\n                user_info = EXCLUDED.user_info\n        ', presence_data['user_id'], presence_data['page_identifier'], presence_data['entered_at'], presence_data['last_seen'], json.dumps(presence_data['user_info']))
        return {'message': 'Presence recorded', 'user_id': current_user['id']}
    except Exception as e:
        logger.error(f'Error recording presence: {str(e)}')
        raise HTTPException(status_code=500, detail='Failed to record presence')

@router.delete('/presence/{page_identifier}/exit')
async def exit_page(page_identifier: str, current_user: dict=Depends(get_current_user), db=Depends(get_db)):
    """Mark user as leaving a page (REST fallback)"""
    try:
        await db.execute('\n            DELETE FROM user_page_presence \n            WHERE user_id = $1 AND page_identifier = $2\n        ', current_user['id'], page_identifier)
        return {'message': 'Presence removed'}
    except Exception as e:
        logger.error(f'Error removing presence: {str(e)}')
        raise HTTPException(status_code=500, detail='Failed to remove presence')

async def cleanup_stale_presence():
    """Remove stale presence records (older than 2 minutes)"""
    try:
        from app.db.database import get_db_sync
        db_pool = get_db_sync()
        if not db_pool:
            logger.warning('Database pool not available for presence cleanup')
            return
        cutoff_time = datetime.utcnow() - timedelta(minutes=2)
        async with db_pool.acquire() as db:
            result = await db.execute('DELETE FROM user_page_presence WHERE last_seen < $1', cutoff_time)
            if result.startswith('DELETE'):
                deleted_count = result.split()[1]
                logger.debug(f'Cleaned up {deleted_count} stale presence records')
    except Exception as e:
        logger.error(f'Error cleaning up presence: {str(e)}')