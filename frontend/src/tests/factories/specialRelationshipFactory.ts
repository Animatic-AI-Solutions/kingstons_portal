/**
 * Special Relationship Factory
 * Provides factory functions for creating mock special relationship data for testing
 */

import {
  SpecialRelationship,
  Relationship,
  RelationshipStatus,
  PERSONAL_RELATIONSHIPS,
  PROFESSIONAL_RELATIONSHIPS,
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
    id: 1,
    name: 'Jane Smith',
    type: 'Personal',
    relationship: 'Spouse',
    status: 'Active',
    date_of_birth: '1985-06-15',
    dependency: false,
    email: 'jane.smith@example.com',
    phone_number: '+44-7700-900000',
    address_id: 1,
    notes: null,
    firm_name: null,
    product_owner_ids: [1, 2],
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
    id: 2,
    name: 'Dr Robert Johnson',
    type: 'Professional',
    relationship: 'Financial Advisor',
    status: 'Active',
    date_of_birth: null,
    dependency: false,
    email: 'robert.johnson@advisor.com',
    phone_number: '+44-20-7946-0123',
    address_id: 2,
    notes: null,
    firm_name: 'Financial Advisors Ltd',
    product_owner_ids: [1, 2],
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
    product_owner_ids?: number[];
  } = {}
): SpecialRelationship[] {
  const {
    type = 'mixed',
    category,
    status,
    product_owner_ids = [1],
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
    const relationships_list = isProfessional
      ? PROFESSIONAL_RELATIONSHIPS
      : PERSONAL_RELATIONSHIPS;
    const selectedRelationship = relationships_list[i % relationships_list.length];

    // Vary statuses across the array if not specified
    const selectedStatus = status || statuses[i % statuses.length];

    const baseData: Partial<SpecialRelationship> = {
      id: i + 1,
      name: `Person${i + 1} Surname${i + 1}`,
      type: isProfessional ? 'Professional' : 'Personal',
      relationship: selectedRelationship,
      status: selectedStatus,
      product_owner_ids: product_owner_ids,
    };

    const relationship = isProfessional
      ? createMockProfessionalRelationship(baseData)
      : createMockPersonalRelationship(baseData);

    relationships.push(relationship);
  }

  return relationships;
}
