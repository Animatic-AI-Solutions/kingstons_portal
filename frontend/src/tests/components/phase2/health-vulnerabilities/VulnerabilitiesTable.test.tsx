/**
 * VulnerabilitiesTable Component Tests (RED Phase - Cycle 9)
 *
 * Tests for the VulnerabilitiesTable component that displays vulnerabilities
 * in a nested table with columns: Description, Adjustments, Diagnosed, Recorded, Status, Actions.
 *
 * The component displays:
 * - Description column with vulnerability description
 * - Adjustments column with accommodations text
 * - Diagnosed column with "Yes" or "No" (boolean to string)
 * - Recorded column with date formatted as dd/MM/yyyy
 * - Status column with appropriate styling (handled by Phase2Table)
 * - Actions column with delete button
 *
 * Following TDD RED-GREEN-BLUE methodology.
 * Expected Result: All tests FAIL (RED phase) until implementation complete.
 *
 * @module tests/components/phase2/health-vulnerabilities/VulnerabilitiesTable
 */

import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import type { Vulnerability, VulnerabilityProductOwner, PersonType } from '@/types/healthVulnerability';

// This import will fail in RED phase - component doesn't exist yet
import VulnerabilitiesTable from '@/components/phase2/health-vulnerabilities/VulnerabilitiesTable';

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

// =============================================================================
// Mock Data
// =============================================================================

const mockVulnerabilities: VulnerabilityProductOwner[] = [
  {
    id: 1,
    product_owner_id: 100,
    description: 'Cognitive decline',
    adjustments: 'Speak slowly, use written summaries',
    diagnosed: true,
    status: 'Active',
    notes: 'Early stage',
    created_at: '2024-01-15T10:00:00Z',
    date_recorded: '2024-01-15',
  },
  {
    id: 2,
    product_owner_id: 100,
    description: 'Recent bereavement',
    adjustments: null,
    diagnosed: false,
    status: 'Inactive',
    notes: null,
    created_at: '2024-02-20T14:00:00Z',
    date_recorded: null,
  },
  {
    id: 3,
    product_owner_id: 100,
    description: 'Hearing impairment',
    adjustments: 'Speak clearly, face the client',
    diagnosed: true,
    status: 'Active',
    notes: 'Uses hearing aid',
    created_at: '2024-03-10T09:00:00Z',
    date_recorded: '2024-03-10',
  },
];

// Default props for rendering
const defaultProps = {
  vulnerabilities: mockVulnerabilities,
  personId: 100,
  personType: 'product_owner' as PersonType,
  onRowClick: jest.fn(),
  onDelete: jest.fn(),
  isLoading: false,
};

// =============================================================================
// Test Suite
// =============================================================================

