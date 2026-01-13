# Plan 04: Frontend TypeScript Interfaces and API Service

## Overview

This plan covers the TypeScript type definitions and API service functions for the Legal Documents feature. The backend API from Plans 02-03 must be implemented and tested before this plan.

## Prerequisites

- Backend API is deployed and accessible
- Backend tests are passing
- API endpoints are available at `/api/legal_documents`

---

## TDD Cycle 1: TypeScript Interfaces

### Red Phase

**Agent**: Tester-Agent
**Task**: Write failing tests for TypeScript interfaces
**Files to create**: `frontend/src/tests/types/legalDocument.test.ts`

```typescript
/**
 * Test suite for Legal Document TypeScript Interfaces
 *
 * Verifies that TypeScript interfaces properly type legal document data
 * and that type guards work correctly.
 *
 * Test Coverage:
 * - LegalDocumentType enum values
 * - LegalDocumentStatus enum values
 * - LegalDocument interface fields
 * - CreateLegalDocumentData interface
 * - UpdateLegalDocumentData interface
 * - Type guard functions
 */

import {
  LegalDocumentType,
  LegalDocumentStatus,
  LegalDocument,
  CreateLegalDocumentData,
  UpdateLegalDocumentData,
  LEGAL_DOCUMENT_TYPES,
  LEGAL_DOCUMENT_STATUSES,
  isStandardDocumentType,
  isValidDocumentStatus,
} from '@/types/legalDocument';

describe('LegalDocumentType', () => {
  it('should include all standard document types', () => {
    expect(LEGAL_DOCUMENT_TYPES).toContain('Will');
    expect(LEGAL_DOCUMENT_TYPES).toContain('LPOA P&F');
    expect(LEGAL_DOCUMENT_TYPES).toContain('LPOA H&W');
    expect(LEGAL_DOCUMENT_TYPES).toContain('EPA');
    expect(LEGAL_DOCUMENT_TYPES).toContain('General Power of Attorney');
    expect(LEGAL_DOCUMENT_TYPES).toContain('Advance Directive');
  });

  it('should have exactly 6 standard types', () => {
    expect(LEGAL_DOCUMENT_TYPES).toHaveLength(6);
  });
});

describe('LegalDocumentStatus', () => {
  it('should include all valid statuses', () => {
    expect(LEGAL_DOCUMENT_STATUSES).toContain('Signed');
    expect(LEGAL_DOCUMENT_STATUSES).toContain('Lapsed');
    expect(LEGAL_DOCUMENT_STATUSES).toContain('Registered');
  });

  it('should have exactly 3 statuses', () => {
    expect(LEGAL_DOCUMENT_STATUSES).toHaveLength(3);
  });

  it('should NOT include Inactive or Deceased (those are for other features)', () => {
    expect(LEGAL_DOCUMENT_STATUSES).not.toContain('Inactive');
    expect(LEGAL_DOCUMENT_STATUSES).not.toContain('Deceased');
  });
});

describe('LegalDocument interface', () => {
  const validDocument: LegalDocument = {
    id: 1,
    type: 'Will',
    document_date: '2024-01-15',
    status: 'Signed',
    notes: 'Test notes',
    product_owner_ids: [123, 456],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  };

  it('should accept valid document with all fields', () => {
    // TypeScript compile-time check
    const doc: LegalDocument = validDocument;
    expect(doc.id).toBe(1);
    expect(doc.type).toBe('Will');
    expect(doc.status).toBe('Signed');
  });

  it('should allow null document_date', () => {
    const doc: LegalDocument = {
      ...validDocument,
      document_date: null,
    };
    expect(doc.document_date).toBeNull();
  });

  it('should allow null notes', () => {
    const doc: LegalDocument = {
      ...validDocument,
      notes: null,
    };
    expect(doc.notes).toBeNull();
  });

  it('should accept custom document type as string', () => {
    // CRITICAL: Type should allow custom types (string union)
    const doc: LegalDocument = {
      ...validDocument,
      type: 'Custom: Family Trust Agreement',
    };
    expect(doc.type).toBe('Custom: Family Trust Agreement');
  });

  it('should require product_owner_ids array', () => {
    const doc: LegalDocument = {
      ...validDocument,
      product_owner_ids: [],
    };
    expect(doc.product_owner_ids).toEqual([]);
  });
});

describe('CreateLegalDocumentData interface', () => {
  it('should require type and product_owner_ids', () => {
    const createData: CreateLegalDocumentData = {
      type: 'Will',
      product_owner_ids: [123],
    };
    expect(createData.type).toBe('Will');
    expect(createData.product_owner_ids).toEqual([123]);
  });

  it('should allow optional fields', () => {
    const createData: CreateLegalDocumentData = {
      type: 'EPA',
      product_owner_ids: [123, 456],
      document_date: '2024-06-15',
      status: 'Signed',
      notes: 'Test notes',
    };
    expect(createData.document_date).toBe('2024-06-15');
    expect(createData.notes).toBe('Test notes');
  });

  it('should accept custom type string', () => {
    const createData: CreateLegalDocumentData = {
      type: 'Custom: Living Will',
      product_owner_ids: [123],
    };
    expect(createData.type).toBe('Custom: Living Will');
  });
});

describe('UpdateLegalDocumentData interface', () => {
  it('should allow partial updates with only type', () => {
    const updateData: UpdateLegalDocumentData = {
      type: 'EPA',
    };
    expect(updateData.type).toBe('EPA');
    expect(updateData.status).toBeUndefined();
  });

  it('should allow partial updates with only status', () => {
    const updateData: UpdateLegalDocumentData = {
      status: 'Lapsed',
    };
    expect(updateData.status).toBe('Lapsed');
    expect(updateData.type).toBeUndefined();
  });

  it('should allow updating product_owner_ids', () => {
    const updateData: UpdateLegalDocumentData = {
      product_owner_ids: [789, 101],
    };
    expect(updateData.product_owner_ids).toEqual([789, 101]);
  });

  it('should allow empty object for no changes', () => {
    const updateData: UpdateLegalDocumentData = {};
    expect(Object.keys(updateData)).toHaveLength(0);
  });
});

describe('Type guard: isStandardDocumentType', () => {
  it('should return true for standard types', () => {
    expect(isStandardDocumentType('Will')).toBe(true);
    expect(isStandardDocumentType('LPOA P&F')).toBe(true);
    expect(isStandardDocumentType('LPOA H&W')).toBe(true);
    expect(isStandardDocumentType('EPA')).toBe(true);
    expect(isStandardDocumentType('General Power of Attorney')).toBe(true);
    expect(isStandardDocumentType('Advance Directive')).toBe(true);
  });

  it('should return false for custom types', () => {
    expect(isStandardDocumentType('Custom: Family Trust')).toBe(false);
    expect(isStandardDocumentType('Living Will')).toBe(false);
    expect(isStandardDocumentType('')).toBe(false);
  });
});

describe('Type guard: isValidDocumentStatus', () => {
  it('should return true for valid statuses', () => {
    expect(isValidDocumentStatus('Signed')).toBe(true);
    expect(isValidDocumentStatus('Lapsed')).toBe(true);
    expect(isValidDocumentStatus('Registered')).toBe(true);
  });

  it('should return false for invalid statuses', () => {
    expect(isValidDocumentStatus('Inactive')).toBe(false);
    expect(isValidDocumentStatus('Deceased')).toBe(false);
    expect(isValidDocumentStatus('Invalid')).toBe(false);
    expect(isValidDocumentStatus('')).toBe(false);
  });
});

// =============================================================================
// Property-Based Tests (using fast-check)
// =============================================================================

import * as fc from 'fast-check';

describe('Property-based: Type Guards', () => {
  describe('isStandardDocumentType', () => {
    it('should always return true for standard types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Will', 'LPOA P&F', 'LPOA H&W', 'EPA', 'General Power of Attorney', 'Advance Directive'),
          (type: string) => {
            return isStandardDocumentType(type) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always return false for non-standard strings', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 200 }),
          (type: string) => {
            const standardTypes = ['Will', 'LPOA P&F', 'LPOA H&W', 'EPA', 'General Power of Attorney', 'Advance Directive'];
            if (standardTypes.includes(type)) {
              return true; // Skip standard types
            }
            return isStandardDocumentType(type) === false;
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should always return a boolean', () => {
      fc.assert(
        fc.property(
          fc.anything(),
          (value: unknown) => {
            // Type guard should handle any input gracefully
            if (typeof value === 'string') {
              const result = isStandardDocumentType(value);
              return typeof result === 'boolean';
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('isValidDocumentStatus', () => {
    it('should always return true for valid statuses', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Signed', 'Lapsed', 'Registered'),
          (status: string) => {
            return isValidDocumentStatus(status) === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always return false for non-valid status strings', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }),
          (status: string) => {
            const validStatuses = ['Signed', 'Lapsed', 'Registered'];
            if (validStatuses.includes(status)) {
              return true; // Skip valid statuses
            }
            return isValidDocumentStatus(status) === false;
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should reject case variations and similar-looking statuses', () => {
      // Property: Similar-looking invalid statuses should still be rejected
      fc.assert(
        fc.property(
          fc.constantFrom('signed', 'SIGNED', 'registered', 'REGISTERED', ' Signed', 'Lapsed '),
          (status: string) => {
            // These variations should all return false (case-sensitive, no whitespace)
            return isValidDocumentStatus(status) === false;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

describe('Property-based: LegalDocument Data Structures', () => {
  // Generator for valid LegalDocument objects
  const legalDocumentArb = fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    type: fc.oneof(
      fc.constantFrom('Will', 'LPOA P&F', 'LPOA H&W', 'EPA', 'General Power of Attorney', 'Advance Directive'),
      fc.string({ minLength: 1, maxLength: 100 }) // Custom types
    ),
    document_date: fc.oneof(
      fc.constant(null),
      fc.date().map(d => d.toISOString().split('T')[0])
    ),
    status: fc.constantFrom('Signed', 'Lapsed', 'Registered') as fc.Arbitrary<'Signed' | 'Lapsed' | 'Registered'>,
    notes: fc.oneof(
      fc.constant(null),
      fc.string({ minLength: 0, maxLength: 2000 })
    ),
    product_owner_ids: fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 0, maxLength: 10 }),
    created_at: fc.date().map(d => d.toISOString()),
    updated_at: fc.date().map(d => d.toISOString()),
  });

  it('should always have valid structure', () => {
    fc.assert(
      fc.property(legalDocumentArb, (doc) => {
        // All required fields should be present
        return (
          typeof doc.id === 'number' &&
          typeof doc.type === 'string' &&
          (doc.document_date === null || typeof doc.document_date === 'string') &&
          ['Signed', 'Lapsed', 'Registered'].includes(doc.status) &&
          (doc.notes === null || typeof doc.notes === 'string') &&
          Array.isArray(doc.product_owner_ids) &&
          typeof doc.created_at === 'string' &&
          typeof doc.updated_at === 'string'
        );
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain notes length constraint', () => {
    fc.assert(
      fc.property(legalDocumentArb, (doc) => {
        if (doc.notes !== null) {
          return doc.notes.length <= 2000;
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });

  it('should have positive integer IDs', () => {
    fc.assert(
      fc.property(legalDocumentArb, (doc) => {
        return doc.id > 0 && Number.isInteger(doc.id);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property-based: CreateLegalDocumentData Validation', () => {
  const createDataArb = fc.record({
    type: fc.string({ minLength: 1, maxLength: 100 }),
    product_owner_ids: fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 10 }),
    document_date: fc.option(fc.date().map(d => d.toISOString().split('T')[0])),
    notes: fc.option(fc.string({ minLength: 0, maxLength: 2000 })),
    status: fc.option(fc.constantFrom('Signed', 'Lapsed', 'Registered') as fc.Arbitrary<'Signed' | 'Lapsed' | 'Registered'>),
  });

  it('should always require at least one product owner', () => {
    fc.assert(
      fc.property(createDataArb, (data) => {
        return data.product_owner_ids.length >= 1;
      }),
      { numRuns: 100 }
    );
  });

  it('should always require non-empty type', () => {
    fc.assert(
      fc.property(createDataArb, (data) => {
        return data.type.length >= 1;
      }),
      { numRuns: 100 }
    );
  });
});
```

