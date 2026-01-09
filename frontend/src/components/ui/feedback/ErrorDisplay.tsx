import React from 'react';

interface ErrorDisplayProps {
  /** Error message to display */
  message: string;
  /** Optional callback for retry button. If not provided, uses window.location.reload() */
  onRetry?: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onRetry }) => {
  // Make sure message is a string, even if an object is passed
  const errorMessage = typeof message === 'object'
    ? JSON.stringify(message, null, 2)
    : message;

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="text-red-600 text-center py-4 rounded-md bg-red-50 p-4">
      <svg
        className="mx-auto h-8 w-8 text-red-500 mb-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
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
        type="button"
        className="mt-2 text-sm text-red-700 underline hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
        onClick={handleRetry}
      >
        Retry
      </button>
    </div>
  );
}; 