/**
 * Phase 2 Components Index
 *
 * Barrel export for Phase 2 (modern, consistent) components.
 * Phase 2 components follow reference patterns from People tab.
 *
 * @module components/phase2
 */

// People Tab (Reference Implementation)
export { default as ProductOwnerTable } from './people/ProductOwnerTable';
export { default as ProductOwnerActions } from './people/ProductOwnerActions';
export { default as CreateProductOwnerModal } from './people/CreateProductOwnerModal';
export { default as EditProductOwnerModal } from './people/EditProductOwnerModal';
export { default as EditProductOwnerForm } from './people/EditProductOwnerForm';
export { default as DeleteConfirmationModal } from './people/DeleteConfirmationModal';
export { default as PresenceIndicator } from './people/PresenceIndicator';
export { default as PresenceNotifications } from './people/PresenceNotifications';

// Special Relationships Tab
export { default as SpecialRelationshipsSubTab } from './special-relationships/SpecialRelationshipsSubTab';
export { default as PersonalRelationshipsTable } from './special-relationships/PersonalRelationshipsTable';
export { default as ProfessionalRelationshipsTable } from './special-relationships/ProfessionalRelationshipsTable';
export { default as PersonalRelationshipFormFields } from './special-relationships/PersonalRelationshipFormFields';
export { default as ProfessionalRelationshipFormFields } from './special-relationships/ProfessionalRelationshipFormFields';
export { default as CreatePersonalRelationshipModal } from './special-relationships/CreatePersonalRelationshipModal';
export { default as CreateProfessionalRelationshipModal } from './special-relationships/CreateProfessionalRelationshipModal';
export { default as EditSpecialRelationshipModal } from './special-relationships/EditSpecialRelationshipModal';
export { default as EmptyStatePersonal } from './special-relationships/EmptyStatePersonal';
export { default as EmptyStateProfessional } from './special-relationships/EmptyStateProfessional';

// Client Groups
export { default as DynamicPageContainer } from './client-groups/DynamicPageContainer';
