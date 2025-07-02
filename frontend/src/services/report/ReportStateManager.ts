/**
 * ReportStateManager - Centralized state management for report functionality
 * Part of Phase 1 refactoring - extracted from ReportDisplay component
 */

import type {
  IReportStateManager,
  ReportState,
  LoadingStates,
  ReportTab
} from '../../types/reportServices';
import type { ReportData } from '../../types/reportTypes';
import { REPORT_TABS } from '../../utils/reportConstants';

export class ReportStateManager implements IReportStateManager {
  private state: ReportState;
  private subscribers: Array<() => void> = [];

  constructor() {
    this.state = {
      reportData: null,
      irrHistoryData: null,
      activeTab: REPORT_TABS.SUMMARY as ReportTab,
      showInactiveProductDetails: new Set<number>(),
      realTimeTotalIRR: null,
      portfolioIrrValues: new Map<number, number>(),
      hideZeros: false,
      visualSigning: false,
      customTitles: new Map<number, string>(),
      showTitleModal: false,
      modalTitles: new Map<number, string>(),
      modalHasChanges: false,
      loading: {
        reportData: false,
        irrHistory: false,
        totalIRR: false,
        portfolioIRR: false,
      }
    };
  }

  getState(): ReportState {
    return { ...this.state };
  }

  getReportData(): ReportData | null {
    return this.state.reportData;
  }

  getActiveTab(): ReportTab {
    return this.state.activeTab;
  }

  getIrrHistoryData(): any | null {
    return this.state.irrHistoryData;
  }

  getShowInactiveProductDetails(): Set<number> {
    return new Set(this.state.showInactiveProductDetails);
  }

  getRealTimeTotalIRR(): number | null {
    return this.state.realTimeTotalIRR;
  }

  getPortfolioIrrValues(): Map<number, number> {
    return new Map(this.state.portfolioIrrValues);
  }

  getHideZeros(): boolean {
    return this.state.hideZeros;
  }

  getVisualSigning(): boolean {
    return this.state.visualSigning;
  }

  getCustomTitles(): Map<number, string> {
    return new Map(this.state.customTitles);
  }

  getShowTitleModal(): boolean {
    return this.state.showTitleModal;
  }

  getModalTitles(): Map<number, string> {
    return new Map(this.state.modalTitles);
  }

  getModalHasChanges(): boolean {
    return this.state.modalHasChanges;
  }

  getLoadingStates(): LoadingStates {
    return { ...this.state.loading };
  }

  setReportData(data: ReportData | null): void {
    this.updateState('reportData', data);
  }

  setActiveTab(tab: ReportTab): void {
    this.updateState('activeTab', tab);
  }

  setIrrHistoryData(data: any): void {
    this.updateState('irrHistoryData', data);
  }

  setShowInactiveProductDetails(productIds: Set<number>): void {
    this.updateState('showInactiveProductDetails', new Set(productIds));
  }

  setRealTimeTotalIRR(irr: number | null): void {
    this.updateState('realTimeTotalIRR', irr);
  }

  setPortfolioIrrValues(values: Map<number, number>): void {
    this.updateState('portfolioIrrValues', new Map(values));
  }

  setHideZeros(hide: boolean): void {
    this.updateState('hideZeros', hide);
  }

  setVisualSigning(enabled: boolean): void {
    this.updateState('visualSigning', enabled);
  }

  setCustomTitles(titles: Map<number, string>): void {
    this.updateState('customTitles', new Map(titles));
  }

  setShowTitleModal(show: boolean): void {
    this.updateState('showTitleModal', show);
  }

  setModalTitles(titles: Map<number, string>): void {
    this.updateState('modalTitles', new Map(titles));
  }

  setModalHasChanges(hasChanges: boolean): void {
    this.updateState('modalHasChanges', hasChanges);
  }

  setLoading(key: keyof LoadingStates, loading: boolean): void {
    const newLoadingState = { ...this.state.loading, [key]: loading };
    this.updateState('loading', newLoadingState);
  }

  toggleInactiveProductDetails(productId: number): void {
    const currentSet = new Set(this.state.showInactiveProductDetails);
    if (currentSet.has(productId)) {
      currentSet.delete(productId);
    } else {
      currentSet.add(productId);
    }
    this.setShowInactiveProductDetails(currentSet);
  }

  resetAllTitles(): void {
    this.setCustomTitles(new Map());
  }

  resetModalState(): void {
    this.setShowTitleModal(false);
    this.setModalTitles(new Map());
    this.setModalHasChanges(false);
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.unsubscribe(callback);
    };
  }

  unsubscribe(callback: () => void): void {
    const index = this.subscribers.indexOf(callback);
    if (index > -1) {
      this.subscribers.splice(index, 1);
    }
  }

  private updateState<K extends keyof ReportState>(
    key: K, 
    newValue: ReportState[K]
  ): void {
    const oldValue = this.state[key];
    
    if (oldValue !== newValue) {
      this.state = {
        ...this.state,
        [key]: newValue
      };
      this.notifySubscribers();
    }
  }

  private notifySubscribers(): void {
    this.subscribers.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in state change subscriber:', error);
      }
    });
  }
}

let reportStateManagerInstance: ReportStateManager | null = null;

export const getReportStateManager = (): ReportStateManager => {
  if (!reportStateManagerInstance) {
    reportStateManagerInstance = new ReportStateManager();
  }
  return reportStateManagerInstance;
};

export default ReportStateManager;
