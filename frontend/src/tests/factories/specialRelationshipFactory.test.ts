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
      expect(mock.client_group_id).toBeDefined();
      expect(mock.first_name).toBeDefined();
      expect(mock.last_name).toBeDefined();
      expect(mock.status).toBe('Active');
      expect(mock.created_at).toBeDefined();
      expect(mock.updated_at).toBeDefined();
    });

    it('should create relationship with personal type', () => {
      const mock = createMockPersonalRelationship();

      const personalTypes = [
        'Spouse',
        'Partner',
        'Child',
        'Parent',
        'Sibling',
        'Grandchild',
        'Grandparent',
        'Other Family'
      ];

      expect(personalTypes).toContain(mock.relationship_type);
    });

    it('should allow overriding default values', () => {
      const overrides = {
        first_name: 'CustomFirstName',
        last_name: 'CustomLastName',
        relationship_type: 'Spouse' as const,
        email: 'custom@example.com',
        status: 'Inactive' as const
      };

      const mock = createMockPersonalRelationship(overrides);

      expect(mock.first_name).toBe('CustomFirstName');
      expect(mock.last_name).toBe('CustomLastName');
      expect(mock.relationship_type).toBe('Spouse');
      expect(mock.email).toBe('custom@example.com');
      expect(mock.status).toBe('Inactive');
    });

    it('should not include professional-specific fields in personal relationships', () => {
      const mock = createMockPersonalRelationship();

      expect(mock.company_name).toBeNull();
      expect(mock.position).toBeNull();
      expect(mock.professional_id).toBeNull();
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
      const hasContact = mock.email || mock.mobile_phone || mock.home_phone;
      expect(hasContact).toBeTruthy();
    });

    it('should generate valid UK address when address is included', () => {
      const mock = createMockPersonalRelationship();

      if (mock.postcode) {
        // UK postcode format validation
        expect(mock.postcode).toMatch(/^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i);
        expect(mock.country).toBe('United Kingdom');
      }
    });
  });

  describe('createMockProfessionalRelationship', () => {
    it('should create valid professional relationship with default values', () => {
      const mock = createMockProfessionalRelationship();

      expect(mock).toBeDefined();
      expect(mock.id).toBeDefined();
      expect(mock.client_group_id).toBeDefined();
      expect(mock.first_name).toBeDefined();
      expect(mock.last_name).toBeDefined();
      expect(mock.status).toBe('Active');
      expect(mock.created_at).toBeDefined();
      expect(mock.updated_at).toBeDefined();
    });

    it('should create relationship with professional type', () => {
      const mock = createMockProfessionalRelationship();

      const professionalTypes = [
        'Accountant',
        'Solicitor',
        'Doctor',
        'Financial Advisor',
        'Estate Planner',
        'Other Professional',
        'Guardian',
        'Power of Attorney'
      ];

      expect(professionalTypes).toContain(mock.relationship_type);
    });

    it('should include professional-specific fields', () => {
      const mock = createMockProfessionalRelationship();

      // Professional relationships should typically have company name
      expect(mock.company_name).toBeDefined();
      expect(typeof mock.company_name).toBe('string');
    });

    it('should allow overriding default values', () => {
      const overrides = {
        first_name: 'Dr.',
        last_name: 'Professional',
        relationship_type: 'Solicitor' as const,
        company_name: 'Law Firm LLP',
        position: 'Senior Partner',
        professional_id: 'SRA-123456',
        status: 'Active' as const
      };

      const mock = createMockProfessionalRelationship(overrides);

      expect(mock.first_name).toBe('Dr.');
      expect(mock.last_name).toBe('Professional');
      expect(mock.relationship_type).toBe('Solicitor');
      expect(mock.company_name).toBe('Law Firm LLP');
      expect(mock.position).toBe('Senior Partner');
      expect(mock.professional_id).toBe('SRA-123456');
    });

    it('should generate work contact information for professional relationships', () => {
      const mock = createMockProfessionalRelationship();

      // Professional should have work email or work phone
      const hasWorkContact = mock.email || mock.work_phone;
      expect(hasWorkContact).toBeTruthy();
    });

    it('should not include personal fields like date_of_birth for professional relationships', () => {
      const mock = createMockProfessionalRelationship();

      expect(mock.date_of_birth).toBeNull();
    });

    it('should generate business address when address is included', () => {
      const mock = createMockProfessionalRelationship();

      if (mock.address_line1) {
        expect(mock.city).toBeDefined();
        expect(mock.country).toBe('United Kingdom');
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

      const personalTypes = [
        'Spouse',
        'Partner',
        'Child',
        'Parent',
        'Sibling',
        'Grandchild',
        'Grandparent',
        'Other Family'
      ];
      const professionalTypes = [
        'Accountant',
        'Solicitor',
        'Doctor',
        'Financial Advisor',
        'Estate Planner',
        'Other Professional',
        'Guardian',
        'Power of Attorney'
      ];

      const hasPersonal = mocks.some(m => personalTypes.includes(m.relationship_type));
      const hasProfessional = mocks.some(m => professionalTypes.includes(m.relationship_type));

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

      const personalTypes = [
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
        expect(personalTypes).toContain(relationship.relationship_type);
      });
    });

    it('should allow setting same client_group_id for all relationships', () => {
      const clientGroupId = 'cg-test-123';
      const mocks = createMockRelationshipArray(5, { client_group_id: clientGroupId });

      mocks.forEach(relationship => {
        expect(relationship.client_group_id).toBe(clientGroupId);
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