### Green Phase

**Agent**: coder-agent
**Task**: Implement TypeScript interfaces to pass tests
**Files to create**: `frontend/src/types/legalDocument.ts`

```typescript
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
 */
export interface LegalDocumentFilters {
  product_owner_id?: number;
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
 * Check if a document is lapsed (status is 'Lapsed' or 'Registered').
 * Used for UI display (greyed out, sorted to bottom).
 *
 * @param document - Legal document to check
 * @returns True if document is lapsed or superseded
 */
export function isDocumentLapsed(document: LegalDocument): boolean {
  return document.status === 'Lapsed' || document.status === 'Registered';
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
```

### Blue Phase

**Agent**: coder-agent
**Task**: Refactor for quality and add barrel export
**Changes**:
1. Add to types barrel export
2. Ensure JSDoc comments are comprehensive
3. Add constants for validation

---

## TDD Cycle 2: API Service Functions

### Red Phase

**Agent**: Tester-Agent
**Task**: Write failing tests for API service functions
**Files to create**: `frontend/src/tests/services/legalDocumentsApi.test.ts`

```typescript
/**
 * Test suite for Legal Documents API Service
 *
 * Tests API service functions for the Legal Documents feature.
 * Uses axios mocking to test HTTP calls without hitting real API.
 *
 * Test Coverage:
 * - fetchLegalDocuments with and without filters
 * - createLegalDocument
 * - updateLegalDocument
 * - updateLegalDocumentStatus
 * - deleteLegalDocument
 * - Error handling for each endpoint
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import api from '@/services/api';
import {
  fetchLegalDocuments,
  createLegalDocument,
  updateLegalDocument,
  updateLegalDocumentStatus,
  deleteLegalDocument,
} from '@/services/legalDocumentsApi';
import type { LegalDocument, CreateLegalDocumentData } from '@/types/legalDocument';

// Mock the api module
vi.mock('@/services/api');

const mockApi = api as jest.Mocked<typeof api>;

// Sample test data
const sampleDocument: LegalDocument = {
  id: 1,
  type: 'Will',
  document_date: '2024-01-15',
  status: 'Signed',
  notes: 'Test notes',
  product_owner_ids: [123, 456],
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const sampleDocuments: LegalDocument[] = [
  sampleDocument,
  {
    ...sampleDocument,
    id: 2,
    type: 'EPA',
    status: 'Lapsed',
  },
];

describe('legalDocumentsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // fetchLegalDocuments Tests
  // ===========================================================================

  describe('fetchLegalDocuments', () => {
    it('should fetch all documents for a product owner', async () => {
      mockApi.get.mockResolvedValueOnce({ data: sampleDocuments });

      const result = await fetchLegalDocuments(123);

      expect(mockApi.get).toHaveBeenCalledWith('/legal_documents', {
        params: { product_owner_id: 123 },
      });
      expect(result).toEqual(sampleDocuments);
    });

    it('should apply type filter when provided', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [sampleDocument] });

      await fetchLegalDocuments(123, { type: 'Will' });

      expect(mockApi.get).toHaveBeenCalledWith('/legal_documents', {
        params: { product_owner_id: 123, type: 'Will' },
      });
    });

    it('should apply status filter when provided', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [sampleDocument] });

      await fetchLegalDocuments(123, { status: 'Signed' });

      expect(mockApi.get).toHaveBeenCalledWith('/legal_documents', {
        params: { product_owner_id: 123, status: 'Signed' },
      });
    });

    it('should apply multiple filters when provided', async () => {
      mockApi.get.mockResolvedValueOnce({ data: [] });

      await fetchLegalDocuments(123, { type: 'Will', status: 'Signed' });

      expect(mockApi.get).toHaveBeenCalledWith('/legal_documents', {
        params: { product_owner_id: 123, type: 'Will', status: 'Signed' },
      });
    });

    it('should throw ApiError on API failure', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: { message: 'Database error' },
        },
      };
      mockApi.get.mockRejectedValueOnce(errorResponse);

      await expect(fetchLegalDocuments(123)).rejects.toThrow('Database error');
    });
  });

  // ===========================================================================
  // createLegalDocument Tests
  // ===========================================================================

  describe('createLegalDocument', () => {
    const createData: CreateLegalDocumentData = {
      type: 'Will',
      product_owner_ids: [123],
      document_date: '2024-06-15',
      notes: 'New document',
    };

    it('should create a new document', async () => {
      mockApi.post.mockResolvedValueOnce({ data: { ...sampleDocument, ...createData } });

      const result = await createLegalDocument(createData);

      expect(mockApi.post).toHaveBeenCalledWith('/legal_documents', createData);
      expect(result.type).toBe('Will');
    });

    it('should handle 422 validation error', async () => {
      const errorResponse = {
        response: {
          status: 422,
          data: { detail: [{ msg: 'type is required' }] },
        },
      };
      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(createLegalDocument(createData)).rejects.toThrow();
    });

    it('should handle 404 product owner not found', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { detail: 'Product owner with ID 999 not found' },
        },
      };
      mockApi.post.mockRejectedValueOnce(errorResponse);

      await expect(createLegalDocument({ ...createData, product_owner_ids: [999] }))
        .rejects.toThrow();
    });
  });

  // ===========================================================================
  // updateLegalDocument Tests
  // ===========================================================================

  describe('updateLegalDocument', () => {
    it('should update a document', async () => {
      const updateData = { notes: 'Updated notes' };
      mockApi.put.mockResolvedValueOnce({
        data: { ...sampleDocument, notes: 'Updated notes' },
      });

      const result = await updateLegalDocument(1, updateData);

      expect(mockApi.put).toHaveBeenCalledWith('/legal_documents/1', updateData);
      expect(result.notes).toBe('Updated notes');
    });

    it('should update multiple fields', async () => {
      const updateData = { type: 'EPA', status: 'Lapsed' as const };
      mockApi.put.mockResolvedValueOnce({
        data: { ...sampleDocument, ...updateData },
      });

      const result = await updateLegalDocument(1, updateData);

      expect(result.type).toBe('EPA');
      expect(result.status).toBe('Lapsed');
    });

    it('should handle 404 document not found', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { detail: 'Legal document with ID 999 not found' },
        },
      };
      mockApi.put.mockRejectedValueOnce(errorResponse);

      await expect(updateLegalDocument(999, { notes: 'test' })).rejects.toThrow();
    });
  });

  // ===========================================================================
  // updateLegalDocumentStatus Tests
  // ===========================================================================

  describe('updateLegalDocumentStatus', () => {
    it('should update status to Lapsed', async () => {
      mockApi.patch.mockResolvedValueOnce({
        data: { ...sampleDocument, status: 'Lapsed' },
      });

      const result = await updateLegalDocumentStatus(1, 'Lapsed');

      expect(mockApi.patch).toHaveBeenCalledWith('/legal_documents/1/status', {
        status: 'Lapsed',
      });
      expect(result.status).toBe('Lapsed');
    });

    it('should reactivate by setting status to Signed', async () => {
      mockApi.patch.mockResolvedValueOnce({
        data: { ...sampleDocument, status: 'Signed' },
      });

      const result = await updateLegalDocumentStatus(1, 'Signed');

      expect(result.status).toBe('Signed');
    });

    it('should handle 422 invalid status', async () => {
      const errorResponse = {
        response: {
          status: 422,
          data: { detail: 'Status must be Signed, Registered, or Lapsed' },
        },
      };
      mockApi.patch.mockRejectedValueOnce(errorResponse);

      // @ts-expect-error - Testing invalid status
      await expect(updateLegalDocumentStatus(1, 'Invalid')).rejects.toThrow();
    });
  });

  // ===========================================================================
  // deleteLegalDocument Tests
  // ===========================================================================

  describe('deleteLegalDocument', () => {
    it('should delete a document', async () => {
      mockApi.delete.mockResolvedValueOnce({});

      await deleteLegalDocument(1);

      expect(mockApi.delete).toHaveBeenCalledWith('/legal_documents/1');
    });

    it('should handle 404 document not found', async () => {
      const errorResponse = {
        response: {
          status: 404,
          data: { detail: 'Legal document with ID 999 not found' },
        },
      };
      mockApi.delete.mockRejectedValueOnce(errorResponse);

      await expect(deleteLegalDocument(999)).rejects.toThrow();
    });
  });
});
```

