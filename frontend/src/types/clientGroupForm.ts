/**
 * Type definitions for the CreateClientGroup form
 *
 * These types match the database schema for product_owners, addresses, and client_groups tables.
 * Used for form state management and validation in the client group creation flow.
 */

/**
 * Form data for creating a product owner
 * Matches product_owners database table (25 fields)
 * Excludes: id, created_at (auto-generated), age (computed from dob)
 */
export interface ProductOwnerFormData {
  // Core Identity (4 fields)
  status: 'active' | 'inactive';
  firstname: string;
  surname: string;
  known_as: string;

  // Personal Details (8 fields)
  title: string;
  middle_names: string;
  relationship_status: string;
  gender: string;
  previous_names: string;
  dob: string;  // ISO date format YYYY-MM-DD
  place_of_birth: string;

  // Contact Information (4 fields)
  email_1: string;
  email_2: string;
  phone_1: string;
  phone_2: string;

  // Residential Information (2 fields)
  moved_in_date: string;  // ISO date format YYYY-MM-DD
  address_id: number | null;

  // Profiling (2 fields)
  three_words: string;
  share_data_with: string;

  // Employment (2 fields)
  employment_status: string;
  occupation: string;

  // Compliance (4 fields)
  passport_expiry_date: string;  // ISO date format YYYY-MM-DD
  ni_number: string;
  aml_result: string;
  aml_date: string;  // ISO date format YYYY-MM-DD
}

/**
 * Form data for address information
 * Matches addresses database table (5 fields)
 * Excludes: id, created_at (auto-generated)
 */
export interface AddressFormData {
  line_1: string;
  line_2: string;
  line_3: string;
  line_4: string;
  line_5: string;
}

/**
 * Form data for creating a client group
 * Matches client_groups database table (11 fields)
 * Excludes: id, created_at (auto-generated)
 */
export interface ClientGroupFormData {
  name: string;
  type: string;
  status: string;
  client_start_date: string;  // ISO date format YYYY-MM-DD - Date when client relationship officially began
  ongoing_start: string;  // ISO date format YYYY-MM-DD
  client_declaration: string;  // ISO date format YYYY-MM-DD
  privacy_declaration: string;  // ISO date format YYYY-MM-DD
  full_fee_agreement: string;  // ISO date format YYYY-MM-DD
  last_satisfactory_discussion: string;  // ISO date format YYYY-MM-DD
  notes: string;
}

/**
 * Composite type for product owner with embedded address
 * Used during form creation before persisting to database
 * Includes temporary ID for frontend tracking of multiple owners
 */
export interface ProductOwnerWithAddress {
  tempId: string;  // Temporary UUID for frontend list management
  productOwner: ProductOwnerFormData;
  address: AddressFormData;
}

/**
 * Complete form state for creating a client group
 * Includes the client group details and all associated product owners
 */
export interface CreateClientGroupFormState {
  clientGroup: ClientGroupFormData;
  productOwners: ProductOwnerWithAddress[];
}

/**
 * Field-level validation errors
 * Keys match field names from ProductOwnerFormData, AddressFormData, and ClientGroupFormData
 * Values are error messages to display to the user
 */
export interface ValidationErrors {
  // Client Group errors
  clientGroup?: {
    name?: string;
    type?: string;
    status?: string;
    client_start_date?: string;
    ongoing_start?: string;
    client_declaration?: string;
    privacy_declaration?: string;
    full_fee_agreement?: string;
    last_satisfactory_discussion?: string;
    notes?: string;
  };

  // Product Owner errors (indexed by tempId)
  productOwners?: {
    [tempId: string]: {
      // Core Identity
      status?: string;
      firstname?: string;
      surname?: string;
      known_as?: string;

      // Personal Details
      title?: string;
      middle_names?: string;
      relationship_status?: string;
      gender?: string;
      previous_names?: string;
      dob?: string;
      place_of_birth?: string;

      // Contact Information
      email_1?: string;
      email_2?: string;
      phone_1?: string;
      phone_2?: string;

      // Residential Information
      moved_in_date?: string;

      // Profiling
      three_words?: string;
      share_data_with?: string;

      // Employment
      employment_status?: string;
      occupation?: string;

      // Compliance
      passport_expiry_date?: string;
      ni_number?: string;
      aml_result?: string;
      aml_date?: string;

      // Address errors
      address?: {
        line_1?: string;
        line_2?: string;
        line_3?: string;
        line_4?: string;
        line_5?: string;
      };
    };
  };
}

/**
 * Form field metadata for dynamic form rendering
 * Used to generate form fields programmatically
 */
export interface FormFieldMetadata {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: readonly string[];  // For select fields
  maxLength?: number;
  pattern?: string;  // Regex pattern for validation
  helpText?: string;
}
