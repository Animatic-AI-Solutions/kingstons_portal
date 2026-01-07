# Cycle 14: Integration and Polish

**Goal**: Full integration testing, styling refinements, accessibility audit, and final polish

---

## RED Phase - Write Integration Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write integration tests for the complete Health and Vulnerabilities feature.

**File**: `frontend/src/tests/integration/HealthVulnerabilityTab.integration.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import HealthVulnerabilityTab from '@/components/phase2/health-vulnerabilities/HealthVulnerabilityTab';

expect.extend(toHaveNoViolations);

// MSW handlers for API mocking
const handlers = [
  // Product owners
  rest.get('/api/product-owners', (req, res, ctx) => {
    return res(ctx.json([
      { id: 1, firstname: 'John', surname: 'Smith', relationship: 'Primary Owner', status: 'active' },
      { id: 2, firstname: 'Jane', surname: 'Smith', relationship: 'Joint Owner', status: 'active' },
    ]));
  }),

  // Special relationships
  rest.get('/api/special-relationships', (req, res, ctx) => {
    return res(ctx.json([
      { id: 10, name: 'Tom Smith', relationship_type: 'Child', status: 'Active' },
    ]));
  }),

  // Health - Product Owners
  rest.get('/api/health/product-owners', (req, res, ctx) => {
    return res(ctx.json([
      { id: 1, product_owner_id: 1, condition: 'Smoking', name: 'Current Smoker', status: 'Active' },
      { id: 2, product_owner_id: 1, condition: 'Diabetes', name: 'Type 2', status: 'Monitoring' },
    ]));
  }),

  // Health - Special Relationships
  rest.get('/api/health/special-relationships', (req, res, ctx) => {
    return res(ctx.json([
      { id: 3, special_relationship_id: 10, condition: 'Asthma', name: 'Mild', status: 'Active' },
    ]));
  }),

  // Vulnerabilities - Product Owners
  rest.get('/api/vulnerabilities/product-owners', (req, res, ctx) => {
    return res(ctx.json([
      { id: 1, product_owner_id: 1, description: 'Hearing impairment', diagnosed: true, status: 'Active' },
    ]));
  }),

  // Vulnerabilities - Special Relationships
  rest.get('/api/vulnerabilities/special-relationships', (req, res, ctx) => {
    return res(ctx.json([]));
  }),

  // POST health
  rest.post('/api/health/product-owners', (req, res, ctx) => {
    return res(ctx.status(201), ctx.json({ id: 100, ...req.body }));
  }),

  // POST vulnerability
  rest.post('/api/vulnerabilities/product-owners', (req, res, ctx) => {
    return res(ctx.status(201), ctx.json({ id: 100, ...req.body }));
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('HealthVulnerabilityTab Integration', () => {
  describe('full user journey - Health tab', () => {
    it('should load and display health data', async () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Tom Smith')).toBeInTheDocument();
      });

      // Verify SR tag
      expect(screen.getByText('SR')).toBeInTheDocument();
    });

    it('should expand row and show health conditions', async () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Click to expand
      fireEvent.click(screen.getByText('John Smith'));

      // Should show health conditions with smoking first
      await waitFor(() => {
        expect(screen.getByText('Current Smoker')).toBeInTheDocument();
        expect(screen.getByText('Type 2')).toBeInTheDocument();
      });
    });

    it('should open add modal and create health record', async () => {
      const user = userEvent.setup();

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Click add button
      const addButtons = screen.getAllByRole('button', { name: /add/i });
      await user.click(addButtons[0]);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill form
      await user.selectOptions(screen.getByLabelText(/condition/i), 'Heart Disease');
      await user.type(screen.getByLabelText(/name/i), 'CAD');

      // Submit
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('full user journey - Vulnerabilities tab', () => {
    it('should switch to vulnerabilities tab and show data', async () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Switch to Vulnerabilities tab
      fireEvent.click(screen.getByRole('tab', { name: /vulnerabilities/i }));

      // Should still show people
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });
    });

    it('should expand row and show vulnerabilities', async () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      // Switch to Vulnerabilities
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('tab', { name: /vulnerabilities/i }));

      // Expand row
      await waitFor(() => {
        fireEvent.click(screen.getByText('John Smith'));
      });

      // Should show vulnerabilities
      await waitFor(() => {
        expect(screen.getByText('Hearing impairment')).toBeInTheDocument();
      });
    });
  });

  describe('error scenarios', () => {
    it('should handle network errors gracefully', async () => {
      server.use(
        rest.get('/api/product-owners', (req, res, ctx) => {
          return res(ctx.status(500));
        })
      );

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations with expanded health row', async () => {
      const { container } = render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('John Smith'));

      await waitFor(() => {
        expect(screen.getByText('Current Smoker')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations with open modal', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      await user.click(addButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('keyboard navigation end-to-end', () => {
    it('should support full keyboard navigation through tabs', async () => {
      const user = userEvent.setup();

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Tab to tab navigation
      const healthTab = screen.getByRole('tab', { name: /health/i });
      healthTab.focus();

      // Arrow to vulnerabilities
      await user.keyboard('{ArrowRight}');
      expect(screen.getByRole('tab', { name: /vulnerabilities/i })).toHaveFocus();

      // Enter to select
      await user.keyboard('{Enter}');
      expect(screen.getByRole('tab', { name: /vulnerabilities/i })).toHaveAttribute('aria-selected', 'true');
    });

    it('should support keyboard navigation through expandable rows', async () => {
      const user = userEvent.setup();

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Focus first row and expand
      const row = screen.getByText('John Smith').closest('tr');
      row?.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Current Smoker')).toBeInTheDocument();
      });
    });

    it('should trap focus in modal', async () => {
      const user = userEvent.setup();

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      await user.click(addButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Tab through modal - should stay trapped
      for (let i = 0; i < 20; i++) {
        await user.tab();
        expect(screen.getByRole('dialog')).toContainFocus();
      }
    });

    it('should close modal on Escape', async () => {
      const user = userEvent.setup();

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      await user.click(addButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('data persistence', () => {
    it('should persist new health record after creation', async () => {
      const user = userEvent.setup();

      // Track POST request
      let postCalled = false;
      server.use(
        rest.post('/api/health/product-owners', (req, res, ctx) => {
          postCalled = true;
          return res(ctx.status(201), ctx.json({ id: 100, ...req.body }));
        })
      );

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      const addButtons = screen.getAllByRole('button', { name: /add/i });
      await user.click(addButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      await user.selectOptions(screen.getByLabelText(/condition/i), 'Heart Disease');
      await user.type(screen.getByLabelText(/name/i), 'CAD');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(postCalled).toBe(true);
      });
    });

    it('should update health record after edit', async () => {
      const user = userEvent.setup();

      let putCalled = false;
      server.use(
        rest.put('/api/health/product-owners/:id', (req, res, ctx) => {
          putCalled = true;
          return res(ctx.status(200), ctx.json({ id: req.params.id, ...req.body }));
        })
      );

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Expand and click on condition to edit
      fireEvent.click(screen.getByText('John Smith'));

      await waitFor(() => {
        expect(screen.getByText('Current Smoker')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Current Smoker'));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Change status and save
      await user.selectOptions(screen.getByLabelText(/status/i), 'Resolved');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(putCalled).toBe(true);
      });
    });

    it('should delete health record after confirmation', async () => {
      let deleteCalled = false;
      server.use(
        rest.delete('/api/health/product-owners/:id', (req, res, ctx) => {
          deleteCalled = true;
          return res(ctx.status(204));
        })
      );

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('John Smith'));

      await waitFor(() => {
        expect(screen.getByText('Current Smoker')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Confirm delete
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(deleteCalled).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle slow network responses', async () => {
      server.use(
        rest.get('/api/product-owners', async (req, res, ctx) => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          return res(ctx.json([
            { id: 1, firstname: 'John', surname: 'Smith', relationship: 'Primary Owner', status: 'active' },
          ]));
        })
      );

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      // Should show loading state
      expect(screen.getByRole('status')).toBeInTheDocument();

      // Eventually shows data
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should handle empty responses gracefully', async () => {
      server.use(
        rest.get('/api/product-owners', (req, res, ctx) => res(ctx.json([]))),
        rest.get('/api/special-relationships', (req, res, ctx) => res(ctx.json([])))
      );

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/no people found/i)).toBeInTheDocument();
      });
    });

    it('should handle partial network failures', async () => {
      server.use(
        rest.get('/api/product-owners', (req, res, ctx) => res(ctx.json([
          { id: 1, firstname: 'John', surname: 'Smith', relationship: 'Primary Owner', status: 'active' },
        ]))),
        rest.get('/api/health/product-owners', (req, res, ctx) => res(ctx.status(500)))
      );

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      // Should handle gracefully - show what we can
      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });
    });

    it('should handle concurrent updates', async () => {
      const user = userEvent.setup();

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Open two add modals in quick succession (simulating concurrent users)
      const addButtons = screen.getAllByRole('button', { name: /add/i });
      await user.click(addButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should handle gracefully
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should handle large datasets without performance issues', async () => {
      const manyOwners = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        firstname: `Person${i}`,
        surname: `Surname${i}`,
        relationship: i === 0 ? 'Primary Owner' : 'Joint Owner',
        status: 'active',
      }));

      const manyHealth = Array.from({ length: 500 }, (_, i) => ({
        id: i + 1,
        product_owner_id: (i % 100) + 1,
        condition: 'Diabetes',
        name: `Condition ${i}`,
        status: 'Active',
      }));

      server.use(
        rest.get('/api/product-owners', (req, res, ctx) => res(ctx.json(manyOwners))),
        rest.get('/api/health/product-owners', (req, res, ctx) => res(ctx.json(manyHealth)))
      );

      const startTime = performance.now();

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Person0 Surname0')).toBeInTheDocument();
      });

      const endTime = performance.now();

      // Should render within reasonable time (under 3 seconds)
      expect(endTime - startTime).toBeLessThan(3000);
    });
  });

  describe('special relationships', () => {
    it('should display SR tag for special relationships', async () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Tom Smith')).toBeInTheDocument();
        expect(screen.getByText('SR')).toBeInTheDocument();
      });
    });

    it('should expand SR row and show health conditions', async () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Tom Smith')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Tom Smith'));

      await waitFor(() => {
        expect(screen.getByText('Mild')).toBeInTheDocument();
      });
    });
  });

  describe('smoking conditions sorting', () => {
    it('should display smoking conditions at top of expanded health table', async () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('John Smith'));

      await waitFor(() => {
        expect(screen.getByText('Current Smoker')).toBeInTheDocument();
        expect(screen.getByText('Type 2')).toBeInTheDocument();
      });

      // Smoking should be first
      const rows = screen.getAllByRole('row');
      const smokingRowIndex = rows.findIndex(row => row.textContent?.includes('Current Smoker'));
      const diabetesRowIndex = rows.findIndex(row => row.textContent?.includes('Type 2'));

      expect(smokingRowIndex).toBeLessThan(diabetesRowIndex);
    });
  });
});
```