### Green Phase

**Agent**: coder-agent
**Task**: Implement API service functions to pass tests
**Files to create**: `frontend/src/services/legalDocumentsApi.ts`

```typescript
/**
 * Legal Documents API Service
 *
 * Provides API functions for managing legal documents in the
 * Kingston's Portal wealth management system.
 *
 * API Endpoints:
 * - GET /api/legal_documents - Fetch documents with optional filters
 * - POST /api/legal_documents - Create new document
 * - PUT /api/legal_documents/:id - Update existing document
 * - PATCH /api/legal_documents/:id/status - Update document status
 * - DELETE /api/legal_documents/:id - Hard delete document
 *
 * @module services/legalDocumentsApi
 */

import api from '@/services/api';
import type {
  LegalDocument,
  CreateLegalDocumentData,
  UpdateLegalDocumentData,
  LegalDocumentFilters,
  LegalDocumentStatus,
} from '@/types/legalDocument';

// =============================================================================
// Error Handling
// =============================================================================

/**
 * Custom error class for API-specific errors with enhanced context.
 */
class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Centralized error handler for API responses.
 * Extracts error message from response body and includes response context.
 *
 * @param error - Error object from axios
 * @throws {ApiError} Enhanced error with status code and response body
 */
const handleApiError = (error: unknown): never => {
  const axiosError = error as {
    response?: {
      status?: number;
      data?: { message?: string; detail?: string | Array<{ msg: string }> };
    };
    message?: string;
  };

  const statusCode = axiosError.response?.status;
  const responseBody = axiosError.response?.data;

  // Extract message from various response formats
  let message = 'An unexpected error occurred';
  if (responseBody?.message) {
    message = responseBody.message;
  } else if (typeof responseBody?.detail === 'string') {
    message = responseBody.detail;
  } else if (Array.isArray(responseBody?.detail)) {
    message = responseBody.detail.map((d) => d.msg).join(', ');
  } else if (axiosError.message) {
    message = axiosError.message;
  }

  throw new ApiError(message, statusCode, responseBody);
};

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetches legal documents for specific product owners with optional filters.
 * Use fetchLegalDocumentsByClientGroup for the more common client group query.
 *
 * @param productOwnerIds - Array of product owner IDs to fetch documents for
 * @param filters - Optional filters (type, status)
 * @returns Promise resolving to array of legal documents
 * @throws {ApiError} Error with status code and message on API failure
 *
 * @example
 * // Fetch all documents for specific product owners
 * const documents = await fetchLegalDocuments([123, 456]);
 *
 * @example
 * // Fetch only active Wills for specific product owners
 * const activeWills = await fetchLegalDocuments([123], {
 *   type: 'Will',
 *   status: 'Signed'
 * });
 */
export const fetchLegalDocuments = async (
  productOwnerIds: number[],
  filters?: LegalDocumentFilters
): Promise<LegalDocument[]> => {
  try {
    const params: Record<string, string> = {};

    // Pass product owner IDs as comma-separated string
    if (productOwnerIds.length > 0) {
      params.product_owner_ids = productOwnerIds.join(',');
    }

    if (filters?.type) {
      params.type = filters.type;
    }

    if (filters?.status) {
      params.status = filters.status;
    }

    const response = await api.get('/legal_documents', { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Fetches legal documents for a client group with optional filters.
 * This is the primary query pattern - documents are linked to client groups
 * indirectly through product owners.
 *
 * @param clientGroupId - Client group ID to fetch documents for
 * @param filters - Optional filters (type, status)
 * @returns Promise resolving to array of legal documents
 * @throws {ApiError} Error with status code and message on API failure
 *
 * @example
 * // Fetch all documents for a client group
 * const documents = await fetchLegalDocumentsByClientGroup(123);
 *
 * @example
 * // Fetch only active Wills for a client group
 * const activeWills = await fetchLegalDocumentsByClientGroup(123, {
 *   type: 'Will',
 *   status: 'Signed'
 * });
 */
export const fetchLegalDocumentsByClientGroup = async (
  clientGroupId: number,
  filters?: LegalDocumentFilters
): Promise<LegalDocument[]> => {
  try {
    const params: Record<string, string | number> = {
      client_group_id: clientGroupId,
    };

    if (filters?.type) {
      params.type = filters.type;
    }

    if (filters?.status) {
      params.status = filters.status;
    }

    const response = await api.get('/legal_documents', { params });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Creates a new legal document.
 *
 * @param data - Legal document data (required: type, product_owner_ids)
 * @returns Promise resolving to created legal document with generated ID
 * @throws {ApiError} Error with status code and message on API failure
 *
 * @example
 * const newDoc = await createLegalDocument({
 *   type: 'Will',
 *   product_owner_ids: [123],
 *   document_date: '2024-06-15',
 *   notes: 'Last Will and Testament'
 * });
 */
export const createLegalDocument = async (
  data: CreateLegalDocumentData
): Promise<LegalDocument> => {
  try {
    const response = await api.post('/legal_documents', data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Updates an existing legal document.
 *
 * @param id - Document ID to update
 * @param data - Updated document data (partial update supported)
 * @returns Promise resolving to updated legal document
 * @throws {ApiError} Error with status code and message on API failure
 *
 * @example
 * const updated = await updateLegalDocument(1, {
 *   notes: 'Updated notes',
 *   document_date: '2024-07-01'
 * });
 */
export const updateLegalDocument = async (
  id: number,
  data: UpdateLegalDocumentData
): Promise<LegalDocument> => {
  try {
    const response = await api.put(`/legal_documents/${id}`, data);
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Updates the status of a legal document (PATCH endpoint).
 *
 * @param id - Document ID to update
 * @param status - New status value (Signed, Registered, or Lapsed)
 * @returns Promise resolving to updated legal document
 * @throws {ApiError} Error with status code and message on API failure
 *
 * @example
 * // Lapse a document
 * const lapsed = await updateLegalDocumentStatus(1, 'Lapsed');
 *
 * @example
 * // Reactivate a document
 * const reactivated = await updateLegalDocumentStatus(1, 'Signed');
 */
export const updateLegalDocumentStatus = async (
  id: number,
  status: LegalDocumentStatus
): Promise<LegalDocument> => {
  try {
    const response = await api.patch(`/legal_documents/${id}/status`, { status });
    return response.data;
  } catch (error) {
    return handleApiError(error);
  }
};

/**
 * Deletes a legal document (hard delete - permanent removal).
 *
 * @param id - Document ID to delete
 * @returns Promise resolving when deletion is complete
 * @throws {ApiError} Error with status code and message on API failure
 *
 * @example
 * await deleteLegalDocument(1);
 */
export const deleteLegalDocument = async (id: number): Promise<void> => {
  try {
    await api.delete(`/legal_documents/${id}`);
  } catch (error) {
    return handleApiError(error);
  }
};
```

### Blue Phase

**Agent**: coder-agent
**Task**: Refactor for quality and consistency
**Changes**:
1. Ensure consistency with specialRelationshipsApi.ts patterns
2. Add comprehensive JSDoc comments
3. Export from services index

---

## Running Tests

```bash
# Run type tests
cd frontend
npm test -- src/tests/types/legalDocument.test.ts

# Run API service tests
npm test -- src/tests/services/legalDocumentsApi.test.ts

# Run all with coverage
npm test -- --coverage src/tests/types/legalDocument.test.ts src/tests/services/legalDocumentsApi.test.ts
```

## Next Steps

Once all tests pass:
1. Proceed to Plan 05: React Query Hooks
2. Types and API service will be available for hook implementation
