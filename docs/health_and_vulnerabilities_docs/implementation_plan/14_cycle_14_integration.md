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
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import HealthVulnerabilityTab from '@/components/phase2/health-vulnerabilities/HealthVulnerabilityTab';

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
      // Use jest-axe for automated a11y testing
      const { container } = render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={1} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('John Smith')).toBeInTheDocument();
      });

      // Run axe accessibility check
      // const results = await axe(container);
      // expect(results).toHaveNoViolations();
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

- [ ] All tests pass with 70%+ coverage
- [ ] WCAG 2.1 AA compliant
- [ ] Keyboard navigation works throughout
- [ ] Loading and error states handled gracefully
- [ ] Consistent styling with other Phase 2 components
- [ ] No performance degradation with 100+ records

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
