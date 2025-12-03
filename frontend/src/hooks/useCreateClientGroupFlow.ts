/**
 * Custom hook for orchestrating client group creation with multi-step API calls
 *
 * Handles the 4-step process:
 * 1. Create addresses (one per product owner) - parallel
 * 2. Create product owners (with address_ids) - parallel
 * 3. Create client group - single call
 * 4. Create junction records (link owners to group) - parallel
 *
 * Includes automatic rollback on failures at any step.
 *
 * @returns Mutation function, loading state, error, progress tracking, and created group ID
 */

import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import type { CreateClientGroupFormState } from '@/types/clientGroupForm';
import {
  createAddress,
  deleteAddress,
  type Address,
} from '@/services/api/addresses';
import {
  createProductOwner,
  deleteProductOwner,
  type ProductOwner,
} from '@/services/api/productOwners';
import {
  createClientGroup,
  deleteClientGroup,
  type ClientGroup,
} from '@/services/api/clientGroups';
import {
  createClientGroupProductOwner,
  type ClientGroupProductOwner,
} from '@/services/api/clientGroupProductOwners';

/**
 * Progress states for the multi-step API call sequence
 */
type ProgressState = 'idle' | 'addresses' | 'owners' | 'group' | 'junctions' | 'complete';

/**
 * Hook return type defining mutation function, state, and actions
 */
interface UseCreateClientGroupFlowReturn {
  // Mutation function
  createClientGroup: (data: CreateClientGroupFormState) => Promise<number>;

  // State
  isLoading: boolean;
  error: Error | null;
  progress: ProgressState;
  createdGroupId: number | null;

  // Actions
  reset: () => void;
}

/**
 * Custom hook for orchestrating client group creation with multi-step API calls
 *
 * Executes a complex 4-step API call sequence with automatic rollback on failures.
 * Uses React Query for the main mutation but performs sequential API calls internally.
 *
 * **API Call Sequence:**
 * 1. **Create Addresses** - Creates one address per product owner in parallel
 * 2. **Create Product Owners** - Creates product owners with address_ids in parallel
 * 3. **Create Client Group** - Creates the client group record (single call)
 * 4. **Create Junctions** - Links product owners to client group in parallel
 *
 * **Rollback Strategy:**
 * - If step 2 fails: Delete all created addresses
 * - If step 3 fails: Delete all created addresses and product owners
 * - If step 4 fails: Delete all created addresses, product owners, and client group
 *
 * **Progress Tracking:**
 * The `progress` state updates at each step to enable UI loading indicators:
 * - `idle` - Initial state, no operation in progress
 * - `addresses` - Creating addresses
 * - `owners` - Creating product owners
 * - `group` - Creating client group
 * - `junctions` - Creating junction records
 * - `complete` - All steps completed successfully
 *
 * @example
 * ```typescript
 * const {
 *   createClientGroup,
 *   isLoading,
 *   error,
 *   progress,
 *   createdGroupId
 * } = useCreateClientGroupFlow();
 *
 * const handleSubmit = async () => {
 *   try {
 *     const groupId = await createClientGroup({
 *       clientGroup: formData.clientGroup,
 *       productOwners: formData.productOwners
 *     });
 *     navigate(`/client-groups/${groupId}`);
 *   } catch (err) {
 *     // Error handling - rollback already attempted
 *   }
 * };
 * ```
 */
