import { ReportStateManager, getReportStateManager } from '../../../services/report/ReportStateManager';
import { REPORT_TABS } from '../../../utils/reportConstants';

describe('ReportStateManager', () => {
  let manager: ReportStateManager;

  beforeEach(() => {
    manager = new ReportStateManager();
  });

  it('should initialize with default state', () => {
    const state = manager.getState();
    const loadingStates = manager.getLoadingStates();
    
    expect(state.reportData).toBeNull();
    expect(state.activeTab).toBe(REPORT_TABS.SUMMARY);
    expect(loadingStates.reportData).toBe(false);
  });

  it('should create manager instances', () => {
    const manager1 = new ReportStateManager();
    const manager2 = getReportStateManager();
    
    expect(manager1).toBeInstanceOf(ReportStateManager);
    expect(manager2).toBeInstanceOf(ReportStateManager);
  });
});

export {};
