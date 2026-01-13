# Plan 08: Full Integration Testing

## Overview

This plan covers the full integration testing of the Legal Documents feature. All components from Plans 02-07 must be implemented and passing individual tests before this plan.

## Prerequisites

- Backend: Database schema (Plan 02), API routes (Plan 03)
- Frontend: TypeScript interfaces (Plan 04), React Query hooks (Plan 05), Table component (Plan 06), Modals (Plan 07)

---

## Integration Test Scope

### End-to-End User Flows

1. **View Documents Flow**: Page loads -> API call -> Table displays documents
2. **Create Document Flow**: Click Add -> Fill form -> Submit -> Table updates
3. **Edit Document Flow**: Click row -> Modal opens -> Edit -> Save -> Table updates
4. **Lapse Document Flow**: Click Lapse icon -> Optimistic update -> Document greys out
5. **Reactivate Document Flow**: Click Reactivate -> Document becomes active
6. **Delete Document Flow**: Click Delete -> Confirm -> Document removed

### Component Integration

1. Table + Hooks + API
2. Modals + Hooks + API
3. Optimistic updates + Rollback
4. Cache invalidation

---

## TDD Cycle 1: Full Feature Integration

### Red Phase

**Agent**: Tester-Agent
**Task**: Write failing integration tests for the complete feature
**Files to create**: `frontend/src/tests/integration/LegalDocuments.integration.test.tsx`

