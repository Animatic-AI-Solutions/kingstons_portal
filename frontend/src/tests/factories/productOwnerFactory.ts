import { faker } from '@faker-js/faker';

export interface ProductOwner {
  id: number;
  // Core Identity (4 fields)
  status: string;
  firstname: string;
  surname: string;
  known_as: string | null;

  // Personal Details (7 fields)
  title: string | null;
  middle_names: string | null;
  relationship_status: string | null;
  gender: string | null;
  previous_names: string | null;
  dob: string | null; // ISO date string
  place_of_birth: string | null;

  // Contact Information (4 fields)
  email_1: string | null;
  email_2: string | null;
  phone_1: string | null;
  phone_2: string | null;

  // Residential Information (2 fields + address expansion)
  moved_in_date: string | null; // ISO date string
  address_id: number | null;
  address_line_1: string | null;
  address_line_2: string | null;
  address_line_3: string | null;
  address_line_4: string | null;
  address_line_5: string | null;

  // Client Profiling (2 fields)
  three_words: string | null;
  share_data_with: string | null;

  // Employment Information (2 fields)
  employment_status: string | null;
  occupation: string | null;

  // Identity & Compliance (4 fields)
  passport_expiry_date: string | null; // ISO date string
  ni_number: string | null;
  aml_result: string | null;
  aml_date: string | null; // ISO date string

  // System fields
  created_at: string; // ISO datetime string
}

export interface ProductOwnerCreate extends Omit<ProductOwner, 'id' | 'created_at' | 'address_line_1' | 'address_line_2' | 'address_line_3' | 'address_line_4' | 'address_line_5'> {}

/**
 * Generate a realistic UK National Insurance number
 * Format: 2 letters, 6 digits, 1 letter (e.g., AB123456C)
 */
function generateNINumber(): string {
  const firstLetter = faker.string.alpha({ length: 1, casing: 'upper', exclude: ['D', 'F', 'I', 'Q', 'U', 'V'] });
  const secondLetter = faker.string.alpha({ length: 1, casing: 'upper', exclude: ['D', 'F', 'I', 'O', 'Q', 'U', 'V'] });
  const numbers = faker.string.numeric(6);
  const lastLetter = faker.string.alpha({ length: 1, casing: 'upper', exclude: ['F', 'I', 'O', 'Q', 'U', 'V'] });
  return `${firstLetter}${secondLetter}${numbers}${lastLetter}`;
}

/**
 * Generate a random product owner status
 */
function generateStatus(): string {
  return faker.helpers.arrayElement(['active', 'lapsed', 'deceased']);
}

/**
 * Generate a random title
 */
function generateTitle(): string {
  return faker.helpers.arrayElement(['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof', 'Sir', 'Lady']);
}

/**
 * Generate a random relationship status
 */
function generateRelationshipStatus(): string {
  return faker.helpers.arrayElement(['Single', 'Married', 'Divorced', 'Widowed', 'Civil Partnership', 'Separated']);
}

/**
 * Generate a random gender
 */
function generateGender(): string {
  return faker.helpers.arrayElement(['Male', 'Female', 'Other', 'Prefer not to say']);
}

/**
 * Generate a random employment status
 */
function generateEmploymentStatus(): string {
  return faker.helpers.arrayElement(['Employed', 'Self-Employed', 'Retired', 'Unemployed', 'Student', 'Other']);
}

/**
 * Generate a random AML result
 */
function generateAMLResult(): string {
  return faker.helpers.arrayElement(['Pass', 'Fail', 'Referred', 'Pending']);
}

/**
 * Create a complete product owner with all fields populated
 */
