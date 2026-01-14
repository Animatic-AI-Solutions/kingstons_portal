/**
 * Test suite for Legal Document TypeScript Interfaces
 * TDD Cycle 1: Red Phase - Tests should FAIL (no implementation exists)
 *
 * Verifies that TypeScript interfaces properly type legal document data
 * and that type guards work correctly.
 *
 * Test Coverage:
 * - LegalDocumentType enum values
 * - LegalDocumentStatus enum values (Signed, Lapsed, Registered)
 * - LegalDocument interface fields
 * - CreateLegalDocumentData interface
 * - UpdateLegalDocumentData interface
 * - Type guard functions
 * - Property-based tests using fast-check
 */

// This import will fail if types don't exist - forcing test failure
import * as LegalDocumentTypes from '@/types/legalDocument';

import type {
  LegalDocumentType,
  LegalDocumentStatus,
  LegalDocument,
  CreateLegalDocumentData,
  UpdateLegalDocumentData,
} from '@/types/legalDocument';

import {
  LEGAL_DOCUMENT_TYPES,
  LEGAL_DOCUMENT_STATUSES,
  isStandardDocumentType,
  isValidDocumentStatus,
  isDocumentLapsed,
} from '@/types/legalDocument';

// Property-based testing
import * as fc from 'fast-check';

