/**
 * ProductTitleModal - Modal for editing product titles
 * Part of Phase 2 refactoring - extracted from ReportDisplay component
 * 
 * This component provides a modal interface for editing custom product titles:
 * - Full CRUD operations for custom titles
 * - Modal state management
 * - Save/cancel/reset functionality
 */

import React, { useEffect } from 'react';
import { useReportStateManager } from '../../hooks/report/useReportStateManager';
import BaseInput from '../ui/BaseInput';
import type { ReportData } from '../../types/reportTypes';

interface ProductTitleModalProps {
  reportData: ReportData;
}

export const ProductTitleModal: React.FC<ProductTitleModalProps> = ({ reportData }) => {
  // State management from Phase 1 services
  const {
    state: {
      showTitleModal,
      modalTitles,
      modalHasChanges,
      customTitles
    },
    actions: {
      setShowTitleModal,
      setModalTitles,
      setModalHasChanges,
      setCustomTitles
    },
    utils: {
      resetModalState
    }
  } = useReportStateManager();

  // Extract plan number from product
  const extractPlanNumber = (product: any): string | null => {
    const productName = product.product_name || '';
    
    const patterns = [
      /Plan Number[:\s]*([A-Z0-9\-\/]+)/i,
      /Plan[:\s]*([A-Z0-9\-\/]+)/i,
      /Policy[:\s]*([A-Z0-9\-\/]+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = productName.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  };

  // Generate default product title
  const generateDefaultProductTitle = (product: any): string => {
    let title = `${product.provider_name || 'Unknown Provider'}`;
    
    if (product.product_type) {
      title += ` - ${product.product_type}`;
    }
    
    const planNumber = extractPlanNumber(product);
    if (planNumber) {
      title += ` [${planNumber}]`;
    }
    
    return title;
  };

  // Initialize modal titles when modal opens
  const openTitleModal = () => {
    // Copy current custom titles to modal state
    const currentModalTitles = new Map(customTitles);
    
    // Ensure all products have an entry in modal titles
    reportData.productSummaries.forEach(product => {
      if (!currentModalTitles.has(product.id)) {
        currentModalTitles.set(product.id, ''); // Empty means use default
      }
    });
    
    setModalTitles(currentModalTitles);
    setModalHasChanges(false);
    setShowTitleModal(true);
  };

  // Close modal without saving
  const closeTitleModal = () => {
    resetModalState();
  };

  // Save modal changes to custom titles
  const handleModalSave = () => {
    // Copy only non-empty titles to custom titles
    const newCustomTitles = new Map<number, string>();
    modalTitles.forEach((title, productId) => {
      if (title && title.trim()) {
        newCustomTitles.set(productId, title.trim());
      }
    });
    
    setCustomTitles(newCustomTitles);
    resetModalState();
  };

  // Reset modal titles to current custom titles
  const handleModalReset = () => {
    const resetTitles = new Map<number, string>();
    
    // Reset to current custom titles
    reportData.productSummaries.forEach(product => {
      resetTitles.set(product.id, customTitles.get(product.id) || '');
    });
    
    setModalTitles(resetTitles);
    setModalHasChanges(false);
  };

  // Handle individual title change
  const handleModalTitleChange = (productId: number, newTitle: string) => {
    const updatedTitles = new Map(modalTitles);
    updatedTitles.set(productId, newTitle);
    setModalTitles(updatedTitles);
    setModalHasChanges(true);
  };

  // Reset all titles to defaults
  const resetAllTitles = () => {
    const emptyTitles = new Map<number, string>();
    reportData.productSummaries.forEach(product => {
      emptyTitles.set(product.id, '');
    });
    setModalTitles(emptyTitles);
    setModalHasChanges(true);
  };

  // Handle modal overlay click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeTitleModal();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeTitleModal();
    }
  };

  // Don't render if modal is not shown
  if (!showTitleModal) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 print-hide"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Product Titles</h2>
          <button
            onClick={closeTitleModal}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            <div className="text-sm text-gray-600 mb-4">
              Customize the display names for your products. Leave blank to use the default format.
            </div>

            {reportData.productSummaries.map(product => (
              <div key={product.id} className="border rounded-lg p-4 bg-gray-50">
                <div className="mb-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {product.provider_name} - {product.product_type}
                  </label>
                  <div className="text-xs text-gray-500 mb-2">
                    Default: {generateDefaultProductTitle(product)}
                  </div>
                </div>
                
                <BaseInput
                  value={modalTitles.get(product.id) || ''}
                  onChange={(e) => handleModalTitleChange(product.id, e.target.value)}
                  placeholder="Enter custom title (leave blank for default)"
                  className="w-full"
                />
                
                {modalTitles.get(product.id) && modalTitles.get(product.id)!.trim() && (
                  <div className="text-xs text-blue-600 mt-1">
                    Preview: {modalTitles.get(product.id)!.trim()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              onClick={resetAllTitles}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Reset All to Default
            </button>
            <button
              onClick={handleModalReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Reset Changes
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={closeTitleModal}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleModalSave}
              disabled={!modalHasChanges}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductTitleModal; 