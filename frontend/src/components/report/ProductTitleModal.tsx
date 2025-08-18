/**
 * ProductTitleModal - Modal for editing product titles
 * Part of Phase 2 refactoring - extracted from ReportDisplay component
 * 
 * This component provides a modal interface for editing custom product titles:
 * - Full CRUD operations for custom titles
 * - Modal state management
 * - Save/cancel/reset functionality
 * - Pre-populated input fields with current effective titles
 */

import React, { useEffect } from 'react';
import { useReportStateManager } from '../../hooks/report/useReportStateManager';
import { normalizeProductType, PRODUCT_TYPE_ORDER } from '../../utils/reportConstants';
import { generateEffectiveProductTitle, generateDefaultProductTitle } from '../../utils/productTitleUtils';
import type { ReportData, ProductPeriodSummary } from '../../types/reportTypes';

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
  const extractPlanNumber = (product: ProductPeriodSummary): string | null => {
    // First, check if plan_number field exists
    if (product.plan_number) {
      return product.plan_number;
    }
    
    // Fallback: try to extract from product_name if it contains plan-like patterns
    if (product.product_name) {
      const patterns = [
        /Plan Number[:\s]*([A-Z0-9\-\/]+)/i,
        /Plan[:\s]*([A-Z0-9\-\/]+)/i,
        /Policy[:\s]*([A-Z0-9\-\/]+)/i,
      ];
      
      for (const pattern of patterns) {
        const match = product.product_name.match(pattern);
        if (match) {
          return match[1].trim();
        }
      }
    }
    
    return null;
  };

  // Organize products by type in the specified order, with inactive/lapsed products at the bottom
  // This matches the same ordering logic used in SummaryTab for product cards
  const organizeProductsByType = (products: ProductPeriodSummary[]) => {
    // Group products by normalized type
    const groupedProducts: { [key: string]: ProductPeriodSummary[] } = {};
    
    products.forEach(product => {
      const normalizedType = normalizeProductType(product.product_type);
      if (!groupedProducts[normalizedType]) {
        groupedProducts[normalizedType] = [];
      }
      groupedProducts[normalizedType].push(product);
    });

    // Sort products within each type by provider name, with special ordering for ISAs
    Object.keys(groupedProducts).forEach(type => {
      if (type === 'ISAs') {
        // Special sorting for ISAs: ISA products first, then JISA products, then by provider
        groupedProducts[type].sort((a, b) => {
          const typeA = a.product_type?.toLowerCase().trim() || '';
          const typeB = b.product_type?.toLowerCase().trim() || '';
          
          // Check if products are JISA
          const isJISA_A = typeA === 'jisa';
          const isJISA_B = typeB === 'jisa';
          
          // If one is JISA and the other is not, non-JISA comes first
          if (isJISA_A && !isJISA_B) return 1;
          if (!isJISA_A && isJISA_B) return -1;
          
          // If both are same type (both JISA or both ISA), sort by provider
          const providerA = a.provider_name || '';
          const providerB = b.provider_name || '';
          return providerA.localeCompare(providerB);
        });
      } else {
        // Standard sorting by provider name for other product types
        groupedProducts[type].sort((a, b) => {
          const providerA = a.provider_name || '';
          const providerB = b.provider_name || '';
          return providerA.localeCompare(providerB);
        });
      }
    });

    // Return products in the specified order
    const orderedProducts: ProductPeriodSummary[] = [];
    
    PRODUCT_TYPE_ORDER.forEach(type => {
      if (groupedProducts[type]) {
        orderedProducts.push(...groupedProducts[type]);
      }
    });

    // Apply status-based sorting: active products first, then inactive/lapsed at the bottom
    // while maintaining original relative order within each group
    const activeProducts = orderedProducts.filter(product => 
      product.status !== 'inactive' && product.status !== 'lapsed'
    );
    const inactiveProducts = orderedProducts.filter(product => 
      product.status === 'inactive' || product.status === 'lapsed'
    );
    
    // Return active products first, then inactive/lapsed products
    return [...activeProducts, ...inactiveProducts];
  };

  // Initialize modal titles when modal opens
  useEffect(() => {
    if (showTitleModal) {
      // Pre-populate with current effective titles (what user sees on screen)
      const currentModalTitles = new Map<number, string>();
      
      // Use the same product ordering as the report cards
      const organizedProducts = organizeProductsByType(reportData.productSummaries);
      
      organizedProducts.forEach(product => {
        const effectiveTitle = generateEffectiveProductTitle(product, customTitles, {
          omitOwner: reportData.productOwnerOrder && reportData.productOwnerOrder.length <= 1
        });
        currentModalTitles.set(product.id, effectiveTitle);
      });
      
      setModalTitles(currentModalTitles);
      setModalHasChanges(false);
    }
  }, [showTitleModal, reportData.productSummaries, customTitles]); // Removed unstable function references

  // Close modal without saving
  const closeTitleModal = () => {
    resetModalState();
  };

  // Save modal changes to custom titles
  const handleModalSave = () => {
    // Save all titles that are different from the default
    const newCustomTitles = new Map<number, string>();
    
    modalTitles.forEach((title, productId) => {
      const product = reportData.productSummaries.find(p => p.id === productId);
      if (product) {
        const defaultTitle = generateDefaultProductTitle(product, {
          omitOwner: reportData.productOwnerOrder && reportData.productOwnerOrder.length <= 1
        });
        
        // Only save as custom if it's different from default and not empty
        if (title && title.trim() && title.trim() !== defaultTitle) {
          newCustomTitles.set(productId, title.trim());
        }
      }
    });
    
    setCustomTitles(newCustomTitles);
    resetModalState();
  };

  // Reset modal titles to current custom titles (what was there when modal opened)
  const handleModalReset = () => {
    const resetTitles = new Map<number, string>();
    
    // Reset to current effective titles (what user sees on screen)
    organizeProductsByType(reportData.productSummaries).forEach(product => {
      const effectiveTitle = generateEffectiveProductTitle(product, customTitles, {
        omitOwner: reportData.productOwnerOrder && reportData.productOwnerOrder.length <= 1
      });
      resetTitles.set(product.id, effectiveTitle);
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
    const defaultTitles = new Map<number, string>();
    organizeProductsByType(reportData.productSummaries).forEach(product => {
      defaultTitles.set(product.id, generateDefaultProductTitle(product, {
        omitOwner: reportData.productOwnerOrder && reportData.productOwnerOrder.length <= 1
      }));
    });
    setModalTitles(defaultTitles);
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
    // Only handle escape if not focused on an input field
    if (e.key === 'Escape' && e.target && (e.target as HTMLElement).tagName !== 'INPUT') {
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
              Edit the display names for your products. The input fields show the current titles as they appear on the report.
            </div>

            {organizeProductsByType(reportData.productSummaries).map(product => {
              const currentTitle = modalTitles.get(product.id) || '';
              const defaultTitle = generateDefaultProductTitle(product, {
          omitOwner: reportData.productOwnerOrder && reportData.productOwnerOrder.length <= 1
        });
              const effectiveTitle = generateEffectiveProductTitle(product, customTitles, {
                omitOwner: reportData.productOwnerOrder && reportData.productOwnerOrder.length <= 1
              });
              const isCustom = customTitles.has(product.id);
              const hasChanges = currentTitle !== effectiveTitle;

              return (
                <div key={product.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {product.provider_name} - {product.product_type}
                      {isCustom && <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">Custom</span>}
                    </label>
                    
                    <div className="space-y-1 text-xs text-gray-500">
                      <div>
                        <span className="font-medium">Auto-generated:</span> {defaultTitle}
                      </div>
                      {isCustom && (
                        <div>
                          <span className="font-medium">Original current:</span> {effectiveTitle}
                        </div>
                      )}
                      {hasChanges && (
                        <div className="text-blue-600">
                          <span className="font-medium">Preview:</span> {currentTitle}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <input
                    key={`title-input-${product.id}`}
                    type="text"
                    value={currentTitle}
                    onChange={(e) => handleModalTitleChange(product.id, e.target.value)}
                    onInput={(e) => handleModalTitleChange(product.id, (e.target as HTMLInputElement).value)}
                    placeholder="Enter custom title"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    readOnly={false}
                    disabled={false}
                    autoComplete="off"
                    spellCheck="false"
                  />
                  
                  {hasChanges && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleModalTitleChange(product.id, effectiveTitle)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Revert to original
                      </button>
                      <button
                        onClick={() => handleModalTitleChange(product.id, defaultTitle)}
                        className="text-xs text-gray-600 hover:text-gray-800 underline"
                      >
                        Use auto-generated
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <button
              onClick={resetAllTitles}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Reset All to Auto-generated
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