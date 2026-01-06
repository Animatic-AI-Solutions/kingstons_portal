/**
 * TabNavigation Component Tests (Cycle 8 - RED Phase)
 *
 * Comprehensive test suite for the tab navigation component used in
 * Special Relationships to switch between Personal and Professional views.
 *
 * This component:
 * - Displays Personal and Professional tabs
 * - Indicates which tab is currently active
 * - Handles click events to switch tabs
 * - Supports keyboard navigation (arrow keys)
 * - Maintains proper ARIA attributes for accessibility
 *
 * Following TDD RED-GREEN-BLUE methodology - RED Phase (Failing Tests).
 *
 * @component TabNavigation
 * @requirements
 * - Render both Personal and Professional tabs
 * - Show active tab with visual indicator
 * - Handle click events to switch tabs
 * - Support keyboard navigation (ArrowLeft/ArrowRight)
 * - Proper ARIA attributes (role, aria-selected, aria-controls)
 * - Accessibility compliance with no violations
 * - Focus management for keyboard users
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import TabNavigation from '@/components/ui/navigation/TabNavigation';

expect.extend(toHaveNoViolations);

describe('TabNavigation Component', () => {
  const mockOnTabChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =================================================================
  // Rendering Tests
  // =================================================================

  describe('Rendering', () => {
    it('renders tablist container', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const tablist = screen.getByRole('tablist');
      expect(tablist).toBeInTheDocument();
    });

    it('renders Personal tab', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      expect(personalTab).toBeInTheDocument();
    });

    it('renders Professional tab', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      expect(professionalTab).toBeInTheDocument();
    });

    it('renders both tabs together', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(2);
    });

    it('renders tabs in correct order (Personal first, Professional second)', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs[0]).toHaveTextContent(/personal/i);
      expect(tabs[1]).toHaveTextContent(/professional/i);
    });
  });

  // =================================================================
  // Active Tab Indicator Tests
  // =================================================================

  describe('Active Tab Indicator', () => {
    it('marks Personal tab as selected when activeTab is "personal"', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      expect(personalTab).toHaveAttribute('aria-selected', 'true');
    });

    it('marks Professional tab as not selected when activeTab is "personal"', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      expect(professionalTab).toHaveAttribute('aria-selected', 'false');
    });

    it('marks Professional tab as selected when activeTab is "professional"', () => {
      render(<TabNavigation activeTab="professional" onTabChange={mockOnTabChange} />);

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      expect(professionalTab).toHaveAttribute('aria-selected', 'true');
    });

    it('marks Personal tab as not selected when activeTab is "professional"', () => {
      render(<TabNavigation activeTab="professional" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      expect(personalTab).toHaveAttribute('aria-selected', 'false');
    });

    it('applies visual styling to active tab', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      const professionalTab = screen.getByRole('tab', { name: /professional/i });

      // Active tab should have different styling (exact classes depend on implementation)
      expect(personalTab.className).toContain('border-blue-600');
      expect(professionalTab.className).not.toContain('border-blue-600');
    });
  });

  // =================================================================
  // Click Interaction Tests
  // =================================================================

  describe('Click Interactions', () => {
    it('calls onTabChange with "personal" when Personal tab is clicked', async () => {
      const user = userEvent.setup();

      render(<TabNavigation activeTab="professional" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      await user.click(personalTab);

      expect(mockOnTabChange).toHaveBeenCalledWith('personal');
      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });

    it('calls onTabChange with "professional" when Professional tab is clicked', async () => {
      const user = userEvent.setup();

      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      await user.click(professionalTab);

      expect(mockOnTabChange).toHaveBeenCalledWith('professional');
      expect(mockOnTabChange).toHaveBeenCalledTimes(1);
    });

    it('allows clicking the already active tab', async () => {
      const user = userEvent.setup();

      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      await user.click(personalTab);

      expect(mockOnTabChange).toHaveBeenCalledWith('personal');
    });

    it('handles rapid tab switching', async () => {
      const user = userEvent.setup();

      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      const professionalTab = screen.getByRole('tab', { name: /professional/i });

      // Rapidly switch tabs
      await user.click(professionalTab);
      await user.click(personalTab);
      await user.click(professionalTab);

      expect(mockOnTabChange).toHaveBeenCalledTimes(3);
      expect(mockOnTabChange).toHaveBeenNthCalledWith(1, 'professional');
      expect(mockOnTabChange).toHaveBeenNthCalledWith(2, 'personal');
      expect(mockOnTabChange).toHaveBeenNthCalledWith(3, 'professional');
    });
  });

  // =================================================================
  // Keyboard Navigation Tests
  // =================================================================

  describe('Keyboard Navigation', () => {
    it('moves focus to Professional tab when ArrowRight is pressed on Personal tab', async () => {
      const user = userEvent.setup();

      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      const professionalTab = screen.getByRole('tab', { name: /professional/i });

      personalTab.focus();
      await user.keyboard('{ArrowRight}');

      expect(professionalTab).toHaveFocus();
    });

    it('moves focus to Personal tab when ArrowLeft is pressed on Professional tab', async () => {
      const user = userEvent.setup();

      render(<TabNavigation activeTab="professional" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      const professionalTab = screen.getByRole('tab', { name: /professional/i });

      professionalTab.focus();
      await user.keyboard('{ArrowLeft}');

      expect(personalTab).toHaveFocus();
    });

    it('wraps focus from Professional to Personal when ArrowRight pressed on last tab', async () => {
      const user = userEvent.setup();

      render(<TabNavigation activeTab="professional" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      const professionalTab = screen.getByRole('tab', { name: /professional/i });

      professionalTab.focus();
      await user.keyboard('{ArrowRight}');

      expect(personalTab).toHaveFocus();
    });

    it('wraps focus from Personal to Professional when ArrowLeft pressed on first tab', async () => {
      const user = userEvent.setup();

      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      const professionalTab = screen.getByRole('tab', { name: /professional/i });

      personalTab.focus();
      await user.keyboard('{ArrowLeft}');

      expect(professionalTab).toHaveFocus();
    });

    it('activates tab when Enter is pressed', async () => {
      const user = userEvent.setup();

      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      professionalTab.focus();
      await user.keyboard('{Enter}');

      expect(mockOnTabChange).toHaveBeenCalledWith('professional');
    });

    it('activates tab when Space is pressed', async () => {
      const user = userEvent.setup();

      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      professionalTab.focus();
      await user.keyboard(' ');

      expect(mockOnTabChange).toHaveBeenCalledWith('professional');
    });

    it('does not activate tab on other key presses', async () => {
      const user = userEvent.setup();

      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      personalTab.focus();

      // Press keys that should not activate
      await user.keyboard('{a}');
      await user.keyboard('{Escape}');
      await user.keyboard('{Tab}');

      // Should not have called onTabChange (except for Tab which might change focus)
      expect(mockOnTabChange).not.toHaveBeenCalled();
    });
  });

  // =================================================================
  // ARIA Attributes Tests
  // =================================================================

  describe('ARIA Attributes', () => {
    it('tablist has role="tablist"', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('role', 'tablist');
    });

    it('tabs have role="tab"', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('role', 'tab');
      });
    });

    it('active tab has aria-selected="true"', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      expect(personalTab).toHaveAttribute('aria-selected', 'true');
    });

    it('inactive tab has aria-selected="false"', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      expect(professionalTab).toHaveAttribute('aria-selected', 'false');
    });

    it('tabs have aria-controls attribute', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      const professionalTab = screen.getByRole('tab', { name: /professional/i });

      expect(personalTab).toHaveAttribute('aria-controls');
      expect(professionalTab).toHaveAttribute('aria-controls');
    });

    it('tabs have unique aria-controls values', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      const professionalTab = screen.getByRole('tab', { name: /professional/i });

      const personalControls = personalTab.getAttribute('aria-controls');
      const professionalControls = professionalTab.getAttribute('aria-controls');

      expect(personalControls).not.toBe(professionalControls);
    });

    it('tabs have tabindex attribute', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const tabs = screen.getAllByRole('tab');
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('tabindex');
      });
    });

    it('active tab has tabindex="0"', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      expect(personalTab).toHaveAttribute('tabindex', '0');
    });

    it('inactive tab has tabindex="-1"', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      expect(professionalTab).toHaveAttribute('tabindex', '-1');
    });
  });

  // =================================================================
  // Focus Management Tests
  // =================================================================

  describe('Focus Management', () => {
    it('active tab is focusable', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      personalTab.focus();

      expect(personalTab).toHaveFocus();
    });

    it('inactive tab can receive focus', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      professionalTab.focus();

      expect(professionalTab).toHaveFocus();
    });

    it('maintains focus on tab after click', async () => {
      const user = userEvent.setup();

      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      await user.click(professionalTab);

      expect(professionalTab).toHaveFocus();
    });

    it('updates tabindex when active tab changes', () => {
      const { rerender } = render(
        <TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />
      );

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      const professionalTab = screen.getByRole('tab', { name: /professional/i });

      expect(personalTab).toHaveAttribute('tabindex', '0');
      expect(professionalTab).toHaveAttribute('tabindex', '-1');

      // Rerender with different activeTab
      rerender(<TabNavigation activeTab="professional" onTabChange={mockOnTabChange} />);

      expect(personalTab).toHaveAttribute('tabindex', '-1');
      expect(professionalTab).toHaveAttribute('tabindex', '0');
    });
  });

  // =================================================================
  // Accessibility Tests
  // =================================================================

  describe('Accessibility', () => {
    it('has no accessibility violations with Personal tab active', async () => {
      const { container } = render(
        <TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('has no accessibility violations with Professional tab active', async () => {
      const { container } = render(
        <TabNavigation activeTab="professional" onTabChange={mockOnTabChange} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('tabs have accessible names', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      const professionalTab = screen.getByRole('tab', { name: /professional/i });

      expect(personalTab).toHaveAccessibleName();
      expect(professionalTab).toHaveAccessibleName();
    });

    it('tabs are keyboard navigable', async () => {
      const user = userEvent.setup();

      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });

      // Should be able to tab to the tablist
      await user.tab();
      expect(personalTab).toHaveFocus();

      // Should be able to navigate with arrow keys
      await user.keyboard('{ArrowRight}');
      const professionalTab = screen.getByRole('tab', { name: /professional/i });
      expect(professionalTab).toHaveFocus();
    });

    it('screen readers announce tab selection', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });

      // aria-selected provides announcement to screen readers
      expect(personalTab).toHaveAttribute('aria-selected', 'true');
      expect(personalTab.getAttribute('aria-selected')).toBe('true');
    });
  });

  // =================================================================
  // Visual Styling Tests
  // =================================================================

  describe('Visual Styling', () => {
    it('applies correct base classes to tablist', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const tablist = screen.getByRole('tablist');
      expect(tablist.className).toContain('border-b');
    });

    it('applies hover state styles', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const professionalTab = screen.getByRole('tab', { name: /professional/i });

      // Should have hover classes for inactive tabs
      expect(professionalTab.className).toContain('hover:');
    });

    it('applies focus visible styles for keyboard users', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });

      // Should have focus-visible classes
      expect(personalTab.className).toContain('focus-visible:');
    });

    it('distinguishes active from inactive tabs visually', () => {
      render(<TabNavigation activeTab="personal" onTabChange={mockOnTabChange} />);

      const personalTab = screen.getByRole('tab', { name: /personal/i });
      const professionalTab = screen.getByRole('tab', { name: /professional/i });

      // Active tab should have different border color
      expect(personalTab.className).toContain('border-blue-600');
      expect(professionalTab.className).toContain('border-transparent');
    });
  });
});
