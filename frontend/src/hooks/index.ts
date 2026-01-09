/**
 * Hooks index - Central export point for all custom React hooks
 *
 * This file provides a convenient single import location for all custom hooks
 * used throughout the application.
 */

// Client Group Form Management
export { useClientGroupForm } from './useClientGroupForm';
export { useCreateClientGroupFlow } from './useCreateClientGroupFlow';

// Client Data Hooks
export { useClientData } from './useClientData';
export { useOptimizedClientData } from './useOptimizedClientData';
export { useClientDetails } from './useClientDetails';
export { useClientMutations } from './useClientMutations';

// Dashboard and Navigation
export { useDashboardData } from './useDashboardData';
export { useSmartNavigation } from './useSmartNavigation';
export { useNavigationRefresh } from './useNavigationRefresh';

// Product and Portfolio Hooks
export { useProductDetails } from './useProductDetails';
export { usePortfolioGenerations } from './usePortfolioGenerations';
export { usePortfolioTemplates } from './usePortfolioTemplates';

// Account Hooks
export { useAccountDetails } from './useAccountDetails';

// Presence and Concurrent User Detection
export { usePresence } from './usePresence';
export { usePresenceWithNotifications } from './usePresenceWithNotifications';
export { useConcurrentUserDetection } from './useConcurrentUserDetection';

// Entity Data
export { useEntityData } from './useEntityData';

// Health and Vulnerability Hooks (Cycle 6)
export {
  // Query key factory
  healthVulnerabilityKeys,
  // Query hooks
  useHealthProductOwners,
  useHealthSpecialRelationships,
  useVulnerabilitiesProductOwners,
  useVulnerabilitiesSpecialRelationships,
  // Mutation hooks
  useCreateHealthRecord,
  useUpdateHealthRecord,
  useDeleteHealthRecord,
  useCreateVulnerability,
  useUpdateVulnerability,
  useDeleteVulnerability,
} from './useHealthVulnerabilities';
