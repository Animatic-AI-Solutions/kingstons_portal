# Cycle 5: Frontend TypeScript Types

**Goal**: Create TypeScript types and interfaces for health and vulnerabilities data

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for TypeScript types.

**File**: `frontend/src/tests/types/healthVulnerability.test.ts`

```typescript
import {
  HealthCondition,
  HealthConditionFormData,
  Vulnerability,
  VulnerabilityFormData,
  PersonWithCounts,
  CONDITION_TYPES,
  SMOKING_CONDITIONS,
  HEALTH_STATUS_OPTIONS,
  VULNERABILITY_STATUS_OPTIONS,
  isSmokingCondition,
} from '@/types/healthVulnerability';

describe('Health and Vulnerability Types', () => {
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
  });

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
  });

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
  });

  describe('SMOKING_CONDITIONS constant', () => {
    it('should contain smoking-related conditions', () => {
      expect(SMOKING_CONDITIONS).toContain('Smoking');
      expect(SMOKING_CONDITIONS).toContain('Current Smoker');
      expect(SMOKING_CONDITIONS).toContain('Former Smoker');
      expect(SMOKING_CONDITIONS).toContain('Non-Smoker');
    });
  });

  describe('isSmokingCondition helper', () => {
    it('should return true for smoking conditions', () => {
      expect(isSmokingCondition({ condition: 'Smoking', name: '' })).toBe(true);
      expect(isSmokingCondition({ condition: '', name: 'Current Smoker' })).toBe(true);
    });

    it('should return false for non-smoking conditions', () => {
      expect(isSmokingCondition({ condition: 'Diabetes', name: 'Type 2' })).toBe(false);
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

- [ ] All 10 type tests pass
- [ ] Types match database schema
- [ ] SMOKING_CONDITIONS includes all smoking-related values
- [ ] isSmokingCondition helper works correctly
- [ ] PersonWithCounts includes activeCount and inactiveCount
- [ ] Types exported from index
