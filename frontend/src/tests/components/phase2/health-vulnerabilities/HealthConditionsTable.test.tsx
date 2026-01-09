/**
 * HealthConditionsTable Component Tests (RED Phase - Cycle 8)
 *
 * Tests for the HealthConditionsTable component that displays health conditions
 * in a nested table with columns: Condition, Name, Diagnosed, Medication/Dosage, Status, Actions.
 *
 * The component displays:
 * - Condition column with condition type
 * - Name column with descriptive name
 * - Diagnosed column with date formatted as dd/MM/yyyy
 * - Medication/Dosage column
 * - Status column with appropriate styling
 * - Actions column with delete button
 *
 * Smoking conditions are displayed at the top of the list.
 *
 * Following TDD RED-GREEN-BLUE methodology.
 * Expected Result: All tests FAIL (RED phase) until implementation complete.
 *
 * @module tests/components/phase2/health-vulnerabilities/HealthConditionsTable
 */

import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import type { HealthCondition, PersonType } from '@/types/healthVulnerability';

// This import will fail in RED phase - component doesn't exist yet
import HealthConditionsTable from '@/components/phase2/health-vulnerabilities/HealthConditionsTable';

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

// =============================================================================
// Mock Data
// =============================================================================

const mockConditions: HealthCondition[] = [
  {
    id: 1,
    product_owner_id: 100,
    condition: 'Heart Disease',
    name: 'Coronary Artery Disease',
    date_of_diagnosis: '2020-05-15',
    status: 'Active',
    medication: 'Aspirin 75mg daily',
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    date_recorded: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    product_owner_id: 100,
    condition: 'Smoking Status',
    name: 'Current Smoker',
    date_of_diagnosis: '2015-01-01',
    status: 'Active',
    medication: null,
    notes: '10 cigarettes per day',
    created_at: '2024-01-01T00:00:00Z',
    date_recorded: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    product_owner_id: 100,
    condition: 'Diabetes',
    name: 'Type 2 Diabetes',
    date_of_diagnosis: '2019-03-20',
    status: 'Lapsed',
    medication: 'Metformin 500mg twice daily',
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    date_recorded: '2024-01-01T00:00:00Z',
  },
];

// Default props for rendering
const defaultProps = {
  conditions: mockConditions,
  personId: 100,
  personType: 'product_owner' as PersonType,
  onRowClick: jest.fn(),
  onDelete: jest.fn(),
  isLoading: false,
};

// =============================================================================
// Test Suite
// =============================================================================

