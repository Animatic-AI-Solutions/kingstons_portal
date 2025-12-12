/**
 * Special Relationship Type Definitions
 * Defines types and interfaces for managing special relationships in the Kingston's Portal system
 */

/**
 * Relationship type categorization
 * Personal: Family and personal connections
 * Professional: Financial advisors, legal professionals, medical professionals
 */
export type RelationshipType =
  | 'Spouse'
  | 'Partner'
  | 'Child'
  | 'Parent'
  | 'Sibling'
  | 'Grandchild'
  | 'Grandparent'
  | 'Other Family'
  | 'Accountant'
  | 'Solicitor'
  | 'Doctor'
  | 'Financial Advisor'
  | 'Estate Planner'
  | 'Other Professional'
  | 'Guardian'
  | 'Power of Attorney';

/**
 * Personal relationship types (family and personal connections)
 * Use this constant to check if a relationship type is personal
 */
export const PERSONAL_RELATIONSHIP_TYPES: readonly RelationshipType[] = [
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
 * Professional relationship types (financial advisors, legal, medical professionals)
 * Use this constant to check if a relationship type is professional
 */
export const PROFESSIONAL_RELATIONSHIP_TYPES: readonly RelationshipType[] = [
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
 * Represents a personal or professional relationship associated with a client group
 */
export interface SpecialRelationship {
  /** Unique identifier */
  id: string;

  /** Associated client group ID */
  client_group_id: string;

  /** Type of relationship */
  relationship_type: RelationshipType;

  /** Current status of the relationship */
  status: RelationshipStatus;

  /** Title (Mr, Mrs, Ms, Dr, etc.) */
  title: string | null;

  /** First name */
  first_name: string;

  /** Last name */
  last_name: string;

  /** Date of birth in ISO format (YYYY-MM-DD) - typically null for professionals */
  date_of_birth: string | null;

  /** Email address */
  email: string | null;

  /** Mobile phone number */
  mobile_phone: string | null;

  /** Home phone number */
  home_phone: string | null;

  /** Work phone number */
  work_phone: string | null;

  /** Address line 1 */
  address_line1: string | null;

  /** Address line 2 */
  address_line2: string | null;

  /** City */
  city: string | null;

  /** County */
  county: string | null;

  /** Postcode */
  postcode: string | null;

  /** Country */
  country: string | null;

  /** Additional notes */
  notes: string | null;

  /** Company name (for professional relationships) */
  company_name: string | null;

  /** Position/title at company (for professional relationships) */
  position: string | null;

  /** Professional registration ID (for professional relationships) */
  professional_id: string | null;

  /** Creation timestamp */
  created_at: string;

  /** Last update timestamp */
  updated_at: string;
}

/**
 * Form data interface for creating/editing special relationships
 * Subset of SpecialRelationship containing only user-editable fields
 */
export interface SpecialRelationshipFormData {
  /** Type of relationship */
  relationship_type: RelationshipType;

  /** Current status of the relationship */
  status: RelationshipStatus;

  /** Title (Mr, Mrs, Ms, Dr, etc.) */
  title?: string | null;

  /** First name */
  first_name: string;

  /** Last name */
  last_name: string;

  /** Date of birth in ISO format (YYYY-MM-DD) */
  date_of_birth?: string | null;

  /** Email address */
  email?: string | null;

  /** Mobile phone number */
  mobile_phone?: string | null;

  /** Home phone number */
  home_phone?: string | null;

  /** Work phone number */
  work_phone?: string | null;

  /** Address line 1 */
  address_line1?: string | null;

  /** Address line 2 */
  address_line2?: string | null;

  /** City */
  city?: string | null;

  /** County */
  county?: string | null;

  /** Postcode */
  postcode?: string | null;

  /** Country */
  country?: string | null;

  /** Additional notes */
  notes?: string | null;

  /** Company name (for professional relationships) */
  company_name?: string | null;

  /** Position/title at company (for professional relationships) */
  position?: string | null;

  /** Professional registration ID (for professional relationships) */
  professional_id?: string | null;
}
