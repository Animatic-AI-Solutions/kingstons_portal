import React from 'react';

interface ConcurrentUserModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  currentUsers: Array<{
    user_id: number;
    user_info: {
      name: string;
      avatar?: string;
    };
    entered_at: string;
  }>;
  pageName: string;
}

const ConcurrentUserModal: React.FC<ConcurrentUserModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  currentUsers,
  pageName
}) => {
  if (!isOpen) return null;

  const otherUsers = currentUsers.filter(user => user.user_id !== parseInt(localStorage.getItem('currentUserId') || '0'));

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-16 px-4 pb-20 text-center sm:block sm:pt-16 sm:px-6">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  Another User is Currently Editing
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-4">
                    {otherUsers.length === 1 ? 'Another user is' : `${otherUsers.length} other users are`} currently working on this {pageName}. 
                    Continuing may result in conflicting changes.
                  </p>
                  
                  {/* Show current users */}
                  <div className="space-y-2">
                    {otherUsers.map((user, index) => (
                      <div key={user.user_id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded-md">
                        <img 
                          src={user.user_info.avatar || '/images/Companylogo2.png'} 
                          alt={user.user_info.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {user.user_info.name || 'Unknown User'}
                          </p>
                          <p className="text-xs text-gray-500">
                            Active since {new Date(user.entered_at).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
                            Active
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          <strong>Warning:</strong> Editing simultaneously may cause data conflicts. Consider coordinating with the other user(s) before proceeding.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-yellow-600 text-base font-medium text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onConfirm}
            >
              Continue Anyway
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onCancel}
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConcurrentUserModal; 