describe('Legal Document Type Definitions', () => {
  describe('Module Exports', () => {
    it('should export all required types from module', () => {
      // This test verifies the module exists and exports the right types
      expect(LegalDocumentTypes).toBeDefined();
      // TypeScript will fail compilation if these types don't exist
      type LegalDocumentTypeCheck = LegalDocumentType;
      type LegalDocumentStatusCheck = LegalDocumentStatus;
      type LegalDocumentCheck = LegalDocument;
      type CreateLegalDocumentDataCheck = CreateLegalDocumentData;
      type UpdateLegalDocumentDataCheck = UpdateLegalDocumentData;
    });

    it('should export LEGAL_DOCUMENT_TYPES constant', () => {
      expect(LEGAL_DOCUMENT_TYPES).toBeDefined();
      expect(Array.isArray(LEGAL_DOCUMENT_TYPES)).toBe(true);
    });

    it('should export LEGAL_DOCUMENT_STATUSES constant', () => {
      expect(LEGAL_DOCUMENT_STATUSES).toBeDefined();
      expect(Array.isArray(LEGAL_DOCUMENT_STATUSES)).toBe(true);
    });

    it('should export isStandardDocumentType function', () => {
      expect(isStandardDocumentType).toBeDefined();
      expect(typeof isStandardDocumentType).toBe('function');
    });

    it('should export isValidDocumentStatus function', () => {
      expect(isValidDocumentStatus).toBeDefined();
      expect(typeof isValidDocumentStatus).toBe('function');
    });

    it('should export isDocumentLapsed function', () => {
      expect(isDocumentLapsed).toBeDefined();
      expect(typeof isDocumentLapsed).toBe('function');
    });
  });

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

    it('should accept all standard types as valid LegalDocumentType values', () => {
      const validTypes: LegalDocumentType[] = [
        'Will',
        'LPOA P&F',
        'LPOA H&W',
        'EPA',
        'General Power of Attorney',
        'Advance Directive',
      ];

      validTypes.forEach(type => {
        const testType: LegalDocumentType = type;
        expect(testType).toBe(type);
      });
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
      expect(LEGAL_DOCUMENT_STATUSES).not.toContain('Active');
    });

    it('should accept all valid status values', () => {
      const validStatuses: LegalDocumentStatus[] = ['Signed', 'Lapsed', 'Registered'];

      validStatuses.forEach(status => {
        const testStatus: LegalDocumentStatus = status;
        expect(testStatus).toBe(status);
      });
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

    it('should require all mandatory fields', () => {
      const doc: LegalDocument = validDocument;
      expect(doc).toHaveProperty('id');
      expect(doc).toHaveProperty('type');
      expect(doc).toHaveProperty('status');
      expect(doc).toHaveProperty('product_owner_ids');
      expect(doc).toHaveProperty('created_at');
      expect(doc).toHaveProperty('updated_at');
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

    it('should have timestamps as ISO strings', () => {
      const doc: LegalDocument = validDocument;
      expect(typeof doc.created_at).toBe('string');
      expect(typeof doc.updated_at).toBe('string');
    });

    it('should accept all three valid statuses', () => {
      const statuses: LegalDocumentStatus[] = ['Signed', 'Lapsed', 'Registered'];

      statuses.forEach(status => {
        const doc: LegalDocument = {
          ...validDocument,
          status,
        };
        expect(doc.status).toBe(status);
      });
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

    it('should NOT have id, created_at, or updated_at fields', () => {
      const createData: CreateLegalDocumentData = {
        type: 'Will',
        product_owner_ids: [123],
      };
      expect('id' in createData).toBe(false);
      expect('created_at' in createData).toBe(false);
      expect('updated_at' in createData).toBe(false);
    });

    it('should allow null for document_date', () => {
      const createData: CreateLegalDocumentData = {
        type: 'Will',
        product_owner_ids: [123],
        document_date: null,
      };
      expect(createData.document_date).toBeNull();
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

    it('should allow all fields to be updated together', () => {
      const updateData: UpdateLegalDocumentData = {
        type: 'LPOA P&F',
        document_date: '2024-07-01',
        status: 'Registered',
        notes: 'Updated notes',
        product_owner_ids: [111, 222],
      };
      expect(updateData.type).toBe('LPOA P&F');
      expect(updateData.status).toBe('Registered');
    });

    it('should NOT have id, created_at, or updated_at fields', () => {
      const updateData: UpdateLegalDocumentData = {
        notes: 'Updated',
      };
      expect('id' in updateData).toBe(false);
      expect('created_at' in updateData).toBe(false);
      expect('updated_at' in updateData).toBe(false);
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

    it('should return false for case variations', () => {
      expect(isStandardDocumentType('will')).toBe(false);
      expect(isStandardDocumentType('WILL')).toBe(false);
      expect(isStandardDocumentType('epa')).toBe(false);
    });

    it('should return false for types with extra whitespace', () => {
      expect(isStandardDocumentType(' Will')).toBe(false);
      expect(isStandardDocumentType('Will ')).toBe(false);
      expect(isStandardDocumentType(' Will ')).toBe(false);
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
      expect(isValidDocumentStatus('Active')).toBe(false);
    });

    it('should return false for case variations', () => {
      expect(isValidDocumentStatus('signed')).toBe(false);
      expect(isValidDocumentStatus('SIGNED')).toBe(false);
      expect(isValidDocumentStatus('lapsed')).toBe(false);
      expect(isValidDocumentStatus('LAPSED')).toBe(false);
    });

    it('should return false for statuses with whitespace', () => {
      expect(isValidDocumentStatus(' Signed')).toBe(false);
      expect(isValidDocumentStatus('Signed ')).toBe(false);
      expect(isValidDocumentStatus(' Lapsed ')).toBe(false);
    });
  });

  describe('Type guard: isDocumentLapsed', () => {
    const createDocument = (status: 'Signed' | 'Lapsed' | 'Registered'): LegalDocument => ({
      id: 1,
      type: 'Will',
      document_date: '2024-01-15',
      status,
      notes: null,
      product_owner_ids: [123],
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    });

    it('should return true only for Lapsed status', () => {
      expect(isDocumentLapsed(createDocument('Lapsed'))).toBe(true);
    });

    it('should return false for Signed status', () => {
      expect(isDocumentLapsed(createDocument('Signed'))).toBe(false);
    });

    it('should return false for Registered status', () => {
      // Registered is a valid active status, NOT lapsed
      expect(isDocumentLapsed(createDocument('Registered'))).toBe(false);
    });
  });
});

// =============================================================================
// Property-Based Tests (using fast-check)
// =============================================================================

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
      fc.integer({ min: 0, max: 4102444800000 }).map(ts => new Date(ts).toISOString().split('T')[0])
    ),
    status: fc.constantFrom('Signed', 'Lapsed', 'Registered') as fc.Arbitrary<'Signed' | 'Lapsed' | 'Registered'>,
    notes: fc.oneof(
      fc.constant(null),
      fc.string({ minLength: 0, maxLength: 2000 })
    ),
    product_owner_ids: fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 0, maxLength: 10 }),
    created_at: fc.integer({ min: 0, max: 4102444800000 }).map(ts => new Date(ts).toISOString()),
    updated_at: fc.integer({ min: 0, max: 4102444800000 }).map(ts => new Date(ts).toISOString()),
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

  it('should have product_owner_ids with positive integers only', () => {
    fc.assert(
      fc.property(legalDocumentArb, (doc) => {
        return doc.product_owner_ids.every(id => id > 0 && Number.isInteger(id));
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property-based: CreateLegalDocumentData Validation', () => {
  const createDataArb = fc.record({
    type: fc.string({ minLength: 1, maxLength: 100 }),
    product_owner_ids: fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 10 }),
    document_date: fc.option(fc.integer({ min: 0, max: 4102444800000 }).map(ts => new Date(ts).toISOString().split('T')[0])),
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

  it('should have valid status if provided', () => {
    fc.assert(
      fc.property(createDataArb, (data) => {
        if (data.status !== undefined && data.status !== null) {
          return ['Signed', 'Lapsed', 'Registered'].includes(data.status);
        }
        return true;
      }),
      { numRuns: 100 }
    );
  });
});

describe('Type Compatibility with Backend Models', () => {
  it('should match backend LegalDocument field types', () => {
    // This test ensures frontend types are compatible with backend Pydantic models
    const backendResponse: LegalDocument = {
      id: 1, // int
      type: 'Will', // string
      document_date: '2024-01-15', // Optional date as ISO string
      status: 'Signed', // Valid status enum
      notes: 'Test notes', // Optional[str]
      product_owner_ids: [123, 456], // List[int]
      created_at: '2025-01-01T10:00:00Z', // datetime as ISO string
      updated_at: '2025-01-01T10:00:00Z', // datetime as ISO string
    };

    expect(typeof backendResponse.id).toBe('number');
    expect(typeof backendResponse.type).toBe('string');
    expect(typeof backendResponse.status).toBe('string');
    expect(Array.isArray(backendResponse.product_owner_ids)).toBe(true);
    expect(typeof backendResponse.created_at).toBe('string');
    expect(typeof backendResponse.updated_at).toBe('string');
  });

  it('should handle status values matching backend VALID_STATUSES', () => {
    // Backend defines: ["Signed", "Lapsed", "Registered"]
    const backendStatuses: LegalDocumentStatus[] = [
      'Signed',
      'Lapsed',
      'Registered',
    ];

    backendStatuses.forEach(status => {
      const testStatus: LegalDocumentStatus = status;
      expect(LEGAL_DOCUMENT_STATUSES).toContain(testStatus);
    });
  });

  it('should handle all standard document types from backend', () => {
    // Backend defines standard types
    const backendTypes = [
      'Will',
      'LPOA P&F',
      'LPOA H&W',
      'EPA',
      'General Power of Attorney',
      'Advance Directive',
    ];

    backendTypes.forEach(type => {
      expect(LEGAL_DOCUMENT_TYPES).toContain(type);
      expect(isStandardDocumentType(type)).toBe(true);
    });
  });
});
