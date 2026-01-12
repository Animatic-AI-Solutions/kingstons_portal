/**
 * Product Owner Types
 *
 * Type definitions for product owners in the Phase 2 People Tab implementation.
 * Represents individuals who own financial products managed by the wealth management system.
 *
 * A Product Owner is a person who:
 * - Owns one or more financial products (ISAs, GIAs, Bonds, Pensions)
 * - Belongs to one or more client groups (families, partnerships)
 * - Has comprehensive personal and contact information for compliance
 *
 * The types support all 30+ fields required for comprehensive person data management,
 * including identity, contact details, residential info, employment, and compliance data.
 *
 * @module types/productOwner
 */

/**
 * Product Owner Entity
 *
 * Represents a complete product owner record with all fields.
 * Maps directly to the `product_owners` database table.
 *
 * Field Groups:
 * - System: id, created_at
 * - Core Identity: status, firstname, surname, known_as (4 fields)
 * - Personal Details: title, middle_names, relationship_status, etc. (7 fields)
 * - Contact Information: email_1, email_2, phone_1, phone_2 (4 fields)
 * - Residential: moved_in_date, address_id, address expansion fields (7 fields)
 * - Client Profiling: three_words, share_data_with (2 fields)
 * - Employment: employment_status, occupation (2 fields)
 * - Identity & Compliance: passport_expiry_date, ni_number, aml_complete, aml_date (4 fields)
 *
 * Total: 32 fields (2 system + 30 business fields)
 */
export interface ProductOwner {
  // ===== System Fields =====
  /**
   * Unique identifier (auto-generated)
   * Primary key in database
   */
  id: number;

  /**
   * Timestamp when record was created (ISO 8601 format)
   * Auto-set by database on INSERT
   */
  created_at: string;

  // ===== Core Identity (4 fields) =====
  /**
   * Product owner status
   * - active: Current customer with active products
   * - lapsed: Former customer, no active products
   * - deceased: Deceased, requires special handling
   */
  status: 'active' | 'lapsed' | 'deceased';

  /**
   * Legal first name
   * Required field, used in all official documents
   */
  firstname: string;

  /**
   * Legal surname (family name)
   * Required field, used in all official documents
   */
  surname: string;

  /**
   * Preferred name or nickname
   * Optional, used in informal communications
   * Example: "Bob" for Robert, "Liz" for Elizabeth
   */
  known_as: string | null;

  // ===== Personal Details (7 fields) =====
  /**
   * Title (Mr, Mrs, Ms, Dr, etc.)
   * Optional, used in formal communications
   */
  title: string | null;

  /**
   * Middle name(s)
   * Optional, space-separated if multiple
   * Example: "James Paul" or "J. P."
   */
  middle_names: string | null;

  /**
   * Relationship status (Married, Single, Divorced, Widowed, etc.)
   * Optional, used for client profiling
   */
  relationship_status: string | null;

  /**
   * Gender (Male, Female, Other, Prefer not to say)
   * Optional, used for diversity reporting
   */
  gender: string | null;

  /**
   * Previous names (maiden name, former married names, etc.)
   * Optional, used for identity verification and compliance
   * Example: "Smith (maiden name)" or "Jones (previous married name)"
   */
  previous_names: string | null;

  /**
   * Date of birth (ISO date string YYYY-MM-DD)
   * Optional but recommended for age calculations and compliance
   * Example: "1980-05-15"
   */
  dob: string | null;

  /**
   * Place of birth (city/town and country)
   * Optional, used for identity verification
   * Example: "London, UK" or "New York, USA"
   */
  place_of_birth: string | null;

  // ===== Contact Information (4 fields) =====
  /**
   * Primary email address
   * Optional, but at least one of email_1/email_2 recommended
   * Used for primary communications
   */
  email_1: string | null;

  /**
   * Secondary email address
   * Optional, backup or personal/work email separation
   */
  email_2: string | null;

  /**
   * Primary phone number
   * Optional, but at least one of phone_1/phone_2 recommended
   * Can be mobile or landline
   */
  phone_1: string | null;

  /**
   * Secondary phone number
   * Optional, backup or home/mobile separation
   */
  phone_2: string | null;

  // ===== Residential Information (2 fields + 5 address expansion fields) =====
  /**
   * Date moved into current residence (ISO date string YYYY-MM-DD)
   * Optional, used for address history tracking
   * Example: "2020-03-15"
   */
  moved_in_date: string | null;

  /**
   * Foreign key to addresses table
   * Optional, links to normalized address record
   * If null, no address is associated
   */
  address_id: number | null;

  // Address expansion fields (read-only, populated via JOIN with addresses table)
  // These fields are denormalized for display convenience and are not editable directly
  /**
   * Address line 1 (house number/name and street)
   * Read-only, populated from addresses table via JOIN
   * Example: "123 Main Street"
   */
  address_line_1: string | null;

  /**
   * Address line 2 (additional street info or district)
   * Read-only, populated from addresses table via JOIN
   */
  address_line_2: string | null;

