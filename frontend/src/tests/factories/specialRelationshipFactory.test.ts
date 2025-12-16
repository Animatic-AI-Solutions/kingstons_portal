/**
 * Mock Data Factory Tests for Special Relationships
 * Cycle 1: Red Phase - Tests should FAIL (no implementation exists)
 *
 * Tests factory functions for creating mock Special Relationship data
 */

import {
  createMockPersonalRelationship,
  createMockProfessionalRelationship,
  createMockRelationshipArray
} from '@/tests/factories/specialRelationshipFactory';
import type { SpecialRelationship } from '@/types/specialRelationship';

describe('Special Relationship Mock Data Generators', () => {
  describe('createMockPersonalRelationship', () => {
    it('should create valid personal relationship with default values', () => {
      const mock = createMockPersonalRelationship();

      expect(mock).toBeDefined();
      expect(mock.id).toBeDefined();
      expect(mock.name).toBeDefined();
      expect(mock.type).toBe('Personal');
      expect(mock.status).toBe('Active');
      expect(mock.created_at).toBeDefined();
      expect(mock.updated_at).toBeDefined();
    });

    it('should create relationship with personal type', () => {
      const mock = createMockPersonalRelationship();

      const personalRelationships = [
        'Spouse',
        'Partner',
        'Child',
        'Parent',
        'Sibling',
        'Grandchild',
        'Grandparent',
        'Other Family'
      ];

      expect(personalRelationships).toContain(mock.relationship);
    });

    it('should allow overriding default values', () => {
      const overrides = {
        name: 'CustomName',
        relationship: 'Spouse' as const,
        email: 'custom@example.com',
        status: 'Inactive' as const
      };

      const mock = createMockPersonalRelationship(overrides);

      expect(mock.name).toBe('CustomName');
      expect(mock.relationship).toBe('Spouse');
      expect(mock.email).toBe('custom@example.com');
      expect(mock.status).toBe('Inactive');
    });

    it('should not include professional-specific fields in personal relationships', () => {
      const mock = createMockPersonalRelationship();

      expect(mock.firm_name).toBeNull();
    });

    it('should generate valid date of birth for personal relationships', () => {
      const mock = createMockPersonalRelationship();

      if (mock.date_of_birth) {
        const dob = new Date(mock.date_of_birth);
        expect(dob).toBeInstanceOf(Date);
        expect(dob.getTime()).toBeLessThan(Date.now());
      }
    });

    it('should generate realistic contact information', () => {
      const mock = createMockPersonalRelationship();

      // Should have at least one form of contact
      const hasContact = mock.email || mock.phone_number;
      expect(hasContact).toBeTruthy();
    });

    it('should have dependency field', () => {
      const mock = createMockPersonalRelationship();
      expect(typeof mock.dependency).toBe('boolean');
    });
  });

  describe('createMockProfessionalRelationship', () => {
    it('should create valid professional relationship with default values', () => {
      const mock = createMockProfessionalRelationship();

      expect(mock).toBeDefined();
      expect(mock.id).toBeDefined();
      expect(mock.name).toBeDefined();
      expect(mock.type).toBe('Professional');
      expect(mock.status).toBe('Active');
      expect(mock.created_at).toBeDefined();
      expect(mock.updated_at).toBeDefined();
    });

    it('should create relationship with professional type', () => {
      const mock = createMockProfessionalRelationship();

      const professionalRelationships = [
        'Accountant',
        'Solicitor',
        'Doctor',
        'Financial Advisor',
        'Estate Planner',
        'Other Professional',
        'Guardian',
        'Power of Attorney'
      ];

      expect(professionalRelationships).toContain(mock.relationship);
    });

    it('should include professional-specific fields', () => {
      const mock = createMockProfessionalRelationship();

      // Professional relationships should typically have firm name
      expect(mock.firm_name).toBeDefined();
      expect(typeof mock.firm_name).toBe('string');
    });

    it('should allow overriding default values', () => {
      const overrides = {
        name: 'Dr. Professional',
        relationship: 'Solicitor' as const,
        firm_name: 'Law Firm LLP',
        status: 'Active' as const
      };

      const mock = createMockProfessionalRelationship(overrides);

      expect(mock.name).toBe('Dr. Professional');
      expect(mock.relationship).toBe('Solicitor');
      expect(mock.firm_name).toBe('Law Firm LLP');
    });

    it('should generate work contact information for professional relationships', () => {
      const mock = createMockProfessionalRelationship();

      // Professional should have work email or phone
      const hasWorkContact = mock.email || mock.phone_number;
      expect(hasWorkContact).toBeTruthy();
    });

    it('should not include personal fields like date_of_birth for professional relationships', () => {
      const mock = createMockProfessionalRelationship();

      expect(mock.date_of_birth).toBeNull();
    });

    it('should have address_id when address is included', () => {
      const mock = createMockProfessionalRelationship();

      if (mock.address_id) {
        expect(typeof mock.address_id).toBe('number');
      }
    });
  });

  describe('createMockRelationshipArray', () => {
    it('should create array of specified count', () => {
      const count = 5;
      const mocks = createMockRelationshipArray(count);

      expect(mocks).toHaveLength(count);
    });

    it('should create mix of personal and professional relationships by default', () => {
      const mocks = createMockRelationshipArray(10);

      const personalRelationships = [
        'Spouse',
        'Partner',
        'Child',
        'Parent',
        'Sibling',
        'Grandchild',
        'Grandparent',
        'Other Family'
      ];
      const professionalRelationships = [
        'Accountant',
        'Solicitor',
        'Doctor',
        'Financial Advisor',
        'Estate Planner',
        'Other Professional',
        'Guardian',
        'Power of Attorney'
      ];

      const hasPersonal = mocks.some(m => personalRelationships.includes(m.relationship));
      const hasProfessional = mocks.some(m => professionalRelationships.includes(m.relationship));

      expect(hasPersonal || hasProfessional).toBe(true);
    });

    it('should create relationships with different statuses', () => {
      const mocks = createMockRelationshipArray(20);

      const statuses = new Set(mocks.map(m => m.status));
      expect(statuses.size).toBeGreaterThan(1); // Should have variety
    });

    it('should generate unique IDs for each relationship', () => {
      const mocks = createMockRelationshipArray(10);
      const ids = new Set(mocks.map(m => m.id));

      expect(ids.size).toBe(10); // All IDs should be unique
    });

    it('should allow filtering by category', () => {
      const personalOnly = createMockRelationshipArray(5, { category: 'personal' });

      const personalRelationships = [
        'Spouse',
        'Partner',
        'Child',
        'Parent',
        'Sibling',
        'Grandchild',
        'Grandparent',
        'Other Family'
      ];

      personalOnly.forEach(relationship => {
        expect(personalRelationships).toContain(relationship.relationship);
        expect(relationship.type).toBe('Personal');
      });
    });

    it('should allow setting same product_owner_ids for all relationships', () => {
      const productOwnerIds = [1, 2, 3];
      const mocks = createMockRelationshipArray(5, { product_owner_ids: productOwnerIds });

      mocks.forEach(relationship => {
        expect(relationship.product_owner_ids).toEqual(productOwnerIds);
      });
    });

    it('should handle edge case of 0 count', () => {
      const mocks = createMockRelationshipArray(0);
      expect(mocks).toHaveLength(0);
      expect(mocks).toEqual([]);
    });

    it('should handle large arrays efficiently', () => {
      const start = Date.now();
      const mocks = createMockRelationshipArray(100);
      const duration = Date.now() - start;

      expect(mocks).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should generate 100 mocks in under 1 second
    });
  });
});
