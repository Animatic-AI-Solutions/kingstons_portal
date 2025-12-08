/**
 * Tests for sortProductOwners utility function
 *
 * RED Phase (Iteration 3): All tests should FAIL until implementation is complete
 *
 * Critical Business Rule:
 * Inactive rows (lapsed/deceased) MUST ALWAYS be positioned at the bottom
 * of the table, regardless of the sort column or direction.
 * Only active rows participate in sorting.
 */

import { sortProductOwners } from '@/utils/sortProductOwners';
import {
  createActiveProductOwner,
  createLapsedProductOwner,
  createDeceasedProductOwner,
  type ProductOwner,
} from '../factories/productOwnerFactory';

/**
 * Sort Configuration Interface
 * Defines column and direction for sorting operations
 */
export interface SortConfig {
  column: 'name' | 'relationship' | 'age' | 'dob' | 'email' | 'status';
  direction: 'asc' | 'desc';
}

/**
 * Calculate age from date of birth
 * Helper function for test expectations
 */
function calculateAge(dob: string | null): number | null {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

describe('sortProductOwners', () => {
  // ========================================
  // NAME SORTING TESTS
  // ========================================
  describe('Name Sorting', () => {
    it('sorts by name alphabetically ascending', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ firstname: 'Charlie', surname: 'Brown' }),
        createActiveProductOwner({ firstname: 'Alice', surname: 'Anderson' }),
        createActiveProductOwner({ firstname: 'Bob', surname: 'Baker' }),
      ];

      const sortConfig: SortConfig = { column: 'name', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      expect(sorted[0].firstname).toBe('Alice');
      expect(sorted[1].firstname).toBe('Bob');
      expect(sorted[2].firstname).toBe('Charlie');
    });

    it('sorts by name alphabetically descending', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ firstname: 'Alice', surname: 'Anderson' }),
        createActiveProductOwner({ firstname: 'Charlie', surname: 'Brown' }),
        createActiveProductOwner({ firstname: 'Bob', surname: 'Baker' }),
      ];

      const sortConfig: SortConfig = { column: 'name', direction: 'desc' };
      const sorted = sortProductOwners(owners, sortConfig);

      expect(sorted[0].firstname).toBe('Charlie');
      expect(sorted[1].firstname).toBe('Bob');
      expect(sorted[2].firstname).toBe('Alice');
    });

    it('sorts by surname when firstnames are identical', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ firstname: 'John', surname: 'Smith' }),
        createActiveProductOwner({ firstname: 'John', surname: 'Anderson' }),
        createActiveProductOwner({ firstname: 'John', surname: 'Baker' }),
      ];

      const sortConfig: SortConfig = { column: 'name', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      expect(sorted[0].surname).toBe('Anderson');
      expect(sorted[1].surname).toBe('Baker');
      expect(sorted[2].surname).toBe('Smith');
    });
  });

  // ========================================
  // RELATIONSHIP SORTING TESTS
  // ========================================
  describe('Relationship Sorting', () => {
    it('sorts by relationship status alphabetically ascending', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ relationship_status: 'Widowed' }),
        createActiveProductOwner({ relationship_status: 'Divorced' }),
        createActiveProductOwner({ relationship_status: 'Married' }),
        createActiveProductOwner({ relationship_status: 'Single' }),
      ];

      const sortConfig: SortConfig = { column: 'relationship', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      expect(sorted[0].relationship_status).toBe('Divorced');
      expect(sorted[1].relationship_status).toBe('Married');
      expect(sorted[2].relationship_status).toBe('Single');
      expect(sorted[3].relationship_status).toBe('Widowed');
    });

    it('sorts by relationship status alphabetically descending', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ relationship_status: 'Divorced' }),
        createActiveProductOwner({ relationship_status: 'Widowed' }),
        createActiveProductOwner({ relationship_status: 'Single' }),
      ];

      const sortConfig: SortConfig = { column: 'relationship', direction: 'desc' };
      const sorted = sortProductOwners(owners, sortConfig);

      expect(sorted[0].relationship_status).toBe('Widowed');
      expect(sorted[1].relationship_status).toBe('Single');
      expect(sorted[2].relationship_status).toBe('Divorced');
    });
  });

  // ========================================
  // AGE SORTING TESTS
  // ========================================
  describe('Age Sorting', () => {
    it('sorts by age numerically ascending (youngest first)', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ dob: '1950-06-15' }), // ~74 years old
        createActiveProductOwner({ dob: '1990-03-20' }), // ~34 years old
        createActiveProductOwner({ dob: '1970-11-10' }), // ~54 years old
      ];

      const sortConfig: SortConfig = { column: 'age', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      // Youngest to oldest
      expect(sorted[0].dob).toBe('1990-03-20');
      expect(sorted[1].dob).toBe('1970-11-10');
      expect(sorted[2].dob).toBe('1950-06-15');
    });

    it('sorts by age numerically descending (oldest first)', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ dob: '1990-03-20' }), // ~34 years old
        createActiveProductOwner({ dob: '1950-06-15' }), // ~74 years old
        createActiveProductOwner({ dob: '1970-11-10' }), // ~54 years old
      ];

      const sortConfig: SortConfig = { column: 'age', direction: 'desc' };
      const sorted = sortProductOwners(owners, sortConfig);

      // Oldest to youngest
      expect(sorted[0].dob).toBe('1950-06-15');
      expect(sorted[1].dob).toBe('1970-11-10');
      expect(sorted[2].dob).toBe('1990-03-20');
    });
  });

  // ========================================
  // DATE OF BIRTH SORTING TESTS
  // ========================================
  describe('Date of Birth Sorting', () => {
    it('sorts by date chronologically ascending (oldest first)', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ dob: '1990-05-15' }),
        createActiveProductOwner({ dob: '1950-01-20' }),
        createActiveProductOwner({ dob: '1970-12-31' }),
      ];

      const sortConfig: SortConfig = { column: 'dob', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      expect(sorted[0].dob).toBe('1950-01-20');
      expect(sorted[1].dob).toBe('1970-12-31');
      expect(sorted[2].dob).toBe('1990-05-15');
    });

    it('sorts by date chronologically descending (newest first)', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ dob: '1950-01-20' }),
        createActiveProductOwner({ dob: '1990-05-15' }),
        createActiveProductOwner({ dob: '1970-12-31' }),
      ];

      const sortConfig: SortConfig = { column: 'dob', direction: 'desc' };
      const sorted = sortProductOwners(owners, sortConfig);

      expect(sorted[0].dob).toBe('1990-05-15');
      expect(sorted[1].dob).toBe('1970-12-31');
      expect(sorted[2].dob).toBe('1950-01-20');
    });
  });

  // ========================================
  // EMAIL SORTING TESTS
  // ========================================
  describe('Email Sorting', () => {
    it('sorts by email alphabetically ascending', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ email_1: 'charlie@example.com' }),
        createActiveProductOwner({ email_1: 'alice@example.com' }),
        createActiveProductOwner({ email_1: 'bob@example.com' }),
      ];

      const sortConfig: SortConfig = { column: 'email', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      expect(sorted[0].email_1).toBe('alice@example.com');
      expect(sorted[1].email_1).toBe('bob@example.com');
      expect(sorted[2].email_1).toBe('charlie@example.com');
    });

    it('sorts by email alphabetically descending', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ email_1: 'alice@example.com' }),
        createActiveProductOwner({ email_1: 'charlie@example.com' }),
        createActiveProductOwner({ email_1: 'bob@example.com' }),
      ];

      const sortConfig: SortConfig = { column: 'email', direction: 'desc' };
      const sorted = sortProductOwners(owners, sortConfig);

      expect(sorted[0].email_1).toBe('charlie@example.com');
      expect(sorted[1].email_1).toBe('bob@example.com');
      expect(sorted[2].email_1).toBe('alice@example.com');
    });
  });

  // ========================================
  // STATUS SORTING TESTS
  // ========================================
  describe('Status Sorting', () => {
    it('sorts by status (active → lapsed → deceased)', () => {
      const owners: ProductOwner[] = [
        createDeceasedProductOwner({ firstname: 'David' }),
        createActiveProductOwner({ firstname: 'Alice' }),
        createLapsedProductOwner({ firstname: 'Bob' }),
        createActiveProductOwner({ firstname: 'Carol' }),
      ];

      const sortConfig: SortConfig = { column: 'status', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      expect(sorted[0].status).toBe('active');
      expect(sorted[1].status).toBe('active');
      expect(sorted[2].status).toBe('lapsed');
      expect(sorted[3].status).toBe('deceased');
    });

    it('sorts by status descending (deceased → lapsed → active)', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ firstname: 'Alice' }),
        createDeceasedProductOwner({ firstname: 'David' }),
        createLapsedProductOwner({ firstname: 'Bob' }),
      ];

      const sortConfig: SortConfig = { column: 'status', direction: 'desc' };
      const sorted = sortProductOwners(owners, sortConfig);

      expect(sorted[0].status).toBe('deceased');
      expect(sorted[1].status).toBe('lapsed');
      expect(sorted[2].status).toBe('active');
    });
  });

  // ========================================
  // CRITICAL: INACTIVE ROWS ALWAYS AT BOTTOM
  // ========================================
  describe('Inactive Rows Always Sort to Bottom (CRITICAL BUSINESS RULE)', () => {
    it('inactive rows always sort to bottom regardless of sort configuration', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ firstname: 'Charlie', surname: 'Active' }),
        createDeceasedProductOwner({ firstname: 'Alice', surname: 'Deceased' }), // Should be at bottom
        createActiveProductOwner({ firstname: 'Bob', surname: 'Active' }),
        createLapsedProductOwner({ firstname: 'David', surname: 'Lapsed' }), // Should be at bottom
      ];

      const sortConfig: SortConfig = { column: 'name', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      // First 2 should be active, sorted alphabetically
      expect(sorted[0].status).toBe('active');
      expect(sorted[0].firstname).toBe('Bob');
      expect(sorted[1].status).toBe('active');
      expect(sorted[1].firstname).toBe('Charlie');

      // Last 2 should be inactive (order doesn't matter within inactive)
      expect(sorted[2].status).not.toBe('active');
      expect(sorted[3].status).not.toBe('active');
      expect(['lapsed', 'deceased']).toContain(sorted[2].status);
      expect(['lapsed', 'deceased']).toContain(sorted[3].status);
    });

    it('maintains active/inactive separation during name sort descending', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ firstname: 'Alice' }),
        createDeceasedProductOwner({ firstname: 'Zebra' }), // Alphabetically last but should be at bottom
        createActiveProductOwner({ firstname: 'Charlie' }),
        createLapsedProductOwner({ firstname: 'Bob' }), // Alphabetically second but should be at bottom
      ];

      const sortConfig: SortConfig = { column: 'name', direction: 'desc' };
      const sorted = sortProductOwners(owners, sortConfig);

      // First 2 should be active, sorted descending
      expect(sorted[0].status).toBe('active');
      expect(sorted[0].firstname).toBe('Charlie');
      expect(sorted[1].status).toBe('active');
      expect(sorted[1].firstname).toBe('Alice');

      // Last 2 should be inactive
      expect(sorted[2].status).not.toBe('active');
      expect(sorted[3].status).not.toBe('active');
    });

    it('maintains active/inactive separation during age sort', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ dob: '1990-01-01' }), // Youngest active
        createDeceasedProductOwner({ dob: '2000-01-01' }), // Youngest overall but should be at bottom
        createActiveProductOwner({ dob: '1950-01-01' }), // Oldest active
        createLapsedProductOwner({ dob: '1945-01-01' }), // Oldest overall but should be at bottom
      ];

      const sortConfig: SortConfig = { column: 'age', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      // First 2 should be active, sorted by age ascending (youngest first)
      expect(sorted[0].status).toBe('active');
      expect(sorted[0].dob).toBe('1990-01-01');
      expect(sorted[1].status).toBe('active');
      expect(sorted[1].dob).toBe('1950-01-01');

      // Last 2 should be inactive
      expect(sorted[2].status).not.toBe('active');
      expect(sorted[3].status).not.toBe('active');
    });

    it('maintains active/inactive separation during date sort', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ dob: '1970-06-15' }),
        createLapsedProductOwner({ dob: '1930-01-01' }), // Earliest date but should be at bottom
        createActiveProductOwner({ dob: '1960-12-20' }),
        createDeceasedProductOwner({ dob: '1995-08-10' }), // Latest date but should be at bottom
      ];

      const sortConfig: SortConfig = { column: 'dob', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      // First 2 should be active, sorted chronologically
      expect(sorted[0].status).toBe('active');
      expect(sorted[0].dob).toBe('1960-12-20');
      expect(sorted[1].status).toBe('active');
      expect(sorted[1].dob).toBe('1970-06-15');

      // Last 2 should be inactive
      expect(sorted[2].status).not.toBe('active');
      expect(sorted[3].status).not.toBe('active');
    });

    it('all active rows when no inactive rows exist', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ firstname: 'Charlie' }),
        createActiveProductOwner({ firstname: 'Alice' }),
        createActiveProductOwner({ firstname: 'Bob' }),
      ];

      const sortConfig: SortConfig = { column: 'name', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      // All should be active and sorted
      expect(sorted.every((owner) => owner.status === 'active')).toBe(true);
      expect(sorted[0].firstname).toBe('Alice');
      expect(sorted[1].firstname).toBe('Bob');
      expect(sorted[2].firstname).toBe('Charlie');
    });

    it('all inactive rows when no active rows exist', () => {
      const owners: ProductOwner[] = [
        createDeceasedProductOwner({ firstname: 'Charlie' }),
        createLapsedProductOwner({ firstname: 'Alice' }),
        createDeceasedProductOwner({ firstname: 'Bob' }),
      ];

      const sortConfig: SortConfig = { column: 'name', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      // All should be inactive (no sorting expected since all inactive)
      expect(sorted.every((owner) => owner.status !== 'active')).toBe(true);
    });
  });

  // ========================================
  // EDGE CASES
  // ========================================
  describe('Edge Cases', () => {
    it('handles null values in name sorting', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ firstname: 'Alice', surname: 'Anderson' }),
        createActiveProductOwner({ firstname: '', surname: 'Baker' }),
        createActiveProductOwner({ firstname: 'Charlie', surname: '' }),
      ];

      const sortConfig: SortConfig = { column: 'name', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      // Should not throw error and complete sort
      expect(sorted).toHaveLength(3);
      expect(sorted[0].firstname).toBe('');
      expect(sorted[2].firstname).toBe('Charlie');
    });

    it('handles null values in age sorting', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ dob: '1990-01-01' }),
        createActiveProductOwner({ dob: null }),
        createActiveProductOwner({ dob: '1970-01-01' }),
      ];

      const sortConfig: SortConfig = { column: 'age', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      // Should not throw error and complete sort
      expect(sorted).toHaveLength(3);
      // Null values should be pushed to end of active section
      expect(sorted[sorted.length - 1].dob).toBeNull();
    });

    it('handles null values in email sorting', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ email_1: 'charlie@example.com' }),
        createActiveProductOwner({ email_1: null }),
        createActiveProductOwner({ email_1: 'alice@example.com' }),
      ];

      const sortConfig: SortConfig = { column: 'email', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      // Should not throw error and complete sort
      expect(sorted).toHaveLength(3);
      // Non-null emails should be sorted
      expect(sorted[0].email_1).toBe('alice@example.com');
    });

    it('handles empty strings in sorting', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ email_1: '' }),
        createActiveProductOwner({ email_1: 'bob@example.com' }),
        createActiveProductOwner({ email_1: 'alice@example.com' }),
      ];

      const sortConfig: SortConfig = { column: 'email', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      // Should not throw error and complete sort
      expect(sorted).toHaveLength(3);
      // Empty strings should be treated consistently
      expect(sorted).toBeDefined();
    });

    it('returns to default order when sortConfig is null', () => {
      const owners: ProductOwner[] = [
        createActiveProductOwner({ id: 3, firstname: 'Charlie' }),
        createActiveProductOwner({ id: 1, firstname: 'Alice' }),
        createActiveProductOwner({ id: 2, firstname: 'Bob' }),
      ];

      const sorted = sortProductOwners(owners, null);

      // Should return original order (by ID)
      expect(sorted[0].id).toBe(3);
      expect(sorted[1].id).toBe(1);
      expect(sorted[2].id).toBe(2);
    });

    it('handles empty array', () => {
      const owners: ProductOwner[] = [];
      const sortConfig: SortConfig = { column: 'name', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      expect(sorted).toEqual([]);
    });

    it('handles single item array', () => {
      const owners: ProductOwner[] = [createActiveProductOwner({ firstname: 'Alice' })];
      const sortConfig: SortConfig = { column: 'name', direction: 'asc' };
      const sorted = sortProductOwners(owners, sortConfig);

      expect(sorted).toHaveLength(1);
      expect(sorted[0].firstname).toBe('Alice');
    });
  });
});