  /**
   * Address line 3 (town/city)
   * Read-only, populated from addresses table via JOIN
   * Example: "London"
   */
  address_line_3: string | null;

  /**
   * Address line 4 (county/state)
   * Read-only, populated from addresses table via JOIN
   * Example: "Greater London"
   */
  address_line_4: string | null;

  /**
   * Address line 5 (postcode/zip)
   * Read-only, populated from addresses table via JOIN
   * Example: "SW1A 1AA"
   */
  address_line_5: string | null;

  // ===== Client Profiling (2 fields) =====
  /**
   * Three words that describe the client
   * Optional, used for quick client characterization
   * Example: "Conservative, Family-focused, Detail-oriented"
   */
  three_words: string | null;

  /**
   * Data sharing preferences or restrictions
   * Optional, used for GDPR compliance and data sharing controls
   * Example: "Do not share with third parties" or "Marketing opt-out"
   */
  share_data_with: string | null;

  // ===== Employment Information (2 fields) =====
  /**
   * Employment status (Employed, Self-employed, Retired, Unemployed, etc.)
   * Optional, used for risk profiling and suitability
   */
  employment_status: string | null;

  /**
   * Occupation or job title
   * Optional, used for risk profiling and compliance
   * Example: "Software Engineer" or "Retired Teacher"
   */
  occupation: string | null;

  // ===== Identity & Compliance (4 fields) =====
  /**
   * Passport expiry date (ISO date string YYYY-MM-DD)
   * Optional, used for identity verification tracking
   * Example: "2030-12-31"
   */
  passport_expiry_date: string | null;

  /**
   * National Insurance number (UK)
   * Optional, used for tax reporting and identity verification
   * Format: AB123456C
   */
  ni_number: string | null;

  /**
   * Whether Anti-Money Laundering (AML) check is complete
   * Boolean flag for AML compliance status
   */
  aml_complete: boolean | null;

  /**
   * Date of last AML check (ISO date string YYYY-MM-DD)
   * Optional, used for compliance tracking and audit trail
   * Example: "2024-01-15"
   */
  aml_date: string | null;
}

/**
 * Product Owner Creation Interface
 *
 * Type for creating new product owner records via API.
 * Excludes read-only system fields and denormalized address fields.
 *
 * Excluded Fields:
 * - id: Auto-generated by database
 * - created_at: Auto-set by database
 * - address_line_1 through address_line_5: Read-only JOIN fields from addresses table
 *
 * Usage:
 * Used in createProductOwner API function and create forms.
 * All business fields from ProductOwner are included and editable.
 *
 * @example
 * const newOwner: ProductOwnerCreate = {
 *   status: 'active',
 *   firstname: 'John',
 *   surname: 'Smith',
 *   email_1: 'john@example.com',
 *   phone_1: '07700900123',
 *   dob: '1980-01-15',
 *   address_id: 123,
 *   // ... other optional fields
 * };
 */
export interface ProductOwnerCreate extends Omit<
  ProductOwner,
  'id' | 'created_at' | 'address_line_1' | 'address_line_2' | 'address_line_3' | 'address_line_4' | 'address_line_5'
> {}

/**
 * Validation Errors Interface
 *
 * Maps field names to validation error messages for form validation.
 * Used to display field-specific error messages in the UI.
 *
 * Structure:
 * - Key: Field name (matches ProductOwner property names)
 * - Value: User-friendly error message
 *
 * @example
 * const errors: ValidationErrors = {
 *   firstname: 'First name is required',
 *   email_1: 'Invalid email format',
 *   dob: 'Date of birth must be in the past'
 * };
 *
 * @example
 * // Accessing errors in form
 * {errors.firstname && <ErrorMessage>{errors.firstname}</ErrorMessage>}
 */
export interface ValidationErrors {
  [fieldName: string]: string;
}

/**
 * Format Full Name Options
 *
 * Configuration options for formatFullName helper function.
 * Allows customization of name display for different contexts.
 *
 * @property includeKnownAs - Include known_as (nickname) in quotes after firstname
 * @property includeMiddleNames - Include middle_names in formatted output
 * @property lastNameFirst - Format as "Surname, Firstname" for directory/sorting
 *
 * @example
 * // Standard format: "Mr John Smith"
 * formatFullName(owner, {});
 *
 * @example
 * // With known_as: "John "Jack" Smith"
 * formatFullName(owner, { includeKnownAs: true });
 *
 * @example
 * // Directory format: "Smith, John"
 * formatFullName(owner, { lastNameFirst: true, includeMiddleNames: false });
 */
export interface FormatFullNameOptions {
  /**
   * Include known_as (nickname) in quotes after firstname
   * @default false
   * @example "John "Jack" Smith"
   */
  includeKnownAs?: boolean;

  /**
   * Include middle names in formatted output
   * @default true
   * @example "John Paul Smith" vs "John Smith"
   */
  includeMiddleNames?: boolean;

  /**
   * Format as "Surname, Firstname" for directory/sorting
   * @default false
   * @example "Smith, John" vs "John Smith"
   */
  lastNameFirst?: boolean;
}
