# Cycle 13: HealthVulnerabilityTab Parent Component

**Goal**: Create the parent container with sub-tab navigation between Health and Vulnerabilities

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for the HealthVulnerabilityTab parent component.

**File**: `frontend/src/tests/components/phase2/health-vulnerabilities/HealthVulnerabilityTab.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { axe, toHaveNoViolations } from 'jest-axe';
import HealthVulnerabilityTab from '@/components/phase2/health-vulnerabilities/HealthVulnerabilityTab';

expect.extend(toHaveNoViolations);

// Mock the sub-tab components
jest.mock('@/components/phase2/health-vulnerabilities/HealthSubTab', () => {
  return function MockHealthSubTab() {
    return <div data-testid="health-subtab">Health Sub Tab Content</div>;
  };
});

jest.mock('@/components/phase2/health-vulnerabilities/VulnerabilitiesSubTab', () => {
  return function MockVulnerabilitiesSubTab() {
    return <div data-testid="vulnerabilities-subtab">Vulnerabilities Sub Tab Content</div>;
  };
});

const createWrapper = () => {
  const queryClient = new QueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('HealthVulnerabilityTab', () => {
  describe('tab navigation', () => {
    it('should render Health and Vulnerabilities tabs', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('tab', { name: /health/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /vulnerabilities/i })).toBeInTheDocument();
    });

    it('should show Health tab content by default', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('tab', { name: /health/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('health-subtab')).toBeInTheDocument();
    });

    it('should switch to Vulnerabilities tab on click', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('tab', { name: /vulnerabilities/i }));

      expect(screen.getByRole('tab', { name: /vulnerabilities/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('vulnerabilities-subtab')).toBeInTheDocument();
    });

    it('should switch back to Health tab on click', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      // Switch to Vulnerabilities
      fireEvent.click(screen.getByRole('tab', { name: /vulnerabilities/i }));
      // Switch back to Health
      fireEvent.click(screen.getByRole('tab', { name: /health/i }));

      expect(screen.getByRole('tab', { name: /health/i })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('health-subtab')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA roles', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(2);
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();
    });

    it('should have aria-controls linking tabs to panels', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      const healthTab = screen.getByRole('tab', { name: /health/i });
      expect(healthTab).toHaveAttribute('aria-controls');
    });

    it('should support keyboard navigation with arrow keys', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      const healthTab = screen.getByRole('tab', { name: /health/i });
      healthTab.focus();

      fireEvent.keyDown(healthTab, { key: 'ArrowRight' });

      expect(screen.getByRole('tab', { name: /vulnerabilities/i })).toHaveFocus();
    });

    it('should support Enter key to select tab', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      const vulnTab = screen.getByRole('tab', { name: /vulnerabilities/i });
      vulnTab.focus();
      fireEvent.keyDown(vulnTab, { key: 'Enter' });

      expect(vulnTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('tab styling', () => {
    it('should have active styling on selected tab', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      const healthTab = screen.getByRole('tab', { name: /health/i });
      expect(healthTab).toHaveClass('bg-primary-700');
    });

    it('should have inactive styling on non-selected tab', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      const vulnTab = screen.getByRole('tab', { name: /vulnerabilities/i });
      expect(vulnTab).not.toHaveClass('bg-primary-700');
    });
  });

  describe('enhanced accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations after tab switch', async () => {
      const { container } = render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('tab', { name: /vulnerabilities/i }));

      await waitFor(() => {
        expect(screen.getByTestId('vulnerabilities-subtab')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper focus ring on tabs', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      const healthTab = screen.getByRole('tab', { name: /health/i });
      expect(healthTab).toHaveClass('focus:ring-2');
    });

    it('should support ArrowLeft navigation', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      const healthTab = screen.getByRole('tab', { name: /health/i });
      healthTab.focus();

      fireEvent.keyDown(healthTab, { key: 'ArrowLeft' });

      expect(screen.getByRole('tab', { name: /vulnerabilities/i })).toHaveFocus();
    });

    it('should wrap around on ArrowRight from last tab', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      const vulnTab = screen.getByRole('tab', { name: /vulnerabilities/i });
      vulnTab.focus();

      fireEvent.keyDown(vulnTab, { key: 'ArrowRight' });

      expect(screen.getByRole('tab', { name: /health/i })).toHaveFocus();
    });

    it('should support Space key to select tab', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      const vulnTab = screen.getByRole('tab', { name: /vulnerabilities/i });
      vulnTab.focus();
      fireEvent.keyDown(vulnTab, { key: ' ' });

      expect(vulnTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should have proper tabindex on tabs', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      // Active tab should have tabindex 0, inactive should have -1
      const healthTab = screen.getByRole('tab', { name: /health/i });
      const vulnTab = screen.getByRole('tab', { name: /vulnerabilities/i });

      expect(healthTab).toHaveAttribute('tabindex', '0');
      expect(vulnTab).toHaveAttribute('tabindex', '-1');
    });

    it('should update tabindex when switching tabs', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      const healthTab = screen.getByRole('tab', { name: /health/i });
      const vulnTab = screen.getByRole('tab', { name: /vulnerabilities/i });

      fireEvent.click(vulnTab);

      expect(healthTab).toHaveAttribute('tabindex', '-1');
      expect(vulnTab).toHaveAttribute('tabindex', '0');
    });
  });

  describe('edge cases', () => {
    it('should handle rapid tab switching', async () => {
      const user = userEvent.setup();

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      const healthTab = screen.getByRole('tab', { name: /health/i });
      const vulnTab = screen.getByRole('tab', { name: /vulnerabilities/i });

      // Rapidly switch tabs
      for (let i = 0; i < 10; i++) {
        await user.click(vulnTab);
        await user.click(healthTab);
      }

      // Should still be functional
      expect(healthTab).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByTestId('health-subtab')).toBeInTheDocument();
    });

    it('should handle multiple Enter key presses', async () => {
      const user = userEvent.setup();

      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      const vulnTab = screen.getByRole('tab', { name: /vulnerabilities/i });
      vulnTab.focus();

      // Multiple Enter presses
      await user.keyboard('{Enter}{Enter}{Enter}');

      expect(vulnTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should preserve state when switching between tabs', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      // Start at Health tab
      expect(screen.getByTestId('health-subtab')).toBeInTheDocument();

      // Switch to Vulnerabilities
      fireEvent.click(screen.getByRole('tab', { name: /vulnerabilities/i }));
      expect(screen.getByTestId('vulnerabilities-subtab')).toBeInTheDocument();

      // Switch back to Health
      fireEvent.click(screen.getByRole('tab', { name: /health/i }));
      expect(screen.getByTestId('health-subtab')).toBeInTheDocument();
    });

    it('should handle different clientGroupId props', () => {
      const { rerender } = render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();

      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <HealthVulnerabilityTab clientGroupId={999} productOwnerId={200} />
        </QueryClientProvider>
      );

      expect(screen.getByRole('tablist')).toBeInTheDocument();
    });

    it('should handle zero as clientGroupId', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={0} productOwnerId={0} />,
        { wrapper: createWrapper() }
      );

      // Should still render tabs
      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(2);
    });
  });

  describe('screen reader support', () => {
    it('should have descriptive tablist aria-label', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('tablist')).toHaveAttribute('aria-label');
    });

    it('should have aria-labelledby on tabpanel', () => {
      render(
        <HealthVulnerabilityTab clientGroupId={1} productOwnerId={100} />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby');
    });
  });
});
```