```typescript
/**
 * Integration Test Suite for Legal Documents Feature
 *
 * Tests the complete Legal Documents feature with all components integrated.
 * Uses MSW (Mock Service Worker) for API mocking in integration tests.
 *
 * Test Coverage:
 * - Complete user flows (view, create, edit, lapse, reactivate, delete)
 * - Component integration (table, modals, hooks)
 * - Optimistic updates and rollback
 * - Cache invalidation
 * - Error handling across components
 * - Accessibility compliance (keyboard navigation, focus management)
 */

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

// Extend expect with jest-axe matchers
expect.extend(toHaveNoViolations);

// Components under test
import LegalDocumentsContainer from '@/components/phase2/legal-documents/LegalDocumentsContainer';

// Types
import type { LegalDocument } from '@/types/legalDocument';

// =============================================================================
// Test Data
// =============================================================================

const productOwners = [
  { id: 123, firstname: 'John', surname: 'Doe' },
  { id: 456, firstname: 'Jane', surname: 'Smith' },
];

const initialDocuments: LegalDocument[] = [
  {
    id: 1,
    type: 'Will',
    document_date: '2024-01-15',
    status: 'Signed',
    notes: 'Original will document',
    product_owner_ids: [123],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    type: 'LPOA P&F',
    document_date: '2024-02-20',
    status: 'Signed',
    notes: null,
    product_owner_ids: [123, 456],
    created_at: '2024-02-20T10:00:00Z',
    updated_at: '2024-02-20T10:00:00Z',
  },
  {
    id: 3,
    type: 'EPA',
    document_date: null,
    status: 'Lapsed',
    notes: 'Registered by new document',
    product_owner_ids: [456],
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
  },
];

// =============================================================================
// MSW Server Setup
// =============================================================================

const server = setupServer(
  // GET /api/legal_documents
  http.get('/api/legal_documents', () => {
    return HttpResponse.json(initialDocuments);
  }),

  // POST /api/legal_documents
  http.post('/api/legal_documents', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newDocument: LegalDocument = {
      id: 999,
      type: body.type as string,
      document_date: body.document_date as string || null,
      status: 'Signed',
      notes: body.notes as string || null,
      product_owner_ids: body.product_owner_ids as number[],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(newDocument, { status: 201 });
  }),

  // PUT /api/legal_documents/:id
  http.put('/api/legal_documents/:id', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>;
    const doc = initialDocuments.find((d) => d.id === Number(params.id));
    if (!doc) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({ ...doc, ...body });
  }),

  // PATCH /api/legal_documents/:id/status
  http.patch('/api/legal_documents/:id/status', async ({ params, request }) => {
    const body = await request.json() as { status: string };
    const doc = initialDocuments.find((d) => d.id === Number(params.id));
    if (!doc) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }
    return HttpResponse.json({ ...doc, status: body.status });
  }),

  // DELETE /api/legal_documents/:id
  http.delete('/api/legal_documents/:id', ({ params }) => {
    const doc = initialDocuments.find((d) => d.id === Number(params.id));
    if (!doc) {
      return HttpResponse.json({ detail: 'Not found' }, { status: 404 });
    }
    return new HttpResponse(null, { status: 204 });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// =============================================================================
// Test Wrapper
// =============================================================================

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// =============================================================================
// Integration Tests
// =============================================================================

describe('Legal Documents Feature Integration', () => {
  // ===========================================================================
  // View Documents Flow
  // ===========================================================================

  describe('View Documents Flow', () => {
    it('should load and display documents on initial render', async () => {
      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      // Should show loading initially
      expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();

      // Should display documents after loading
      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
        expect(screen.getByText('LPOA P&F')).toBeInTheDocument();
        expect(screen.getByText('EPA')).toBeInTheDocument();
      });
    });

    it('should sort lapsed documents to the bottom', async () => {
      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1); // Skip header

      // Lapsed document (EPA) should be last
      const lastRow = dataRows[dataRows.length - 1];
      expect(within(lastRow).getByText('EPA')).toBeInTheDocument();
    });

    it('should grey out lapsed documents', async () => {
      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('EPA')).toBeInTheDocument();
      });

      const lapsedRow = screen.getByTestId('table-row-3');
      expect(lapsedRow).toHaveClass('opacity-50');
    });
  });

  // ===========================================================================
  // Create Document Flow
  // ===========================================================================

  describe('Create Document Flow', () => {
    it('should open create modal when Add button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /add.*legal document/i });
      await user.click(addButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/add legal document/i)).toBeInTheDocument();
    });

    it('should create document and update table', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Open create modal
      const addButton = screen.getByRole('button', { name: /add.*legal document/i });
      await user.click(addButton);

      // Fill form
      const typeInput = screen.getByLabelText(/type/i);
      await user.type(typeInput, 'Advance Directive');

      // Select product owner
      // (Implementation depends on MultiSelectDropdown behavior)

      // Submit
      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      // Modal should close and table should update
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Edit Document Flow
  // ===========================================================================

  describe('Edit Document Flow', () => {
    it('should open edit modal when row is clicked', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      const row = screen.getByTestId('table-row-1');
      await user.click(row);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/edit legal document/i)).toBeInTheDocument();
    });

    it('should update document and close modal', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Open edit modal
      const row = screen.getByTestId('table-row-1');
      await user.click(row);

      // Edit notes
      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Updated will notes');

      // Save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Lapse Document Flow
  // ===========================================================================

  describe('Lapse Document Flow', () => {
    it('should lapse document with optimistic update', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Click lapse button on Will document
      const row = screen.getByTestId('table-row-1');
      const lapseButton = within(row).getByLabelText(/lapse/i);
      await user.click(lapseButton);

      // Row should immediately show as greyed out (optimistic update)
      await waitFor(() => {
        expect(row).toHaveClass('opacity-50');
      });
    });

    it('should show Reactivate and Delete buttons after lapsing', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Click lapse button
      const row = screen.getByTestId('table-row-1');
      const lapseButton = within(row).getByLabelText(/lapse/i);
      await user.click(lapseButton);

      // Should now show Reactivate and Delete buttons
      await waitFor(() => {
        expect(within(row).getByLabelText(/reactivate/i)).toBeInTheDocument();
        expect(within(row).getByLabelText(/delete/i)).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Reactivate Document Flow
  // ===========================================================================

  describe('Reactivate Document Flow', () => {
    it('should reactivate lapsed document', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('EPA')).toBeInTheDocument();
      });

      // EPA is already lapsed, click reactivate
      const lapsedRow = screen.getByTestId('table-row-3');
      const reactivateButton = within(lapsedRow).getByLabelText(/reactivate/i);
      await user.click(reactivateButton);

      // Row should no longer be greyed out
      await waitFor(() => {
        expect(lapsedRow).not.toHaveClass('opacity-50');
      });
    });
  });

  // ===========================================================================
  // Delete Document Flow (uses accessible ConfirmationModal)
  // ===========================================================================

  describe('Delete Document Flow', () => {
    it('should open confirmation modal when delete is clicked', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsContainer
          clientGroupId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('EPA')).toBeInTheDocument();
      });

      // EPA is lapsed, should have delete button
      const lapsedRow = screen.getByTestId('table-row-3');
      const deleteButton = within(lapsedRow).getByLabelText(/delete/i);
      await user.click(deleteButton);

      // Confirmation modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/delete legal document/i)).toBeInTheDocument();
        expect(screen.getByText(/are you sure you want to permanently delete this EPA/i)).toBeInTheDocument();
      });
    });

    it('should delete document when confirmed in modal', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsContainer
          clientGroupId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('EPA')).toBeInTheDocument();
      });

      // Click delete button to open modal
      const lapsedRow = screen.getByTestId('table-row-3');
      const deleteButton = within(lapsedRow).getByLabelText(/delete/i);
      await user.click(deleteButton);

      // Wait for modal and click confirm
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      // Document should be removed from table
      await waitFor(() => {
        expect(screen.queryByText('EPA')).not.toBeInTheDocument();
      });
    });

    it('should close modal and not delete when cancelled', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsContainer
          clientGroupId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('EPA')).toBeInTheDocument();
      });

      // Click delete button to open modal
      const lapsedRow = screen.getByTestId('table-row-3');
      const deleteButton = within(lapsedRow).getByLabelText(/delete/i);
      await user.click(deleteButton);

      // Wait for modal and click cancel
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Modal should close and document should still be there
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(screen.getByText('EPA')).toBeInTheDocument();
    });

    it('should trap focus within confirmation modal', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsContainer
          clientGroupId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('EPA')).toBeInTheDocument();
      });

      // Click delete button to open modal
      const lapsedRow = screen.getByTestId('table-row-3');
      const deleteButton = within(lapsedRow).getByLabelText(/delete/i);
      await user.click(deleteButton);

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Focus should be within the modal
      const modal = screen.getByRole('dialog');
      expect(modal.contains(document.activeElement)).toBe(true);

      // Tab through modal elements - focus should stay trapped
      await user.tab();
      expect(modal.contains(document.activeElement)).toBe(true);
      await user.tab();
      expect(modal.contains(document.activeElement)).toBe(true);
    });

    it('should close modal on Escape key', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsContainer
          clientGroupId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('EPA')).toBeInTheDocument();
      });

      // Click delete button to open modal
      const lapsedRow = screen.getByTestId('table-row-3');
      const deleteButton = within(lapsedRow).getByLabelText(/delete/i);
      await user.click(deleteButton);

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Press Escape
      await user.keyboard('{Escape}');

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
      expect(screen.getByText('EPA')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should show error state when API fails', async () => {
      server.use(
        http.get('/api/legal_documents', () => {
          return HttpResponse.json(
            { detail: 'Database connection failed' },
            { status: 500 }
          );
        })
      );

      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
      });
    });

    it('should rollback optimistic update on error', async () => {
      const user = userEvent.setup();

      // First load successfully
      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Make status update fail
      server.use(
        http.patch('/api/legal_documents/:id/status', () => {
          return HttpResponse.json(
            { detail: 'Update failed' },
            { status: 500 }
          );
        })
      );

      // Try to lapse
      const row = screen.getByTestId('table-row-1');
      const lapseButton = within(row).getByLabelText(/lapse/i);
      await user.click(lapseButton);

      // Should rollback - row should not be greyed out
      await waitFor(() => {
        expect(row).not.toHaveClass('opacity-50');
      });
    });
  });

  // ===========================================================================
  // Accessibility Integration
  // ===========================================================================

  describe('Accessibility', () => {
    it('should support full keyboard navigation', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Tab to Add button
      await user.tab();
      expect(document.activeElement).toHaveTextContent(/add/i);

      // Tab to first row
      await user.tab();
      // Continue tabbing to action buttons

      // Open modal with Enter on row
      await user.keyboard('{Enter}');
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close modal with Escape
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Open modal
      const addButton = screen.getByRole('button', { name: /add.*legal document/i });
      await user.click(addButton);

      // Focus should be trapped in modal
      const dialog = screen.getByRole('dialog');
      expect(document.activeElement?.closest('[role="dialog"]')).toBe(dialog);
    });
  });

  // ===========================================================================
  // Automated Accessibility Testing (axe-core)
  // ===========================================================================

  describe('Automated Accessibility (axe-core)', () => {
    it('should have no accessibility violations on table view', async () => {
      const { container } = render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations on edit modal', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Open edit modal by clicking row
      const row = screen.getByText('Will').closest('tr');
      await user.click(row!);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations on create modal', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Open create modal
      const addButton = screen.getByRole('button', { name: /add.*legal document/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations on loading state', async () => {
      // Delay server response to test loading state
      server.use(
        http.get('/api/legal_documents', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json(initialDocuments);
        })
      );

      const { container } = render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      // Check loading state accessibility
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations on error state', async () => {
      server.use(
        http.get('/api/legal_documents', () => {
          return HttpResponse.json({ detail: 'Server error' }, { status: 500 });
        })
      );

      const { container } = render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ===========================================================================
  // Error Boundary Tests
  // ===========================================================================

  describe('Error Boundary', () => {
    // Suppress console.error for error boundary tests
    const originalError = console.error;
    beforeEach(() => {
      console.error = vi.fn();
    });
    afterEach(() => {
      console.error = originalError;
    });

    it('should render error boundary fallback when component throws', async () => {
      // Create a component that throws
      const ThrowingComponent = () => {
        throw new Error('Test error');
      };

      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
          // Force error by providing invalid data
          _testForceError={true}
        />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });

    it('should provide retry functionality from error boundary', async () => {
      const user = userEvent.setup();

      // First request fails, second succeeds
      let requestCount = 0;
      server.use(
        http.get('/api/legal_documents', () => {
          requestCount++;
          if (requestCount === 1) {
            throw new Error('Network error');
          }
          return HttpResponse.json(initialDocuments);
        })
      );

      render(
        <LegalDocumentsContainer
          productOwnerId={123}
          productOwners={productOwners}
        />,
        { wrapper: createWrapper() }
      );

      // Wait for error state
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Click retry
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Should successfully load after retry
      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });
    });
  });
});
```