---

## GREEN Phase - Fix Issues

**Agent**: `coder-agent`

**Instructions**: Use the coder-agent to fix any failing integration tests and address issues found during testing.

### Common Issues to Address:

1. **API endpoint mismatches** - Ensure frontend calls match backend routes
2. **Loading state timing** - Handle race conditions in data fetching
3. **Modal state management** - Ensure proper cleanup on close
4. **Query invalidation** - Verify cache updates after mutations

---

## BLUE Phase - Final Polish

### Styling Refinements

- [ ] Ensure consistent spacing with other Phase 2 components
- [ ] Verify purple styling for special relationships matches design
- [ ] Check responsive behavior on different screen sizes
- [ ] Verify loading skeletons match table structure

### Accessibility Audit

- [ ] Run jest-axe automated tests
- [ ] Test with keyboard-only navigation
- [ ] Test with screen reader (NVDA/VoiceOver)
- [ ] Verify focus management in modals
- [ ] Check color contrast ratios

### Performance Optimization

- [ ] Profile component renders with React DevTools
- [ ] Add React.memo to pure components
- [ ] Optimize useMemo/useCallback dependencies
- [ ] Test with 100+ health/vulnerability records

### Documentation

- [ ] Add JSDoc comments to all exported components
- [ ] Update component README
- [ ] Document API endpoints in OpenAPI spec

