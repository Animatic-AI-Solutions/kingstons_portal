import React from 'react';

const IconTest: React.FC = () => {
  return (
    <div className="p-8 bg-white">
      <h2 className="text-xl font-bold mb-6">Icon Rendering Test</h2>
      
      {/* Direct SVG test */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Direct SVG Icons:</h3>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <svg className="h-8 w-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
            <span className="text-xs mt-1">Filter</span>
          </div>
          
          <div className="flex flex-col items-center">
            <svg className="h-8 w-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
            </svg>
            <span className="text-xs mt-1">Sort</span>
          </div>
        </div>
      </div>
      
      {/* Button with SVG test */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Button with SVG:</h3>
        <div className="flex items-center gap-4">
          <button className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-50">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
            </svg>
          </button>
          
          <button className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-50">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* Alternative icons test */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Alternative Icon Approaches:</h3>
        <div className="flex items-center gap-4">
          {/* Unicode symbols */}
          <button className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-50 text-lg">
            ⚟
          </button>
          
          <button className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-50 text-lg">
            ↕
          </button>
          
          {/* Text icons */}
          <button className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-50 text-xs font-bold">
            F
          </button>
          
          <button className="inline-flex items-center justify-center w-8 h-8 rounded-md border border-gray-300 bg-white text-gray-600 hover:text-gray-800 hover:bg-gray-50 text-xs font-bold">
            S
          </button>
        </div>
      </div>
      
      {/* Debug info */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Debug Information:</h3>
        <ul className="text-sm space-y-1">
          <li>• If you see SVG icons above, the issue is component-specific</li>
          <li>• If you see alternative icons (⚟ ↕ F S), SVG rendering works</li>
          <li>• If you see nothing, there's a deeper rendering issue</li>
          <li>• Check browser console for any errors</li>
        </ul>
      </div>
    </div>
  );
};

export default IconTest; 