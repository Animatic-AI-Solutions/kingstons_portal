/**
 * Shared Form Types for Health/Vulnerability Modals
 *
 * Type definitions for form state and validation used by both
 * Add and Edit modals.
 *
 * @module components/phase2/health-vulnerabilities/shared/formTypes
 */

import type { HealthVulnerabilityStatus } from '@/types/healthVulnerability';

// =============================================================================
// Form State Interfaces
// =============================================================================

/**
 * Health form state interface
 *
 * Used for both Add and Edit modals when managing health condition data.
 */
export interface HealthFormState {
  /** Type of health condition (required) */
  condition: string;
  /** Descriptive name for the condition (optional) */
  name: string;
  /** Date of diagnosis in YYYY-MM-DD format (optional) */
  date_of_diagnosis: string;
  /** Current medications (optional) */
  medication: string;
  /** Status - Active or Lapsed */
  status: HealthVulnerabilityStatus;
  /** Additional notes (optional) */
  notes: string;
}

/**
 * Vulnerability form state interface
 *
 * Used for both Add and Edit modals when managing vulnerability data.
 */
export interface VulnerabilityFormState {
  /** Description of the vulnerability (required) */
  description: string;
  /** Adjustments made to accommodate (optional) */
  adjustments: string;
  /** Whether professionally diagnosed */
  diagnosed: boolean;
  /** Status - Active or Lapsed */
  status: HealthVulnerabilityStatus;
  /** Additional notes (optional) */
  notes: string;
}

/**
 * Form validation errors interface
 *
 * Tracks validation errors for required fields.
 */
export interface FormErrors {
  /** Error message for condition field */
  condition?: string;
  /** Error message for description field */
  description?: string;
}

// =============================================================================
// Initial Form States
// =============================================================================

/**
 * Initial state for health form (Add modal)
 */
export const initialHealthState: HealthFormState = {
  condition: '',
  name: '',
  date_of_diagnosis: '',
  medication: '',
  status: 'Active',
  notes: '',
};

/**
 * Initial state for vulnerability form (Add modal)
 */
export const initialVulnerabilityState: VulnerabilityFormState = {
  description: '',
  adjustments: '',
  diagnosed: false,
  status: 'Active',
  notes: '',
};
