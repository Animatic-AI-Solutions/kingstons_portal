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
 * Matches People tab styling with rounded edges and shadow
 */
export const TABLE_CLASSES = {
  container: 'bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden',
  table: 'min-w-full divide-y divide-gray-200',
  thead: 'bg-gray-50',
  tbody: 'bg-white divide-y divide-gray-200',
} as const;

/**
 * Table header cell classes
 * Matches People tab with bold font and darker text
 */
export const HEADER_CLASSES = {
  base: 'px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider',
  hiddenOnTablet: 'hidden lg:table-cell',
} as const;

/**
 * Table body cell classes
 * Matches People tab with larger text and consistent padding
 */
export const CELL_CLASSES = {
  base: 'px-3 py-2 whitespace-nowrap text-base text-gray-900',
  hiddenOnTablet: 'px-3 py-2 whitespace-nowrap text-base text-gray-900 hidden lg:table-cell',
} as const;

/**
 * Table row classes
 */
export const ROW_CLASSES = {
  base: 'hover:bg-gray-50 cursor-pointer',
} as const;

/**
 * Action button container and button classes
 * Matches People tab styling with padding, backgrounds, and hover states
 */
export const ACTION_CLASSES = {
  container: 'flex items-center gap-1',
  lapseButton: 'p-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  deceasedButton: 'p-1 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  reactivateButton: 'p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
  deleteButton: 'p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
} as const;

/**
 * Status badge classes by status type
 * Matches People tab status badge styling
 */
export const STATUS_BADGE_CLASSES = {
  base: 'px-2 py-1 rounded-full text-sm font-medium',
  Active: 'bg-green-100 text-green-800',
  Inactive: 'bg-gray-200 text-gray-900',
  Deceased: 'bg-gray-300 text-gray-900',
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
