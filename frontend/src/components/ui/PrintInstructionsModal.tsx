import React from 'react';
import { InformationCircleIcon, PrinterIcon } from '@heroicons/react/24/outline';

interface PrintInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PrintInstructionsModal: React.FC<PrintInstructionsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="print-instructions-modal-title" role="dialog" aria-modal="true">
      <div className="flex items-center justify-center min-h-screen pt-16 px-4 pb-20 text-center sm:block sm:pt-16 sm:px-6">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all my-8 sm:align-middle sm:max-w-md sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                <InformationCircleIcon className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="print-instructions-modal-title">
                  Optimal Print Settings
                </h3>
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-4">
                    For the best print quality, please follow these steps:
                  </p>
                  
                  {/* Instructions list */}
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        1
                      </div>
                      <p className="text-sm text-gray-700">
                        Use <strong>Google Chrome</strong> for best results, then click the <strong>Print Report</strong> button
                      </p>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        2
                      </div>
                      <div className="text-sm text-gray-700">
                        <p className="mb-1">In the print dialog:</p>
                        <ul className="ml-4 space-y-1 text-xs text-gray-600">
                          <li>• Select <strong>"Save as PDF"</strong> as destination</li>
                          <li>• Ensure <strong>headers and footers are unchecked</strong></li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        3
                      </div>
                      <p className="text-sm text-gray-700">
                        Save the PDF to your desired location
                      </p>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        4
                      </div>
                      <p className="text-sm text-gray-700">
                        Open the saved PDF file (it should open with Foxit PhantomPDF as your default PDF application)
                      </p>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-semibold">
                        5
                      </div>
                      <div className="text-sm text-gray-700">
                        <p className="mb-1">From the PDF viewer, select print and configure:</p>
                        <ul className="ml-4 space-y-1 text-xs text-gray-600">
                          <li>• Set scale to <strong>"Fit to printer margins"</strong></li>
                          <li>• Keep all other settings at their default values</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded-r-md">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <PrinterIcon className="h-5 w-5 text-blue-400" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          <strong>Tip:</strong> This two-step process ensures optimal formatting and print quality for your reports.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:justify-end">
            <button
              type="button"
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:w-auto sm:text-sm transition-colors"
              onClick={onClose}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintInstructionsModal;