/**
 * ProductOwnerModal - Modal for editing product owner names display
 * Allows customization of product owner display names with nickname + lastname format
 */

import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useReportStateManager } from '../../hooks/report/useReportStateManager';
import type { ReportData } from '../../types/reportTypes';

interface ProductOwnerModalProps {
  reportData: ReportData;
}

const ProductOwnerModal: React.FC<ProductOwnerModalProps> = ({ reportData }) => {
  const {
    state: { showProductOwnerModal, customProductOwnerNames },
    actions: { setShowProductOwnerModal, setCustomProductOwnerNames }
  } = useReportStateManager();

  const [editedOwnerNames, setEditedOwnerNames] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  // Function to format names to nickname + lastname format with capitalization
  const formatToNicknameLast = (fullName: string): string => {
    const parts = fullName.trim().split(' ');
    if (parts.length === 1) {
      return capitalizeFirstLetter(parts[0]);
    }
    
    // For multiple parts, use first name (nickname) + last name, both capitalized
    const firstname = capitalizeFirstLetter(parts[0]);
    const lastname = capitalizeFirstLetter(parts[parts.length - 1]);
    return `${firstname} ${lastname}`;
  };

  // Initialize with auto-generated format when modal opens
  useEffect(() => {
    if (showProductOwnerModal && !isInitialized) {
      const autoFormatted = reportData.productOwnerNames
        .map(name => formatToNicknameLast(name))
        .join(' & ');
      
      setEditedOwnerNames(customProductOwnerNames || autoFormatted);
      setIsInitialized(true);
    }
  }, [showProductOwnerModal, reportData.productOwnerNames, customProductOwnerNames, isInitialized]);

  // Reset when modal closes
  useEffect(() => {
    if (!showProductOwnerModal) {
      setIsInitialized(false);
    }
  }, [showProductOwnerModal]);

  const handleSave = () => {
    setCustomProductOwnerNames(editedOwnerNames.trim());
    setShowProductOwnerModal(false);
  };

  const handleCancel = () => {
    setShowProductOwnerModal(false);
  };

  const handleReset = () => {
    const autoFormatted = reportData.productOwnerNames
      .map(name => formatToNicknameLast(name))
      .join(' & ');
    setEditedOwnerNames(autoFormatted);
  };

  if (!showProductOwnerModal) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center p-4 pt-16">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Edit Product Owner Names
            </h3>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={editedOwnerNames}
                onChange={(e) => setEditedOwnerNames(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Freddie Flintstone & Wilma Flintstone"
              />
            </div>

            <div className="text-sm text-gray-500">
              <p className="mb-2"><strong>Original Names:</strong></p>
              <p className="italic">{reportData.productOwnerNames.join(', ')}</p>
            </div>

            <div className="text-sm text-gray-500">
              <p className="mb-1"><strong>Format Guide:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Use "Nickname Lastname" format (e.g., "Freddie Flintstone")</li>
                <li>Separate multiple owners with " & " (e.g., "John Smith & Jane Smith")</li>
                <li>First letter of each name is capitalized automatically</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Reset to Auto-Format
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductOwnerModal; 