import React from 'react';

interface ErrorDisplayProps {
  message: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  // Make sure message is a string, even if an object is passed
  const errorMessage = typeof message === 'object' 
    ? JSON.stringify(message, null, 2) 
    : message;
    
  return (
    <div className="text-red-600 text-center py-4 rounded-md bg-red-50 p-4">
      <svg 
        className="mx-auto h-8 w-8 text-red-500 mb-2" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      <p>{errorMessage}</p>
      <button 
        className="mt-2 text-sm text-red-700 underline"
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
    </div>
  );
}; 