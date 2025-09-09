import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const HolidayBanner = () => {
  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start space-x-3">
          <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 leading-relaxed">
            <span className="font-medium">🏖️ Jacob is on holiday in Turkey from Friday 12th September until Monday 6th October.</span>
            {' '}Please check the <a href="/user-guide" className="underline font-medium hover:text-blue-900 transition-colors">User Guide</a> for common questions and system help.
            <br />
            <span className="text-blue-700 mt-1 block">
              For any bugs: Take a screenshot, note what happened and steps to recreate it - document but please only contact me for emergencies.
              <br />
              <span className="font-medium">Emergency contact:</span> 
              <a href="mailto:jacob.b.mcnulty.2019@gmail.com" className="underline hover:text-blue-900 ml-1">jacob.b.mcnulty.2019@gmail.com</a> | 
              <a href="tel:07505755664" className="underline hover:text-blue-900 ml-1">07505 755 664</a>
              <span className="text-blue-600 ml-2">(I'm 3 hours ahead in Turkey)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HolidayBanner;