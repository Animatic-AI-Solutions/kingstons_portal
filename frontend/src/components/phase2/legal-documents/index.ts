/**
 * Legal Documents Components
 *
 * Phase 2 components for managing legal documents (Wills, LPOAs, EPAs, etc.)
 */

export { default as LegalDocumentsTable } from './LegalDocumentsTable';
export type { LegalDocumentsTableProps } from './LegalDocumentsTable';

export { default as LegalDocumentModal } from './LegalDocumentModal';
export type { LegalDocumentModalProps } from './LegalDocumentModal';

export { default as CreateLegalDocumentModal } from './CreateLegalDocumentModal';
export type { CreateLegalDocumentModalProps } from './CreateLegalDocumentModal';

// Shared utilities and components
export {
  PeopleMultiSelect,
  NOTES_MAX_LENGTH,
  NOTES_WARNING_THRESHOLD,
  TYPE_MAX_LENGTH,
  sanitizeErrorMessage,
} from './shared';
export type { PeopleMultiSelectOption, PeopleMultiSelectProps } from './shared';
