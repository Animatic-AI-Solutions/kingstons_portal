import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const HolidayBanner = () => {
  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2.5">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center space-x-2">
          <InformationCircleIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            Need help? Check the <a href="/user-guide" className="underline font-medium hover:text-blue-900 transition-colors">User Guide</a> for common questions and system information.
          </div>
        </div>
      </div>
    </div>
  );
};

export default HolidayBanner;