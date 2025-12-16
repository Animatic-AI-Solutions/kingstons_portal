/**
 * Utility Function Tests for Special Relationships
 * Cycle 1: Red Phase - Tests should FAIL (no implementation exists)
 *
 * Tests utility functions for the Special Relationships feature
 */

import {
  calculateAge,
  sortRelationships,
  filterRelationshipsByType,
  getRelationshipCategory,
  formatRelationshipName
} from '@/utils/specialRelationshipUtils';
import type { SpecialRelationship } from '@/types/specialRelationship';

describe('Special Relationship Utilities', () => {
  describe('calculateAge', () => {
    it('should calculate correct age from date of birth string', () => {
      // Test with a known date - assuming current date is 2025-12-16
      const dateOfBirth = '1980-12-16'; // Exactly 45 years old
      const age = calculateAge(dateOfBirth);
      expect(age).toBe(45);
    });

    it('should calculate age for someone born earlier in the year', () => {
      const dateOfBirth = '1990-01-15'; // Born in January
      const age = calculateAge(dateOfBirth);
      expect(age).toBeGreaterThanOrEqual(35);
      expect(typeof age).toBe('number');
    });

    it('should calculate age for someone born later in the year', () => {
      const dateOfBirth = '1995-11-20'; // Born in November
      const age = calculateAge(dateOfBirth);
      expect(age).toBeGreaterThanOrEqual(29);
      expect(typeof age).toBe('number');
    });

    it('should handle birthday not yet occurred this year', () => {
      const dateOfBirth = '2000-12-25'; // Birthday in late December
      const age = calculateAge(dateOfBirth);
      expect(age).toBeGreaterThanOrEqual(24);
      expect(age).toBeLessThanOrEqual(25);
    });

    it('should return undefined for null date of birth', () => {
      const age = calculateAge(null);
      expect(age).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const age = calculateAge('');
      expect(age).toBeUndefined();
    });

    it('should return undefined for invalid date format', () => {
      const age = calculateAge('invalid-date');
      expect(age).toBeUndefined();
    });

    it('should handle ISO 8601 datetime format', () => {
      const dateOfBirth = '1985-06-15T00:00:00Z';
      const age = calculateAge(dateOfBirth);
      expect(age).toBeGreaterThanOrEqual(40);
      expect(typeof age).toBe('number');
    });
  });

  describe('sortRelationships', () => {
    const mockRelationships: SpecialRelationship[] = [
      {
        id: 1,
        name: 'Alice Smith',
        type: 'Personal',
        relationship: 'Spouse',
        status: 'Deceased',
        date_of_birth: null,
        dependency: false,
        email: null,
        phone_number: null,
        address_id: null,
        notes: null,
        firm_name: null,
        product_owner_ids: [1],
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      },
      {
        id: 2,
        name: 'Bob Smith',
        type: 'Personal',
        relationship: 'Child',
        status: 'Active',
        date_of_birth: null,
        dependency: false,
        email: null,
        phone_number: null,
        address_id: null,
        notes: null,
        firm_name: null,
        product_owner_ids: [1],
        created_at: '2025-01-02T10:00:00Z',
        updated_at: '2025-01-02T10:00:00Z'
      },
      {
        id: 3,
        name: 'Charlie Smith',
        type: 'Personal',
        relationship: 'Sibling',
        status: 'Inactive',
        date_of_birth: null,
        dependency: false,
        email: null,
        phone_number: null,
        address_id: null,
        notes: null,
        firm_name: null,
        product_owner_ids: [1],
        created_at: '2025-01-03T10:00:00Z',
        updated_at: '2025-01-03T10:00:00Z'
      }
    ];

    it('should sort by status with Active > Inactive > Deceased priority', () => {
      const sorted = sortRelationships(mockRelationships, 'status', 'asc');

      expect(sorted[0].status).toBe('Active');
      expect(sorted[1].status).toBe('Inactive');
      expect(sorted[2].status).toBe('Deceased');
    });

    it('should sort by name alphabetically in ascending order', () => {
      const sorted = sortRelationships(mockRelationships, 'name', 'asc');

      expect(sorted[0].name).toBe('Alice Smith');
      expect(sorted[1].name).toBe('Bob Smith');
      expect(sorted[2].name).toBe('Charlie Smith');
    });

    it('should sort by name alphabetically in descending order', () => {
      const sorted = sortRelationships(mockRelationships, 'name', 'desc');

      expect(sorted[0].name).toBe('Charlie Smith');
      expect(sorted[1].name).toBe('Bob Smith');
      expect(sorted[2].name).toBe('Alice Smith');
    });

    it('should sort by relationship alphabetically', () => {
      const sorted = sortRelationships(mockRelationships, 'relationship', 'asc');

      // Child < Sibling < Spouse alphabetically
      expect(sorted[0].relationship).toBe('Child');
      expect(sorted[1].relationship).toBe('Sibling');
      expect(sorted[2].relationship).toBe('Spouse');
    });

    it('should maintain status priority within same-name sorting', () => {
      const sameName: SpecialRelationship[] = [
        { ...mockRelationships[0], name: 'John', status: 'Deceased' },
        { ...mockRelationships[1], name: 'John', status: 'Active' },
        { ...mockRelationships[2], name: 'John', status: 'Inactive' }
      ];

      const sorted = sortRelationships(sameName, 'name', 'asc');

      // When names are same, should maintain status priority
      expect(sorted[0].status).toBe('Active');
      expect(sorted[1].status).toBe('Inactive');
      expect(sorted[2].status).toBe('Deceased');
    });

    it('should handle empty array gracefully', () => {
      const sorted = sortRelationships([], 'name', 'asc');
      expect(sorted).toEqual([]);
    });
  });

  describe('filterRelationshipsByType', () => {
    const mockRelationships: SpecialRelationship[] = [
      {
        id: 1,
        name: 'Personal1 Smith',
        type: 'Personal',
        relationship: 'Spouse',
        status: 'Active',
        date_of_birth: null,
        dependency: false,
        email: null,
        phone_number: null,
        address_id: null,
        notes: null,
        firm_name: null,
        product_owner_ids: [1],
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      },
      {
        id: 2,
        name: 'Professional1 Jones',
        type: 'Professional',
        relationship: 'Solicitor',
        status: 'Active',
        date_of_birth: null,
        dependency: false,
        email: null,
        phone_number: null,
        address_id: null,
        notes: null,
        firm_name: 'Law Firm',
        product_owner_ids: [1],
        created_at: '2025-01-02T10:00:00Z',
        updated_at: '2025-01-02T10:00:00Z'
      },
      {
        id: 3,
        name: 'Personal2 Smith',
        type: 'Personal',
        relationship: 'Child',
        status: 'Active',
        date_of_birth: null,
        dependency: false,
        email: null,
        phone_number: null,
        address_id: null,
        notes: null,
        firm_name: null,
        product_owner_ids: [1],
        created_at: '2025-01-03T10:00:00Z',
        updated_at: '2025-01-03T10:00:00Z'
      },
      {
        id: 4,
        name: 'Professional2 Brown',
        type: 'Professional',
        relationship: 'Accountant',
        status: 'Active',
        date_of_birth: null,
        dependency: false,
        email: null,
        phone_number: null,
        address_id: null,
        notes: null,
        firm_name: 'Accounting Co',
        product_owner_ids: [1],
        created_at: '2025-01-04T10:00:00Z',
        updated_at: '2025-01-04T10:00:00Z'
      }
    ];

    it('should filter personal relationships only', () => {
      const filtered = filterRelationshipsByType(mockRelationships, 'Personal');

      expect(filtered).toHaveLength(2);
      expect(filtered[0].relationship).toBe('Spouse');
      expect(filtered[1].relationship).toBe('Child');
    });

    it('should filter professional relationships only', () => {
      const filtered = filterRelationshipsByType(mockRelationships, 'Professional');

      expect(filtered).toHaveLength(2);
      expect(filtered[0].relationship).toBe('Solicitor');
      expect(filtered[1].relationship).toBe('Accountant');
    });

    it('should handle empty array gracefully', () => {
      const filtered = filterRelationshipsByType([], 'Personal');
      expect(filtered).toEqual([]);
    });

    it('should recognize all personal types', () => {
      const personalTypes: SpecialRelationship[] = [
        { ...mockRelationships[0], relationship: 'Partner' },
        { ...mockRelationships[0], relationship: 'Parent' },
        { ...mockRelationships[0], relationship: 'Sibling' },
        { ...mockRelationships[0], relationship: 'Grandchild' },
        { ...mockRelationships[0], relationship: 'Grandparent' },
        { ...mockRelationships[0], relationship: 'Other Family' }
      ];

      const filtered = filterRelationshipsByType(personalTypes, 'Personal');
      expect(filtered).toHaveLength(6);
    });

    it('should recognize all professional types', () => {
      const professionalTypes: SpecialRelationship[] = [
        { ...mockRelationships[1], relationship: 'Doctor' },
        { ...mockRelationships[1], relationship: 'Financial Advisor' },
        { ...mockRelationships[1], relationship: 'Estate Planner' },
        { ...mockRelationships[1], relationship: 'Other Professional' },
        { ...mockRelationships[1], relationship: 'Guardian' },
        { ...mockRelationships[1], relationship: 'Power of Attorney' }
      ];

      const filtered = filterRelationshipsByType(professionalTypes, 'Professional');
      expect(filtered).toHaveLength(6);
    });
  });

  describe('getRelationshipCategory', () => {
    it('should return "Personal" for personal relationship types', () => {
      expect(getRelationshipCategory('Spouse')).toBe('Personal');
      expect(getRelationshipCategory('Partner')).toBe('Personal');
      expect(getRelationshipCategory('Child')).toBe('Personal');
      expect(getRelationshipCategory('Parent')).toBe('Personal');
      expect(getRelationshipCategory('Sibling')).toBe('Personal');
      expect(getRelationshipCategory('Grandchild')).toBe('Personal');
      expect(getRelationshipCategory('Grandparent')).toBe('Personal');
      expect(getRelationshipCategory('Other Family')).toBe('Personal');
    });

    it('should return "Professional" for professional relationship types', () => {
      expect(getRelationshipCategory('Accountant')).toBe('Professional');
      expect(getRelationshipCategory('Solicitor')).toBe('Professional');
      expect(getRelationshipCategory('Doctor')).toBe('Professional');
      expect(getRelationshipCategory('Financial Advisor')).toBe('Professional');
      expect(getRelationshipCategory('Estate Planner')).toBe('Professional');
      expect(getRelationshipCategory('Other Professional')).toBe('Professional');
      expect(getRelationshipCategory('Guardian')).toBe('Professional');
      expect(getRelationshipCategory('Power of Attorney')).toBe('Professional');
    });
  });

  describe('formatRelationshipName', () => {
    it('should format name correctly', () => {
      const relationship: SpecialRelationship = {
        id: 1,
        name: 'John Doe',
        type: 'Personal',
        relationship: 'Spouse',
        status: 'Active',
        date_of_birth: null,
        dependency: false,
        email: null,
        phone_number: null,
        address_id: null,
        notes: null,
        firm_name: null,
        product_owner_ids: [1],
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      expect(formatRelationshipName(relationship)).toBe('John Doe');
    });

    it('should handle name with title', () => {
      const relationship: SpecialRelationship = {
        id: 1,
        name: 'Dr Jane Smith',
        type: 'Professional',
        relationship: 'Doctor',
        status: 'Active',
        date_of_birth: null,
        dependency: false,
        email: null,
        phone_number: null,
        address_id: null,
        notes: null,
        firm_name: null,
        product_owner_ids: [1],
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      expect(formatRelationshipName(relationship)).toBe('Dr Jane Smith');
    });

    it('should handle empty name', () => {
      const relationship: SpecialRelationship = {
        id: 1,
        name: '',
        type: 'Personal',
        relationship: 'Other Family',
        status: 'Active',
        date_of_birth: null,
        dependency: false,
        email: null,
        phone_number: null,
        address_id: null,
        notes: null,
        firm_name: null,
        product_owner_ids: [1],
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      expect(formatRelationshipName(relationship)).toBe('');
    });
  });
});
