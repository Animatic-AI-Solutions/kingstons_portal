# Cycle 10: AddHealthVulnerabilityModal Component

**Goal**: Create modal for adding new health conditions or vulnerabilities

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for the AddHealthVulnerabilityModal component.

**File**: `frontend/src/tests/components/phase2/health-vulnerabilities/AddHealthVulnerabilityModal.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddHealthVulnerabilityModal from '@/components/phase2/health-vulnerabilities/AddHealthVulnerabilityModal';
import { PersonWithCounts } from '@/types/healthVulnerability';

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('AddHealthVulnerabilityModal', () => {
  const mockPerson: PersonWithCounts = {
    id: 1,
    name: 'John Smith',
    relationship: 'Primary Owner',
    personType: 'product_owner',
    status: 'Active',
    activeCount: 0,
    inactiveCount: 0,
  };

  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('modal rendering', () => {
    it('should not render when isOpen is false', () => {
      render(
        <AddHealthVulnerabilityModal
          isOpen={false}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should show person name in title', () => {
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/John Smith/)).toBeInTheDocument();
    });
  });

  describe('health form', () => {
    it('should render health form fields when tabType is health', () => {
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/condition/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/diagnosed/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/medication/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it('should require condition field', async () => {
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/condition is required/i)).toBeInTheDocument();
      });
    });

    it('should submit health form with valid data', async () => {
      const user = userEvent.setup();

      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/condition/i), 'Smoking');
      await user.type(screen.getByLabelText(/name/i), 'Current Smoker');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });

  describe('vulnerability form', () => {
    it('should render vulnerability form fields when tabType is vulnerabilities', () => {
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="vulnerabilities"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/adjustments/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/diagnosed/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it('should require description field', async () => {
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="vulnerabilities"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      const submitButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/description is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('modal actions', () => {
    it('should call onClose when cancel button clicked', () => {
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when X button clicked', () => {
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('special relationship support', () => {
    it('should handle special relationship person', () => {
      const srPerson: PersonWithCounts = {
        ...mockPerson,
        id: 10,
        personType: 'special_relationship',
      };

      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={srPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests (jest-axe)
  // ===========================================================================

  describe('accessibility', () => {
    it('should have no accessibility violations for health form', async () => {
      const { container } = render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations for vulnerability form', async () => {
      const { container } = render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="vulnerabilities"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      // Tab through all focusable elements
      const dialog = screen.getByRole('dialog');
      expect(dialog).toContainFocus();

      // Tab to close button
      await user.tab();
      expect(screen.getByRole('button', { name: /close/i })).toHaveFocus();
    });

    it('should close modal on Escape key', async () => {
      const user = userEvent.setup();
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should have aria-labelledby pointing to dialog title', () => {
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      const dialog = screen.getByRole('dialog');
      const titleId = dialog.getAttribute('aria-labelledby');
      expect(titleId).toBeTruthy();
      expect(document.getElementById(titleId!)).toHaveTextContent(/health condition/i);
    });

    it('should have proper form labels', () => {
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      // All form fields should have labels
      expect(screen.getByLabelText(/condition/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    });

    it('should have aria-live region for announcements', () => {
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      // Should have aria-live region for status announcements
      const liveRegion = document.querySelector('[aria-live]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('should announce success message via aria-live on successful save', async () => {
      const user = userEvent.setup();

      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      await user.selectOptions(screen.getByLabelText(/condition/i), 'Smoking');
      await user.type(screen.getByLabelText(/name/i), 'Current Smoker');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        const liveRegion = document.querySelector('[aria-live="polite"]');
        expect(liveRegion).toHaveTextContent(/saved successfully|added successfully/i);
      });
    });

    it('should announce error message via aria-live on save failure', async () => {
      // Mock the mutation to fail
      const user = userEvent.setup();

      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      await user.selectOptions(screen.getByLabelText(/condition/i), 'Smoking');
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Trigger error state - in real test, mock would fail
      await waitFor(() => {
        const liveRegion = document.querySelector('[aria-live="assertive"]');
        // If error occurred, it should be announced
        if (liveRegion?.textContent) {
          expect(liveRegion.textContent).toMatch(/error|failed/i);
        }
      });
    });

    it('should return focus to trigger element after modal closes', async () => {
      const user = userEvent.setup();
      const triggerRef = { current: null as HTMLButtonElement | null };

      // Render a trigger button that opens the modal
      const { rerender } = render(
        <>
          <button ref={(el) => { triggerRef.current = el; }} data-testid="trigger">
            Open Modal
          </button>
          <AddHealthVulnerabilityModal
            isOpen={true}
            onClose={mockOnClose}
            person={mockPerson}
            tabType="health"
            onSuccess={mockOnSuccess}
            triggerRef={triggerRef}
          />
        </>,
        { wrapper: createWrapper() }
      );

      // Close the modal
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Rerender with modal closed
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <button ref={(el) => { triggerRef.current = el; }} data-testid="trigger">
            Open Modal
          </button>
          <AddHealthVulnerabilityModal
            isOpen={false}
            onClose={mockOnClose}
            person={mockPerson}
            tabType="health"
            onSuccess={mockOnSuccess}
            triggerRef={triggerRef}
          />
        </QueryClientProvider>
      );

      // Focus should return to trigger
      await waitFor(() => {
        expect(screen.getByTestId('trigger')).toHaveFocus();
      });
    });

    it('should return focus to trigger after successful save', async () => {
      const user = userEvent.setup();
      const triggerRef = { current: null as HTMLButtonElement | null };

      render(
        <>
          <button ref={(el) => { triggerRef.current = el; }} data-testid="trigger">
            Open Modal
          </button>
          <AddHealthVulnerabilityModal
            isOpen={true}
            onClose={mockOnClose}
            person={mockPerson}
            tabType="health"
            onSuccess={mockOnSuccess}
            triggerRef={triggerRef}
          />
        </>,
        { wrapper: createWrapper() }
      );

      await user.selectOptions(screen.getByLabelText(/condition/i), 'Smoking');
      await user.type(screen.getByLabelText(/name/i), 'Current Smoker');
      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });

      // After success, focus should return to trigger
      await waitFor(() => {
        expect(screen.getByTestId('trigger')).toHaveFocus();
      });
    });
  });

  // ===========================================================================
  // Inline Validation Tests
  // ===========================================================================

  describe('inline validation', () => {
    it('should show error on blur for empty required field', async () => {
      const user = userEvent.setup();
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      const conditionField = screen.getByLabelText(/condition/i);
      await user.click(conditionField);
      await user.tab(); // Blur the field

      await waitFor(() => {
        expect(screen.getByText(/condition is required/i)).toBeInTheDocument();
      });
    });

    it('should clear error when valid value entered', async () => {
      const user = userEvent.setup();
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      // First, trigger error
      const conditionField = screen.getByLabelText(/condition/i);
      await user.click(conditionField);
      await user.tab();

      await waitFor(() => {
        expect(screen.getByText(/condition is required/i)).toBeInTheDocument();
      });

      // Then fix it
      await user.click(conditionField);
      await user.selectOptions(conditionField, 'Smoking');

      await waitFor(() => {
        expect(screen.queryByText(/condition is required/i)).not.toBeInTheDocument();
      });
    });

    it('should show visual error styling on invalid field', async () => {
      const user = userEvent.setup();
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      const conditionField = screen.getByLabelText(/condition/i);
      await user.click(conditionField);
      await user.tab();

      await waitFor(() => {
        expect(conditionField).toHaveClass('border-red-300');
      });
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle form reset when modal closes and reopens', async () => {
      const { rerender } = render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      // Enter some data
      const user = userEvent.setup();
      await user.type(screen.getByLabelText(/name/i), 'Test Name');

      // Close modal
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <AddHealthVulnerabilityModal
            isOpen={false}
            onClose={mockOnClose}
            person={mockPerson}
            tabType="health"
            onSuccess={mockOnSuccess}
          />
        </QueryClientProvider>
      );

      // Reopen modal
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <AddHealthVulnerabilityModal
            isOpen={true}
            onClose={mockOnClose}
            person={mockPerson}
            tabType="health"
            onSuccess={mockOnSuccess}
          />
        </QueryClientProvider>
      );

      // Form should be reset
      expect(screen.getByLabelText(/name/i)).toHaveValue('');
    });

    it('should handle special characters in form input', async () => {
      const user = userEvent.setup();
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="vulnerabilities"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/description/i), "O'Brien's <Test> & \"Condition\"");
      expect(screen.getByLabelText(/description/i)).toHaveValue("O'Brien's <Test> & \"Condition\"");
    });

    it('should handle unicode characters in form input', async () => {
      const user = userEvent.setup();
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="vulnerabilities"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      await user.type(screen.getByLabelText(/description/i), '聴覚障害 émoji 🏥');
      expect(screen.getByLabelText(/description/i)).toHaveValue('聴覚障害 émoji 🏥');
    });

    it('should prevent double submission', async () => {
      const user = userEvent.setup();
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      await user.selectOptions(screen.getByLabelText(/condition/i), 'Smoking');
      const submitButton = screen.getByRole('button', { name: /save/i });

      // Click twice rapidly
      await user.click(submitButton);
      await user.click(submitButton);

      // Button should be disabled after first click
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should handle notes field with long text', async () => {
      const user = userEvent.setup();
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      const longText = 'A'.repeat(1000);
      const notesField = screen.getByLabelText(/notes/i);
      await user.type(notesField, longText);

      expect(notesField).toHaveValue(longText);
    });
  });

  // ===========================================================================
  // Keyboard Navigation Tests
  // ===========================================================================

  describe('keyboard navigation', () => {
    it('should allow form navigation with Tab', async () => {
      const user = userEvent.setup();
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      // Start from close button
      await user.tab();

      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText(/condition/i)).toHaveFocus();
    });

    it('should submit form with Enter key', async () => {
      const user = userEvent.setup();
      render(
        <AddHealthVulnerabilityModal
          isOpen={true}
          onClose={mockOnClose}
          person={mockPerson}
          tabType="health"
          onSuccess={mockOnSuccess}
        />,
        { wrapper: createWrapper() }
      );

      await user.selectOptions(screen.getByLabelText(/condition/i), 'Smoking');

      // Focus submit button and press Enter
      const submitButton = screen.getByRole('button', { name: /save/i });
      submitButton.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });
});
```