---

## Create Index File

**File**: `frontend/src/components/phase2/health-vulnerabilities/index.ts`

```typescript
/**
 * Health and Vulnerabilities Module
 *
 * Components for managing health conditions and vulnerabilities
 * for product owners and special relationships.
 */

export { default as HealthVulnerabilityTab } from './HealthVulnerabilityTab';
export { default as HealthSubTab } from './HealthSubTab';
export { default as VulnerabilitiesSubTab } from './VulnerabilitiesSubTab';
export { default as PersonTable } from './PersonTable';
export { default as HealthConditionsTable } from './HealthConditionsTable';
export { default as VulnerabilitiesTable } from './VulnerabilitiesTable';
export { default as AddHealthVulnerabilityModal } from './AddHealthVulnerabilityModal';
```

---

## Final Acceptance Criteria

### Functional Requirements

- [ ] Health sub-tab displays all product owners and special relationships
- [ ] Vulnerabilities sub-tab displays all product owners and special relationships
- [ ] Special relationships appear at bottom with purple styling and "SR" tag
- [ ] Rows are expandable to show nested health/vulnerability tables
- [ ] Smoking conditions appear at top of health tables
- [ ] CRUD operations work for both health and vulnerabilities
- [ ] Sub-tab navigation works correctly
- [ ] Add modal opens from person row Actions column