describe('HealthConditionsTable Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // 1. Column Rendering
  // ===========================================================================

  describe('Column Rendering', () => {
    it('should render all 6 column headers (Condition, Name, Diagnosed, Medication/Dosage, Status, Actions)', () => {
      render(<HealthConditionsTable {...defaultProps} />);

      expect(screen.getByRole('columnheader', { name: /condition/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /^name$/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /diagnosed/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /medication\/dosage/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 2. Data Rendering
  // ===========================================================================

  describe('Data Rendering', () => {
    it('should render all health conditions', () => {
      render(<HealthConditionsTable {...defaultProps} />);

      expect(screen.getByText('Heart Disease')).toBeInTheDocument();
      expect(screen.getByText('Smoking Status')).toBeInTheDocument();
      expect(screen.getByText('Diabetes')).toBeInTheDocument();
    });

    it('should display condition type', () => {
      render(<HealthConditionsTable {...defaultProps} />);

      expect(screen.getByText('Heart Disease')).toBeInTheDocument();
      expect(screen.getByText('Diabetes')).toBeInTheDocument();
    });

    it('should format diagnosis date as dd/MM/yyyy', () => {
      render(<HealthConditionsTable {...defaultProps} />);

      // 2020-05-15 should be formatted as 15/05/2020
      expect(screen.getByText('15/05/2020')).toBeInTheDocument();
      // 2015-01-01 should be formatted as 01/01/2015
      expect(screen.getByText('01/01/2015')).toBeInTheDocument();
      // 2019-03-20 should be formatted as 20/03/2019
      expect(screen.getByText('20/03/2019')).toBeInTheDocument();
    });

    it('should display medication/dosage', () => {
      render(<HealthConditionsTable {...defaultProps} />);

      expect(screen.getByText('Aspirin 75mg daily')).toBeInTheDocument();
      expect(screen.getByText('Metformin 500mg twice daily')).toBeInTheDocument();
    });

    it('should display dash (-) for missing medication', () => {
      render(<HealthConditionsTable {...defaultProps} />);

      // Find the row with Smoking condition
      const rows = screen.getAllByRole('row');
      const smokingRow = rows.find(row => within(row).queryByText('Smoking Status'));

      if (smokingRow) {
        // Should display a dash for missing medication
        expect(within(smokingRow).getByText('-')).toBeInTheDocument();
      }
    });

    it('should display status with appropriate styling', () => {
      render(<HealthConditionsTable {...defaultProps} />);

      // Active status should be present
      const activeStatuses = screen.getAllByText('Active');
      expect(activeStatuses.length).toBeGreaterThanOrEqual(1);

      // Lapsed status should be present
      expect(screen.getByText('Lapsed')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 3. Smoking Condition Sorting
  // ===========================================================================

  describe('Smoking Condition Sorting', () => {
    it('should display smoking conditions at the top', () => {
      render(<HealthConditionsTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      // Skip header row (index 0)
      const dataRows = rows.slice(1);

      // First data row should be the smoking condition
      expect(within(dataRows[0]).getByText('Smoking Status')).toBeInTheDocument();
    });

    it('should maintain order of non-smoking conditions', () => {
      render(<HealthConditionsTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      // Skip header row (index 0)
      const dataRows = rows.slice(1);

      // After smoking (first), the remaining conditions should be in their original order
      // Heart Disease was first, Diabetes was third
      const secondRowText = dataRows[1].textContent;
      const thirdRowText = dataRows[2].textContent;

      expect(secondRowText).toContain('Heart Disease');
      expect(thirdRowText).toContain('Diabetes');
    });
  });

  // ===========================================================================
  // 4. Row Click Behavior
  // ===========================================================================

  describe('Row Click Behavior', () => {
    it('should call onRowClick when row is clicked', async () => {
      const mockOnRowClick = jest.fn();
      const user = userEvent.setup();

      render(<HealthConditionsTable {...defaultProps} onRowClick={mockOnRowClick} />);

      const rows = screen.getAllByRole('row');
      // Click the first data row (Smoking condition after sorting)
      await user.click(rows[1]);

      expect(mockOnRowClick).toHaveBeenCalledTimes(1);
      expect(mockOnRowClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 2,
          condition: 'Smoking Status',
        })
      );
    });

    it('should have cursor-pointer on rows', () => {
      render(<HealthConditionsTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      // Skip header row
      const dataRows = rows.slice(1);

      dataRows.forEach(row => {
        expect(row).toHaveClass('cursor-pointer');
      });
    });
  });

  // ===========================================================================
  // 5. Delete Action
  // ===========================================================================

  describe('Delete Action', () => {
    it('should have delete button for each row', () => {
      render(<HealthConditionsTable {...defaultProps} />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      expect(deleteButtons).toHaveLength(3);
    });

    it('should call onDelete with condition data when delete confirmed', async () => {
      const mockOnDelete = jest.fn();
      const user = userEvent.setup();

      render(<HealthConditionsTable {...defaultProps} onDelete={mockOnDelete} />);

      // Click the first delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Confirm the delete in the modal
      const confirmButton = await screen.findByRole('button', { name: /confirm|yes|delete|remove/i });
      await user.click(confirmButton);

      expect(mockOnDelete).toHaveBeenCalledTimes(1);
      expect(mockOnDelete).toHaveBeenCalledWith(
        expect.objectContaining({
          condition: 'Smoking Status', // First row after sorting is Smoking
        })
      );
    });

    it('should NOT trigger row click when delete button is clicked (event propagation)', async () => {
      const mockOnRowClick = jest.fn();
      const mockOnDelete = jest.fn();
      const user = userEvent.setup();

      render(
        <HealthConditionsTable
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
  // 6. Empty State
  // ===========================================================================

  describe('Empty State', () => {
    it('should show "No health conditions" message when empty', () => {
      render(
        <HealthConditionsTable
          {...defaultProps}
          conditions={[]}
        />
      );

      expect(screen.getByText(/no health conditions/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 7. Accessibility (jest-axe)
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<HealthConditionsTable {...defaultProps} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in empty state', async () => {
      const { container } = render(
        <HealthConditionsTable
          {...defaultProps}
          conditions={[]}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper table semantics (table role, 6 columnheaders)', () => {
      render(<HealthConditionsTable {...defaultProps} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(screen.getAllByRole('columnheader')).toHaveLength(6);
    });

    it('should have sr-only text for status badges', () => {
      render(<HealthConditionsTable {...defaultProps} />);

      // Status badges should have screen reader text
      const srOnlyTexts = document.querySelectorAll('.sr-only');
      expect(srOnlyTexts.length).toBeGreaterThan(0);
    });

    it('should have descriptive aria-labels on delete buttons', () => {
      render(<HealthConditionsTable {...defaultProps} />);

      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      deleteButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-label');
        expect(button.getAttribute('aria-label')).toMatch(/delete.*condition/i);
      });
    });
  });

  // ===========================================================================
  // 8. Keyboard Navigation
  // ===========================================================================

  describe('Keyboard Navigation', () => {
    it('should allow tab navigation to delete buttons', async () => {
      const user = userEvent.setup();
      render(<HealthConditionsTable {...defaultProps} />);

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

      render(<HealthConditionsTable {...defaultProps} />);

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
  });

  // ===========================================================================
  // 9. Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle condition with missing optional fields (null name, date, medication)', () => {
      const conditionWithNulls: HealthCondition[] = [
        {
          id: 10,
          product_owner_id: 100,
          condition: 'Unknown Condition',
          name: null,
          date_of_diagnosis: null,
          status: 'Active',
          medication: null,
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: null,
        },
      ];

      render(
        <HealthConditionsTable
          {...defaultProps}
          conditions={conditionWithNulls}
        />
      );

      expect(screen.getByText('Unknown Condition')).toBeInTheDocument();
      // Should display dashes for missing fields
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(2); // At least name and date
    });

    it('should handle special characters in condition names', () => {
      const specialCharCondition: HealthCondition[] = [
        {
          id: 11,
          product_owner_id: 100,
          condition: "O'Brien's Syndrome & Related Issues",
          name: 'Type A < Type B',
          date_of_diagnosis: '2023-01-01',
          status: 'Active',
          medication: 'Test & Medication',
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: null,
        },
      ];

      render(
        <HealthConditionsTable
          {...defaultProps}
          conditions={specialCharCondition}
        />
      );

      expect(screen.getByText("O'Brien's Syndrome & Related Issues")).toBeInTheDocument();
      expect(screen.getByText('Type A < Type B')).toBeInTheDocument();
    });

    it('should handle unicode characters', () => {
      const unicodeCondition: HealthCondition[] = [
        {
          id: 12,
          product_owner_id: 100,
          condition: '\u7cd6\u5c3f\u75c5', // Diabetes in Japanese
          name: '\u30bf\u30a4\u30d72', // Type 2 in Japanese
          date_of_diagnosis: '2023-06-15',
          status: 'Active',
          medication: null,
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: null,
        },
      ];

      render(
        <HealthConditionsTable
          {...defaultProps}
          conditions={unicodeCondition}
        />
      );

      expect(screen.getByText('\u7cd6\u5c3f\u75c5')).toBeInTheDocument();
      expect(screen.getByText('\u30bf\u30a4\u30d72')).toBeInTheDocument();
    });

    it('should handle invalid date gracefully (show dash)', () => {
      const invalidDateCondition: HealthCondition[] = [
        {
          id: 13,
          product_owner_id: 100,
          condition: 'Test Condition',
          name: 'Test Name',
          date_of_diagnosis: 'invalid-date',
          status: 'Active',
          medication: null,
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: null,
        },
      ];

      render(
        <HealthConditionsTable
          {...defaultProps}
          conditions={invalidDateCondition}
        />
      );

      // Should show dash for invalid date
      const rows = screen.getAllByRole('row');
      const dataRow = rows[1];
      expect(within(dataRow).getByText('-')).toBeInTheDocument();
    });

    it('should handle many rows (50) efficiently (<500ms)', () => {
      const manyConditions: HealthCondition[] = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        product_owner_id: 100,
        condition: `Condition ${i + 1}`,
        name: `Name ${i + 1}`,
        date_of_diagnosis: '2023-01-01',
        status: 'Active' as const,
        medication: `Medication ${i + 1}`,
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
        date_recorded: null,
      }));

      const startTime = performance.now();

      render(
        <HealthConditionsTable
          {...defaultProps}
          conditions={manyConditions}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Render should complete in under 500ms
      expect(renderTime).toBeLessThan(500);

      // Verify all rows rendered
      const rows = screen.getAllByRole('row');
      // 50 data rows + 1 header row = 51
      expect(rows).toHaveLength(51);
    });

    it('should handle all status types (Active, Lapsed)', () => {
      const allStatusConditions: HealthCondition[] = [
        {
          id: 20,
          product_owner_id: 100,
          condition: 'Active Condition',
          name: null,
          date_of_diagnosis: null,
          status: 'Active',
          medication: null,
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: null,
        },
        {
          id: 21,
          product_owner_id: 100,
          condition: 'Lapsed Condition',
          name: null,
          date_of_diagnosis: null,
          status: 'Lapsed',
          medication: null,
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: null,
        },
      ];

      render(
        <HealthConditionsTable
          {...defaultProps}
          conditions={allStatusConditions}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Lapsed')).toBeInTheDocument();
    });

    it('should handle special_relationship personType', () => {
      const srCondition: HealthCondition[] = [
        {
          id: 30,
          special_relationship_id: 200,
          condition: 'SR Condition',
          name: 'SR Name',
          date_of_diagnosis: '2023-01-01',
          status: 'Active',
          medication: 'SR Medication',
          notes: null,
          created_at: '2024-01-01T00:00:00Z',
          date_recorded: null,
        },
      ];

      render(
        <HealthConditionsTable
          {...defaultProps}
          conditions={srCondition}
          personId={200}
          personType="special_relationship"
        />
      );

      expect(screen.getByText('SR Condition')).toBeInTheDocument();
      expect(screen.getByText('SR Name')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 10. Delete Confirmation Modal
  // ===========================================================================

  describe('Delete Confirmation Modal', () => {
    it('should show confirmation modal when delete clicked', async () => {
      const user = userEvent.setup();

      render(<HealthConditionsTable {...defaultProps} />);

      // Click the first delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Modal should appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Modal should contain confirmation text
      expect(screen.getByText(/are you sure|confirm|delete/i)).toBeInTheDocument();
    });

    it('should close modal when cancel clicked', async () => {
      const user = userEvent.setup();

      render(<HealthConditionsTable {...defaultProps} />);

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

    it('should call onDelete when confirm clicked', async () => {
      const mockOnDelete = jest.fn();
      const user = userEvent.setup();

      render(<HealthConditionsTable {...defaultProps} onDelete={mockOnDelete} />);

      // Click delete button to open modal
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click confirm button
      const confirmButton = screen.getByRole('button', { name: /confirm|yes|delete|remove/i });
      await user.click(confirmButton);

      // onDelete should be called
      expect(mockOnDelete).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // 11. Loading State
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading skeleton when isLoading is true', () => {
      render(<HealthConditionsTable {...defaultProps} isLoading={true} />);

      // Should show skeleton/loading indicator
      const skeletons = document.querySelectorAll('.animate-pulse, [role="progressbar"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not show data rows when loading', () => {
      render(<HealthConditionsTable {...defaultProps} isLoading={true} />);

      // Should not show actual condition data
      expect(screen.queryByText('Heart Disease')).not.toBeInTheDocument();
      expect(screen.queryByText('Smoking Status')).not.toBeInTheDocument();
    });
  });
});