export const useCreateClientGroupFlow = (): UseCreateClientGroupFlowReturn => {
  const [progress, setProgress] = useState<ProgressState>('idle');
  const [createdGroupId, setCreatedGroupId] = useState<number | null>(null);

  /**
   * Main mutation function that executes the 4-step API call sequence
   * Includes rollback logic on failures
   */
  const mutation = useMutation({
    mutationFn: async (data: CreateClientGroupFormState): Promise<number> => {
      // Track created entities for rollback purposes
      const createdAddresses: Address[] = [];
      const createdOwners: ProductOwner[] = [];
      let createdGroup: ClientGroup | null = null;
      const createdJunctions: ClientGroupProductOwner[] = [];

      try {
        // Step 1: Create addresses (one per product owner) - parallel
        setProgress('addresses');
        const addressPromises = data.productOwners.map((po) =>
          createAddress(po.address)
        );
        const addresses = await Promise.all(addressPromises);
        createdAddresses.push(...addresses);

        // Step 2: Create product owners (with address_ids) - parallel
        setProgress('owners');
        const ownerPromises = data.productOwners.map((po, index) =>
          createProductOwner({
            ...po.productOwner,
            address_id: addresses[index].id,
          })
        );
        const owners = await Promise.all(ownerPromises);
        createdOwners.push(...owners);

        // Step 3: Create client group - single call
        setProgress('group');
        const group = await createClientGroup(data.clientGroup);
        createdGroup = group;

        // Step 4: Create junction records (link owners to group) - parallel
        setProgress('junctions');
        const junctionPromises = owners.map((owner) =>
          createClientGroupProductOwner({
            client_group_id: group.id,
            product_owner_id: owner.id,
          })
        );
        const junctions = await Promise.all(junctionPromises);
        createdJunctions.push(...junctions);

        // Success - return created group ID
        setProgress('complete');
        return group.id;
      } catch (error) {
        // Rollback strategy - delete in reverse order
        console.error('Client group creation failed, attempting rollback:', error);

        await performRollback(
          createdAddresses,
          createdOwners,
          createdGroup,
          progress
        );

        // Re-throw error for React Query to handle
        throw error;
      }
    },
    onSuccess: (groupId) => {
      setCreatedGroupId(groupId);
    },
    onError: (error) => {
      console.error('Client group creation failed:', error);
      // Progress state already set during rollback
    },
  });

  /**
   * Performs rollback operations based on which step failed
   * Deletes created entities in reverse order to maintain referential integrity
   *
   * @param addresses - Created addresses to potentially delete
   * @param owners - Created product owners to potentially delete
   * @param group - Created client group to potentially delete
   * @param failedAtStep - The progress state where failure occurred
   */
  const performRollback = async (
    addresses: Address[],
    owners: ProductOwner[],
    group: ClientGroup | null,
    failedAtStep: ProgressState
  ): Promise<void> => {
    try {
      // If junctions step failed: delete group, owners, and addresses
      if (failedAtStep === 'junctions' && group) {
        console.log('Rolling back: Deleting client group, product owners, and addresses');
        await deleteClientGroup(group.id);

        // Delete all product owners in parallel
        await Promise.all(owners.map((owner) => deleteProductOwner(owner.id)));

        // Delete all addresses in parallel
        await Promise.all(addresses.map((address) => deleteAddress(address.id)));
      }
      // If group step failed: delete owners and addresses
      else if (failedAtStep === 'group' && owners.length > 0) {
        console.log('Rolling back: Deleting product owners and addresses');

        // Delete all product owners in parallel
        await Promise.all(owners.map((owner) => deleteProductOwner(owner.id)));

        // Delete all addresses in parallel
        await Promise.all(addresses.map((address) => deleteAddress(address.id)));
      }
      // If owners step failed: delete addresses
      else if (failedAtStep === 'owners' && addresses.length > 0) {
        console.log('Rolling back: Deleting addresses');

        // Delete all addresses in parallel
        await Promise.all(addresses.map((address) => deleteAddress(address.id)));
      }
      // If addresses step failed: nothing to rollback
      else if (failedAtStep === 'addresses') {
        console.log('Rollback: No entities to delete (addresses step failed)');
      }
    } catch (rollbackError) {
      // Log rollback failures but don't throw - original error is more important
      console.error('Rollback failed:', rollbackError);
      console.error('Manual cleanup may be required for:', {
        addresses: addresses.map((a) => a.id),
        owners: owners.map((o) => o.id),
        group: group?.id,
      });
    }
  };

  /**
   * Resets the mutation state back to initial values
   * Clears progress, created group ID, and mutation state
   */
  const reset = useCallback(() => {
    setProgress('idle');
    setCreatedGroupId(null);
    mutation.reset();
  }, [mutation]);

  return {
    createClientGroup: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    progress,
    createdGroupId,
    reset,
  };
};
