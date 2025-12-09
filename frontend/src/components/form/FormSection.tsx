/**
 * FormSection Component
 *
 * Reusable collapsible section component for forms using HeadlessUI Disclosure.
 * Provides progressive disclosure pattern to reduce cognitive load in long forms.
 *
 * Features:
 * - Collapsible sections with smooth transitions
 * - Chevron icon indicating open/closed state
 * - Keyboard accessible (Enter/Space to toggle)
 * - ARIA attributes for screen readers
 * - Customizable default open state
 *
 * @module components/form/FormSection
 */

import React from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

/**
 * FormSection Props Interface
 *
 * @property title - Section heading text displayed in the disclosure button
 * @property defaultOpen - Whether section is expanded by default (default: false)
 * @property children - Form fields to display when section is expanded
 */
interface FormSectionProps {
  /** Section heading text displayed in the disclosure button */
  title: string;
  /** Whether section is expanded by default (default: false) */
  defaultOpen?: boolean;
  /** Form fields to display when section is expanded */
  children: React.ReactNode;
}

/**
 * FormSection Component
 *
 * Renders a collapsible section for grouping related form fields.
 * Uses HeadlessUI Disclosure for accessible collapse/expand behavior.
 *
 * Performance: Memoized to prevent unnecessary re-renders when parent updates.
 * Only re-renders when title, defaultOpen, or children props change.
 *
 * @param props - Component props
 * @returns JSX element with HeadlessUI Disclosure
 *
 * @example
 * <FormSection title="Personal Information" defaultOpen={true}>
 *   <FormTextField name="firstname" label="First Name" control={control} />
 *   <FormTextField name="surname" label="Surname" control={control} />
 * </FormSection>
 */
const FormSection: React.FC<FormSectionProps> = React.memo(({
  title,
  defaultOpen = false,
  children,
}) => {
  return (
    <Disclosure defaultOpen={defaultOpen}>
      {({ open }) => (
        <div className="border-b border-gray-200">
          <Disclosure.Button
            className="flex w-full items-center justify-between py-4 text-left text-sm font-medium text-gray-900 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            aria-expanded={open}
          >
            <span className="flex items-center gap-2">
              <ChevronRightIcon
                className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
                  open ? 'rotate-90' : ''
                }`}
                role="img"
                aria-hidden="true"
              />
              <span>{title}</span>
            </span>
          </Disclosure.Button>
          <Disclosure.Panel className="pb-4 space-y-4">
            {children}
          </Disclosure.Panel>
        </div>
      )}
    </Disclosure>
  );
});

// Display name for React DevTools
FormSection.displayName = 'FormSection';

export default FormSection;