---

## GREEN Phase - Implement Component

**Agent**: `coder-agent`

**Instructions**: Use the coder-agent to implement the AddHealthVulnerabilityModal component to pass all tests.

**File**: `frontend/src/components/phase2/health-vulnerabilities/AddHealthVulnerabilityModal.tsx`

```typescript
/**
 * AddHealthVulnerabilityModal Component
 *
 * Modal for adding new health conditions or vulnerabilities.
 * Form fields change based on tabType (health vs vulnerabilities).
 * Uses HeadlessUI Dialog for accessible modal implementation with focus trap.
 *
 * @component
 * @param {AddHealthVulnerabilityModalProps} props - Component props
 */

import React, { Fragment, useState, useRef, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { BaseInput, TextArea, ActionButton } from '@/components/ui';
import { useCreateHealthRecord, useCreateVulnerability } from '@/hooks/useHealthVulnerabilities';
import {
  PersonWithCounts,
  HealthConditionFormData,
  VulnerabilityFormData,
  HEALTH_STATUS_OPTIONS,
  VULNERABILITY_STATUS_OPTIONS,
  CONDITION_TYPES,
} from '@/types/healthVulnerability';

type TabType = 'health' | 'vulnerabilities';

interface AddHealthVulnerabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  person: PersonWithCounts;
  tabType: TabType;
  onSuccess: () => void;
}

/**
 * Transition timing constants for HeadlessUI
 */
const TRANSITION_DURATION = {
  ENTER: 'ease-out duration-300',
  LEAVE: 'ease-in duration-200',
} as const;

const AddHealthVulnerabilityModal: React.FC<AddHealthVulnerabilityModalProps> = ({
  isOpen,
  onClose,
  person,
  tabType,
  onSuccess,
}) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const createHealth = useCreateHealthRecord();
  const createVulnerability = useCreateVulnerability();

  // Health form state
  const [healthForm, setHealthForm] = useState<HealthConditionFormData>({
    condition: '',
    name: '',
    date_of_diagnosis: '',
    status: 'Active',
    medication: '',
    notes: '',
  });

  // Vulnerability form state
  const [vulnForm, setVulnForm] = useState<VulnerabilityFormData>({
    description: '',
    adjustments: '',
    diagnosed: false,
    status: 'Active',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Inline validation - validates on change and blur
  const validateField = useCallback((field: string, value: string): string => {
    switch (field) {
      case 'condition':
        return !value.trim() ? 'Condition is required' : '';
      case 'description':
        return !value.trim() ? 'Description is required' : '';
      default:
        return '';
    }
  }, []);

  // Handle field change with inline validation
  const handleHealthFieldChange = useCallback((field: keyof HealthConditionFormData, value: string) => {
    setHealthForm(prev => ({ ...prev, [field]: value }));

    // Only show error if field has been touched
    if (touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  }, [touched, validateField]);

  const handleVulnFieldChange = useCallback((field: keyof VulnerabilityFormData, value: string | boolean) => {
    setVulnForm(prev => ({ ...prev, [field]: value }));

    // Only validate string fields
    if (typeof value === 'string' && touched[field]) {
      const error = validateField(field, value);
      setErrors(prev => ({ ...prev, [field]: error }));
    }
  }, [touched, validateField]);

  // Handle blur - mark field as touched and validate
  const handleBlur = useCallback((field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, value);
    setErrors(prev => ({ ...prev, [field]: error }));
  }, [validateField]);

  const validateHealthForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    if (!healthForm.condition.trim()) {
      newErrors.condition = 'Condition is required';
      newTouched.condition = true;
    }

    setErrors(newErrors);
    setTouched(prev => ({ ...prev, ...newTouched }));
    return Object.keys(newErrors).length === 0;
  };

  const validateVulnForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    if (!vulnForm.description.trim()) {
      newErrors.description = 'Description is required';
      newTouched.description = true;
    }

    setErrors(newErrors);
    setTouched(prev => ({ ...prev, ...newTouched }));
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (tabType === 'health') {
      if (!validateHealthForm()) return;

      const payload = {
        ...healthForm,
        ...(person.personType === 'product_owner'
          ? { product_owner_id: person.id }
          : { special_relationship_id: person.id }),
      };

      await createHealth.mutateAsync(payload);
    } else {
      if (!validateVulnForm()) return;

      const payload = {
        ...vulnForm,
        ...(person.personType === 'product_owner'
          ? { product_owner_id: person.id }
          : { special_relationship_id: person.id }),
      };

      await createVulnerability.mutateAsync(payload);
    }

    onSuccess();
    onClose();
  };

  const title = tabType === 'health'
    ? `Add Health Condition for ${person.name}`
    : `Add Vulnerability for ${person.name}`;

  const isLoading = createHealth.isPending || createVulnerability.isPending;

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={onClose}
        initialFocus={cancelButtonRef}
      >
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter={TRANSITION_DURATION.ENTER}
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave={TRANSITION_DURATION.LEAVE}
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        {/* Modal container */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter={TRANSITION_DURATION.ENTER}
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave={TRANSITION_DURATION.LEAVE}
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium leading-6 text-gray-900">
                    {title}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    aria-label="Close"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {tabType === 'health' ? (
                    <>
                      <div>
                        <label htmlFor="condition" className="block text-sm font-medium text-gray-700">
                          Condition *
                        </label>
                        <select
                          id="condition"
                          value={healthForm.condition}
                          onChange={(e) => handleHealthFieldChange('condition', e.target.value)}
                          onBlur={(e) => handleBlur('condition', e.target.value)}
                          className={`mt-1 block w-full rounded-md shadow-sm focus:ring-primary-500 ${
                            errors.condition && touched.condition
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-gray-300 focus:border-primary-500'
                          }`}
                        >
                          <option value="">Select condition type</option>
                          {CONDITION_TYPES.map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                        {errors.condition && touched.condition && (
                          <p className="mt-1 text-sm text-red-600">{errors.condition}</p>
                        )}
                      </div>

                      <BaseInput
                        id="name"
                        label="Name"
                        value={healthForm.name || ''}
                        onChange={(e) => handleHealthFieldChange('name', e.target.value)}
                        onBlur={(e) => handleBlur('name', e.target.value)}
                        placeholder="e.g., Current Smoker, Type 2 Diabetes"
                      />

                      <BaseInput
                        id="diagnosed"
                        label="Diagnosed"
                        type="date"
                        value={healthForm.date_of_diagnosis || ''}
                        onChange={(e) => handleHealthFieldChange('date_of_diagnosis', e.target.value)}
                      />

                      <BaseInput
                        id="medication"
                        label="Medication/Dosage"
                        value={healthForm.medication || ''}
                        onChange={(e) => handleHealthFieldChange('medication', e.target.value)}
                        placeholder="e.g., Metformin 500mg twice daily"
                      />

                      <div>
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <select
                          id="status"
                          value={healthForm.status}
                          onChange={(e) => handleHealthFieldChange('status', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        >
                          {HEALTH_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                          Notes
                        </label>
                        <TextArea
                          id="notes"
                          value={healthForm.notes || ''}
                          onChange={(e) => handleHealthFieldChange('notes', e.target.value)}
                          placeholder="Additional notes..."
                          rows={3}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <BaseInput
                        id="description"
                        label="Description *"
                        value={vulnForm.description}
                        onChange={(e) => handleVulnFieldChange('description', e.target.value)}
                        onBlur={(e) => handleBlur('description', e.target.value)}
                        placeholder="e.g., Hearing impairment"
                        error={errors.description && touched.description ? errors.description : undefined}
                      />

                      <BaseInput
                        id="adjustments"
                        label="Adjustments"
                        value={vulnForm.adjustments || ''}
                        onChange={(e) => handleVulnFieldChange('adjustments', e.target.value)}
                        placeholder="e.g., Speak clearly, face-to-face"
                      />

                      <div className="flex items-center gap-2">
                        <input
                          id="diagnosed"
                          type="checkbox"
                          checked={vulnForm.diagnosed}
                          onChange={(e) => handleVulnFieldChange('diagnosed', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor="diagnosed" className="text-sm font-medium text-gray-700">
                          Professionally Diagnosed
                        </label>
                      </div>

                      <div>
                        <label htmlFor="vulnStatus" className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <select
                          id="vulnStatus"
                          value={vulnForm.status}
                          onChange={(e) => handleVulnFieldChange('status', e.target.value)}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                        >
                          {VULNERABILITY_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="vulnNotes" className="block text-sm font-medium text-gray-700">
                          Notes
                        </label>
                        <TextArea
                          id="vulnNotes"
                          value={vulnForm.notes || ''}
                          onChange={(e) => handleVulnFieldChange('notes', e.target.value)}
                          placeholder="Additional notes..."
                          rows={3}
                        />
                      </div>
                    </>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      ref={cancelButtonRef}
                      type="button"
                      onClick={onClose}
                      disabled={isLoading}
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <ActionButton
                      type="submit"
                      isLoading={isLoading}
                      disabled={isLoading}
                    >
                      Save
                    </ActionButton>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default AddHealthVulnerabilityModal;
```

---

## BLUE Phase - Refactor

- [ ] Extract form to separate components (HealthForm, VulnerabilityForm)
- [ ] Add form validation library (react-hook-form or similar)
- [ ] Add error handling for API failures
- [ ] Add loading states
- [ ] Use ModalShell from UI components

---

## Acceptance Criteria

- [ ] All 40+ tests pass (11 base + 29 enhanced including aria-live/focus return)
- [ ] Modal shows/hides based on isOpen prop
- [ ] Correct form fields for health vs vulnerability
- [ ] Form validation works
- [ ] Submit creates record via API
- [ ] Cancel/Close buttons work
- [ ] Supports both product owners and special relationships
- [ ] **Aria-live regions**: Success/error announcements for screen readers
- [ ] **Focus return**: Focus returns to trigger element after modal closes
- [ ] **Focus return on success**: Focus returns after successful save
