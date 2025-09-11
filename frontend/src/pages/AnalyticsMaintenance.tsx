import React from 'react';
import DynamicPageContainer from '../components/DynamicPageContainer';

const AnalyticsMaintenance: React.FC = () => {
  return (
    <DynamicPageContainer maxWidth="800px" className="py-8">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
          <svg
            className="h-8 w-8 text-yellow-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Analytics Under Maintenance
        </h1>
        
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          We're currently updating our analytics system to ensure all figures are accurate. 
          The analytics page will be available again shortly.
        </p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-sm text-blue-700">
            <strong>Alternative:</strong> You can still access revenue analytics and individual client reports from their respective pages.
          </p>
        </div>
        
        <div className="mt-8">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <svg
              className="mr-2 -ml-1 h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16l-4-4m0 0l4-4m-4 4h18"
              />
            </svg>
            Go Back
          </button>
        </div>
      </div>
    </DynamicPageContainer>
  );
};

export default AnalyticsMaintenance;