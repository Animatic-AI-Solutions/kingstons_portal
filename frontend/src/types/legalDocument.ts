/**
 * Legal Document TypeScript Type Definitions
 *
 * Defines interfaces and types for the Legal Documents feature.
 * Supports both standard document types and custom user-defined types.
 *
 * @module types/legalDocument
 */

// =============================================================================
// Constants
// =============================================================================

/**
 * Standard legal document types.
 * Custom types are also supported via string values.
 */
export const LEGAL_DOCUMENT_TYPES = [
  'Will',
  'LPOA P&F',
  'LPOA H&W',
  'EPA',
  'General Power of Attorney',
  'Advance Directive',
] as const;

/**
 * Valid status values for legal documents.
 * Note: Uses 'Lapsed' not 'Inactive' (different from other features).
 */
export const LEGAL_DOCUMENT_STATUSES = ['Signed', 'Lapsed', 'Registered'] as const;

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Standard document type (from predefined list)
 */
export type StandardDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];

/**
 * Document type - allows both standard types and custom strings.
 * Custom types are user-defined and can be any string value.
 *
 * Examples:
 * - Standard: 'Will', 'LPOA P&F', 'EPA'
 * - Custom: 'Custom: Family Trust Agreement', 'Living Will'
 */
export type LegalDocumentType = StandardDocumentType | string;

/**
 * Valid document status values.
 * - Signed: Document has been signed
 * - Registered: Document has been registered
 * - Lapsed: Document has been lapsed (can be reactivated)
 */
export type LegalDocumentStatus = (typeof LEGAL_DOCUMENT_STATUSES)[number];

// =============================================================================
// Interfaces
// =============================================================================

/**
 * Legal Document interface - represents a document from the API.
 *
 * @property id - Unique document identifier
 * @property type - Document type (standard or custom)
 * @property document_date - Date of the legal document (nullable)
 * @property status - Current document status
 * @property notes - Additional notes (max 2000 chars, nullable)
 * @property product_owner_ids - Associated product owner IDs
 * @property created_at - Creation timestamp
 * @property updated_at - Last update timestamp
 */
export interface LegalDocument {
  id: number;
  type: LegalDocumentType;
  document_date: string | null;
  status: LegalDocumentStatus;
  notes: string | null;
  product_owner_ids: number[];
  created_at: string;
  updated_at: string;
}

/**
 * Data for creating a new legal document.
 *
 * @property type - Document type (required)
 * @property product_owner_ids - At least one product owner required
 * @property document_date - Optional document date
 * @property status - Optional status (defaults to 'Signed')
 * @property notes - Optional notes (max 2000 chars)
 */
export interface CreateLegalDocumentData {
  type: LegalDocumentType;
  product_owner_ids: number[];
  document_date?: string | null;
  status?: LegalDocumentStatus;
  notes?: string | null;
}

/**
 * Data for updating an existing legal document.
 * All fields are optional for partial updates.
 */
export interface UpdateLegalDocumentData {
  type?: LegalDocumentType;
  document_date?: string | null;
  status?: LegalDocumentStatus;
  notes?: string | null;
  product_owner_ids?: number[];
}

/**
 * Filters for fetching legal documents.
 * Note: product_owner_id and client_group_id are passed as separate parameters
 * to fetchLegalDocuments and fetchLegalDocumentsByClientGroup respectively.
 */
export interface LegalDocumentFilters {
  type?: LegalDocumentType;
  status?: LegalDocumentStatus;
}

/**
 * Form data for legal document edit/create forms.
 * Mirrors CreateLegalDocumentData but with all fields for form state.
 */
export interface LegalDocumentFormData {
  type: LegalDocumentType;
  document_date: string | null;
  status: LegalDocumentStatus;
  notes: string | null;
  product_owner_ids: number[];
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if a type value is a standard document type.
 *
 * @param type - Type value to check
 * @returns True if type is one of the standard document types
 *
 * @example
 * isStandardDocumentType('Will'); // true
 * isStandardDocumentType('Custom: Trust'); // false
 */
export function isStandardDocumentType(type: string): type is StandardDocumentType {
  return LEGAL_DOCUMENT_TYPES.includes(type as StandardDocumentType);
}

/**
 * Check if a status value is valid.
 *
 * @param status - Status value to check
 * @returns True if status is a valid document status
 *
 * @example
 * isValidDocumentStatus('Signed'); // true
 * isValidDocumentStatus('Inactive'); // false (that's for other features)
 */
export function isValidDocumentStatus(status: string): status is LegalDocumentStatus {
  return LEGAL_DOCUMENT_STATUSES.includes(status as LegalDocumentStatus);
}

/**
 * Check if a document is lapsed (status is 'Lapsed').
 * Used for UI display (greyed out, sorted to bottom).
 * Note: 'Registered' is a valid active status, not lapsed.
 *
 * @param document - Legal document to check
 * @returns True if document status is 'Lapsed'
 */
export function isDocumentLapsed(document: LegalDocument): boolean {
  return document.status === 'Lapsed';
}

// =============================================================================
// Display Helpers
// =============================================================================

/**
 * Display labels for document types.
 */
export const DOCUMENT_TYPE_LABELS: Record<StandardDocumentType, string> = {
  Will: 'Will',
  'LPOA P&F': 'LPOA - Property & Financial',
  'LPOA H&W': 'LPOA - Health & Welfare',
  EPA: 'Enduring Power of Attorney',
  'General Power of Attorney': 'General Power of Attorney',
  'Advance Directive': 'Advance Directive',
};

/**
 * Get display label for a document type.
 * Returns the full label for standard types or the original value for custom types.
 *
 * @param type - Document type
 * @returns Display label
 */
export function getDocumentTypeLabel(type: LegalDocumentType): string {
  if (isStandardDocumentType(type)) {
    return DOCUMENT_TYPE_LABELS[type];
  }
  return type;
}
