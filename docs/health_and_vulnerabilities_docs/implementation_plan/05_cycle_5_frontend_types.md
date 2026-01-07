# Cycle 5: Frontend TypeScript Types

**Goal**: Create TypeScript types and interfaces for health and vulnerabilities data

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for TypeScript types.

**File**: `frontend/src/tests/types/healthVulnerability.test.ts`

```typescript
import * as fc from 'fast-check';
import {
  HealthCondition,
  HealthConditionFormData,
  Vulnerability,
  VulnerabilityFormData,
  PersonWithCounts,
  PersonType,
  HealthStatus,
  VulnerabilityStatus,
  CONDITION_TYPES,
  SMOKING_CONDITIONS,
  HEALTH_STATUS_OPTIONS,
  VULNERABILITY_STATUS_OPTIONS,
  isSmokingCondition,
  sortHealthConditions,
  validateHealthForm,
  validateVulnerabilityForm,
} from '@/types/healthVulnerability';

// =============================================================================
// Test Data Generators (Arbitraries) for Property-Based Testing
// =============================================================================

const healthStatusArbitrary = fc.constantFrom<HealthStatus>('Active', 'Resolved', 'Monitoring', 'Inactive');
const vulnStatusArbitrary = fc.constantFrom<VulnerabilityStatus>('Active', 'Resolved', 'Inactive');
const personTypeArbitrary = fc.constantFrom<PersonType>('product_owner', 'special_relationship');
const conditionTypeArbitrary = fc.constantFrom(...CONDITION_TYPES);

const healthConditionArbitrary = fc.record({
  id: fc.nat(),
  product_owner_id: fc.option(fc.nat(), { nil: undefined }),
  special_relationship_id: fc.option(fc.nat(), { nil: undefined }),
  condition: fc.string({ minLength: 1, maxLength: 255 }),
  name: fc.option(fc.string({ maxLength: 255 }), { nil: null }),
  date_of_diagnosis: fc.option(fc.date().map(d => d.toISOString().split('T')[0]), { nil: null }),
  status: healthStatusArbitrary,
  medication: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
  date_recorded: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
  notes: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
  created_at: fc.date().map(d => d.toISOString()),
});

const vulnerabilityArbitrary = fc.record({
  id: fc.nat(),
  product_owner_id: fc.option(fc.nat(), { nil: undefined }),
  special_relationship_id: fc.option(fc.nat(), { nil: undefined }),
  description: fc.string({ minLength: 1, maxLength: 500 }),
  adjustments: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
  diagnosed: fc.boolean(),
  date_recorded: fc.option(fc.date().map(d => d.toISOString()), { nil: null }),
  status: vulnStatusArbitrary,
  notes: fc.option(fc.string({ maxLength: 1000 }), { nil: null }),
  created_at: fc.date().map(d => d.toISOString()),
});

const personWithCountsArbitrary = fc.record({
  id: fc.nat(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  relationship: fc.string({ minLength: 1, maxLength: 50 }),
  personType: personTypeArbitrary,
  status: fc.string({ minLength: 1, maxLength: 20 }),
  activeCount: fc.nat({ max: 100 }),
  inactiveCount: fc.nat({ max: 100 }),
});

describe('Health and Vulnerability Types', () => {
  // ===========================================================================
  // Unit Tests - HealthCondition type
  // ===========================================================================

  describe('HealthCondition type', () => {
    it('should have all required fields', () => {
      const condition: HealthCondition = {
        id: 1,
        product_owner_id: 123,
        condition: 'Smoking',
        name: 'Current Smoker',
        date_of_diagnosis: '2020-01-15',
        status: 'Active',
        medication: 'None',
        date_recorded: '2024-01-01T00:00:00Z',
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(condition.id).toBeDefined();
      expect(condition.condition).toBeDefined();
      expect(condition.status).toBeDefined();
    });

    it('should allow special_relationship_id instead of product_owner_id', () => {
      const condition: HealthCondition = {
        id: 2,
        special_relationship_id: 456,
        condition: 'Diabetes',
        name: 'Type 2',
        date_of_diagnosis: null,
        status: 'Monitoring',
        medication: 'Metformin',
        date_recorded: null,
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(condition.special_relationship_id).toBe(456);
      expect(condition.product_owner_id).toBeUndefined();
    });

    // Property-based test
    it('should always have either product_owner_id or special_relationship_id', () => {
      fc.assert(
        fc.property(healthConditionArbitrary, (condition) => {
          const hasProductOwner = condition.product_owner_id !== undefined;
          const hasSpecialRelationship = condition.special_relationship_id !== undefined;
          // At least one should be defined (business rule)
          return hasProductOwner || hasSpecialRelationship;
        }),
        { numRuns: 100 }
      );
    });
  });

  // ===========================================================================
  // Unit Tests - Vulnerability type
  // ===========================================================================

  describe('Vulnerability type', () => {
    it('should have all required fields', () => {
      const vulnerability: Vulnerability = {
        id: 1,
        product_owner_id: 123,
        description: 'Hearing impairment',
        adjustments: 'Speak clearly, face-to-face',
        diagnosed: true,
        date_recorded: '2024-01-01T00:00:00Z',
        status: 'Active',
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(vulnerability.id).toBeDefined();
      expect(vulnerability.description).toBeDefined();
      expect(vulnerability.diagnosed).toBe(true);
    });

    it('should have diagnosed as boolean', () => {
      const vulnerability: Vulnerability = {
        id: 1,
        product_owner_id: 123,
        description: 'Test',
        adjustments: null,
        diagnosed: false,
        date_recorded: null,
        status: 'Active',
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(typeof vulnerability.diagnosed).toBe('boolean');
    });

    // Property-based test
    it('should always have diagnosed as boolean for any vulnerability', () => {
      fc.assert(
        fc.property(vulnerabilityArbitrary, (vuln) => {
          return typeof vuln.diagnosed === 'boolean';
        }),
        { numRuns: 100 }
      );
    });
  });

  // ===========================================================================
  // Unit Tests - PersonWithCounts type
  // ===========================================================================

  describe('PersonWithCounts type', () => {
    it('should have active and inactive counts', () => {
      const person: PersonWithCounts = {
        id: 1,
        name: 'John Smith',
        relationship: 'Primary Owner',
        personType: 'product_owner',
        status: 'Active',
        activeCount: 3,
        inactiveCount: 1,
      };

      expect(person.activeCount).toBe(3);
      expect(person.inactiveCount).toBe(1);
    });

    it('should distinguish product owners from special relationships', () => {
      const sr: PersonWithCounts = {
        id: 2,
        name: 'Jane Doe',
        relationship: 'Spouse',
        personType: 'special_relationship',
        status: 'Active',
        activeCount: 0,
        inactiveCount: 0,
      };

      expect(sr.personType).toBe('special_relationship');
    });

    // Property-based tests
    it('should always have non-negative counts', () => {
      fc.assert(
        fc.property(personWithCountsArbitrary, (person) => {
          return person.activeCount >= 0 && person.inactiveCount >= 0;
        }),
        { numRuns: 100 }
      );
    });

    it('should always have valid personType', () => {
      fc.assert(
        fc.property(personWithCountsArbitrary, (person) => {
          return person.personType === 'product_owner' || person.personType === 'special_relationship';
        }),
        { numRuns: 100 }
      );
    });
  });

  // ===========================================================================
  // Unit Tests - Constants
  // ===========================================================================

  describe('SMOKING_CONDITIONS constant', () => {
    it('should contain smoking-related conditions', () => {
      expect(SMOKING_CONDITIONS).toContain('Smoking');
      expect(SMOKING_CONDITIONS).toContain('Current Smoker');
      expect(SMOKING_CONDITIONS).toContain('Former Smoker');
      expect(SMOKING_CONDITIONS).toContain('Non-Smoker');
    });

    it('should be immutable (readonly)', () => {
      expect(Object.isFrozen(SMOKING_CONDITIONS)).toBe(true);
    });
  });

  describe('Status options', () => {
    it('should have valid health status options', () => {
      expect(HEALTH_STATUS_OPTIONS).toContain('Active');
      expect(HEALTH_STATUS_OPTIONS).toContain('Resolved');
      expect(HEALTH_STATUS_OPTIONS).toContain('Monitoring');
      expect(HEALTH_STATUS_OPTIONS).toContain('Inactive');
    });

    it('should have valid vulnerability status options', () => {
      expect(VULNERABILITY_STATUS_OPTIONS).toContain('Active');
      expect(VULNERABILITY_STATUS_OPTIONS).toContain('Resolved');
      expect(VULNERABILITY_STATUS_OPTIONS).toContain('Inactive');
    });

    it('should be immutable arrays', () => {
      expect(Object.isFrozen(HEALTH_STATUS_OPTIONS)).toBe(true);
      expect(Object.isFrozen(VULNERABILITY_STATUS_OPTIONS)).toBe(true);
    });
  });

  // ===========================================================================
  // Unit Tests - isSmokingCondition helper
  // ===========================================================================

  describe('isSmokingCondition helper', () => {
    it('should return true for smoking conditions', () => {
      expect(isSmokingCondition({ condition: 'Smoking', name: '' })).toBe(true);
      expect(isSmokingCondition({ condition: '', name: 'Current Smoker' })).toBe(true);
    });

    it('should return false for non-smoking conditions', () => {
      expect(isSmokingCondition({ condition: 'Diabetes', name: 'Type 2' })).toBe(false);
    });

    // Edge cases
    it('should return false for empty strings', () => {
      expect(isSmokingCondition({ condition: '', name: '' })).toBe(false);
    });

    it('should return false for null name', () => {
      expect(isSmokingCondition({ condition: 'Diabetes', name: null })).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(isSmokingCondition({ condition: 'smoking', name: null })).toBe(false);
      expect(isSmokingCondition({ condition: 'SMOKING', name: null })).toBe(false);
    });

    // Property-based tests
    it('should return true for any SMOKING_CONDITIONS value in condition field', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SMOKING_CONDITIONS),
          (smokingCondition) => {
            return isSmokingCondition({ condition: smokingCondition, name: null }) === true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return true for any SMOKING_CONDITIONS value in name field', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SMOKING_CONDITIONS),
          (smokingName) => {
            return isSmokingCondition({ condition: 'Other', name: smokingName }) === true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return false for random non-smoking strings', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s =>
            !SMOKING_CONDITIONS.includes(s as any)
          ),
          (randomCondition) => {
            return isSmokingCondition({ condition: randomCondition, name: null }) === false;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ===========================================================================
  // Unit Tests - sortHealthConditions helper
  // ===========================================================================

  describe('sortHealthConditions helper', () => {
    it('should sort smoking conditions to the top', () => {
      const conditions: HealthCondition[] = [
        { id: 1, condition: 'Diabetes', name: 'Type 2', status: 'Active', date_of_diagnosis: null, medication: null, date_recorded: null, notes: null, created_at: '' },
        { id: 2, condition: 'Smoking', name: 'Current Smoker', status: 'Active', date_of_diagnosis: null, medication: null, date_recorded: null, notes: null, created_at: '' },
        { id: 3, condition: 'Heart Disease', name: null, status: 'Active', date_of_diagnosis: null, medication: null, date_recorded: null, notes: null, created_at: '' },
      ];

      const sorted = sortHealthConditions(conditions);
      expect(sorted[0].condition).toBe('Smoking');
    });

    it('should preserve order of non-smoking conditions', () => {
      const conditions: HealthCondition[] = [
        { id: 1, condition: 'Diabetes', name: 'Type 2', status: 'Active', date_of_diagnosis: null, medication: null, date_recorded: null, notes: null, created_at: '' },
        { id: 2, condition: 'Heart Disease', name: null, status: 'Active', date_of_diagnosis: null, medication: null, date_recorded: null, notes: null, created_at: '' },
      ];

      const sorted = sortHealthConditions(conditions);
      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
    });

    it('should handle empty array', () => {
      expect(sortHealthConditions([])).toEqual([]);
    });

    // Property-based test
    it('should always place smoking conditions before non-smoking', () => {
      fc.assert(
        fc.property(
          fc.array(healthConditionArbitrary, { minLength: 2, maxLength: 20 }),
          (conditions) => {
            const sorted = sortHealthConditions(conditions);
            let foundNonSmoking = false;

            for (const condition of sorted) {
              if (!isSmokingCondition(condition)) {
                foundNonSmoking = true;
              } else if (foundNonSmoking) {
                // Found smoking condition after non-smoking - invalid!
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not change array length', () => {
      fc.assert(
        fc.property(
          fc.array(healthConditionArbitrary, { maxLength: 50 }),
          (conditions) => {
            const sorted = sortHealthConditions(conditions);
            return sorted.length === conditions.length;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ===========================================================================
  // Unit Tests - Form Validation
  // ===========================================================================

  describe('validateHealthForm', () => {
    it('should return error for empty condition', () => {
      const form: HealthConditionFormData = {
        condition: '',
        status: 'Active',
      };
      const errors = validateHealthForm(form);
      expect(errors.condition).toBe('Condition is required');
    });

    it('should return error for whitespace-only condition', () => {
      const form: HealthConditionFormData = {
        condition: '   ',
        status: 'Active',
      };
      const errors = validateHealthForm(form);
      expect(errors.condition).toBe('Condition is required');
    });

    it('should return no errors for valid form', () => {
      const form: HealthConditionFormData = {
        condition: 'Smoking',
        status: 'Active',
      };
      const errors = validateHealthForm(form);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    // Property-based test
    it('should always validate non-empty condition as valid', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          healthStatusArbitrary,
          (condition, status) => {
            const form: HealthConditionFormData = { condition, status };
            const errors = validateHealthForm(form);
            return !errors.condition;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('validateVulnerabilityForm', () => {
    it('should return error for empty description', () => {
      const form: VulnerabilityFormData = {
        description: '',
        diagnosed: false,
        status: 'Active',
      };
      const errors = validateVulnerabilityForm(form);
      expect(errors.description).toBe('Description is required');
    });

    it('should return no errors for valid form', () => {
      const form: VulnerabilityFormData = {
        description: 'Hearing impairment',
        diagnosed: true,
        status: 'Active',
      };
      const errors = validateVulnerabilityForm(form);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    // Property-based test
    it('should always validate non-empty description as valid', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
          fc.boolean(),
          vulnStatusArbitrary,
          (description, diagnosed, status) => {
            const form: VulnerabilityFormData = { description, diagnosed, status };
            const errors = validateVulnerabilityForm(form);
            return !errors.description;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ===========================================================================
  // Edge Case Tests
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle unicode characters in condition names', () => {
      const condition: HealthCondition = {
        id: 1,
        product_owner_id: 1,
        condition: 'Condición médica',
        name: '糖尿病',
        date_of_diagnosis: null,
        status: 'Active',
        medication: null,
        date_recorded: null,
        notes: 'Notes with émojis 🏥',
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(condition.condition).toBe('Condición médica');
      expect(condition.name).toBe('糖尿病');
    });

    it('should handle very long strings within limits', () => {
      const longString = 'A'.repeat(255);
      const condition: HealthCondition = {
        id: 1,
        product_owner_id: 1,
        condition: longString,
        name: longString,
        date_of_diagnosis: null,
        status: 'Active',
        medication: null,
        date_recorded: null,
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(condition.condition.length).toBe(255);
    });

    it('should handle special characters in text fields', () => {
      const condition: HealthCondition = {
        id: 1,
        product_owner_id: 1,
        condition: "Patient's \"Condition\" & <Notes>",
        name: null,
        date_of_diagnosis: null,
        status: 'Active',
        medication: null,
        date_recorded: null,
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
      };

      expect(condition.condition).toContain("'");
      expect(condition.condition).toContain('"');
      expect(condition.condition).toContain('&');
      expect(condition.condition).toContain('<');
    });

    it('should handle boundary values for counts', () => {
      const person: PersonWithCounts = {
        id: 1,
        name: 'Test',
        relationship: 'Primary Owner',
        personType: 'product_owner',
        status: 'Active',
        activeCount: 0,
        inactiveCount: 0,
      };

      expect(person.activeCount).toBe(0);
      expect(person.inactiveCount).toBe(0);

      const personMax: PersonWithCounts = {
        ...person,
        activeCount: Number.MAX_SAFE_INTEGER,
        inactiveCount: Number.MAX_SAFE_INTEGER,
      };

      expect(personMax.activeCount).toBe(Number.MAX_SAFE_INTEGER);
    });
  });
});
```

