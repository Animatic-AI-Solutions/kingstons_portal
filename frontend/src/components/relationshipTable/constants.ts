/**
 * Relationship Table Constants
 *
 * Shared constants for Personal and Professional relationship tables.
 * Promotes DRY principle and maintains consistency across table components.
 *
 * @module relationshipTable/constants
 */

// ==========================
// CSS Class Constants
// ==========================

/**
 * Common table structure classes
 */
export const TABLE_CLASSES = {
  container: 'overflow-x-auto',
  table: 'min-w-full divide-y divide-gray-200',
  thead: 'bg-gray-50',
  tbody: 'bg-white divide-y divide-gray-200',
} as const;

/**
 * Table header cell classes
 */
export const HEADER_CLASSES = {
  base: 'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
  hiddenOnTablet: 'hidden lg:table-cell',
} as const;

/**
 * Table body cell classes
 */
export const CELL_CLASSES = {
  base: 'px-4 py-3 text-sm',
  hiddenOnTablet: 'px-4 py-3 text-sm hidden lg:table-cell',
} as const;

/**
 * Table row classes
 */
export const ROW_CLASSES = {
  base: 'hover:bg-gray-50 cursor-pointer',
} as const;

/**
 * Action button container classes
 */
export const ACTION_CLASSES = {
  container: 'flex items-center gap-2',
  editButton: 'text-blue-600 hover:text-blue-800',
  deleteButton: 'text-red-600 hover:text-red-800',
} as const;

/**
 * Status badge classes by status type
 */
export const STATUS_BADGE_CLASSES = {
  base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  Active: 'bg-green-100 text-green-800',
  Inactive: 'bg-gray-100 text-gray-800',
  Deceased: 'bg-red-100 text-red-800',
} as const;

/**
 * Product owner pill/badge classes
 */
export const PRODUCT_OWNER_BADGE_CLASSES = {
  container: 'flex flex-wrap gap-1',
  badge: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800',
} as const;

// ==========================
// Column Configuration
// ==========================

/**
 * Common column identifiers for sortable columns
 */
export const SORTABLE_COLUMNS = {
  firstName: 'first_name',
  lastName: 'last_name',
  status: 'status',
  dateOfBirth: 'date_of_birth',
  companyName: 'company_name',
  position: 'position',
} as const;

/**
 * Column labels for table headers
 */
export const COLUMN_LABELS = {
  name: 'Name',
  firstName: 'First Name',
  lastName: 'Last Name',
  relationship: 'Relationship',
  dateOfBirth: 'Date of Birth',
  age: 'Age',
  dependency: 'Dependent',
  email: 'Email',
  phone: 'Phone',
  contactDetails: 'Contact Details',
  status: 'Status',
  productOwners: 'Product Owners',
  firmName: 'Firm Name',
  actions: 'Actions',
  company: 'Company',
  position: 'Position',
} as const;

// ==========================
// Default Values
// ==========================

/**
 * Placeholder for missing/null values
 */
export const EMPTY_VALUE_PLACEHOLDER = '-';

/**
 * Default sort configuration (first name ascending)
 */
export const DEFAULT_SORT_CONFIG = {
  column: '',
  direction: 'asc',
} as const;
