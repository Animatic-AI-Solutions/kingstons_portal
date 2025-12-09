/**
 * API Services Barrel Export
 *
 * Centralized export for all CreateClientGroup API services.
 * Enables clean imports throughout the application.
 *
 * @example
 * // Import specific services
 * import { createAddress, createProductOwner } from '@/services/api';
 *
 * // Import types
 * import type { Address, ProductOwner } from '@/services/api';
 */

// Address API
export * from './addresses';

// Product Owner API
export * from './productOwners';

// Client Group API
export * from './clientGroups';

// Client Group Product Owners Junction API
export * from './clientGroupProductOwners';

// Product Owner Status Update API
export * from './updateProductOwner';

// Product Owner Delete API
export * from './deleteProductOwner';