### Column Requirements

- [ ] Person table: Name, Relationship, Active, Inactive, Actions
- [ ] Health table: Condition, Name, Diagnosed (date), Medication/Dosage, Status, Actions
- [ ] Vulnerability table: Description, Adjustments, Diagnosed (Yes/No), Recorded, Status, Actions

### Non-Functional Requirements

- [ ] All 30+ integration tests pass (8 base + 22 enhanced)
- [ ] 70%+ code coverage
- [ ] WCAG 2.1 AA compliant (jest-axe passes)
- [ ] Keyboard navigation works throughout
- [ ] Loading and error states handled gracefully
- [ ] Consistent styling with other Phase 2 components
- [ ] No performance degradation with 100+ records

### Enhanced Testing Requirements

- [ ] **Accessibility**: Jest-axe passes for all views (default, expanded, modal open)
- [ ] **Keyboard navigation E2E**: Tab navigation, row expansion, modal focus trap, Escape to close
- [ ] **Data persistence**: Create, update, delete operations verified via MSW
- [ ] **Edge cases**: Slow network, empty responses, partial failures, concurrent updates, large datasets
- [ ] **Special relationships**: SR tag displays, expandable rows work
- [ ] **Smoking sorting**: Smoking conditions appear first in health table

### Documentation

- [ ] JSDoc comments on all public functions/components
- [ ] Component index file created
- [ ] Types exported from types index

---

## Deployment Checklist

- [ ] All 14 cycles completed
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Backend routes registered in main.py
- [ ] Frontend component integrated into ClientGroupPhase2 page
- [ ] Database tables exist (health_*, vulnerabilities_*)
- [ ] Manual testing completed
- [ ] Ready for production deployment