---

## GREEN Phase - Implement Types

**Agent**: `coder-agent`

**Instructions**: Use the coder-agent to implement the TypeScript types to pass all tests.

**File**: `frontend/src/types/healthVulnerability.ts`

```typescript
/**
 * @fileoverview Health and Vulnerability Type Definitions
 * @description Types and constants for managing health conditions and vulnerabilities
 * in Kingston's Portal Phase 2.
 * @module types/healthVulnerability
 */

// =============================================================================
// Constants
// =============================================================================

/**
 * Available condition types for health records
 * @constant {readonly string[]}
 */
export const CONDITION_TYPES = [
  'Smoking',
  'Heart Disease',
  'Diabetes',
  'Cancer',
  'Mental Health',
  'Respiratory',
  'Neurological',
  'Other',
] as const;

/** @typedef {typeof CONDITION_TYPES[number]} ConditionType */
export type ConditionType = typeof CONDITION_TYPES[number];

/**
 * Smoking-related conditions that should appear at top of health tables
 * Used for sorting health records with smoking conditions first
 * @constant {readonly string[]}
 */
export const SMOKING_CONDITIONS = [
  'Smoking',
  'Current Smoker',
  'Former Smoker',
  'Non-Smoker',
] as const;

/**
 * Available status options for health records
 * @constant {readonly string[]}
 */
export const HEALTH_STATUS_OPTIONS = [
  'Active',
  'Resolved',
  'Monitoring',
  'Inactive',
] as const;

/** @typedef {typeof HEALTH_STATUS_OPTIONS[number]} HealthStatus */
export type HealthStatus = typeof HEALTH_STATUS_OPTIONS[number];

/**
 * Available status options for vulnerability records
 * @constant {readonly string[]}
 */
export const VULNERABILITY_STATUS_OPTIONS = [
  'Active',
  'Resolved',
  'Inactive',
] as const;

/** @typedef {typeof VULNERABILITY_STATUS_OPTIONS[number]} VulnerabilityStatus */
export type VulnerabilityStatus = typeof VULNERABILITY_STATUS_OPTIONS[number];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a health condition is smoking-related
 * Used to sort smoking conditions to the top of health tables
 *
 * @param {Object} condition - The condition to check
 * @param {string} condition.condition - The condition type
 * @param {string|null} condition.name - The specific condition name
 * @returns {boolean} True if the condition is smoking-related
 *
 * @example
 * isSmokingCondition({ condition: 'Smoking', name: 'Current Smoker' }); // true
 * isSmokingCondition({ condition: 'Diabetes', name: 'Type 2' }); // false
 */
export const isSmokingCondition = (condition: { condition: string; name: string | null }): boolean => {
  const smokingSet = new Set(SMOKING_CONDITIONS as readonly string[]);
  return smokingSet.has(condition.condition) || smokingSet.has(condition.name || '');
};

/**
 * Sorts health conditions with smoking-related conditions at the top
 * Preserves relative order of non-smoking conditions (stable sort)
 *
 * @param {HealthCondition[]} conditions - Array of health conditions to sort
 * @returns {HealthCondition[]} New sorted array with smoking conditions first
 *
 * @example
 * const sorted = sortHealthConditions(conditions);
 * // Smoking conditions appear before other conditions
 */
export const sortHealthConditions = (conditions: HealthCondition[]): HealthCondition[] => {
  return [...conditions].sort((a, b) => {
    const aIsSmoking = isSmokingCondition(a);
    const bIsSmoking = isSmokingCondition(b);

    if (aIsSmoking && !bIsSmoking) return -1;
    if (!aIsSmoking && bIsSmoking) return 1;
    return 0; // Preserve original order for same category
  });
};

/**
 * Validation errors object for form validation
 */
export type ValidationErrors = Record<string, string>;

/**
 * Validates a health condition form
 * Returns an object with field names as keys and error messages as values
 *
 * @param {HealthConditionFormData} form - The form data to validate
 * @returns {ValidationErrors} Object with validation errors (empty if valid)
 *
 * @example
 * const errors = validateHealthForm({ condition: '', status: 'Active' });
 * // { condition: 'Condition is required' }
 */
export const validateHealthForm = (form: HealthConditionFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!form.condition || !form.condition.trim()) {
    errors.condition = 'Condition is required';
  }

  return errors;
};

/**
 * Validates a vulnerability form
 * Returns an object with field names as keys and error messages as values
 *
 * @param {VulnerabilityFormData} form - The form data to validate
 * @returns {ValidationErrors} Object with validation errors (empty if valid)
 *
 * @example
 * const errors = validateVulnerabilityForm({ description: '', diagnosed: false, status: 'Active' });
 * // { description: 'Description is required' }
 */
export const validateVulnerabilityForm = (form: VulnerabilityFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!form.description || !form.description.trim()) {
    errors.description = 'Description is required';
  }

  return errors;
};

// =============================================================================
// Health Types
// =============================================================================

/**
 * Health condition record for a product owner or special relationship
 * @interface HealthCondition
 * @property {number} id - Unique identifier
 * @property {number} [product_owner_id] - FK to product_owners table (mutually exclusive with special_relationship_id)
 * @property {number} [special_relationship_id] - FK to special_relationships table
 * @property {string} condition - Condition type (e.g., "Smoking", "Diabetes", "Heart Disease")
 * @property {string|null} name - Specific condition name (e.g., "Current Smoker", "Type 2")
 * @property {string|null} date_of_diagnosis - ISO date string of diagnosis
 * @property {HealthStatus} status - Current status (Active, Resolved, Monitoring, Inactive)
 * @property {string|null} medication - Current medication and dosage
 * @property {string|null} date_recorded - ISO timestamp when record was created
 * @property {string|null} notes - Additional notes
 * @property {string} created_at - ISO timestamp of record creation
 */
export interface HealthCondition {
  id: number;
  product_owner_id?: number;
  special_relationship_id?: number;
  condition: string;
  name: string | null;
  date_of_diagnosis: string | null;
  status: HealthStatus;
  medication: string | null;
  date_recorded: string | null;
  notes: string | null;
  created_at: string;
}

/**
 * Form data for creating or editing a health condition
 * @interface HealthConditionFormData
 * @property {string} condition - Required condition type
 * @property {string} [name] - Optional specific condition name
 * @property {string} [date_of_diagnosis] - Optional diagnosis date
 * @property {HealthStatus} status - Current status
 * @property {string} [medication] - Optional medication info
 * @property {string} [notes] - Optional notes
 */
export interface HealthConditionFormData {
  condition: string;
  name?: string | null;
  date_of_diagnosis?: string | null;
  status: HealthStatus;
  medication?: string | null;
  notes?: string | null;
}

// =============================================================================
// Vulnerability Types
// =============================================================================

/**
 * Vulnerability record for a product owner or special relationship
 * @interface Vulnerability
 * @property {number} id - Unique identifier
 * @property {number} [product_owner_id] - FK to product_owners table
 * @property {number} [special_relationship_id] - FK to special_relationships table
 * @property {string} description - Description of the vulnerability
 * @property {string|null} adjustments - Required adjustments for this vulnerability
 * @property {boolean} diagnosed - Whether professionally diagnosed
 * @property {string|null} date_recorded - ISO timestamp when record was created
 * @property {VulnerabilityStatus} status - Current status (Active, Resolved, Inactive)
 * @property {string|null} notes - Additional notes
 * @property {string} created_at - ISO timestamp of record creation
 */
export interface Vulnerability {
  id: number;
  product_owner_id?: number;
  special_relationship_id?: number;
  description: string;
  adjustments: string | null;
  diagnosed: boolean;
  date_recorded: string | null;
  status: VulnerabilityStatus;
  notes: string | null;
  created_at: string;
}

/**
 * Form data for creating or editing a vulnerability
 * @interface VulnerabilityFormData
 * @property {string} description - Required vulnerability description
 * @property {string} [adjustments] - Optional required adjustments
 * @property {boolean} diagnosed - Whether professionally diagnosed
 * @property {VulnerabilityStatus} status - Current status
 * @property {string} [notes] - Optional notes
 */
export interface VulnerabilityFormData {
  description: string;
  adjustments?: string | null;
  diagnosed: boolean;
  status: VulnerabilityStatus;
  notes?: string | null;
}

// =============================================================================
// Person Types (for display in tables)
// =============================================================================

/**
 * Type identifier for distinguishing product owners from special relationships
 * @typedef {'product_owner' | 'special_relationship'} PersonType
 */
export type PersonType = 'product_owner' | 'special_relationship';

/**
 * Person record with active/inactive health or vulnerability counts
 * Used in the main PersonTable to display all people with their record counts
 *
 * @interface PersonWithCounts
 * @property {number} id - Unique identifier
 * @property {string} name - Full name of the person
 * @property {string} relationship - Relationship type (e.g., "Primary Owner", "Spouse", "Child")
 * @property {PersonType} personType - Whether this is a product owner or special relationship
 * @property {string} status - Current status of the person
 * @property {number} activeCount - Count of active health/vulnerability records
 * @property {number} inactiveCount - Count of inactive/resolved health/vulnerability records
 */
export interface PersonWithCounts {
  id: number;
  name: string;
  relationship: string;
  personType: PersonType;
  status: string;
  activeCount: number;
  inactiveCount: number;
}
```

---

## BLUE Phase - Refactor

**Instructions**: Refactor and optimize the implementation

- [ ] Add comprehensive JSDoc comments for all types
- [ ] Export types from `frontend/src/types/index.ts`
- [ ] Ensure alignment with backend Pydantic models
- [ ] Add type guards if needed

---

## Acceptance Criteria

- [ ] All 40+ tests pass (unit, property-based, edge cases)
- [ ] Types match database schema
- [ ] SMOKING_CONDITIONS includes all smoking-related values and is immutable
- [ ] isSmokingCondition helper works correctly with property-based validation
- [ ] sortHealthConditions sorts smoking to top (property: no smoking after non-smoking)
- [ ] validateHealthForm and validateVulnerabilityForm validate required fields
- [ ] PersonWithCounts includes activeCount and inactiveCount with non-negative values
- [ ] Types exported from index
- [ ] Property tests verify type invariants with random data (fast-check)
- [ ] Edge cases handled: unicode, special chars, boundary values, null/undefined
