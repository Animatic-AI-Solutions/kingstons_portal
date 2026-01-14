/**
 * Shared test fixtures for legal document component tests
 *
 * Contains common mock data and test utilities used by both
 * LegalDocumentModal.test.tsx and CreateLegalDocumentModal.test.tsx
 *
 * @module tests/components/phase2/legal-documents/fixtures
 */

import type { LegalDocument } from '@/types/legalDocument';

// =============================================================================
// Types
// =============================================================================

/**
 * Product owner data structure for tests
 */
export interface ProductOwner {
  id: number;
  firstname: string;
  surname: string;
}

// =============================================================================
// Sample Product Owners
// =============================================================================

/**
 * Sample product owners for multi-select tests
 */
export const sampleProductOwners: ProductOwner[] = [
  { id: 123, firstname: 'John', surname: 'Doe' },
  { id: 456, firstname: 'Jane', surname: 'Smith' },
  { id: 789, firstname: 'Bob', surname: 'Johnson' },
];

/**
 * Empty product owners array for edge case tests
 */
export const emptyProductOwners: ProductOwner[] = [];

/**
 * Single product owner for minimal tests
 */
export const singleProductOwner: ProductOwner[] = [
  { id: 123, firstname: 'John', surname: 'Doe' },
];

// =============================================================================
// Sample Documents
// =============================================================================

/**
 * Standard sample document with all fields populated
 */
export const sampleDocument: LegalDocument = {
  id: 1,
  type: 'Will',
  document_date: '2024-01-15',
  status: 'Signed',
  notes: 'Test notes for the document',
  product_owner_ids: [123, 456],
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

/**
 * Document with null date for edge case tests
 */
export const sampleDocumentWithNullDate: LegalDocument = {
  id: 2,
  type: 'LPOA P&F',
  document_date: null,
  status: 'Signed',
  notes: null,
  product_owner_ids: [123],
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

/**
 * Document with all null optional fields
 */
export const sampleDocumentWithNulls: LegalDocument = {
  id: 10,
  type: 'EPA',
  document_date: null,
  status: 'Signed',
  notes: null,
  product_owner_ids: [123],
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

/**
 * Newly created document returned from API
 */
export const createdDocument: LegalDocument = {
  id: 1,
  type: 'Will',
  document_date: '2024-01-15',
  status: 'Signed',
  notes: 'New document notes',
  product_owner_ids: [123, 456],
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

/**
 * Updated document returned from API
 */
export const updatedDocument: LegalDocument = {
  id: 1,
  type: 'Will',
  document_date: '2024-01-15',
  status: 'Signed',
  notes: 'Updated notes',
  product_owner_ids: [123, 456],
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-16T10:00:00Z',
};

// =============================================================================
// Test Data Constants
// =============================================================================

/**
 * Long text for notes validation tests (exceeds 2000 char limit)
 */
export const longNotesText = 'a'.repeat(2001);

/**
 * Exact 2000 character text for boundary tests
 */
export const exactLimitNotesText = 'a'.repeat(2000);

/**
 * Near limit text (1900 chars) for warning tests
 */
export const nearLimitNotesText = 'a'.repeat(1900);

/**
 * Over limit text for error styling tests
 */
export const overLimitNotesText = 'a'.repeat(2050);

/**
 * Special characters for edge case tests
 */
export const specialCharactersText = "O'Brien's document - <test> & \"special\" chars";

/**
 * Unicode characters for internationalization tests
 */
export const unicodeText = '\u9057\u8a00\u6587\u66F8 - Legal document';

// =============================================================================
// Mock Error Messages
// =============================================================================

/**
 * Standard API error message for failed update
 */
export const updateFailedError = new Error('Failed to update document');

/**
 * Standard API error message for failed creation
 */
export const createFailedError = new Error('Failed to create document');

/**
 * Network error for connectivity tests
 */
export const networkError = new Error('Network error: Failed to fetch');

/**
 * Server error for 500 response tests
 */
export const serverError = new Error('500 Internal Server Error');
