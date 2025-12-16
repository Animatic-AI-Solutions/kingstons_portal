/**
 * Special Relationship Type Definitions
 * Defines types and interfaces for managing special relationships in the Kingston's Portal system
 */

/**
 * Relationship category (type field in backend)
 * Personal: Family and personal connections
 * Professional: Financial advisors, legal professionals, medical professionals
 */
export type RelationshipCategory = 'Personal' | 'Professional';

/**
 * Personal relationship types
 * These values go in the 'relationship' field when type='Personal'
 */
export const PERSONAL_RELATIONSHIPS = [
  'Spouse',
  'Partner',
  'Child',
  'Parent',
  'Sibling',
  'Grandchild',
  'Grandparent',
  'Other Family',
] as const;

/**
 * Professional relationship types
 * These values go in the 'relationship' field when type='Professional'
 */
export const PROFESSIONAL_RELATIONSHIPS = [
  'Accountant',
  'Solicitor',
  'Doctor',
  'Financial Advisor',
  'Estate Planner',
  'Other Professional',
  'Guardian',
  'Power of Attorney',
] as const;

/**
 * All possible relationship values (union of personal and professional)
 */
export type Relationship = typeof PERSONAL_RELATIONSHIPS[number] | typeof PROFESSIONAL_RELATIONSHIPS[number];

// Legacy type names for backwards compatibility - TODO: Remove after frontend migration
/** @deprecated Use PERSONAL_RELATIONSHIPS instead */
export const PERSONAL_RELATIONSHIP_TYPES = PERSONAL_RELATIONSHIPS;
/** @deprecated Use PROFESSIONAL_RELATIONSHIPS instead */
export const PROFESSIONAL_RELATIONSHIP_TYPES = PROFESSIONAL_RELATIONSHIPS;

/**
 * Status of the relationship
 * Active: Current active relationship
 * Inactive: Relationship no longer active
 * Deceased: Person is deceased
 */
export type RelationshipStatus = 'Active' | 'Inactive' | 'Deceased';

/**
 * Status priority ordering for sorting relationships
 * Lower number = higher priority (Active > Inactive > Deceased)
 */
export const STATUS_PRIORITY_ORDER: Readonly<Record<RelationshipStatus, number>> = {
  Active: 1,
  Inactive: 2,
  Deceased: 3,
} as const;

/**
 * Complete special relationship entity
 * Represents a personal or professional relationship associated with product owners
 * Matches backend schema exactly
 */
export interface SpecialRelationship {
  /** Unique identifier */
  id: number;

  /** Full name (merged from first_name + last_name) */
  name: string;

  /** Relationship category: Personal or Professional */
  type: RelationshipCategory;

  /** Specific relationship (e.g., Spouse, Accountant, etc.) */
  relationship: Relationship;

  /** Current status of the relationship */
  status: RelationshipStatus;

  /** Date of birth in ISO format (YYYY-MM-DD) - typically null for professionals */
  date_of_birth: string | null;

  /** Dependency indicator (for personal relationships) */
  dependency: boolean;

  /** Email address */
  email: string | null;

  /** Phone number (merged from mobile/home/work phones) */
  phone_number: string | null;

  /** Foreign key to addresses table */
  address_id: number | null;

  /** Additional notes */
  notes: string | null;

  /** Firm name (for professional relationships) - renamed from company_name */
  firm_name: string | null;

  /** Product owner IDs (replaces client_group_id) */
  product_owner_ids: number[];

  /** Creation timestamp */
  created_at: string;

  /** Last update timestamp */
  updated_at: string;
}

/**
 * Form data interface for creating/editing special relationships
 * Subset of SpecialRelationship containing only user-editable fields
 * Matches backend schema exactly
 */
export interface SpecialRelationshipFormData {
  /** Full name */
  name: string;

  /** Relationship category: Personal or Professional */
  type: RelationshipCategory;

  /** Specific relationship (e.g., Spouse, Accountant, etc.) */
  relationship: Relationship;

  /** Current status of the relationship */
  status: RelationshipStatus;

  /** Date of birth in ISO format (YYYY-MM-DD) */
  date_of_birth?: string | null;

  /** Dependency indicator (for personal relationships) */
  dependency?: boolean;

  /** Email address */
  email?: string | null;

  /** Phone number */
  phone_number?: string | null;

  /** Foreign key to addresses table */
  address_id?: number | null;

  /** Additional notes */
  notes?: string | null;

  /** Firm name (for professional relationships) */
  firm_name?: string | null;
}