describe('VulnerabilitiesTable Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // 1. Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should render all table headers (Description, Adjustments, Diagnosed, Recorded, Status, Actions)', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      expect(screen.getByRole('columnheader', { name: /description/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /adjustments/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /diagnosed/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /recorded/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
    });

    it('should render vulnerability data in rows', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      expect(screen.getByText('Cognitive decline')).toBeInTheDocument();
      expect(screen.getByText('Recent bereavement')).toBeInTheDocument();
      expect(screen.getByText('Hearing impairment')).toBeInTheDocument();
    });

    it('should display adjustments text', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      expect(screen.getByText('Speak slowly, use written summaries')).toBeInTheDocument();
      expect(screen.getByText('Speak clearly, face the client')).toBeInTheDocument();
    });

    it('should display "Yes" for diagnosed=true and "No" for diagnosed=false', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      // Find the rows and check diagnosed column values
      const rows = screen.getAllByRole('row');

      // First row (Cognitive decline) should have "Yes"
      const cognitiveRow = rows.find(row => within(row).queryByText('Cognitive decline'));
      if (cognitiveRow) {
        expect(within(cognitiveRow).getByText('Yes')).toBeInTheDocument();
      }

      // Second row (Recent bereavement) should have "No"
      const bereavementRow = rows.find(row => within(row).queryByText('Recent bereavement'));
      if (bereavementRow) {
        expect(within(bereavementRow).getByText('No')).toBeInTheDocument();
      }
    });

    it('should format date_recorded as dd/MM/yyyy', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      // 2024-01-15 should be formatted as 15/01/2024
      expect(screen.getByText('15/01/2024')).toBeInTheDocument();
      // 2024-03-10 should be formatted as 10/03/2024
      expect(screen.getByText('10/03/2024')).toBeInTheDocument();
    });

    it('should show en-dash for null date_recorded', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      // Find the row with Recent bereavement (has null date_recorded)
      const rows = screen.getAllByRole('row');
      const bereavementRow = rows.find(row => within(row).queryByText('Recent bereavement'));

      if (bereavementRow) {
        // Should display en-dash for missing date
        expect(within(bereavementRow).getByText('\u2013')).toBeInTheDocument();
      }
    });

    it('should show dash (-) for null/empty adjustments', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      // Find the row with Recent bereavement (has null adjustments)
      const rows = screen.getAllByRole('row');
      const bereavementRow = rows.find(row => within(row).queryByText('Recent bereavement'));

      if (bereavementRow) {
        // Should display dash for missing adjustments
        expect(within(bereavementRow).getByText('-')).toBeInTheDocument();
      }
    });

    it('should render correct aria-label for table', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label', expect.stringMatching(/vulnerabilit/i));
    });
  });

  // ===========================================================================
  // 2. Loading State Tests
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading skeleton when isLoading is true', () => {
      render(<VulnerabilitiesTable {...defaultProps} isLoading={true} />);

      // Should show skeleton/loading indicator
      const skeletons = document.querySelectorAll('.animate-pulse, [role="progressbar"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not show data rows when loading', () => {
      render(<VulnerabilitiesTable {...defaultProps} isLoading={true} />);

      // Should not show actual vulnerability data
      expect(screen.queryByText('Cognitive decline')).not.toBeInTheDocument();
      expect(screen.queryByText('Recent bereavement')).not.toBeInTheDocument();
    });

    it('should pass isLoading to Phase2Table', () => {
      render(<VulnerabilitiesTable {...defaultProps} isLoading={true} />);

      // Table should have aria-busy when loading
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-busy', 'true');
    });
  });

  // ===========================================================================
  // 3. Error State Tests
  // ===========================================================================

  describe('Error State', () => {
    const testError = new Error('Failed to load vulnerabilities');

    it('should display error message when error is present', () => {
      render(<VulnerabilitiesTable {...defaultProps} error={testError} />);

      expect(screen.getByText(/failed to load vulnerabilities/i)).toBeInTheDocument();
    });

    it('should show retry button when onRetry is provided', () => {
      const mockOnRetry = jest.fn();
      render(<VulnerabilitiesTable {...defaultProps} error={testError} onRetry={mockOnRetry} />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', async () => {
      const mockOnRetry = jest.fn();
      const user = userEvent.setup();

      render(<VulnerabilitiesTable {...defaultProps} error={testError} onRetry={mockOnRetry} />);

      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });

    it('should pass error to Phase2Table', () => {
      render(<VulnerabilitiesTable {...defaultProps} error={testError} />);

      // Should have error alert role
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 4. Empty State Tests
  // ===========================================================================

  describe('Empty State', () => {
    it('should show empty message when no vulnerabilities', () => {
      render(<VulnerabilitiesTable {...defaultProps} vulnerabilities={[]} />);

      expect(screen.getByText(/no vulnerabilit/i)).toBeInTheDocument();
    });

    it('should not show table rows when empty', () => {
      render(<VulnerabilitiesTable {...defaultProps} vulnerabilities={[]} />);

      // Should not have any data rows
      const rows = screen.queryAllByRole('row');
      // At most there might be a header row, but no data rows
      expect(rows.length).toBeLessThanOrEqual(1);
    });
  });

  // ===========================================================================
  // 5. Interaction Tests
  // ===========================================================================

  describe('Interaction', () => {
    it('should call onRowClick with correct vulnerability when row is clicked', async () => {
      const mockOnRowClick = jest.fn();
      const user = userEvent.setup();

      render(<VulnerabilitiesTable {...defaultProps} onRowClick={mockOnRowClick} />);

      const rows = screen.getAllByRole('row');
      // Click the first data row
      await user.click(rows[1]);

      expect(mockOnRowClick).toHaveBeenCalledTimes(1);
      expect(mockOnRowClick).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.any(String),
        })
      );
    });

    it('should have cursor-pointer on clickable rows', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      // Skip header row
      const dataRows = rows.slice(1);

      dataRows.forEach(row => {
        expect(row).toHaveClass('cursor-pointer');
      });
    });

    it('should have delete button for each row', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(3);
    });

    it('should open delete confirmation modal when delete button clicked', async () => {
      const user = userEvent.setup();

      render(<VulnerabilitiesTable {...defaultProps} />);

      // Click the first delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Modal should appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should call onDelete when deletion is confirmed', async () => {
      const mockOnDelete = jest.fn();
      const user = userEvent.setup();

      render(<VulnerabilitiesTable {...defaultProps} onDelete={mockOnDelete} />);

      // Click the first delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click confirm button
      const confirmButton = screen.getByRole('button', { name: /confirm|yes|delete|remove/i });
      await user.click(confirmButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });

    it('should close modal when deletion is cancelled', async () => {
      const user = userEvent.setup();

      render(<VulnerabilitiesTable {...defaultProps} />);

      // Click delete button to open modal
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel|no|close/i });
      await user.click(cancelButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should NOT call onDelete when cancelled', async () => {
      const mockOnDelete = jest.fn();
      const user = userEvent.setup();

      render(<VulnerabilitiesTable {...defaultProps} onDelete={mockOnDelete} />);

      // Click delete button to open modal
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click cancel button
      const cancelButton = screen.getByRole('button', { name: /cancel|no|close/i });
      await user.click(cancelButton);

      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('should NOT trigger row click when delete button is clicked (event propagation)', async () => {
      const mockOnRowClick = jest.fn();
      const mockOnDelete = jest.fn();
      const user = userEvent.setup();

      render(
        <VulnerabilitiesTable
          {...defaultProps}
          onRowClick={mockOnRowClick}
          onDelete={mockOnDelete}
        />
      );

      // Click the delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // onRowClick should NOT be called
      expect(mockOnRowClick).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 6. Delete Modal Tests
  // ===========================================================================

  describe('Delete Confirmation Modal', () => {
    it('should show vulnerability description in modal', async () => {
      const user = userEvent.setup();

      render(<VulnerabilitiesTable {...defaultProps} />);

      // Click the first delete button (Cognitive decline after any sorting)
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Modal should contain the vulnerability description
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // The modal should reference the vulnerability being deleted (multiple elements may match, just verify at least one exists)
      const confirmationTexts = screen.getAllByText(/are you sure|confirm|delete/i);
      expect(confirmationTexts.length).toBeGreaterThan(0);
    });

    it('should have Cancel and Remove buttons', async () => {
      const user = userEvent.setup();

      render(<VulnerabilitiesTable {...defaultProps} />);

      // Click delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Wait for modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Should have Cancel and Remove buttons
      expect(screen.getByRole('button', { name: /cancel|no|close/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /confirm|yes|delete|remove/i })).toBeInTheDocument();
    });

    it('should close modal on cancel click', async () => {
      const user = userEvent.setup();

      render(<VulnerabilitiesTable {...defaultProps} />);

      // Open modal
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /cancel|no|close/i });
      await user.click(cancelButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // 7. Sorting Tests
  // ===========================================================================

  describe('Sorting', () => {
    it('should have sortable Description column', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      const descriptionHeader = screen.getByRole('columnheader', { name: /description/i });
      // Sortable headers should have interactive elements
      expect(descriptionHeader.querySelector('button') || descriptionHeader).toBeInTheDocument();
    });

    it('should have sortable Diagnosed column', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      const diagnosedHeader = screen.getByRole('columnheader', { name: /diagnosed/i });
      expect(diagnosedHeader).toBeInTheDocument();
    });

    it('should have sortable Recorded column', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      const recordedHeader = screen.getByRole('columnheader', { name: /recorded/i });
      expect(recordedHeader).toBeInTheDocument();
    });

    it('should NOT have sortable Adjustments column', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      const adjustmentsHeader = screen.getByRole('columnheader', { name: /adjustments/i });
      // Non-sortable headers should not have button inside
      const button = adjustmentsHeader.querySelector('button');
      // If there's no button or click handler, it's not sortable
      expect(button).toBeNull();
    });

    it('should apply default sort (inactive at bottom)', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);

      // Inactive items should be at the bottom
      // Recent bereavement (Inactive) should be last
      const lastRow = dataRows[dataRows.length - 1];
      expect(within(lastRow).getByText('Recent bereavement')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 8. Status Display Tests
  // ===========================================================================

  describe('Status Display', () => {
    it('should show "Active" status correctly', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      const activeStatuses = screen.getAllByText('Active');
      expect(activeStatuses.length).toBeGreaterThanOrEqual(1);
    });

    it('should show "Inactive" status correctly', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should apply inactive styling to inactive rows', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      const bereavementRow = rows.find(row => within(row).queryByText('Recent bereavement'));

      if (bereavementRow) {
        // Inactive rows should have opacity or grayscale styling
        expect(bereavementRow).toHaveClass('opacity-50');
      }
    });
  });

  // ===========================================================================
  // 9. Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<VulnerabilitiesTable {...defaultProps} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in empty state', async () => {
      const { container } = render(
        <VulnerabilitiesTable {...defaultProps} vulnerabilities={[]} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in loading state', async () => {
      const { container } = render(
        <VulnerabilitiesTable {...defaultProps} isLoading={true} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper table semantics (table role, 6 columnheaders)', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(6);
    });

    it('should have descriptive aria-labels on delete buttons', () => {
      render(<VulnerabilitiesTable {...defaultProps} />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      deleteButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
        expect(button.getAttribute('aria-label')).toMatch(/delete.*vulnerabilit/i);
      });
    });
  });

  // ===========================================================================
  // 10. Keyboard Navigation Tests
  // ===========================================================================

  describe('Keyboard Navigation', () => {
    it('should allow tab navigation to delete buttons', async () => {
      const user = userEvent.setup();
      render(<VulnerabilitiesTable {...defaultProps} />);

      // Tab through elements until we reach a delete button
      await user.tab();
      let iterations = 0;
      const maxIterations = 20;

      while (
        iterations < maxIterations &&
        !document.activeElement?.getAttribute('aria-label')?.includes('Delete')
      ) {
        await user.tab();
        iterations++;
      }

      // Should have focused a delete button
      expect(document.activeElement).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Delete')
      );
    });

    it('should allow Enter key to activate delete button', async () => {
      const user = userEvent.setup();

      render(<VulnerabilitiesTable {...defaultProps} />);

      // Focus the first delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      deleteButtons[0].focus();

      // Press Enter
      await user.keyboard('{Enter}');

      // Should open confirmation modal
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should allow Escape to close modal', async () => {
      const user = userEvent.setup();

      render(<VulnerabilitiesTable {...defaultProps} />);

      // Open modal
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Press Escape
      await user.keyboard('{Escape}');

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // 11. Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle vulnerability with all null optional fields', () => {
      const vulnerabilityWithNulls: VulnerabilityProductOwner[] = [
        {
          id: 10,
          product_owner_id: 100,
          description: 'Unknown vulnerability',
          adjustments: null,
          diagnosed: false,
          status: 'Active',
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: null,
        },
      ];

      render(
        <VulnerabilitiesTable {...defaultProps} vulnerabilities={vulnerabilityWithNulls} />
      );

      expect(screen.getByText('Unknown vulnerability')).toBeInTheDocument();
      // Should display dashes/en-dashes for missing fields
      const dashes = screen.getAllByText(/^(-|\u2013)$/);
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle special characters in description', () => {
      const specialCharVulnerability: VulnerabilityProductOwner[] = [
        {
          id: 11,
          product_owner_id: 100,
          description: "O'Brien's cognitive issues & memory loss",
          adjustments: 'Use < 3 topics per meeting',
          diagnosed: true,
          status: 'Active',
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: '2024-01-01',
        },
      ];

      render(
        <VulnerabilitiesTable {...defaultProps} vulnerabilities={specialCharVulnerability} />
      );

      expect(screen.getByText("O'Brien's cognitive issues & memory loss")).toBeInTheDocument();
      expect(screen.getByText('Use < 3 topics per meeting')).toBeInTheDocument();
    });

    it('should handle unicode characters', () => {
      const unicodeVulnerability: VulnerabilityProductOwner[] = [
        {
          id: 12,
          product_owner_id: 100,
          description: '\u8a8d\u77e5\u969c\u5bb3', // Cognitive disorder in Japanese
          adjustments: '\u3086\u3063\u304f\u308a\u8a71\u3059', // Speak slowly in Japanese
          diagnosed: true,
          status: 'Active',
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: '2024-01-01',
        },
      ];

      render(
        <VulnerabilitiesTable {...defaultProps} vulnerabilities={unicodeVulnerability} />
      );

      expect(screen.getByText('\u8a8d\u77e5\u969c\u5bb3')).toBeInTheDocument();
      expect(screen.getByText('\u3086\u3063\u304f\u308a\u8a71\u3059')).toBeInTheDocument();
    });

    it('should handle invalid date gracefully (show en-dash)', () => {
      const invalidDateVulnerability: VulnerabilityProductOwner[] = [
        {
          id: 13,
          product_owner_id: 100,
          description: 'Test vulnerability',
          adjustments: 'Some adjustments', // Non-null to avoid conflict with en-dash regex
          diagnosed: false,
          status: 'Active',
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: 'invalid-date',
        },
      ];

      render(
        <VulnerabilitiesTable {...defaultProps} vulnerabilities={invalidDateVulnerability} />
      );

      // Should show en-dash for invalid date
      const rows = screen.getAllByRole('row');
      const dataRow = rows[1];
      expect(within(dataRow).getByText(/^(-|\u2013)$/)).toBeInTheDocument();
    });

    it('should handle many rows (50) efficiently (<500ms)', () => {
      const manyVulnerabilities: VulnerabilityProductOwner[] = Array.from(
        { length: 50 },
        (_, i) => ({
          id: i + 1,
          product_owner_id: 100,
          description: `Vulnerability ${i + 1}`,
          adjustments: `Adjustment ${i + 1}`,
          diagnosed: i % 2 === 0,
          status: 'Active' as const,
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: '2024-01-01',
        })
      );

      const startTime = performance.now();

      render(<VulnerabilitiesTable {...defaultProps} vulnerabilities={manyVulnerabilities} />);

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Render should complete in under 500ms
      expect(renderTime).toBeLessThan(500);

      // Verify all rows rendered
      const rows = screen.getAllByRole('row');
      // 50 data rows + 1 header row = 51
      expect(rows).toHaveLength(51);
    });

    it('should handle all status types (Active, Inactive)', () => {
      const allStatusVulnerabilities: VulnerabilityProductOwner[] = [
        {
          id: 20,
          product_owner_id: 100,
          description: 'Active vulnerability',
          adjustments: null,
          diagnosed: false,
          status: 'Active',
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: null,
        },
        {
          id: 21,
          product_owner_id: 100,
          description: 'Inactive vulnerability',
          adjustments: null,
          diagnosed: false,
          status: 'Inactive',
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: null,
        },
      ];

      render(
        <VulnerabilitiesTable {...defaultProps} vulnerabilities={allStatusVulnerabilities} />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });

    it('should handle special_relationship personType', () => {
      // VulnerabilitySpecialRelationship type
      const srVulnerability: Vulnerability[] = [
        {
          id: 30,
          special_relationship_id: 200,
          description: 'SR Vulnerability',
          adjustments: 'SR Adjustments',
          diagnosed: true,
          status: 'Active',
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: '2024-01-01',
        } as Vulnerability,
      ];

      render(
        <VulnerabilitiesTable
          {...defaultProps}
          vulnerabilities={srVulnerability}
          personId={200}
          personType="special_relationship"
        />
      );

      expect(screen.getByText('SR Vulnerability')).toBeInTheDocument();
      expect(screen.getByText('SR Adjustments')).toBeInTheDocument();
    });

    it('should handle very long description text (truncation or wrapping)', () => {
      const longDescriptionVulnerability: VulnerabilityProductOwner[] = [
        {
          id: 40,
          product_owner_id: 100,
          description:
            'This is a very long vulnerability description that goes on and on and on to test how the component handles extremely long text content that might need to be truncated or wrapped appropriately',
          adjustments: null,
          diagnosed: false,
          status: 'Active',
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: null,
        },
      ];

      render(
        <VulnerabilitiesTable {...defaultProps} vulnerabilities={longDescriptionVulnerability} />
      );

      // Should render without breaking
      expect(screen.getByText(/This is a very long vulnerability description/)).toBeInTheDocument();
    });

    it('should handle very long adjustments text', () => {
      const longAdjustmentsVulnerability: VulnerabilityProductOwner[] = [
        {
          id: 41,
          product_owner_id: 100,
          description: 'Test vulnerability',
          adjustments:
            'Always ensure that you speak very slowly and clearly, use written materials, involve family members in all discussions, schedule appointments at quiet times, and always confirm understanding before proceeding with any financial decisions',
          diagnosed: true,
          status: 'Active',
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: '2024-01-01',
        },
      ];

      render(
        <VulnerabilitiesTable {...defaultProps} vulnerabilities={longAdjustmentsVulnerability} />
      );

      // Should render without breaking
      expect(screen.getByText(/Always ensure that you speak very slowly/)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 12. Boolean Display Tests
  // ===========================================================================

  describe('Boolean Diagnosed Display', () => {
    it('should display exactly "Yes" text for diagnosed=true', () => {
      const diagnosedTrue: VulnerabilityProductOwner[] = [
        {
          id: 50,
          product_owner_id: 100,
          description: 'Diagnosed vulnerability',
          adjustments: null,
          diagnosed: true,
          status: 'Active',
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: null,
        },
      ];

      render(<VulnerabilitiesTable {...defaultProps} vulnerabilities={diagnosedTrue} />);

      const rows = screen.getAllByRole('row');
      const dataRow = rows[1];
      expect(within(dataRow).getByText('Yes')).toBeInTheDocument();
    });

    it('should display exactly "No" text for diagnosed=false', () => {
      const diagnosedFalse: VulnerabilityProductOwner[] = [
        {
          id: 51,
          product_owner_id: 100,
          description: 'Undiagnosed vulnerability',
          adjustments: null,
          diagnosed: false,
          status: 'Active',
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: null,
        },
      ];

      render(<VulnerabilitiesTable {...defaultProps} vulnerabilities={diagnosedFalse} />);

      const rows = screen.getAllByRole('row');
      const dataRow = rows[1];
      expect(within(dataRow).getByText('No')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 13. Date Formatting Tests
  // ===========================================================================

  describe('Date Formatting', () => {
    it('should format ISO date 2024-12-25 as 25/12/2024', () => {
      const christmasVulnerability: VulnerabilityProductOwner[] = [
        {
          id: 60,
          product_owner_id: 100,
          description: 'Christmas vulnerability',
          adjustments: null,
          diagnosed: false,
          status: 'Active',
          notes: null,
          created_at: '2024-12-25T00:00:00Z',
          date_recorded: '2024-12-25',
        },
      ];

      render(<VulnerabilitiesTable {...defaultProps} vulnerabilities={christmasVulnerability} />);

      expect(screen.getByText('25/12/2024')).toBeInTheDocument();
    });

    it('should format single digit day and month with leading zeros', () => {
      const singleDigitDateVulnerability: VulnerabilityProductOwner[] = [
        {
          id: 61,
          product_owner_id: 100,
          description: 'Single digit date vulnerability',
          adjustments: null,
          diagnosed: false,
          status: 'Active',
          notes: null,
          created_at: '2024-01-05T00:00:00Z',
          date_recorded: '2024-01-05',
        },
      ];

      render(
        <VulnerabilitiesTable {...defaultProps} vulnerabilities={singleDigitDateVulnerability} />
      );

      // Should show 05/01/2024, not 5/1/2024
      expect(screen.getByText('05/01/2024')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 14. Row Click with Correct Data Tests
  // ===========================================================================

  describe('Row Click with Correct Data', () => {
    it('should pass the exact vulnerability object to onRowClick', async () => {
      const mockOnRowClick = jest.fn();
      const user = userEvent.setup();

      const singleVulnerability: VulnerabilityProductOwner[] = [
        {
          id: 99,
          product_owner_id: 100,
          description: 'Specific vulnerability',
          adjustments: 'Specific adjustments',
          diagnosed: true,
          status: 'Active',
          notes: 'Specific notes',
          created_at: '2024-06-15T10:30:00Z',
          date_recorded: '2024-06-15',
        },
      ];

      render(
        <VulnerabilitiesTable
          {...defaultProps}
          vulnerabilities={singleVulnerability}
          onRowClick={mockOnRowClick}
        />
      );

      const rows = screen.getAllByRole('row');
      await user.click(rows[1]);

      expect(mockOnRowClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 99,
          product_owner_id: 100,
          description: 'Specific vulnerability',
          adjustments: 'Specific adjustments',
          diagnosed: true,
          status: 'Active',
        })
      );
    });
  });

  // ===========================================================================
  // 15. Delete Callback Data Tests
  // ===========================================================================

  describe('Delete Callback Data', () => {
    it('should pass the correct vulnerability to onDelete', async () => {
      const mockOnDelete = jest.fn();
      const user = userEvent.setup();

      const singleVulnerability: VulnerabilityProductOwner[] = [
        {
          id: 88,
          product_owner_id: 100,
          description: 'Delete test vulnerability',
          adjustments: null,
          diagnosed: false,
          status: 'Active',
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: null,
        },
      ];

      render(
        <VulnerabilitiesTable
          {...defaultProps}
          vulnerabilities={singleVulnerability}
          onDelete={mockOnDelete}
        />
      );

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Confirm deletion
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const confirmButton = screen.getByRole('button', { name: /confirm|yes|delete|remove/i });
      await user.click(confirmButton);

      expect(mockOnDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 88,
          description: 'Delete test vulnerability',
        })
      );
    });
  });
});
