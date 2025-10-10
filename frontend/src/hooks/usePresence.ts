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
    if (!enabled) {
      return;
    }

    if (!user) {
      return;
    }

    if (!pageIdentifier) {
      return;
    }

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

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
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

          ws.send(JSON.stringify(enterMessage));

          // Start heartbeat
          heartbeatRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              const heartbeatMessage = {
                type: 'heartbeat',
                user_id: user.id
              };
              ws.send(JSON.stringify(heartbeatMessage));
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            if (message.type === 'presence_update') {
              setUsers(message.users || []);
            }
          } catch (err) {
            console.error('❌ usePresence: Error parsing WebSocket message:', err, 'Raw data:', event.data);
          }
        };

        ws.onclose = (event) => {
          setIsConnected(false);

          // Clear heartbeat
          if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
          }

          // Attempt to reconnect after 3 seconds unless it was a clean close
          if (event.code !== 1000 && enabled) {
            setTimeout(() => {
              if (enabled) {
                connectWebSocket();
              }
            }, 3000);
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
      if (wsRef.current) {
        // Send exit message before closing
        if (wsRef.current.readyState === WebSocket.OPEN) {
          const exitMessage = {
            type: 'presence_exit',
            user_id: user.id
          };
          wsRef.current.send(JSON.stringify(exitMessage));
        }
        wsRef.current.close(1000, 'Component unmounting');
      }

      if (heartbeatRef.current) {
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