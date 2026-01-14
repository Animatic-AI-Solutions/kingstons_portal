/**
 * Shared utilities and components for legal documents
 *
 * @module components/phase2/legal-documents/shared
 */

export { default as PeopleMultiSelect } from './PeopleMultiSelect';
export type { PeopleMultiSelectOption, PeopleMultiSelectProps } from './PeopleMultiSelect';

export { NOTES_MAX_LENGTH, NOTES_WARNING_THRESHOLD, TYPE_MAX_LENGTH } from './constants';

export { sanitizeErrorMessage } from './errorUtils';