### Green Phase

**Agent**: coder-agent
**Task**: Create the container component that integrates all parts
**Files to create**: `frontend/src/components/phase2/legal-documents/LegalDocumentsContainer.tsx`

```typescript
/**
 * LegalDocumentsContainer Component
 *
 * Container component that integrates LegalDocumentsTable with modals
 * and manages the overall state for the Legal Documents feature.
 *
 * This component:
 * - Fetches legal documents using useLegalDocuments hook
 * - Manages modal open/close state
 * - Handles document actions (lapse, reactivate, delete)
 * - Coordinates optimistic updates
 * - Wraps content in Error Boundary for graceful error handling
 *
 * @component LegalDocumentsContainer
 */

import React, { useState, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import toast from 'react-hot-toast';
import LegalDocumentsTable from './LegalDocumentsTable';
import LegalDocumentModal from './LegalDocumentModal';
import CreateLegalDocumentModal from './CreateLegalDocumentModal';
import { ConfirmationModal } from '@/components/ui';
import {
  useLegalDocuments,
  useUpdateLegalDocumentStatus,
  useDeleteLegalDocument,
} from '@/hooks/useLegalDocuments';
import type { LegalDocument } from '@/types/legalDocument';

// ==========================
// Error Boundary
// ==========================

interface ErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component for catching React errors.
 * Provides a fallback UI with retry functionality.
 */
class LegalDocumentsErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('LegalDocuments Error Boundary caught an error:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <div className="text-red-600 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-sm text-gray-500 mb-4">
            We encountered an error loading legal documents. Please try again.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ==========================
// Types
// ==========================

interface ProductOwner {
  id: number;
  firstname: string;
  surname: string;
}

interface LegalDocumentsContainerProps {
  /** Product owner ID to fetch documents for */
  productOwnerId: number;
  /** All product owners for the client group */
  productOwners: ProductOwner[];
  /** For testing: force error boundary to show */
  _testForceError?: boolean;
}

// ==========================
// Component
// ==========================

const LegalDocumentsContainerInner: React.FC<LegalDocumentsContainerProps> = ({
  productOwnerId,
  productOwners,
  _testForceError = false,
}) => {
  // For testing error boundary
  if (_testForceError) {
    throw new Error('Forced error for testing');
  }

  // Modal state
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // Delete confirmation modal state
  const [documentToDelete, setDocumentToDelete] = useState<LegalDocument | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Query hook
  const {
    data: documents = [],
    isLoading,
    error,
    refetch,
  } = useLegalDocuments(productOwnerId);

  // Mutation hooks
  const updateStatusMutation = useUpdateLegalDocumentStatus();
  const deleteMutation = useDeleteLegalDocument();

  // ==========================
  // Event Handlers
  // ==========================

  /**
   * Handle row click - open edit modal
   */
  const handleRowClick = useCallback((document: LegalDocument) => {
    setSelectedDocument(document);
    setIsEditModalOpen(true);
  }, []);

  /**
   * Handle lapse action
   */
  const handleLapse = useCallback(
    async (document: LegalDocument) => {
      try {
        await updateStatusMutation.mutateAsync({
          id: document.id,
          status: 'Lapsed',
        });
        toast.success(`${document.type} has been lapsed`);
      } catch {
        toast.error('Failed to lapse document');
      }
    },
    [updateStatusMutation]
  );

  /**
   * Handle reactivate action
   */
  const handleReactivate = useCallback(
    async (document: LegalDocument) => {
      try {
        await updateStatusMutation.mutateAsync({
          id: document.id,
          status: 'Signed',
        });
        toast.success(`${document.type} has been reactivated`);
      } catch {
        toast.error('Failed to reactivate document');
      }
    },
    [updateStatusMutation]
  );

  /**
   * Handle delete action - opens confirmation modal
   * Uses accessible ConfirmationModal instead of window.confirm
   */
  const handleDelete = useCallback((document: LegalDocument) => {
    setDocumentToDelete(document);
    setIsDeleteModalOpen(true);
  }, []);

  /**
   * Handle delete confirmation - actually performs the delete
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!documentToDelete) return;

    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(documentToDelete.id);
      toast.success(`${documentToDelete.type} has been deleted`);
      setIsDeleteModalOpen(false);
      setDocumentToDelete(null);
    } catch {
      toast.error('Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  }, [documentToDelete, deleteMutation]);

  /**
   * Handle delete modal close/cancel
   */
  const handleDeleteModalClose = useCallback(() => {
    if (!isDeleting) {
      setIsDeleteModalOpen(false);
      setDocumentToDelete(null);
    }
  }, [isDeleting]);

  /**
   * Handle add button click - open create modal
   */
  const handleAdd = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  /**
   * Handle edit modal close
   */
  const handleEditModalClose = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedDocument(null);
  }, []);

  /**
   * Handle create modal close
   */
  const handleCreateModalClose = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  /**
   * Handle successful edit
   */
  const handleEditSuccess = useCallback(() => {
    // Document updated, modal will close
  }, []);

  /**
   * Handle successful create
   */
  const handleCreateSuccess = useCallback(() => {
    // Document created, modal will close
  }, []);

  // ==========================
  // Render
  // ==========================

  return (
    <div className="legal-documents-container">
      <LegalDocumentsTable
        documents={documents}
        productOwners={productOwners}
        onRowClick={handleRowClick}
        onLapse={handleLapse}
        onReactivate={handleReactivate}
        onDelete={handleDelete}
        onAdd={handleAdd}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
      />

      {/* Edit Modal */}
      {selectedDocument && (
        <LegalDocumentModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          document={selectedDocument}
          productOwners={productOwners}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Create Modal */}
      <CreateLegalDocumentModal
        isOpen={isCreateModalOpen}
        onClose={handleCreateModalClose}
        productOwners={productOwners}
        onSuccess={handleCreateSuccess}
      />

      {/* Delete Confirmation Modal - Accessible alternative to window.confirm */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={handleConfirmDelete}
        title="Delete Legal Document"
        message={
          documentToDelete
            ? `Are you sure you want to permanently delete this ${documentToDelete.type}? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={isDeleting}
        aria-describedby="delete-confirmation-description"
      />
    </div>
  );
};

