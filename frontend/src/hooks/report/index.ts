/**
 * Report Hooks Index
 * Part of Phase 1 refactoring - centralized exports for report hooks
 * 
 * This file provides clean exports for all React hooks that integrate
 * with the report services.
 */

// State Management Hooks
export { 
  useReportStateManager,
  useReportStateSelector,
  useReportStateActions
} from './useReportStateManager';

// Formatting Hooks
export { 
  useReportFormatter,
  useReportFormatterWithState,
  useReportFormatterReadOnly
} from './useReportFormatter';

// IRR Calculation Hooks
export { 
  useIRRCalculationService,
  useIRRCalculationServiceWithState,
  useIRRCalculationServiceReadOnly
} from './useIRRCalculationService';

// Hook Types
export type {
  UseReportStateManager,
  UseReportFormatter,
  UseIRRCalculationService,
  UsePrintService
} from '../../types/reportServices';

// =============================================================================
// PRINT SERVICE HOOKS (Phase 1 Day 5)
// =============================================================================

export { 
  default as usePrintService, 
  usePrintServiceWithDefaults, 
  usePrintServiceReadOnly 
} from './usePrintService';

// Note: Other hooks will be added here as services are implemented:
// - usePrintService (Day 5) 