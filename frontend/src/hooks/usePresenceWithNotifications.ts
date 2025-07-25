import { useState, useEffect, useRef } from 'react';
import { usePresence } from './usePresence';

interface NotificationState {
  id: string;
  type: 'user_entered' | 'user_left';
  userName: string;
  userAvatar?: string;
  timestamp: number;
}

interface UsePresenceWithNotificationsOptions {
  pageIdentifier: string;
  enabled?: boolean;
  showNotifications?: boolean;
  notificationDuration?: number;
}

export const usePresenceWithNotifications = ({
  pageIdentifier,
  enabled = true,
  showNotifications = true,
  notificationDuration = 4000
}: UsePresenceWithNotificationsOptions) => {
  const presenceData = usePresence({ pageIdentifier, enabled });
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const previousUsersRef = useRef<Set<number>>(new Set());
  const isInitialLoadRef = useRef(true);

  // Track user changes and create notifications
  useEffect(() => {
    if (!showNotifications || !presenceData.isConnected) {
      return;
    }

    const currentUserIds = new Set(presenceData.users.map(user => user.user_id));
    const previousUserIds = previousUsersRef.current;

    // Skip notifications on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      previousUsersRef.current = currentUserIds;
      return;
    }

    // Check for new users (entered)
    const newUsers = presenceData.users.filter(user => !previousUserIds.has(user.user_id));
    newUsers.forEach(user => {
      const notification: NotificationState = {
        id: `entered-${user.user_id}-${Date.now()}`,
        type: 'user_entered',
        userName: user.user_info.name,
        userAvatar: user.user_info.avatar,
        timestamp: Date.now()
      };
      
      setNotifications(prev => [...prev, notification]);
      
      // Auto-remove notification after duration
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, notificationDuration);
    });

    // Check for users who left
    const leftUserIds = Array.from(previousUserIds).filter(userId => !currentUserIds.has(userId));
    
    // We don't have user info for left users, so we'll show a generic message
    leftUserIds.forEach(userId => {
      const notification: NotificationState = {
        id: `left-${userId}-${Date.now()}`,
        type: 'user_left',
        userName: 'A user',
        timestamp: Date.now()
      };
      
      setNotifications(prev => [...prev, notification]);
      
      // Auto-remove notification after duration
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, notificationDuration);
    });

    // Update previous users reference
    previousUsersRef.current = currentUserIds;
  }, [presenceData.users, presenceData.isConnected, showNotifications, notificationDuration]);

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const dismissAllNotifications = () => {
    setNotifications([]);
  };

  return {
    ...presenceData,
    notifications,
    dismissNotification,
    dismissAllNotifications
  };
}; 