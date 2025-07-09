import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

interface PresenceUser {
  user_id: number;
  user_info: {
    name: string;
    avatar: string;
  };
  entered_at: string;
  last_seen: string;
}

interface UsePresenceOptions {
  pageIdentifier: string;
  enabled?: boolean;
}

export const usePresence = ({ pageIdentifier, enabled = true }: UsePresenceOptions) => {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    console.log('🎯 usePresence: useEffect triggered with:', { enabled, user: user?.id, pageIdentifier });
    
    if (!enabled) {
      console.log('⚠️ usePresence: Presence disabled, skipping connection');
      return;
    }
    
    if (!user) {
      console.log('⚠️ usePresence: No user provided, skipping connection');
      return;
    }
    
    if (!pageIdentifier) {
      console.log('⚠️ usePresence: No page identifier provided, skipping connection');
      return;
    }
    
    console.log('✅ usePresence: All conditions met, proceeding with WebSocket connection');

    const connectWebSocket = () => {
      try {
        // Environment-aware WebSocket URL
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const apiBaseUrl = window.location.hostname === 'localhost' || 
                          window.location.hostname === '127.0.0.1' ||
                          window.location.port === '3000'
          ? 'localhost:8001'
          : 'intranet.kingston.local:8001';
        
        const wsUrl = `${wsProtocol}//${apiBaseUrl}/api/ws/presence/${pageIdentifier}`;
        
        console.log(`🔄 usePresence: Attempting WebSocket connection`);
        console.log(`🔄 usePresence: Protocol: ${wsProtocol}, Host: ${apiBaseUrl}`);
        console.log(`🔄 usePresence: Full URL: ${wsUrl}`);
        console.log(`🔄 usePresence: Page identifier: ${pageIdentifier}`);
        console.log(`🔄 usePresence: User:`, user);
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('✅ usePresence: WebSocket connected successfully');
          setIsConnected(true);
          setError(null);
          
          // Send presence enter message
          const enterMessage = {
            type: 'presence_enter',
            user_id: user.id,
            user_info: {
              name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
              avatar: user.profile_picture_url || '/images/Companylogo2.png'
            }
          };
          
          console.log('📤 usePresence: Sending presence_enter message:', enterMessage);
          ws.send(JSON.stringify(enterMessage));

          // Start heartbeat
          heartbeatRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              const heartbeatMessage = {
                type: 'heartbeat',
                user_id: user.id
              };
              console.log('💓 usePresence: Sending heartbeat:', heartbeatMessage);
              ws.send(JSON.stringify(heartbeatMessage));
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            console.log('📨 usePresence: Received WebSocket message:', event.data);
            const message = JSON.parse(event.data);
            console.log('📨 usePresence: Parsed message:', message);
            
            if (message.type === 'presence_update') {
              console.log('👥 usePresence: Presence update received. Users:', message.users);
              setUsers(message.users || []);
            } else {
              console.log('⚠️ usePresence: Unknown message type:', message.type);
            }
          } catch (err) {
            console.error('❌ usePresence: Error parsing WebSocket message:', err, 'Raw data:', event.data);
          }
        };

        ws.onclose = (event) => {
          console.log('🔌 usePresence: WebSocket closed. Code:', event.code, 'Reason:', event.reason);
          setIsConnected(false);
          
          // Clear heartbeat
          if (heartbeatRef.current) {
            console.log('💓 usePresence: Clearing heartbeat interval');
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
          }
          
          // Attempt to reconnect after 3 seconds unless it was a clean close
          if (event.code !== 1000 && enabled) {
            console.log('🔄 usePresence: Scheduling reconnection in 3 seconds...');
            setTimeout(() => {
              if (enabled) {
                console.log('🔄 usePresence: Attempting reconnection...');
                connectWebSocket();
              }
            }, 3000);
          } else {
            console.log('🔌 usePresence: Clean close or disabled, not reconnecting');
          }
        };

        ws.onerror = (error) => {
          console.error('❌ usePresence: WebSocket error:', error);
          setError('Connection error');
        };

      } catch (err) {
        console.error('Error connecting to WebSocket:', err);
        setError('Failed to connect');
      }
    };

    connectWebSocket();

    // Cleanup on unmount
    return () => {
      console.log('🧹 usePresence: Cleanup function called');
      
      if (wsRef.current) {
        console.log('🧹 usePresence: Cleaning up WebSocket connection');
        // Send exit message before closing
        if (wsRef.current.readyState === WebSocket.OPEN) {
          const exitMessage = {
            type: 'presence_exit',
            user_id: user.id
          };
          console.log('📤 usePresence: Sending presence_exit message:', exitMessage);
          wsRef.current.send(JSON.stringify(exitMessage));
        }
        wsRef.current.close(1000, 'Component unmounting');
      }
      
      if (heartbeatRef.current) {
        console.log('🧹 usePresence: Clearing heartbeat interval');
        clearInterval(heartbeatRef.current);
      }
    };
  }, [pageIdentifier, enabled, user]);

  // Filter out current user from display
  const otherUsers = users.filter(u => u.user_id !== user?.id);

  return {
    users: otherUsers,
    isConnected,
    error,
    totalUsers: users.length
  };
}; 