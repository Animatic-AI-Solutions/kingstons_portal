/**
 * @fileoverview Central export point for all TypeScript type definitions
 * @description Re-exports all types from the types directory for convenient importing
 * @module types
 *
 * @example
 * // Instead of importing from individual files:
 * import { HealthProductOwner } from '@/types/healthVulnerability';
 * import { ProductPeriodSummary } from '@/types/reportTypes';
 *
 * // You can import from the central index:
 * import { HealthProductOwner, ProductPeriodSummary } from '@/types';
 */

// =============================================================================
// Health and Vulnerability Types
// =============================================================================

export {
  // Shared types
  type HealthVulnerabilityStatus,
  type PersonType,
  type PersonReference,
  type PersonWithCounts,

  // Health types
  type HealthProductOwner,
  type HealthSpecialRelationship,
  type HealthProductOwnerCreate,
  type HealthSpecialRelationshipCreate,
  type HealthConditionUpdate,
  type HealthCondition,
  type HealthConditionWithPerson,

  // Vulnerability types
  type VulnerabilityProductOwner,
  type VulnerabilitySpecialRelationship,
  type VulnerabilityProductOwnerCreate,
  type VulnerabilitySpecialRelationshipCreate,
  type VulnerabilityUpdate,
  type Vulnerability,
  type VulnerabilityWithPerson,

  // Query/Response types
  type HealthQueryParams,
  type VulnerabilityQueryParams,
  type PaginationMeta,

  // Modal/Form types
  type ModalMode,
  type RecordType,
  type HealthVulnerabilityModalProps,

  // Constants
  HEALTH_FIELD_LIMITS,
  VULNERABILITY_FIELD_LIMITS,
  STATUS_OPTIONS,

  // Type Guards
  isHealthProductOwner,
  isHealthSpecialRelationship,
  isVulnerabilityProductOwner,
  isVulnerabilitySpecialRelationship,

  // Date Utilities
  parseHealthDate,
  formatHealthDate,
} from './healthVulnerability';

// =============================================================================
// Report Types
// =============================================================================

export * from './reportTypes';

// =============================================================================
// Report Services Types
// =============================================================================

export * from './reportServices';

// =============================================================================
// Client Group Form Types
// =============================================================================

export * from './clientGroupForm';

// =============================================================================
// Product Owner Types
// =============================================================================

export * from './productOwner';

// =============================================================================
// Special Relationship Types
// =============================================================================

export * from './specialRelationship';
