/**
 * Report Services Index
 * Part of Phase 1 refactoring - centralized exports for report services
 * 
 * This file provides clean exports for all report services created during
 * the refactoring of ReportDisplay component.
 */

// State Management
export { 
  ReportStateManager, 
  getReportStateManager 
} from './ReportStateManager';

// Formatting Services
export { 
  ReportFormatter, 
  createReportFormatter, 
  getReportFormatter 
} from './ReportFormatter';

// IRR Calculation Services
export { 
  IRRCalculationService, 
  createIRRCalculationService, 
  getIRRCalculationService 
} from './IRRCalculationService';

// Service Types
export type {
  IReportStateManager,
  IReportFormatter,
  IIRRCalculationService,
  IPrintService,
  IReportServices,
  ReportState,
  StateUpdateActions,
  LoadingStates,
  ReportTab,
  FormatterOptions,
  PrintConfiguration,
  UseReportStateManager,
  UseReportFormatter,
  UseIRRCalculationService,
  UsePrintService
} from '../../types/reportServices';

// =============================================================================
// PRINT SERVICE EXPORTS (Phase 1 Day 5)
// =============================================================================

export { default as PrintService, createPrintService, getPrintService } from './PrintService';
export type { 
  PrintOptions, 
  PrintPreparationResult
} from '../../types/reportServices';

// Note: Other services will be added here as they are implemented:
// - PrintService (Day 5) 