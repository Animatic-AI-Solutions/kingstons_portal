import React from 'react';
import { Transition } from '@headlessui/react';

interface Notification {
  id: string;
  type: 'user_entered' | 'user_left';
  userName: string;
  userAvatar?: string;
  timestamp: number;
}

interface PresenceNotificationsProps {
  notifications: Notification[];
  onDismiss: (notificationId: string) => void;
  onDismissAll: () => void;
}

const PresenceNotifications: React.FC<PresenceNotificationsProps> = ({
  notifications,
  onDismiss,
  onDismissAll
}) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-24 right-4 z-50 space-y-3 w-80">
      {notifications.map((notification) => (
        <Transition
          key={notification.id}
          show={true}
          enter="transform ease-out duration-300 transition"
          enterFrom="translate-x-full opacity-0 scale-95"
          enterTo="translate-x-0 opacity-100 scale-100"
          leave="transition ease-in duration-150"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <div className="w-full bg-white shadow-xl rounded-xl border border-gray-200 overflow-hidden backdrop-blur-sm">
            {/* Header with color indicator */}
            <div className={`h-1 w-full ${
              notification.type === 'user_entered' ? 'bg-green-500' : 'bg-orange-500'
            }`}>
              <div 
                className="h-full bg-gray-300 transition-all duration-4000 ease-linear"
                style={{
                  animation: 'shrink 4s linear forwards'
                }}
              />
            </div>
            
            {/* Content */}
            <div className="p-3">
              <div className="flex items-center">
                {/* Icon and Avatar */}
                <div className="flex-shrink-0 flex items-center">
                  {notification.userAvatar ? (
                    <img
                      className="h-8 w-8 rounded-full"
                      src={notification.userAvatar}
                      alt={notification.userName}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/images/Companylogo2.png';
                      }}
                    />
                  ) : (
                    <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Status indicator */}
                  <div className={`ml-2 h-3 w-3 rounded-full flex items-center justify-center ${
                    notification.type === 'user_entered' 
                      ? 'bg-green-100' 
                      : 'bg-orange-100'
                  }`}>
                    <div className={`h-1.5 w-1.5 rounded-full ${
                      notification.type === 'user_entered' 
                        ? 'bg-green-500' 
                        : 'bg-orange-500'
                    }`} />
                  </div>
                </div>
                
                {/* Text content */}
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {notification.type === 'user_entered' 
                      ? `${notification.userName} joined` 
                      : `${notification.userName} left`}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {notification.type === 'user_entered' 
                      ? 'Now editing this page' 
                      : 'Stopped editing'}
                  </p>
                </div>
                
                {/* Close button */}
                <div className="ml-2 flex-shrink-0">
                  <button
                    className="rounded-md inline-flex text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-1 transition-colors duration-150"
                    onClick={() => onDismiss(notification.id)}
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      ))}
      
      {/* Dismiss all button when multiple notifications */}
      {notifications.length > 1 && (
        <div className="text-center mt-2">
          <button
            onClick={onDismissAll}
            className="text-xs text-gray-500 hover:text-gray-700 underline bg-white px-2 py-1 rounded-md shadow-sm border border-gray-200 transition-colors duration-150"
          >
            Dismiss all ({notifications.length})
          </button>
        </div>
      )}
      
      <style jsx>{`
        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
};

export default PresenceNotifications; 