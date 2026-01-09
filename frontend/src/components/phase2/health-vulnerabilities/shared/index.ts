/**
 * Shared module exports for Health/Vulnerability Modals
 *
 * @module components/phase2/health-vulnerabilities/shared
 */

export {
  INPUT_BASE_CLASSES,
  INPUT_DISABLED_CLASSES,
  INPUT_ERROR_BORDER,
  INPUT_NORMAL_BORDER,
  LABEL_CLASSES,
  getInputClasses,
} from './formStyles';

export {
  type HealthFormState,
  type VulnerabilityFormState,
  type FormErrors,
  initialHealthState,
  initialVulnerabilityState,
} from './formTypes';
