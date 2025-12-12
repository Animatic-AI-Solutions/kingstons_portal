# Delete Confirmation and Undo UX Specification

## Document Purpose

This document addresses **Medium Priority Issue #2**: "Delete confirmation UX missing." It provides comprehensive specifications for delete confirmation modals, undo functionality, and soft delete implementation.

## Table of Contents

1. [Delete Flow Overview](#delete-flow-overview)
2. [Confirmation Modal Design](#confirmation-modal-design)
3. [Undo Toast Notification](#undo-toast-notification)
4. [Soft Delete Implementation](#soft-delete-implementation)
5. [Edge Cases and Error Handling](#edge-cases-and-error-handling)
6. [Accessibility](#accessibility)
7. [Testing Strategy](#testing-strategy)

---

## Delete Flow Overview

### User Journey

```
User clicks Delete button
    ↓
Confirmation modal appears
    ↓
User confirms deletion
    ↓
Modal closes
    ↓
Optimistic UI: Row marked as deleting (greyed out)
    ↓
API call: PATCH /api/special_relationships/{id} (soft delete, set deleted_at timestamp)
    ↓
Success: Row removed from table
    ↓
Toast notification appears: "Relationship deleted" with [Undo] button (5 seconds)
    ↓
If user clicks [Undo] within 5 seconds:
  - API call: PATCH /api/special_relationships/{id}/restore
  - Row reappears in table
  - Toast: "Deletion cancelled"
    ↓
If 5 seconds pass without undo:
  - Toast disappears
  - Deletion is permanent (for user - still soft deleted in database)
```

---

## Confirmation Modal Design

### Visual Design

```
┌───────────────────────────────────────────────┐
│  Delete Relationship?                      [×]│
├───────────────────────────────────────────────┤
│                                               │
│  Are you sure you want to delete              │
│  John Doe (Child)?                            │
│                                               │
│  This action cannot be undone. The            │
│  relationship will be permanently removed     │
│  from this client group.                      │
│                                               │
│                                               │
│            [Cancel]    [Delete]               │
│                                               │
└───────────────────────────────────────────────┘
```

### Implementation

```typescript
// components/DeleteConfirmationModal.tsx

import { Modal } from '@/components/ui';
import { AlertTriangle } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  relationshipName: string;
  relationshipType: string;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  relationshipName,
  relationshipType,
  isDeleting = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Relationship?"
      size="sm"
    >
      <div className="p-6">
        {/* Warning icon */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 text-red-500">
            <AlertTriangle size={24} aria-hidden="true" />
          </div>

          <div className="flex-1">
            <p className="text-sm text-gray-700 mb-3">
              Are you sure you want to delete{' '}
              <span className="font-semibold">
                {relationshipName} ({relationshipType})
              </span>
              ?
            </p>

            <p className="text-sm text-gray-600">
              This action cannot be undone. The relationship will be permanently
              removed from this client group.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isDeleting ? (
              <>
                <span className="animate-spin">⏳</span>
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
```

### Usage in Table Component

```typescript
// SpecialRelationshipActions.tsx

import { DeleteConfirmationModal } from './DeleteConfirmationModal';

export const SpecialRelationshipActions: React.FC<Props> = ({ relationship }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteMutation = useDeleteSpecialRelationship();

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate(relationship.id, {
      onSuccess: () => {
        setShowDeleteConfirm(false);
        // Undo toast will be shown automatically (see below)
      },
      onError: (error) => {
        toast.error(`Failed to delete relationship: ${error.message}`);
        setShowDeleteConfirm(false);
      },
    });
  };

  return (
    <>
      <button
        onClick={handleDeleteClick}
        className="text-red-600 hover:text-red-800"
        aria-label={`Delete ${relationship.name}`}
      >
        Delete
      </button>

      <DeleteConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        relationshipName={relationship.name}
        relationshipType={relationship.relationship_type}
        isDeleting={deleteMutation.isLoading}
      />
    </>
  );
};
```

---

## Undo Toast Notification

### Visual Design

```
┌──────────────────────────────────────┐
│  ✓ Relationship deleted              │
│                                      │
│  John Doe has been removed.          │
│                          [Undo] [×]  │
└──────────────────────────────────────┘

Auto-dismiss after 5 seconds (with countdown)
```

### Implementation

```typescript
// hooks/useDeleteWithUndo.ts

import { useState, useCallback } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  deleteSpecialRelationship,
  restoreSpecialRelationship,
} from '@/services/specialRelationshipsApi';
import { SpecialRelationship } from '@/types/specialRelationship';
import { SPECIAL_RELATIONSHIPS_QUERY_KEY } from './useSpecialRelationships';

interface UndoableDelete {
  relationshipId: string;
  relationshipName: string;
  timeoutId: NodeJS.Timeout;
}

export const useDeleteWithUndo = (clientGroupId: string) => {
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<UndoableDelete | null>(null);

  // Delete mutation (soft delete)
  const deleteMutation = useMutation({
    mutationFn: deleteSpecialRelationship,
    onMutate: async (relationshipId: string) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: [SPECIAL_RELATIONSHIPS_QUERY_KEY, clientGroupId],
      });

      // Snapshot previous value for rollback
      const previousData = queryClient.getQueryData<SpecialRelationship[]>([
        SPECIAL_RELATIONSHIPS_QUERY_KEY,
        clientGroupId,
      ]);

      // Optimistically remove from cache
      queryClient.setQueryData<SpecialRelationship[]>(
        [SPECIAL_RELATIONSHIPS_QUERY_KEY, clientGroupId],
        (old) => old?.filter((r) => r.id !== relationshipId) || []
      );

      return { previousData };
    },
    onError: (err, relationshipId, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          [SPECIAL_RELATIONSHIPS_QUERY_KEY, clientGroupId],
          context.previousData
        );
      }
    },
    onSuccess: (_, relationshipId) => {
      // Find relationship name for toast message
      const previousData = queryClient.getQueryData<SpecialRelationship[]>([
        SPECIAL_RELATIONSHIPS_QUERY_KEY,
        clientGroupId,
      ]);
      const relationship = previousData?.find((r) => r.id === relationshipId);

      // Show undo toast (5 second countdown)
      const toastId = toast.custom(
        (t) => (
          <UndoToast
            message={`${relationship?.name || 'Relationship'} deleted`}
            onUndo={() => handleUndo(relationshipId, toastId)}
            onDismiss={() => toast.dismiss(toastId)}
            visible={t.visible}
          />
        ),
        { duration: 5000, position: 'bottom-right' }
      );

      // Set up timeout to finalize deletion after 5 seconds
      const timeoutId = setTimeout(() => {
        setPendingDelete(null);
        // In a real implementation, you might call a backend endpoint
        // to permanently delete after undo window expires
      }, 5000);

      setPendingDelete({
        relationshipId,
        relationshipName: relationship?.name || 'Relationship',
        timeoutId,
      });
    },
  });

  // Restore mutation (undo delete)
  const restoreMutation = useMutation({
    mutationFn: restoreSpecialRelationship,
    onSuccess: (restoredRelationship) => {
      // Add back to cache
      queryClient.setQueryData<SpecialRelationship[]>(
        [SPECIAL_RELATIONSHIPS_QUERY_KEY, clientGroupId],
        (old) => [...(old || []), restoredRelationship]
      );

      toast.success(`${restoredRelationship.name} restored`, {
        duration: 3000,
        position: 'bottom-right',
      });
    },
    onError: (error) => {
      toast.error(`Failed to restore relationship: ${error.message}`);
    },
  });

  const handleUndo = useCallback(
    (relationshipId: string, toastId: string) => {
      // Clear deletion timeout
      if (pendingDelete?.timeoutId) {
        clearTimeout(pendingDelete.timeoutId);
      }

      // Dismiss undo toast
      toast.dismiss(toastId);

      // Restore relationship
      restoreMutation.mutate(relationshipId);

      // Clear pending delete
      setPendingDelete(null);
    },
    [pendingDelete, restoreMutation]
  );

  return {
    deleteRelationship: deleteMutation.mutate,
    isDeleting: deleteMutation.isLoading,
    pendingDelete,
  };
};
```

### Undo Toast Component

```typescript
// components/UndoToast.tsx

import { X } from 'lucide-react';
import { CheckCircle } from 'lucide-react';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  visible: boolean;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  message,
  onUndo,
  onDismiss,
  visible,
}) => {
  return (
    <div
      className={`
        bg-white border border-gray-300 rounded-lg shadow-lg p-4 flex items-start gap-3 max-w-md
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
      `}
      role="status"
      aria-live="polite"
    >
      <div className="flex-shrink-0 text-green-500">
        <CheckCircle size={20} aria-hidden="true" />
      </div>

      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{message}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onUndo}
          className="text-sm font-medium text-blue-600 hover:text-blue-800 px-3 py-1 rounded hover:bg-blue-50"
        >
          Undo
        </button>

        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
```

---

## Soft Delete Implementation

### Backend API Specification

**Endpoint**: `DELETE /api/special_relationships/{id}`

**Implementation**: Soft delete (sets `deleted_at` timestamp)

```python
# backend/app/api/routes/special_relationships.py

@router.delete("/{relationship_id}", status_code=204)
async def soft_delete_relationship(
    relationship_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Soft delete a special relationship (sets deleted_at timestamp).

    This allows for undo functionality and maintains audit trail.
    Relationships are excluded from GET queries but can be restored.
    """
    async with get_db_connection() as conn:
        # Verify relationship exists and user has permission
        relationship = await conn.fetchrow(
            """
            SELECT sr.*, cg.advisor_id
            FROM special_relationships sr
            JOIN client_groups cg ON sr.client_group_id = cg.id
            WHERE sr.id = $1 AND sr.deleted_at IS NULL
            """,
            relationship_id,
        )

        if not relationship:
            raise HTTPException(status_code=404, detail="Relationship not found")

        if relationship['advisor_id'] != current_user.id:
            raise HTTPException(status_code=403, detail="Permission denied")

        # Soft delete (set deleted_at timestamp)
        await conn.execute(
            """
            UPDATE special_relationships
            SET deleted_at = NOW(), updated_at = NOW()
            WHERE id = $1
            """,
            relationship_id,
        )

    return Response(status_code=204)
```

**Restore Endpoint**: `PATCH /api/special_relationships/{id}/restore`

```python
@router.patch("/{relationship_id}/restore", response_model=SpecialRelationship)
async def restore_relationship(
    relationship_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Restore a soft-deleted special relationship (clears deleted_at timestamp).

    Only works if relationship was deleted within last 5 minutes
    (undo window) and user has permission.
    """
    async with get_db_connection() as conn:
        # Verify relationship exists and was recently deleted
        relationship = await conn.fetchrow(
            """
            SELECT sr.*, cg.advisor_id
            FROM special_relationships sr
            JOIN client_groups cg ON sr.client_group_id = cg.id
            WHERE sr.id = $1
              AND sr.deleted_at IS NOT NULL
              AND sr.deleted_at > NOW() - INTERVAL '5 minutes'
            """,
            relationship_id,
        )

        if not relationship:
            raise HTTPException(
                status_code=404,
                detail="Relationship not found or undo window expired"
            )

        if relationship['advisor_id'] != current_user.id:
            raise HTTPException(status_code=403, detail="Permission denied")

        # Restore relationship (clear deleted_at)
        result = await conn.fetchrow(
            """
            UPDATE special_relationships
            SET deleted_at = NULL, updated_at = NOW()
            WHERE id = $1
            RETURNING *
            """,
            relationship_id,
        )

    return SpecialRelationship(**dict(result))
```

### Database Schema

```sql
-- special_relationships table (add deleted_at column)

ALTER TABLE special_relationships
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Create index for soft delete queries
CREATE INDEX idx_special_relationships_deleted_at
ON special_relationships(deleted_at)
WHERE deleted_at IS NULL;

-- Update GET query to exclude soft-deleted relationships
SELECT * FROM special_relationships
WHERE client_group_id = $1
  AND deleted_at IS NULL  -- Exclude soft-deleted
ORDER BY name ASC;
```

---

## Edge Cases and Error Handling

### 1. Delete Fails on Backend

**Scenario**: API returns error during delete

**Handling**:
```typescript
deleteMutation.mutate(relationshipId, {
  onError: (error) => {
    // Rollback optimistic update (handled automatically by React Query)

    // Show error toast
    toast.error(
      `Failed to delete relationship: ${error.message}. Please try again.`,
      { duration: 5000 }
    );

    // Close confirmation modal
    setShowDeleteConfirm(false);
  },
});
```

**User Experience**: Row remains in table, error message explains what happened

---

### 2. Undo Fails on Backend

**Scenario**: User clicks Undo but restore API fails (e.g., 5-minute window expired)

**Handling**:
```typescript
restoreMutation.mutate(relationshipId, {
  onError: (error) => {
    if (error.message.includes('undo window expired')) {
      toast.error(
        'Undo window has expired. The relationship cannot be restored.',
        { duration: 5000 }
      );
    } else {
      toast.error(
        `Failed to restore relationship: ${error.message}`,
        { duration: 5000 }
      );
    }
  },
});
```

**User Experience**: Undo button doesn't work after 5 minutes, error explains why

---

### 3. Network Failure During Delete

**Scenario**: User deletes relationship, goes offline, API call queued

**Handling**:
```typescript
// Use React Query's retry mechanism
const deleteMutation = useMutation({
  mutationFn: deleteSpecialRelationship,
  retry: 2, // Retry twice on failure
  retryDelay: 1000, // 1 second between retries
  onError: (error) => {
    if (error.message.includes('Network')) {
      toast.error(
        'Network error. Please check your connection and try again.',
        { duration: 5000 }
      );
    }
  },
});
```

**User Experience**: Automatic retry, clear error if ultimately fails

---

### 4. Concurrent Deletion

**Scenario**: Two users try to delete same relationship simultaneously

**Handling**:
```python
# Backend handles with optimistic locking or idempotent delete
@router.delete("/{relationship_id}")
async def soft_delete_relationship(relationship_id: str, current_user: User):
    result = await conn.execute(
        """
        UPDATE special_relationships
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL  -- Only delete if not already deleted
        RETURNING id
        """,
        relationship_id,
    )

    if result == "UPDATE 0":
        # Already deleted (idempotent - return success anyway)
        return Response(status_code=204)

    return Response(status_code=204)
```

**User Experience**: Both users see deletion succeed (idempotent operation)

---

### 5. User Navigates Away During Undo Window

**Scenario**: User deletes relationship, sees undo toast, navigates to different page

**Handling**:
```typescript
// Clean up timeout on component unmount
useEffect(() => {
  return () => {
    if (pendingDelete?.timeoutId) {
      clearTimeout(pendingDelete.timeoutId);
    }
  };
}, [pendingDelete]);
```

**User Experience**: Undo toast disappears when navigating away, deletion persists (no undo option after navigation)

**Alternative (persist across navigation)**:
```typescript
// Store pending delete in global state (Zustand, Redux, etc.)
// Allow undo from anywhere in app within 5-minute window
```

**Recommendation**: Use simple approach (undo only on same page) for v1 implementation

---

## Accessibility

### Confirmation Modal

**ARIA Attributes**:
```typescript
<div
  role="alertdialog"
  aria-modal="true"
  aria-labelledby="delete-modal-title"
  aria-describedby="delete-modal-description"
>
  <h2 id="delete-modal-title">Delete Relationship?</h2>
  <p id="delete-modal-description">
    Are you sure you want to delete {relationshipName} ({relationshipType})?
    This action cannot be undone.
  </p>

  <button onClick={onClose}>Cancel</button>
  <button onClick={onConfirm} autoFocus>Delete</button>
</div>
```

**Focus Management**:
- Focus moves to Delete button when modal opens (dangerous action)
- Escape key closes modal (Cancel action)
- Tab key cycles between Cancel and Delete buttons
- Focus returns to Delete button in table row when modal closes

---

### Undo Toast

**ARIA Attributes**:
```typescript
<div
  role="status"
  aria-live="polite"
  aria-atomic="true"
>
  <p>{message}</p>
  <button onClick={onUndo}>Undo</button>
  <button onClick={onDismiss} aria-label="Dismiss notification">×</button>
</div>
```

**Screen Reader Announcements**:
- "Relationship deleted. Undo button available." (announced automatically)
- After undo: "Deletion cancelled. Relationship restored."

---

## Testing Strategy

### Unit Tests

```typescript
// tests/components/DeleteConfirmationModal.test.tsx

describe('DeleteConfirmationModal', () => {
  test('shows relationship name and type in confirmation message', () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        relationshipName="John Doe"
        relationshipType="Child"
        isDeleting={false}
      />
    );

    expect(screen.getByText(/John Doe \(Child\)/)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/)).toBeInTheDocument();
  });

  test('calls onConfirm when Delete button clicked', async () => {
    const user = userEvent.setup();
    const handleConfirm = jest.fn();

    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={handleConfirm}
        relationshipName="John Doe"
        relationshipType="Child"
        isDeleting={false}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  test('disables buttons when isDeleting is true', () => {
    render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        relationshipName="John Doe"
        relationshipType="Child"
        isDeleting={true}
      />
    );

    expect(screen.getByRole('button', { name: /Deleting/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  test('has accessible alertdialog role', () => {
    const { container } = render(
      <DeleteConfirmationModal
        isOpen={true}
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        relationshipName="John Doe"
        relationshipType="Child"
        isDeleting={false}
      />
    );

    expect(container.querySelector('[role="alertdialog"]')).toBeInTheDocument();
    expect(container.querySelector('[aria-modal="true"]')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// tests/integration/DeleteWithUndo.test.tsx

describe('Delete with Undo Flow', () => {
  test('full delete and undo flow', async () => {
    const user = userEvent.setup();

    render(<PersonalRelationshipsTable clientGroupId="cg-1" />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click Delete button
    await user.click(screen.getByRole('button', { name: /Delete John Doe/ }));

    // Confirmation modal appears
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure.*John Doe/)).toBeInTheDocument();

    // Confirm deletion
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    // Row disappears
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    // Undo toast appears
    expect(await screen.findByText(/John Doe deleted/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();

    // Click Undo within 5 seconds
    await user.click(screen.getByRole('button', { name: 'Undo' }));

    // Row reappears
    expect(await screen.findByText('John Doe')).toBeInTheDocument();

    // Success toast appears
    expect(await screen.findByText(/John Doe restored/)).toBeInTheDocument();
  });

  test('deletion persists after undo window expires', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });

    render(<PersonalRelationshipsTable clientGroupId="cg-1" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Delete relationship
    await user.click(screen.getByRole('button', { name: /Delete John Doe/ }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    // Wait for undo toast
    await waitFor(() => {
      expect(screen.getByText(/John Doe deleted/)).toBeInTheDocument();
    });

    // Fast-forward 6 seconds (past 5-second undo window)
    jest.advanceTimersByTime(6000);

    // Toast should be gone
    await waitFor(() => {
      expect(screen.queryByText(/John Doe deleted/)).not.toBeInTheDocument();
    });

    // Row should still be deleted
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();

    jest.useRealTimers();
  });
});
```

---

## Summary

### Components to Create

1. **DeleteConfirmationModal** - 1 hour
2. **UndoToast** - 30 min
3. **useDeleteWithUndo** hook - 1.5 hours

### Backend Work Required

1. Add `deleted_at` column to `special_relationships` table - 15 min
2. Update DELETE endpoint to soft delete - 30 min
3. Create PATCH /restore endpoint - 30 min
4. Update GET queries to exclude deleted - 15 min

**Total Effort**: ~4-5 hours (frontend + backend)

### Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Delete Type** | Soft delete | Enables undo, maintains audit trail |
| **Undo Window** | 5 seconds | Balances user experience with database cleanup |
| **Undo Scope** | Same page only | Simple implementation, clear UX boundaries |
| **Confirmation** | Always required | Prevents accidental deletion of important data |
| **Toast Position** | Bottom-right | Doesn't obscure table content, follows toast conventions |

This specification ensures users can safely delete relationships with clear confirmation and the ability to undo mistakes, addressing the medium priority issue of missing delete confirmation UX.
