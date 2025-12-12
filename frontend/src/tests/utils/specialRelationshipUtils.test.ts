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
      // Test with a known date - assuming current date is 2025-12-12
      const dateOfBirth = '1980-12-12'; // Exactly 45 years old
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
        id: '1',
        client_group_id: 'cg-1',
        relationship_type: 'Spouse',
        status: 'Deceased',
        first_name: 'Alice',
        last_name: 'Smith',
        title: null,
        date_of_birth: null,
        email: null,
        mobile_phone: null,
        home_phone: null,
        work_phone: null,
        address_line1: null,
        address_line2: null,
        city: null,
        county: null,
        postcode: null,
        country: null,
        notes: null,
        company_name: null,
        position: null,
        professional_id: null,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      },
      {
        id: '2',
        client_group_id: 'cg-1',
        relationship_type: 'Child',
        status: 'Active',
        first_name: 'Bob',
        last_name: 'Smith',
        title: null,
        date_of_birth: null,
        email: null,
        mobile_phone: null,
        home_phone: null,
        work_phone: null,
        address_line1: null,
        address_line2: null,
        city: null,
        county: null,
        postcode: null,
        country: null,
        notes: null,
        company_name: null,
        position: null,
        professional_id: null,
        created_at: '2025-01-02T10:00:00Z',
        updated_at: '2025-01-02T10:00:00Z'
      },
      {
        id: '3',
        client_group_id: 'cg-1',
        relationship_type: 'Sibling',
        status: 'Inactive',
        first_name: 'Charlie',
        last_name: 'Smith',
        title: null,
        date_of_birth: null,
        email: null,
        mobile_phone: null,
        home_phone: null,
        work_phone: null,
        address_line1: null,
        address_line2: null,
        city: null,
        county: null,
        postcode: null,
        country: null,
        notes: null,
        company_name: null,
        position: null,
        professional_id: null,
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

    it('should sort by first_name alphabetically in ascending order', () => {
      const sorted = sortRelationships(mockRelationships, 'first_name', 'asc');

      expect(sorted[0].first_name).toBe('Alice');
      expect(sorted[1].first_name).toBe('Bob');
      expect(sorted[2].first_name).toBe('Charlie');
    });

    it('should sort by first_name alphabetically in descending order', () => {
      const sorted = sortRelationships(mockRelationships, 'first_name', 'desc');

      expect(sorted[0].first_name).toBe('Charlie');
      expect(sorted[1].first_name).toBe('Bob');
      expect(sorted[2].first_name).toBe('Alice');
    });

    it('should sort by last_name alphabetically', () => {
      const mixed: SpecialRelationship[] = [
        { ...mockRelationships[0], last_name: 'Zulu' },
        { ...mockRelationships[1], last_name: 'Alpha' },
        { ...mockRelationships[2], last_name: 'Beta' }
      ];

      const sorted = sortRelationships(mixed, 'last_name', 'asc');

      expect(sorted[0].last_name).toBe('Alpha');
      expect(sorted[1].last_name).toBe('Beta');
      expect(sorted[2].last_name).toBe('Zulu');
    });

    it('should sort by relationship_type alphabetically', () => {
      const sorted = sortRelationships(mockRelationships, 'relationship_type', 'asc');

      // Child < Sibling < Spouse alphabetically
      expect(sorted[0].relationship_type).toBe('Child');
      expect(sorted[1].relationship_type).toBe('Sibling');
      expect(sorted[2].relationship_type).toBe('Spouse');
    });

    it('should maintain status priority within same-name sorting', () => {
      const sameName: SpecialRelationship[] = [
        { ...mockRelationships[0], first_name: 'John', status: 'Deceased' },
        { ...mockRelationships[1], first_name: 'John', status: 'Active' },
        { ...mockRelationships[2], first_name: 'John', status: 'Inactive' }
      ];

      const sorted = sortRelationships(sameName, 'first_name', 'asc');

      // When names are same, should maintain status priority
      expect(sorted[0].status).toBe('Active');
      expect(sorted[1].status).toBe('Inactive');
      expect(sorted[2].status).toBe('Deceased');
    });

    it('should handle empty array gracefully', () => {
      const sorted = sortRelationships([], 'first_name', 'asc');
      expect(sorted).toEqual([]);
    });
  });

  describe('filterRelationshipsByType', () => {
    const mockRelationships: SpecialRelationship[] = [
      {
        id: '1',
        client_group_id: 'cg-1',
        relationship_type: 'Spouse',
        status: 'Active',
        first_name: 'Personal1',
        last_name: 'Smith',
        title: null,
        date_of_birth: null,
        email: null,
        mobile_phone: null,
        home_phone: null,
        work_phone: null,
        address_line1: null,
        address_line2: null,
        city: null,
        county: null,
        postcode: null,
        country: null,
        notes: null,
        company_name: null,
        position: null,
        professional_id: null,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      },
      {
        id: '2',
        client_group_id: 'cg-1',
        relationship_type: 'Solicitor',
        status: 'Active',
        first_name: 'Professional1',
        last_name: 'Jones',
        title: null,
        date_of_birth: null,
        email: null,
        mobile_phone: null,
        home_phone: null,
        work_phone: null,
        address_line1: null,
        address_line2: null,
        city: null,
        county: null,
        postcode: null,
        country: null,
        notes: null,
        company_name: 'Law Firm',
        position: null,
        professional_id: null,
        created_at: '2025-01-02T10:00:00Z',
        updated_at: '2025-01-02T10:00:00Z'
      },
      {
        id: '3',
        client_group_id: 'cg-1',
        relationship_type: 'Child',
        status: 'Active',
        first_name: 'Personal2',
        last_name: 'Smith',
        title: null,
        date_of_birth: null,
        email: null,
        mobile_phone: null,
        home_phone: null,
        work_phone: null,
        address_line1: null,
        address_line2: null,
        city: null,
        county: null,
        postcode: null,
        country: null,
        notes: null,
        company_name: null,
        position: null,
        professional_id: null,
        created_at: '2025-01-03T10:00:00Z',
        updated_at: '2025-01-03T10:00:00Z'
      },
      {
        id: '4',
        client_group_id: 'cg-1',
        relationship_type: 'Accountant',
        status: 'Active',
        first_name: 'Professional2',
        last_name: 'Brown',
        title: null,
        date_of_birth: null,
        email: null,
        mobile_phone: null,
        home_phone: null,
        work_phone: null,
        address_line1: null,
        address_line2: null,
        city: null,
        county: null,
        postcode: null,
        country: null,
        notes: null,
        company_name: 'Accounting Co',
        position: null,
        professional_id: null,
        created_at: '2025-01-04T10:00:00Z',
        updated_at: '2025-01-04T10:00:00Z'
      }
    ];

    it('should filter personal relationships only', () => {
      const filtered = filterRelationshipsByType(mockRelationships, 'personal');

      expect(filtered).toHaveLength(2);
      expect(filtered[0].relationship_type).toBe('Spouse');
      expect(filtered[1].relationship_type).toBe('Child');
    });

    it('should filter professional relationships only', () => {
      const filtered = filterRelationshipsByType(mockRelationships, 'professional');

      expect(filtered).toHaveLength(2);
      expect(filtered[0].relationship_type).toBe('Solicitor');
      expect(filtered[1].relationship_type).toBe('Accountant');
    });

    it('should handle empty array gracefully', () => {
      const filtered = filterRelationshipsByType([], 'personal');
      expect(filtered).toEqual([]);
    });

    it('should recognize all personal types', () => {
      const personalTypes: SpecialRelationship[] = [
        { ...mockRelationships[0], relationship_type: 'Partner' },
        { ...mockRelationships[0], relationship_type: 'Parent' },
        { ...mockRelationships[0], relationship_type: 'Sibling' },
        { ...mockRelationships[0], relationship_type: 'Grandchild' },
        { ...mockRelationships[0], relationship_type: 'Grandparent' },
        { ...mockRelationships[0], relationship_type: 'Other Family' }
      ];

      const filtered = filterRelationshipsByType(personalTypes, 'personal');
      expect(filtered).toHaveLength(6);
    });

    it('should recognize all professional types', () => {
      const professionalTypes: SpecialRelationship[] = [
        { ...mockRelationships[1], relationship_type: 'Doctor' },
        { ...mockRelationships[1], relationship_type: 'Financial Advisor' },
        { ...mockRelationships[1], relationship_type: 'Estate Planner' },
        { ...mockRelationships[1], relationship_type: 'Other Professional' },
        { ...mockRelationships[1], relationship_type: 'Guardian' },
        { ...mockRelationships[1], relationship_type: 'Power of Attorney' }
      ];

      const filtered = filterRelationshipsByType(professionalTypes, 'professional');
      expect(filtered).toHaveLength(6);
    });
  });

  describe('getRelationshipCategory', () => {
    it('should return "personal" for personal relationship types', () => {
      expect(getRelationshipCategory('Spouse')).toBe('personal');
      expect(getRelationshipCategory('Partner')).toBe('personal');
      expect(getRelationshipCategory('Child')).toBe('personal');
      expect(getRelationshipCategory('Parent')).toBe('personal');
      expect(getRelationshipCategory('Sibling')).toBe('personal');
      expect(getRelationshipCategory('Grandchild')).toBe('personal');
      expect(getRelationshipCategory('Grandparent')).toBe('personal');
      expect(getRelationshipCategory('Other Family')).toBe('personal');
    });

    it('should return "professional" for professional relationship types', () => {
      expect(getRelationshipCategory('Accountant')).toBe('professional');
      expect(getRelationshipCategory('Solicitor')).toBe('professional');
      expect(getRelationshipCategory('Doctor')).toBe('professional');
      expect(getRelationshipCategory('Financial Advisor')).toBe('professional');
      expect(getRelationshipCategory('Estate Planner')).toBe('professional');
      expect(getRelationshipCategory('Other Professional')).toBe('professional');
      expect(getRelationshipCategory('Guardian')).toBe('professional');
      expect(getRelationshipCategory('Power of Attorney')).toBe('professional');
    });
  });

  describe('formatRelationshipName', () => {
    it('should format name with title when available', () => {
      const relationship: SpecialRelationship = {
        id: '1',
        client_group_id: 'cg-1',
        relationship_type: 'Spouse',
        status: 'Active',
        first_name: 'John',
        last_name: 'Doe',
        title: 'Mr',
        date_of_birth: null,
        email: null,
        mobile_phone: null,
        home_phone: null,
        work_phone: null,
        address_line1: null,
        address_line2: null,
        city: null,
        county: null,
        postcode: null,
        country: null,
        notes: null,
        company_name: null,
        position: null,
        professional_id: null,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      expect(formatRelationshipName(relationship)).toBe('Mr John Doe');
    });

    it('should format name without title when not available', () => {
      const relationship: SpecialRelationship = {
        id: '1',
        client_group_id: 'cg-1',
        relationship_type: 'Child',
        status: 'Active',
        first_name: 'Jane',
        last_name: 'Smith',
        title: null,
        date_of_birth: null,
        email: null,
        mobile_phone: null,
        home_phone: null,
        work_phone: null,
        address_line1: null,
        address_line2: null,
        city: null,
        county: null,
        postcode: null,
        country: null,
        notes: null,
        company_name: null,
        position: null,
        professional_id: null,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      expect(formatRelationshipName(relationship)).toBe('Jane Smith');
    });

    it('should handle missing last name', () => {
      const relationship: SpecialRelationship = {
        id: '1',
        client_group_id: 'cg-1',
        relationship_type: 'Other Family',
        status: 'Active',
        first_name: 'Bob',
        last_name: '',
        title: null,
        date_of_birth: null,
        email: null,
        mobile_phone: null,
        home_phone: null,
        work_phone: null,
        address_line1: null,
        address_line2: null,
        city: null,
        county: null,
        postcode: null,
        country: null,
        notes: null,
        company_name: null,
        position: null,
        professional_id: null,
        created_at: '2025-01-01T10:00:00Z',
        updated_at: '2025-01-01T10:00:00Z'
      };

      expect(formatRelationshipName(relationship)).toBe('Bob');
    });
  });
});
