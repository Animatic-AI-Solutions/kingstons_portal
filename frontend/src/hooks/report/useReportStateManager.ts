/**
 * useReportStateManager - React hook for ReportStateManager integration
 * Part of Phase 1 refactoring - provides React integration for centralized state
 * 
 * This hook replaces the 12+ useState hooks that were in ReportDisplay
 * and provides a clean interface to the centralized state manager.
 */

import { useRef, useEffect, useReducer } from 'react';
import { getReportStateManager } from '../../services/report/ReportStateManager';
import type { UseReportStateManager, ReportState, StateUpdateActions } from '../../types/reportServices';

/**
 * Custom hook that provides access to the ReportStateManager
 * Automatically handles subscriptions and re-renders
 */
export const useReportStateManager = (): UseReportStateManager => {
  // Force re-render trigger
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  
  // Get singleton instance of state manager
  const stateManagerRef = useRef(getReportStateManager());
  const stateManager = stateManagerRef.current;

  // Subscribe to state changes on mount, unsubscribe on unmount
  useEffect(() => {
    const unsubscribe = stateManager.subscribe(() => {
      forceUpdate();
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [stateManager]);

  // Get current state
  const state: ReportState = stateManager.getState();

  // Create actions object with all state setters
  const actions: StateUpdateActions = {
    setReportData: stateManager.setReportData.bind(stateManager),
    setActiveTab: stateManager.setActiveTab.bind(stateManager),
    setIrrHistoryData: stateManager.setIrrHistoryData.bind(stateManager),
    setShowInactiveProductDetails: stateManager.setShowInactiveProductDetails.bind(stateManager),
    setRealTimeTotalIRR: stateManager.setRealTimeTotalIRR.bind(stateManager),
    setPortfolioIrrValues: stateManager.setPortfolioIrrValues.bind(stateManager),
    setHideZeros: stateManager.setHideZeros.bind(stateManager),
    setVisualSigning: stateManager.setVisualSigning.bind(stateManager),
    setCustomTitles: stateManager.setCustomTitles.bind(stateManager),
    setShowTitleModal: stateManager.setShowTitleModal.bind(stateManager),
    setModalTitles: stateManager.setModalTitles.bind(stateManager),
    setModalHasChanges: stateManager.setModalHasChanges.bind(stateManager),
    setCustomProductOwnerNames: stateManager.setCustomProductOwnerNames.bind(stateManager),
    setShowProductOwnerModal: stateManager.setShowProductOwnerModal.bind(stateManager),
    setLoading: stateManager.setLoading.bind(stateManager),
  };

  // Create utility functions
  const utils = {
    toggleInactiveProductDetails: stateManager.toggleInactiveProductDetails.bind(stateManager),
    resetAllTitles: stateManager.resetAllTitles.bind(stateManager),
    resetModalState: stateManager.resetModalState.bind(stateManager),
  };

  return {
    state,
    actions,
    utils
  };
};

/**
 * Hook for components that only need to read specific state values
 * More efficient than useReportStateManager for read-only components
 */
export const useReportStateSelector = <T>(
  selector: (state: ReportState) => T
): T => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const stateManagerRef = useRef(getReportStateManager());
  const stateManager = stateManagerRef.current;
  const lastValueRef = useRef<T>();

  useEffect(() => {
    const unsubscribe = stateManager.subscribe(() => {
      const newValue = selector(stateManager.getState());
      if (newValue !== lastValueRef.current) {
        lastValueRef.current = newValue;
        forceUpdate();
      }
    });

    return unsubscribe;
  }, [stateManager, selector]);

  const currentValue = selector(stateManager.getState());
  lastValueRef.current = currentValue;
  return currentValue;
};

/**
 * Hook for accessing only the actions without subscribing to state changes
 * Useful for components that only need to update state
 */
export const useReportStateActions = (): StateUpdateActions & {
  toggleInactiveProductDetails: (productId: number) => void;
  resetAllTitles: () => void;
  resetModalState: () => void;
} => {
  const stateManager = getReportStateManager();

  return {
    // State setters
    setReportData: stateManager.setReportData.bind(stateManager),
    setActiveTab: stateManager.setActiveTab.bind(stateManager),
    setIrrHistoryData: stateManager.setIrrHistoryData.bind(stateManager),
    setShowInactiveProductDetails: stateManager.setShowInactiveProductDetails.bind(stateManager),
    setRealTimeTotalIRR: stateManager.setRealTimeTotalIRR.bind(stateManager),
    setPortfolioIrrValues: stateManager.setPortfolioIrrValues.bind(stateManager),
    setHideZeros: stateManager.setHideZeros.bind(stateManager),
    setVisualSigning: stateManager.setVisualSigning.bind(stateManager),
    setCustomTitles: stateManager.setCustomTitles.bind(stateManager),
    setShowTitleModal: stateManager.setShowTitleModal.bind(stateManager),
    setModalTitles: stateManager.setModalTitles.bind(stateManager),
    setModalHasChanges: stateManager.setModalHasChanges.bind(stateManager),
    setCustomProductOwnerNames: stateManager.setCustomProductOwnerNames.bind(stateManager),
    setShowProductOwnerModal: stateManager.setShowProductOwnerModal.bind(stateManager),
    setLoading: stateManager.setLoading.bind(stateManager),
    
    // Utility functions
    toggleInactiveProductDetails: stateManager.toggleInactiveProductDetails.bind(stateManager),
    resetAllTitles: stateManager.resetAllTitles.bind(stateManager),
    resetModalState: stateManager.resetModalState.bind(stateManager),
  };
};

export default useReportStateManager; 