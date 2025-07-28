import { useState, useEffect, useRef } from 'react';
import { usePresence } from './usePresence';

interface NotificationState {
  id: string;
  type: 'user_entered' | 'user_left';
  userName: string;
  userAvatar?: string;
  timestamp: number;
}

interface UserInfo {
  name: string;
  avatar?: string;
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
  const userInfoCacheRef = useRef<Map<number, UserInfo>>(new Map());
  const isInitialLoadRef = useRef(true);

  // Track user changes and create notifications
  useEffect(() => {
    if (!showNotifications || !presenceData.isConnected) {
      return;
    }

    const currentUserIds = new Set(presenceData.users.map(user => user.user_id));
    const previousUserIds = previousUsersRef.current;

    // Update user info cache with current users
    presenceData.users.forEach(user => {
      userInfoCacheRef.current.set(user.user_id, {
        name: user.user_info.name,
        avatar: user.user_info.avatar
      });
    });

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
    
    // Use cached user info for left users
    leftUserIds.forEach(userId => {
      const cachedUserInfo = userInfoCacheRef.current.get(userId);
      const notification: NotificationState = {
        id: `left-${userId}-${Date.now()}`,
        type: 'user_left',
        userName: cachedUserInfo?.name || 'A user',
        userAvatar: cachedUserInfo?.avatar,
        timestamp: Date.now()
      };
      
      setNotifications(prev => [...prev, notification]);
      
      // Auto-remove notification after duration
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, notificationDuration);

      // Clean up cache entry for left user to avoid memory leaks
      userInfoCacheRef.current.delete(userId);
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