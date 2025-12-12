/**
 * Special Relationship Factory
 * Provides factory functions for creating mock special relationship data for testing
 */

import {
  SpecialRelationship,
  RelationshipType,
  RelationshipStatus,
  PERSONAL_RELATIONSHIP_TYPES,
  PROFESSIONAL_RELATIONSHIP_TYPES,
} from '@/types/specialRelationship';

/**
 * Create a mock personal relationship
 * @param overrides - Optional fields to override defaults
 * @returns Mock SpecialRelationship object
 */
export function createMockPersonalRelationship(
  overrides: Partial<SpecialRelationship> = {}
): SpecialRelationship {
  const baseRelationship: SpecialRelationship = {
    id: 'rel-personal-001',
    client_group_id: 'group-001',
    relationship_type: 'Spouse',
    status: 'Active',
    title: null,
    first_name: 'Jane',
    last_name: 'Smith',
    date_of_birth: '1985-06-15',
    email: 'jane.smith@example.com',
    mobile_phone: '+44-7700-900000',
    home_phone: '+44-20-7946-0958',
    work_phone: null,
    address_line1: '123 Main Street',
    address_line2: 'Flat 4B',
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom',
    notes: null,
    company_name: null,
    position: null,
    professional_id: null,
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  };

  return { ...baseRelationship, ...overrides };
}

/**
 * Create a mock professional relationship
 * @param overrides - Optional fields to override defaults
 * @returns Mock SpecialRelationship object
 */
export function createMockProfessionalRelationship(
  overrides: Partial<SpecialRelationship> = {}
): SpecialRelationship {
  const baseRelationship: SpecialRelationship = {
    id: 'rel-professional-001',
    client_group_id: 'group-001',
    relationship_type: 'Financial Advisor',
    status: 'Active',
    title: 'Dr',
    first_name: 'Robert',
    last_name: 'Johnson',
    date_of_birth: null,
    email: 'robert.johnson@advisor.com',
    mobile_phone: null,
    home_phone: null,
    work_phone: '+44-20-7946-0123',
    address_line1: '456 Business Park',
    address_line2: 'Suite 200',
    city: 'London',
    county: 'Greater London',
    postcode: 'EC1A 1BB',
    country: 'United Kingdom',
    notes: null,
    company_name: 'Financial Advisors Ltd',
    position: 'Senior Advisor',
    professional_id: 'FCA-123456',
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  };

  return { ...baseRelationship, ...overrides };
}

/**
 * Create an array of mock relationships
 * @param count - Number of relationships to create
 * @param options - Optional configuration
 * @returns Array of mock SpecialRelationship objects
 */
export function createMockRelationshipArray(
  count: number,
  options: {
    type?: 'personal' | 'professional' | 'mixed';
    category?: 'personal' | 'professional';
    status?: RelationshipStatus;
    client_group_id?: string;
  } = {}
): SpecialRelationship[] {
  const {
    type = 'mixed',
    category,
    status,
    client_group_id = 'group-001',
  } = options;

  const statuses: RelationshipStatus[] = ['Active', 'Inactive', 'Deceased'];

  const relationships: SpecialRelationship[] = [];

  for (let i = 0; i < count; i++) {
    let relationshipCategory: 'personal' | 'professional';

    // Determine category based on options
    if (category) {
      relationshipCategory = category;
    } else if (type === 'mixed') {
      relationshipCategory = i % 2 === 0 ? 'personal' : 'professional';
    } else {
      relationshipCategory = type;
    }

    const isProfessional = relationshipCategory === 'professional';
    const types = isProfessional
      ? PROFESSIONAL_RELATIONSHIP_TYPES
      : PERSONAL_RELATIONSHIP_TYPES;
    const selectedType = types[i % types.length];

    // Vary statuses across the array if not specified
    const selectedStatus = status || statuses[i % statuses.length];

    const baseData: Partial<SpecialRelationship> = {
      id: `rel-${i + 1}`,
      client_group_id: client_group_id,
      relationship_type: selectedType,
      status: selectedStatus,
      first_name: `Person${i + 1}`,
      last_name: `Surname${i + 1}`,
    };

    const relationship = isProfessional
      ? createMockProfessionalRelationship(baseData)
      : createMockPersonalRelationship(baseData);

    relationships.push(relationship);
  }

  return relationships;
}