/**
 * LegalDocumentsContainer with Error Boundary wrapper
 * Wraps the inner component to catch and handle React errors gracefully
 */
const LegalDocumentsContainer: React.FC<LegalDocumentsContainerProps> = (props) => {
  return (
    <LegalDocumentsErrorBoundary onRetry={() => window.location.reload()}>
      <LegalDocumentsContainerInner {...props} />
    </LegalDocumentsErrorBoundary>
  );
};

export default LegalDocumentsContainer;
```

### Blue Phase

**Agent**: coder-agent
**Task**: Final refactoring, update exports, and ensure all tests pass
**Changes**:
1. Update barrel export to include container
2. Add confirmation dialog component for delete
3. Ensure all accessibility requirements are met

**Update**: `frontend/src/components/phase2/legal-documents/index.ts`

```typescript
/**
 * Legal Documents Components Barrel Export
 *
 * @module components/phase2/legal-documents
 */

export { default as LegalDocumentsTable } from './LegalDocumentsTable';
export { default as LegalDocumentModal } from './LegalDocumentModal';
export { default as CreateLegalDocumentModal } from './CreateLegalDocumentModal';
export { default as LegalDocumentsContainer } from './LegalDocumentsContainer';
```

---

## Running Integration Tests

```bash
# Run integration tests
cd frontend
npm test -- src/tests/integration/LegalDocuments.integration.test.tsx

