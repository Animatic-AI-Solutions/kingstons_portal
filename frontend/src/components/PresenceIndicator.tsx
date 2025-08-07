import React from 'react';
import { usePresence } from '../hooks/usePresence';

interface PresenceIndicatorProps {
  pageIdentifier: string;
  className?: string;
}

const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({ 
  pageIdentifier, 
  className = '' 
}) => {
  const { users, isConnected, error } = usePresence({ pageIdentifier });
  
  // Helper function to safely parse user_info JSON string
  const parseUserInfo = (user: any) => {
    try {
      if (typeof user.user_info === 'string') {
        return JSON.parse(user.user_info);
      }
      return user.user_info || { name: 'Unknown User', avatar: '/images/Companylogo2.png' };
    } catch (err) {
      console.error('Failed to parse user_info:', user.user_info, err);
      return { name: 'Unknown User', avatar: '/images/Companylogo2.png' };
    }
  };
  
  // Debug logging
  console.log('🎭 PresenceIndicator: Render with props:', { pageIdentifier, className });
  console.log('🎭 PresenceIndicator: Hook state:', { users, isConnected, error, userCount: users?.length });

  if (error) {
    console.log('🎭 PresenceIndicator: Rendering error state:', error);
    return (
      <div className={`text-red-500 text-sm ${className}`}>
        <span className="flex items-center">
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Connection error
        </span>
      </div>
    );
  }

  if (!isConnected) {
    console.log('🎭 PresenceIndicator: Rendering connecting state');
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        <span className="flex items-center">
          <svg className="w-4 h-4 mr-1 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Connecting...
        </span>
      </div>
    );
  }

  if (users.length === 0) {
    console.log('🎭 PresenceIndicator: No other users, showing debug indicator');
    // During debugging, show a small indicator even when no users
    return (
      <div className={`text-xs text-gray-400 ${className}`}>
        <span className="flex items-center">
          <div className="w-2 h-2 bg-gray-300 rounded-full mr-1"></div>
          Only you here
        </span>
      </div>
    );
  }

  console.log('🎭 PresenceIndicator: Rendering presence for users:', users);

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* User avatars */}
      <div className="flex -space-x-2">
        {users.slice(0, 3).map((user) => {
          const userInfo = parseUserInfo(user);
          return (
            <div
              key={user.user_id}
              className="relative"
              title={`${userInfo.name} is also here`}
            >
              <img
                src={userInfo.avatar}
                alt={userInfo.name}
                className="w-6 h-6 rounded-full border-2 border-white shadow-sm bg-gray-100"
                onError={(e) => {
                  // Fallback to default avatar if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/Companylogo2.png';
                }}
              />
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          </div>
          );
        })}
        {users.length > 3 && (
          <div className="w-6 h-6 rounded-full border-2 border-white shadow-sm bg-gray-200 flex items-center justify-center text-xs text-gray-600">
            +{users.length - 3}
          </div>
        )}
      </div>
      
      {/* User names and status */}
      <div className="flex items-center space-x-2">
        <div className="text-sm text-gray-600">
                  {users.length === 1 ? (
          <span><strong>{parseUserInfo(users[0]).name}</strong> is also here</span>
        ) : users.length === 2 ? (
          <span>
            <strong>{parseUserInfo(users[0]).name}</strong> and <strong>{parseUserInfo(users[1]).name}</strong> are also here
          </span>
        ) : (
          <span>
            <strong>{parseUserInfo(users[0]).name}</strong> and <strong>{users.length - 1} others</strong> are also here
          </span>
        )}
        </div>
        
        {/* Live indicator */}
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="ml-1 text-xs text-green-600 font-medium">Live</span>
        </div>
      </div>
    </div>
  );
};

export default PresenceIndicator; 