---

## GREEN Phase - Implement Component

**Agent**: `coder-agent`

**Instructions**: Use the coder-agent to implement the HealthVulnerabilityTab component to pass all tests.

**File**: `frontend/src/components/phase2/health-vulnerabilities/HealthVulnerabilityTab.tsx`

```typescript
/**
 * HealthVulnerabilityTab Component
 *
 * Parent container for Health and Vulnerabilities feature.
 * Contains sub-tab navigation between Health and Vulnerabilities views.
 */

import React, { useState, useCallback } from 'react';
import HealthSubTab from './HealthSubTab';
import VulnerabilitiesSubTab from './VulnerabilitiesSubTab';

type SubTabType = 'health' | 'vulnerabilities';

interface HealthVulnerabilityTabProps {
  clientGroupId: number;
  productOwnerId: number;
}

const TAB_CONFIG = {
  health: { label: 'Health', panelId: 'health-panel' },
  vulnerabilities: { label: 'Vulnerabilities', panelId: 'vulnerabilities-panel' },
} as const;

const CSS = {
  TAB_LIST: 'inline-flex items-center bg-primary-50 rounded-lg p-1 border border-primary-200 shadow-sm',
  TAB_BASE: 'flex items-center gap-1.5 px-4 py-2 rounded-md transition-all text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
  TAB_ACTIVE: 'bg-primary-700 text-white shadow-md',
  TAB_INACTIVE: 'text-primary-700 hover:bg-primary-100',
} as const;

const HealthVulnerabilityTab: React.FC<HealthVulnerabilityTabProps> = ({
  clientGroupId,
  productOwnerId,
}) => {
  const [activeTab, setActiveTab] = useState<SubTabType>('health');

  const handleTabChange = useCallback((tab: SubTabType) => {
    setActiveTab(tab);
  }, []);

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent<HTMLButtonElement>,
    currentTab: SubTabType
  ) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextTab = currentTab === 'health' ? 'vulnerabilities' : 'health';
      setActiveTab(nextTab);
      // Focus the next tab
      const nextButton = document.querySelector(`[data-tab="${nextTab}"]`) as HTMLButtonElement;
      nextButton?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevTab = currentTab === 'health' ? 'vulnerabilities' : 'health';
      setActiveTab(prevTab);
      const prevButton = document.querySelector(`[data-tab="${prevTab}"]`) as HTMLButtonElement;
      prevButton?.focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveTab(currentTab);
    }
  }, []);

  const getTabClassName = (tab: SubTabType) => {
    const isActive = activeTab === tab;
    return `${CSS.TAB_BASE} ${isActive ? CSS.TAB_ACTIVE : CSS.TAB_INACTIVE}`;
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex items-center justify-center">
        <div
          role="tablist"
          aria-label="Health and Vulnerabilities tabs"
          className={CSS.TAB_LIST}
        >
          <button
            role="tab"
            data-tab="health"
            aria-selected={activeTab === 'health'}
            aria-controls={TAB_CONFIG.health.panelId}
            tabIndex={activeTab === 'health' ? 0 : -1}
            onClick={() => handleTabChange('health')}
            onKeyDown={(e) => handleKeyDown(e, 'health')}
            className={getTabClassName('health')}
          >
            {TAB_CONFIG.health.label}
          </button>
          <button
            role="tab"
            data-tab="vulnerabilities"
            aria-selected={activeTab === 'vulnerabilities'}
            aria-controls={TAB_CONFIG.vulnerabilities.panelId}
            tabIndex={activeTab === 'vulnerabilities' ? 0 : -1}
            onClick={() => handleTabChange('vulnerabilities')}
            onKeyDown={(e) => handleKeyDown(e, 'vulnerabilities')}
            className={getTabClassName('vulnerabilities')}
          >
            {TAB_CONFIG.vulnerabilities.label}
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'health' ? (
        <div
          id={TAB_CONFIG.health.panelId}
          role="tabpanel"
          aria-labelledby="health-tab"
        >
          <HealthSubTab
            clientGroupId={clientGroupId}
            productOwnerId={productOwnerId}
          />
        </div>
      ) : (
        <div
          id={TAB_CONFIG.vulnerabilities.panelId}
          role="tabpanel"
          aria-labelledby="vulnerabilities-tab"
        >
          <VulnerabilitiesSubTab
            clientGroupId={clientGroupId}
            productOwnerId={productOwnerId}
          />
        </div>
      )}
    </div>
  );
};

export default HealthVulnerabilityTab;
```

---

## BLUE Phase - Refactor

- [ ] Extract TabNavigation to reusable component if not using existing
- [ ] Add URL state sync for active tab (optional)
- [ ] Ensure styling matches other Phase 2 tabs
- [ ] Add comprehensive accessibility testing

---

## Acceptance Criteria

- [ ] All 28+ tests pass (10 base + 18 enhanced)
- [ ] Health and Vulnerabilities tabs render
- [ ] Health tab selected by default
- [ ] Tab switching works on click
- [ ] Keyboard navigation works (Arrow keys, Enter, Space)
- [ ] Proper ARIA roles and attributes
- [ ] Active/inactive tab styling correct
- [ ] **Accessibility**: No jest-axe violations, focus rings, proper tabindex management
- [ ] **Keyboard navigation**: ArrowLeft/Right wraps around, Space/Enter select tab
- [ ] **Edge cases**: Rapid tab switching, prop changes, zero IDs
- [ ] **Screen reader**: Descriptive aria-label, aria-labelledby on tabpanel