# Run all Legal Documents tests with coverage
npm test -- --coverage \
  src/tests/types/legalDocument.test.ts \
  src/tests/services/legalDocumentsApi.test.ts \
  src/tests/hooks/useLegalDocuments.*.test.ts \
  src/tests/components/phase2/legal-documents/*.test.tsx \
  src/tests/integration/LegalDocuments.integration.test.tsx
```

---

## Final Checklist

### Backend

- [ ] Database schema created (`legal_documents`, `product_owner_legal_documents`)
- [ ] Database indexes created for performance
- [ ] Trigger for `updated_at` auto-update working
- [ ] All Pydantic model tests passing
- [ ] All API route tests passing

### Frontend

- [ ] TypeScript interfaces defined and exported
- [ ] API service functions implemented and tested
- [ ] React Query hooks implemented with optimistic updates
- [ ] LegalDocumentsTable component rendering correctly
- [ ] LegalDocumentModal (edit) working with validation
- [ ] CreateLegalDocumentModal working with ComboDropdown
- [ ] LegalDocumentsContainer integrating all parts
- [ ] All individual component tests passing
- [ ] Integration tests passing

### Quality

- [ ] 70%+ test coverage achieved
- [ ] WCAG 2.1 AA accessibility compliance verified
- [ ] Notes field validates 2000 char max
- [ ] Lapsed documents sorted to bottom and greyed out
- [ ] Custom document types supported
- [ ] Optimistic updates with rollback on error
- [ ] Proper error handling and display

---

## Summary

This completes the comprehensive TDD implementation plan for the Legal Documents feature. The plan follows a strict backend-first approach, ensuring the API infrastructure is in place before frontend development begins.

### Implementation Order

1. **Backend Database** (Plan 02) - Schema and migrations
2. **Backend API** (Plan 03) - Routes and models
3. **Frontend Types & API** (Plan 04) - TypeScript definitions
4. **Frontend Hooks** (Plan 05) - React Query integration
5. **Frontend Table** (Plan 06) - Main display component
6. **Frontend Modals** (Plan 07) - Edit and create forms
7. **Integration** (Plan 08) - Full feature testing

Each plan includes complete Red-Green-Blue TDD cycles with explicit agent assignments, file paths, and complete code implementations ready for execution.
