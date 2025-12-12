# Empty States and Loading States Specification

## Document Purpose

This document addresses **Medium Priority Issue #1**: "Empty state design not specified." It provides comprehensive specifications for all empty states, loading states, and error states in the Special Relationships feature.

## Table of Contents

1. [State Categories](#state-categories)
2. [Empty State Designs](#empty-state-designs)
3. [Loading State Designs](#loading-state-designs)
4. [Error State Designs](#error-state-designs)
5. [Implementation Patterns](#implementation-patterns)
6. [Component Specifications](#component-specifications)
7. [Testing Strategy](#testing-strategy)

---

## State Categories

### Data States to Handle

| State | When It Occurs | User Experience Goal |
|-------|----------------|---------------------|
| **Empty (No Data)** | First-time user, no relationships added yet | Guide user to add first relationship |
| **Empty (Filtered)** | Search/filter returns no results | Help user understand why empty, offer to clear filters |
| **Empty (Tab-Specific)** | Personal tab has data, Professional tab empty (or vice versa) | Guide user to add relationship in specific category |
| **Loading (Initial)** | Fetching relationships for first time | Show skeleton to indicate loading |
| **Loading (Refresh)** | Refetching relationships in background | Subtle spinner, don't hide existing data |
| **Error (Network)** | API call failed due to network issue | Offer retry with helpful error message |
| **Error (Permission)** | User lacks permission to view relationships | Explain issue, suggest contacting admin |
| **Error (Server)** | 500 error from backend | Apologize, offer retry, suggest refresh |

---

## Empty State Designs

### 1. Empty State - No Relationships Yet (First-Time User)

**When**: User navigates to Special Relationships tab, no relationships exist for this client group

**Visual Design**:
```
┌────────────────────────────────────────────┐
│                                            │
│            [Icon: People/Handshake]        │
│                                            │
│         No relationships added yet         │
│                                            │
│   Track personal and professional          │
│   relationships to build comprehensive     │
│   client profiles.                         │
│                                            │
│         [Add Relationship Button]          │
│                                            │
└────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// components/EmptyStateNoRelationships.tsx

import { Users } from 'lucide-react';
import { AddButton } from '@/components/ui';

interface EmptyStateNoRelationshipsProps {
  onAddClick: () => void;
}

export const EmptyStateNoRelationships: React.FC<EmptyStateNoRelationshipsProps> = ({
  onAddClick,
}) => {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 text-gray-400">
        <Users size={64} aria-hidden="true" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No relationships added yet
      </h3>

      <p className="text-sm text-gray-600 max-w-md mb-6">
        Track personal and professional relationships to build comprehensive client profiles.
      </p>

      <AddButton
        onClick={onAddClick}
        label="Add Relationship"
        variant="primary"
      />
    </div>
  );
};
```

**Accessibility**:
- `role="status"` announces to screen readers
- `aria-live="polite"` ensures announcement doesn't interrupt
- Icon has `aria-hidden="true"` (decorative only)
- Button has clear, descriptive label

---

### 2. Empty State - Personal Tab Only

**When**: User switches to Personal tab, only professional relationships exist

**Visual Design**:
```
┌────────────────────────────────────────────┐
│                                            │
│         [Icon: Family/User Group]          │
│                                            │
│      No personal relationships yet         │
│                                            │
│   Add family members and dependents to     │
│   track personal connections.              │
│                                            │
│      [Add Personal Relationship]           │
│                                            │
└────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// components/EmptyStatePersonal.tsx

import { Users } from 'lucide-react';
import { AddButton } from '@/components/ui';

export const EmptyStatePersonal: React.FC<{ onAddClick: () => void }> = ({
  onAddClick,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 text-gray-400">
        <Users size={64} aria-hidden="true" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No personal relationships yet
      </h3>

      <p className="text-sm text-gray-600 max-w-md mb-6">
        Add family members and dependents to track personal connections.
      </p>

      <AddButton
        onClick={onAddClick}
        label="Add Personal Relationship"
        variant="primary"
      />
    </div>
  );
};
```

---

### 3. Empty State - Professional Tab Only

**When**: User switches to Professional tab, only personal relationships exist

**Visual Design**:
```
┌────────────────────────────────────────────┐
│                                            │
│         [Icon: Briefcase]                  │
│                                            │
│   No professional relationships yet        │
│                                            │
│   Add accountants, solicitors, and other   │
│   professional contacts.                   │
│                                            │
│    [Add Professional Relationship]         │
│                                            │
└────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// components/EmptyStateProfessional.tsx

import { Briefcase } from 'lucide-react';
import { AddButton } from '@/components/ui';

export const EmptyStateProfessional: React.FC<{ onAddClick: () => void }> = ({
  onAddClick,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 text-gray-400">
        <Briefcase size={64} aria-hidden="true" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No professional relationships yet
      </h3>

      <p className="text-sm text-gray-600 max-w-md mb-6">
        Add accountants, solicitors, and other professional contacts.
      </p>

      <AddButton
        onClick={onAddClick}
        label="Add Professional Relationship"
        variant="primary"
      />
    </div>
  );
};
```

---

### 4. Empty State - No Search Results

**When**: User searches/filters and no relationships match

**Visual Design**:
```
┌────────────────────────────────────────────┐
│                                            │
│         [Icon: Search with X]              │
│                                            │
│         No results found for "John"        │
│                                            │
│   Try adjusting your search or             │
│   [clear filters] to see all relationships.│
│                                            │
└────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// components/EmptyStateNoResults.tsx

import { SearchX } from 'lucide-react';

interface EmptyStateNoResultsProps {
  searchTerm: string;
  onClearSearch: () => void;
}

export const EmptyStateNoResults: React.FC<EmptyStateNoResultsProps> = ({
  searchTerm,
  onClearSearch,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 text-gray-400">
        <SearchX size={48} aria-hidden="true" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        No results found{searchTerm && ` for "${searchTerm}"`}
      </h3>

      <p className="text-sm text-gray-600 max-w-md">
        Try adjusting your search or{' '}
        <button
          onClick={onClearSearch}
          className="text-blue-600 hover:text-blue-800 underline"
        >
          clear filters
        </button>{' '}
        to see all relationships.
      </p>
    </div>
  );
};
```

---

## Loading State Designs

### 1. Loading Skeleton (Initial Load)

**When**: First time loading relationships for client group

**Visual Design**:
```
┌────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓  ▓▓▓▓▓▓  ▓▓▓  ▓▓▓▓▓▓▓  ▓▓▓  ▓▓▓▓ │ <- Header
├────────────────────────────────────────────┤
│ ░░░░░░░  ░░░░░░  ░░░  ░░░░░░░  ░░░  ░░░░ │ <- Row 1
│ ░░░░░░░  ░░░░░░  ░░░  ░░░░░░░  ░░░  ░░░░ │ <- Row 2
│ ░░░░░░░  ░░░░░░  ░░░  ░░░░░░░  ░░░  ░░░░ │ <- Row 3
│ ░░░░░░░  ░░░░░░  ░░░  ░░░░░░░  ░░░  ░░░░ │ <- Row 4
└────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// components/SkeletonTable.tsx

export const SkeletonTableRow: React.FC = () => {
  return (
    <tr className="animate-pulse">
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-28"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
      </td>
      <td className="px-4 py-3">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </td>
    </tr>
  );
};

export const SkeletonTable: React.FC<{ rowCount?: number }> = ({
  rowCount = 4,
}) => {
  return (
    <div role="status" aria-live="polite" aria-label="Loading relationships">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Relationship</th>
            <th className="px-4 py-3 text-left">Age</th>
            <th className="px-4 py-3 text-left">Email</th>
            <th className="px-4 py-3 text-left">Phone</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rowCount }).map((_, index) => (
            <SkeletonTableRow key={index} />
          ))}
        </tbody>
      </table>
      <span className="sr-only">Loading relationships...</span>
    </div>
  );
};
```

**Accessibility**:
- `role="status"` announces loading state
- `aria-live="polite"` ensures screen reader announcement
- `.sr-only` text provides context for screen readers

---

### 2. Loading Spinner (Background Refresh)

**When**: Refetching relationships after mutation or manual refresh

**Visual Design**:
```
┌────────────────────────────────────────────┐
│  [Spinner] Refreshing...          [×]      │ <- Toast notification
└────────────────────────────────────────────┘

(Table remains visible with existing data)
```

**Implementation**:
```typescript
// components/RefreshingIndicator.tsx

import { Loader2 } from 'lucide-react';

export const RefreshingIndicator: React.FC = () => {
  return (
    <div
      className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg px-4 py-3 flex items-center gap-3"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="animate-spin text-blue-600" size={20} aria-hidden="true" />
      <span className="text-sm text-gray-700">Refreshing relationships...</span>
    </div>
  );
};
```

**When to Use**:
- Background refetch after create/edit/delete
- Manual refresh triggered by user
- **DO NOT use** for initial load (use skeleton instead)

---

### 3. Optimistic Update Loading (Inline)

**When**: Status change or quick update with optimistic UI

**Visual Design**:
```
Table Row (during optimistic update):
┌────────────────────────────────────────────┐
│ John Doe │ Child │ 25 │ [Saving...] Active │
└────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// components/SpecialRelationshipRow.tsx

export const SpecialRelationshipRow: React.FC<Props> = ({
  relationship,
  isUpdating,
}) => {
  return (
    <tr className={isUpdating ? 'opacity-60' : ''}>
      {/* ... cells ... */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {isUpdating && (
            <Loader2 className="animate-spin text-gray-400" size={14} aria-hidden="true" />
          )}
          <StatusBadge status={relationship.status} />
        </div>
      </td>
    </tr>
  );
};
```

---

## Error State Designs

### 1. Error State - Network Failure

**When**: API call fails due to network issue (offline, timeout, etc.)

**Visual Design**:
```
┌────────────────────────────────────────────┐
│                                            │
│         [Icon: Wifi Off/Cloud X]           │
│                                            │
│       Unable to load relationships         │
│                                            │
│   Check your internet connection and       │
│   try again.                               │
│                                            │
│            [Try Again Button]              │
│                                            │
└────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// components/ErrorStateNetwork.tsx

import { WifiOff } from 'lucide-react';
import { ActionButton } from '@/components/ui';

interface ErrorStateNetworkProps {
  onRetry: () => void;
}

export const ErrorStateNetwork: React.FC<ErrorStateNetworkProps> = ({
  onRetry,
}) => {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="alert"
      aria-live="assertive"
    >
      <div className="mb-4 text-red-400">
        <WifiOff size={48} aria-hidden="true" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Unable to load relationships
      </h3>

      <p className="text-sm text-gray-600 max-w-md mb-6">
        Check your internet connection and try again.
      </p>

      <ActionButton onClick={onRetry} label="Try Again" variant="primary" />
    </div>
  );
};
```

**Accessibility**:
- `role="alert"` announces error immediately
- `aria-live="assertive"` interrupts screen reader (appropriate for errors)

---

### 2. Error State - Server Error (500)

**When**: Backend returns 500 error or unexpected error

**Visual Design**:
```
┌────────────────────────────────────────────┐
│                                            │
│         [Icon: Alert Triangle]             │
│                                            │
│       Something went wrong                 │
│                                            │
│   We're having trouble loading your        │
│   relationships. Please try again or       │
│   refresh the page.                        │
│                                            │
│   [Try Again]  [Refresh Page]              │
│                                            │
└────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// components/ErrorStateServer.tsx

import { AlertTriangle } from 'lucide-react';
import { ActionButton } from '@/components/ui';

interface ErrorStateServerProps {
  onRetry: () => void;
  errorMessage?: string;
}

export const ErrorStateServer: React.FC<ErrorStateServerProps> = ({
  onRetry,
  errorMessage,
}) => {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="alert"
    >
      <div className="mb-4 text-red-500">
        <AlertTriangle size={48} aria-hidden="true" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Something went wrong
      </h3>

      <p className="text-sm text-gray-600 max-w-md mb-2">
        We're having trouble loading your relationships. Please try again or refresh
        the page.
      </p>

      {errorMessage && (
        <details className="text-xs text-gray-500 mb-6">
          <summary className="cursor-pointer">Technical details</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded text-left overflow-auto">
            {errorMessage}
          </pre>
        </details>
      )}

      <div className="flex gap-3">
        <ActionButton onClick={onRetry} label="Try Again" variant="primary" />
        <ActionButton
          onClick={() => window.location.reload()}
          label="Refresh Page"
          variant="secondary"
        />
      </div>
    </div>
  );
};
```

---

### 3. Error State - Permission Denied

**When**: User lacks permission to view relationships (403 error)

**Visual Design**:
```
┌────────────────────────────────────────────┐
│                                            │
│         [Icon: Lock/Shield X]              │
│                                            │
│       Access denied                        │
│                                            │
│   You don't have permission to view        │
│   relationships for this client group.     │
│   Please contact your administrator.       │
│                                            │
└────────────────────────────────────────────┘
```

**Implementation**:
```typescript
// components/ErrorStatePermission.tsx

import { Lock } from 'lucide-react';

export const ErrorStatePermission: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-4 text-gray-400">
        <Lock size={48} aria-hidden="true" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">Access denied</h3>

      <p className="text-sm text-gray-600 max-w-md">
        You don't have permission to view relationships for this client group. Please
        contact your administrator.
      </p>
    </div>
  );
};
```

---

## Implementation Patterns

### State Management in Components

```typescript
// PersonalRelationshipsTable.tsx

import { useSpecialRelationships } from '@/hooks/useSpecialRelationships';
import {
  EmptyStatePersonal,
  SkeletonTable,
  ErrorStateNetwork,
  ErrorStateServer,
} from '@/components/special-relationships';

export const PersonalRelationshipsTable: React.FC<Props> = ({ clientGroupId }) => {
  const { data, isLoading, isError, error, refetch } = useSpecialRelationships(clientGroupId);

  // Filter personal relationships
  const personalRelationships = useMemo(
    () => data?.filter(r => !r.is_professional) || [],
    [data]
  );

  // Loading state (initial load)
  if (isLoading) {
    return <SkeletonTable rowCount={5} />;
  }

  // Error states
  if (isError) {
    // Network error (offline, timeout)
    if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
      return <ErrorStateNetwork onRetry={refetch} />;
    }

    // Permission error (403)
    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      return <ErrorStatePermission />;
    }

    // Server error (500 or other)
    return <ErrorStateServer onRetry={refetch} errorMessage={error.message} />;
  }

  // Empty state (no personal relationships)
  if (personalRelationships.length === 0) {
    return (
      <EmptyStatePersonal
        onAddClick={() => setShowCreateModal(true)}
      />
    );
  }

  // Data exists - render table
  return (
    <table className="w-full">
      {/* Table content */}
    </table>
  );
};
```

---

### Search/Filter Empty State

```typescript
// SpecialRelationshipsSubTab.tsx

const [searchTerm, setSearchTerm] = useState('');

// Filter relationships by search term
const filteredRelationships = useMemo(() => {
  if (!searchTerm) return relationships;
  const lowerSearch = searchTerm.toLowerCase();
  return relationships.filter(r =>
    r.name.toLowerCase().includes(lowerSearch) ||
    r.relationship_type.toLowerCase().includes(lowerSearch) ||
    r.email?.toLowerCase().includes(lowerSearch)
  );
}, [relationships, searchTerm]);

// Render logic
if (filteredRelationships.length === 0 && searchTerm) {
  return (
    <EmptyStateNoResults
      searchTerm={searchTerm}
      onClearSearch={() => setSearchTerm('')}
    />
  );
}

if (filteredRelationships.length === 0) {
  return <EmptyStateNoRelationships onAddClick={() => setShowCreateModal(true)} />;
}
```

---

## Component Specifications

### EmptyState Component (Reusable)

```typescript
// components/ui/EmptyState.tsx

import { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onActionClick?: () => void;
  secondaryActionLabel?: string;
  onSecondaryActionClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onActionClick,
  secondaryActionLabel,
  onSecondaryActionClick,
}) => {
  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 text-gray-400">
        <Icon size={64} aria-hidden="true" />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>

      <p className="text-sm text-gray-600 max-w-md mb-6">{description}</p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex gap-3">
          {actionLabel && onActionClick && (
            <button
              onClick={onActionClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {actionLabel}
            </button>
          )}

          {secondaryActionLabel && onSecondaryActionClick && (
            <button
              onClick={onSecondaryActionClick}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Usage example:
<EmptyState
  icon={Users}
  title="No relationships added yet"
  description="Track personal and professional relationships to build comprehensive client profiles."
  actionLabel="Add Relationship"
  onActionClick={() => setShowCreateModal(true)}
/>
```

---

## Testing Strategy

### Unit Tests

```typescript
// tests/components/EmptyState.test.tsx

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  test('renders title and description', () => {
    render(
      <EmptyState
        icon={Users}
        title="No data"
        description="Add some data to get started"
      />
    );

    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Add some data to get started')).toBeInTheDocument();
  });

  test('calls action callback when button clicked', async () => {
    const user = userEvent.setup();
    const handleAction = jest.fn();

    render(
      <EmptyState
        icon={Users}
        title="No data"
        description="Add some data"
        actionLabel="Add Data"
        onActionClick={handleAction}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Add Data' }));
    expect(handleAction).toHaveBeenCalledTimes(1);
  });

  test('has accessible status role', () => {
    const { container } = render(
      <EmptyState icon={Users} title="No data" description="Description" />
    );

    expect(container.querySelector('[role="status"]')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
// tests/integration/PersonalRelationshipsTable.test.tsx

describe('PersonalRelationshipsTable - States', () => {
  test('shows loading skeleton on initial load', () => {
    server.use(
      rest.get('/api/special_relationships', (req, res, ctx) => {
        return res(ctx.delay('infinite')); // Never resolves
      })
    );

    render(<PersonalRelationshipsTable clientGroupId="cg-1" />);

    expect(screen.getByLabelText('Loading relationships')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(5); // 4 skeleton rows + header
  });

  test('shows empty state when no personal relationships', async () => {
    server.use(
      rest.get('/api/special_relationships', (req, res, ctx) => {
        return res(ctx.json([])); // Empty array
      })
    );

    render(<PersonalRelationshipsTable clientGroupId="cg-1" />);

    await waitFor(() => {
      expect(screen.getByText('No personal relationships yet')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Add Personal Relationship' })).toBeInTheDocument();
  });

  test('shows network error state on API failure', async () => {
    server.use(
      rest.get('/api/special_relationships', (req, res, ctx) => {
        return res.networkError('Network error');
      })
    );

    render(<PersonalRelationshipsTable clientGroupId="cg-1" />);

    await waitFor(() => {
      expect(screen.getByText('Unable to load relationships')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });
});
```

---

## Summary

### Components to Create

1. **EmptyState** (reusable base component) - 1 hour
2. **EmptyStateNoRelationships** - 30 min
3. **EmptyStatePersonal** - 30 min
4. **EmptyStateProfessional** - 30 min
5. **EmptyStateNoResults** - 30 min
6. **SkeletonTable** - 1 hour
7. **ErrorStateNetwork** - 30 min
8. **ErrorStateServer** - 30 min
9. **ErrorStatePermission** - 30 min

**Total Effort**: ~5-6 hours (includes testing)

### Decision Matrix for State Selection

```typescript
// State selection logic

if (isLoading && !data) {
  return <SkeletonTable />;
}

if (isError) {
  if (isNetworkError(error)) return <ErrorStateNetwork />;
  if (isPermissionError(error)) return <ErrorStatePermission />;
  return <ErrorStateServer />;
}

if (searchTerm && filteredData.length === 0) {
  return <EmptyStateNoResults searchTerm={searchTerm} />;
}

if (data.length === 0) {
  return activeTab === 'personal'
    ? <EmptyStatePersonal />
    : <EmptyStateProfessional />;
}

return <DataTable data={filteredData} />;
```

This specification ensures users always understand the current state of the application and know what actions to take next, addressing the medium priority issue of unspecified empty states.