export function createProductOwner(overrides?: Partial<ProductOwner>): ProductOwner {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const dob = faker.date.birthdate({ min: 18, max: 90, mode: 'age' });

  return {
    id: faker.number.int({ min: 1, max: 100000 }),
    status: generateStatus(),
    firstname: firstName,
    surname: lastName,
    known_as: faker.helpers.maybe(() => faker.person.firstName(), { probability: 0.3 }) || null,

    title: faker.helpers.maybe(() => generateTitle(), { probability: 0.8 }) || null,
    middle_names: faker.helpers.maybe(() => faker.person.middleName(), { probability: 0.4 }) || null,
    relationship_status: faker.helpers.maybe(() => generateRelationshipStatus(), { probability: 0.9 }) || null,
    gender: faker.helpers.maybe(() => generateGender(), { probability: 0.9 }) || null,
    previous_names: faker.helpers.maybe(() => faker.person.lastName(), { probability: 0.15 }) || null,
    dob: dob.toISOString().split('T')[0],
    place_of_birth: faker.helpers.maybe(() => faker.location.city(), { probability: 0.7 }) || null,

    email_1: faker.internet.email({ firstName, lastName }).toLowerCase(),
    email_2: faker.helpers.maybe(() => faker.internet.email({ firstName, lastName }).toLowerCase(), { probability: 0.3 }) || null,
    phone_1: faker.phone.number('+44 #### ### ###'),
    phone_2: faker.helpers.maybe(() => faker.phone.number('+44 #### ### ###'), { probability: 0.4 }) || null,

    moved_in_date: faker.helpers.maybe(() => faker.date.past({ years: 10 }).toISOString().split('T')[0], { probability: 0.6 }) || null,
    address_id: faker.helpers.maybe(() => faker.number.int({ min: 1, max: 1000 }), { probability: 0.8 }) || null,
    address_line_1: faker.location.streetAddress(),
    address_line_2: faker.helpers.maybe(() => faker.location.secondaryAddress(), { probability: 0.3 }) || null,
    address_line_3: faker.location.city(),
    address_line_4: faker.location.county(),
    address_line_5: faker.location.zipCode('??# #??'),

    three_words: faker.helpers.maybe(() => `${faker.word.adjective()} ${faker.word.adjective()} ${faker.word.adjective()}`, { probability: 0.5 }) || null,
    share_data_with: faker.helpers.maybe(() => faker.helpers.arrayElement(['Spouse', 'Accountant', 'Solicitor', 'All', 'None']), { probability: 0.6 }) || null,

    employment_status: faker.helpers.maybe(() => generateEmploymentStatus(), { probability: 0.9 }) || null,
    occupation: faker.helpers.maybe(() => faker.person.jobTitle(), { probability: 0.8 }) || null,

    passport_expiry_date: faker.helpers.maybe(() => faker.date.future({ years: 5 }).toISOString().split('T')[0], { probability: 0.7 }) || null,
    ni_number: faker.helpers.maybe(() => generateNINumber(), { probability: 0.9 }) || null,
    aml_result: faker.helpers.maybe(() => generateAMLResult(), { probability: 0.8 }) || null,
    aml_date: faker.helpers.maybe(() => faker.date.past({ years: 2 }).toISOString().split('T')[0], { probability: 0.8 }) || null,

    created_at: faker.date.past({ years: 3 }).toISOString(),

    ...overrides,
  };
}

/**
 * Create a product owner with active status
 */
export function createActiveProductOwner(overrides?: Partial<ProductOwner>): ProductOwner {
  return createProductOwner({ status: 'active', ...overrides });
}

/**
 * Create a product owner with lapsed status
 */
export function createLapsedProductOwner(overrides?: Partial<ProductOwner>): ProductOwner {
  return createProductOwner({ status: 'lapsed', ...overrides });
}

/**
 * Create a product owner with deceased status
 */
export function createDeceasedProductOwner(overrides?: Partial<ProductOwner>): ProductOwner {
  return createProductOwner({ status: 'deceased', ...overrides });
}

/**
 * Create multiple product owners
 */
export function createProductOwners(count: number, overrides?: Partial<ProductOwner>): ProductOwner[] {
  return Array.from({ length: count }, () => createProductOwner(overrides));
}

/**
 * Create a minimal product owner for creation (without system fields)
 */
export function createProductOwnerForCreation(overrides?: Partial<ProductOwnerCreate>): ProductOwnerCreate {
  const fullOwner = createProductOwner();
  const { id, created_at, address_line_1, address_line_2, address_line_3, address_line_4, address_line_5, ...createData } = fullOwner;

  return {
    ...createData,
    status: 'active', // Default to active for new creations
    ...overrides,
  };
}

/**
 * Create a product owner with minimal required fields only
 */
export function createMinimalProductOwner(overrides?: Partial<ProductOwner>): ProductOwner {
  return createProductOwner({
    status: 'active',
    known_as: null,
    title: null,
    middle_names: null,
    relationship_status: null,
    gender: null,
    previous_names: null,
    dob: null,
    place_of_birth: null,
    email_1: null,
    email_2: null,
    phone_1: null,
    phone_2: null,
    moved_in_date: null,
    address_id: null,
    address_line_1: null,
    address_line_2: null,
    address_line_3: null,
    address_line_4: null,
    address_line_5: null,
    three_words: null,
    share_data_with: null,
    employment_status: null,
    occupation: null,
    passport_expiry_date: null,
    ni_number: null,
    aml_result: null,
    aml_date: null,
    ...overrides,
  });
}
