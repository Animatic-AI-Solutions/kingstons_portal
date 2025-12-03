/**
 * Constants for client group and product owner form fields
 *
 * These constants define valid options for dropdown fields in the client group creation flow.
 * Using 'as const' ensures type safety and allows TypeScript to infer literal types.
 */

/**
 * Title options for product owners
 * Used in the title dropdown field
 */
export const TITLE_OPTIONS = [
  'Mr',
  'Mrs',
  'Miss',
  'Ms',
  'Dr',
  'Prof',
  'Rev',
  'Sir',
  'Dame',
  'Lord',
  'Lady',
  'Other',
] as const;

/**
 * Relationship status options for product owners
 * Used in the relationship_status dropdown field
 */
export const RELATIONSHIP_STATUS_OPTIONS = [
  'Single',
  'Married',
  'Divorced',
  'Widowed',
  'Civil Partnership',
  'Separated',
  'Cohabiting',
] as const;

/**
 * Gender options for product owners
 * Used in the gender dropdown field
 */
export const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Other',
  'Prefer not to say',
] as const;

/**
 * Employment status options for product owners
 * Used in the employment_status dropdown field
 */
export const EMPLOYMENT_STATUS_OPTIONS = [
  'Employed',
  'Self-Employed',
  'Retired',
  'Unemployed',
  'Student',
  'Other',
] as const;

/**
 * Client group type options
 * Used in the client group type dropdown field
 */
export const CLIENT_GROUP_TYPES = [
  'Individual',
  'Joint',
  'Family',
  'Trust',
  'Corporate',
] as const;

/**
 * Status options for both product owners and client groups
 * Used in status dropdown fields
 */
export const STATUS_OPTIONS = [
  'active',
  'inactive',
] as const;

/**
 * AML (Anti-Money Laundering) result options for product owners
 * Used in the aml_result dropdown field
 */
export const AML_RESULT_OPTIONS = [
  'Pass',
  'Fail',
  'Pending',
] as const;

/**
 * Type exports for use in type definitions
 * These allow other files to reference the constant types
 */
export type TitleOption = typeof TITLE_OPTIONS[number];
export type RelationshipStatusOption = typeof RELATIONSHIP_STATUS_OPTIONS[number];
export type GenderOption = typeof GENDER_OPTIONS[number];
export type EmploymentStatusOption = typeof EMPLOYMENT_STATUS_OPTIONS[number];
export type ClientGroupType = typeof CLIENT_GROUP_TYPES[number];
export type StatusOption = typeof STATUS_OPTIONS[number];
export type AMLResultOption = typeof AML_RESULT_OPTIONS[number];
