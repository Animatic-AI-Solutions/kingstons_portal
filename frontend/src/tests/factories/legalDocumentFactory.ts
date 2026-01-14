/**
 * Legal Document Factory
 * Provides factory functions for creating mock legal document data for testing
 */

import type {
  LegalDocument,
  LegalDocumentStatus,
  StandardDocumentType,
} from '@/types/legalDocument';
import { LEGAL_DOCUMENT_TYPES, LEGAL_DOCUMENT_STATUSES } from '@/types/legalDocument';

/**
 * Create a mock legal document
 * @param overrides - Optional fields to override defaults
 * @returns Mock LegalDocument object
 */
export function createMockLegalDocument(
  overrides: Partial<LegalDocument> = {}
): LegalDocument {
  const baseDocument: LegalDocument = {
    id: 1,
    type: 'Will',
    document_date: '2024-01-15',
    status: 'Signed',
    notes: 'Test legal document notes',
    product_owner_ids: [123],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  };

  return { ...baseDocument, ...overrides };
}

/**
 * Create a mock legal document with specific type
 * @param type - Document type
 * @param overrides - Optional fields to override defaults
 * @returns Mock LegalDocument object
 */
export function createMockLegalDocumentOfType(
  type: StandardDocumentType,
  overrides: Partial<LegalDocument> = {}
): LegalDocument {
  return createMockLegalDocument({ type, ...overrides });
}

/**
 * Create a mock LPOA P&F document
 * @param overrides - Optional fields to override defaults
 * @returns Mock LegalDocument object for LPOA P&F
 */
export function createMockLPOAPF(
  overrides: Partial<LegalDocument> = {}
): LegalDocument {
  return createMockLegalDocument({
    type: 'LPOA P&F',
    notes: 'Lasting Power of Attorney for Property and Financial Affairs',
    ...overrides,
  });
}

/**
 * Create a mock LPOA H&W document
 * @param overrides - Optional fields to override defaults
 * @returns Mock LegalDocument object for LPOA H&W
 */
export function createMockLPOAHW(
  overrides: Partial<LegalDocument> = {}
): LegalDocument {
  return createMockLegalDocument({
    type: 'LPOA H&W',
    notes: 'Lasting Power of Attorney for Health and Welfare',
    ...overrides,
  });
}

/**
 * Create an array of mock legal documents
 * @param count - Number of documents to create
 * @param options - Optional configuration
 * @returns Array of mock LegalDocument objects
 */
export function createMockLegalDocumentArray(
  count: number,
  options: {
    type?: StandardDocumentType | 'mixed';
    status?: LegalDocumentStatus | 'mixed';
    product_owner_ids?: number[];
  } = {}
): LegalDocument[] {
  const { type = 'mixed', status = 'mixed', product_owner_ids = [123] } = options;

  const documents: LegalDocument[] = [];

  for (let i = 0; i < count; i++) {
    // Rotate through document types if 'mixed'
    const selectedType =
      type === 'mixed'
        ? LEGAL_DOCUMENT_TYPES[i % LEGAL_DOCUMENT_TYPES.length]
        : type;

    // Rotate through statuses if 'mixed'
    const selectedStatus =
      status === 'mixed'
        ? LEGAL_DOCUMENT_STATUSES[i % LEGAL_DOCUMENT_STATUSES.length]
        : status;

    const document = createMockLegalDocument({
      id: i + 1,
      type: selectedType,
      status: selectedStatus,
      product_owner_ids,
      notes: `Document ${i + 1} notes`,
      document_date: `2024-0${(i % 9) + 1}-15`,
    });

    documents.push(document);
  }

  return documents;
}

/**
 * Create a lapsed legal document
 * @param overrides - Optional fields to override defaults
 * @returns Mock LegalDocument object with Lapsed status
 */
export function createMockLapsedDocument(
  overrides: Partial<LegalDocument> = {}
): LegalDocument {
  return createMockLegalDocument({
    status: 'Lapsed',
    ...overrides,
  });
}

/**
 * Create a registered legal document
 * @param overrides - Optional fields to override defaults
 * @returns Mock LegalDocument object with Registered status
 */
export function createMockRegisteredDocument(
  overrides: Partial<LegalDocument> = {}
): LegalDocument {
  return createMockLegalDocument({
    status: 'Registered',
    ...overrides,
  });
}
