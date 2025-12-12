# Remaining Medium Priority Issues - Consolidated Specifications

## Document Purpose

This document consolidates specifications for all remaining medium priority issues identified in the critical analysis. It provides comprehensive guidance for:

1. Modal Form Validation
2. Responsive Design for Tablet (768-1024px)
3. UAT Process and Checklist
4. Data Validation Service Layer
5. Additional Medium Priority Items

---

## Table of Contents

1. [Modal Form Validation Specification](#modal-form-validation-specification)
2. [Responsive Design for Tablet](#responsive-design-for-tablet)
3. [UAT Process and Checklist](#uat-process-and-checklist)
4. [Data Validation Service Layer](#data-validation-service-layer)
5. [Additional Specifications](#additional-specifications)

---

# Modal Form Validation Specification

## Overview

**Issue**: "Modal form validation specifics missing - No details on inline validation timing, error message text, or required field indicators."

## Field Requirements

### Personal Relationship Form

| Field | Required | Validation Rules | Error Messages |
|-------|----------|------------------|----------------|
| Name | Yes | 1-200 characters | "Name is required", "Name must be 200 characters or less" |
| Relationship Type | Yes | From dropdown or custom (1-50 chars) | "Relationship type is required" |
| Date of Birth | No | Valid date, not in future, age 0-120 | "Date cannot be in the future", "Please enter a valid date" |
| Is Dependent | No | Boolean | N/A |
| Email | No | Valid email format | "Please enter a valid email address" |
| Phone Number | No | UK format: `^[0-9\s\+\-\(\)]+$` | "Please enter a valid phone number" |
| Status | Yes | Active, Inactive, Deceased | "Status is required" |

### Professional Relationship Form

| Field | Required | Validation Rules | Error Messages |
|-------|----------|------------------|----------------|
| Name | Yes | 1-200 characters | "Name is required", "Name must be 200 characters or less" |
| Relationship Type | Yes | From dropdown or custom (1-50 chars) | "Relationship type is required" |
| Relationship With | No | Multi-select product owners | N/A |
| Email | No | Valid email format | "Please enter a valid email address" |
| Phone Number | No | UK format: `^[0-9\s\+\-\(\)]+$` | "Please enter a valid phone number" |
| Status | Yes | Active, Inactive | "Status is required" |

## Validation Timing

### When to Validate

**On Blur (Preferred)**:
- Validate individual field when user moves to next field
- Show error immediately if field is invalid
- Remove error immediately when user fixes it
- **UX Benefit**: Immediate feedback, doesn't interrupt typing

**On Submit**:
- Validate all fields when user clicks "Add Relationship" or "Save Changes"
- Focus first invalid field
- Scroll to first error if needed
- **Use Case**: Catch any missed errors before API call

**On Change (Selective)**:
- Use only for fields with strict format requirements (email, phone)
- Show green checkmark when valid (positive feedback)
- **UX Benefit**: Real-time format validation

### Implementation

```typescript
// hooks/useRelationshipValidation.ts

import { useState, useCallback } from 'react';
import { SpecialRelationshipFormData } from '@/types/specialRelationship';

export interface ValidationErrors {
  name?: string;
  relationship_type?: string;
  date_of_birth?: string;
  email?: string;
  phone_number?: string;
  status?: string;
}

export const useRelationshipValidation = () => {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Mark field as touched (user has interacted with it)
  const touchField = useCallback((fieldName: string) => {
    setTouchedFields(prev => new Set(prev).add(fieldName));
  }, []);

  // Validate single field
  const validateField = useCallback(
    (fieldName: keyof SpecialRelationshipFormData, value: any): string | undefined => {
      switch (fieldName) {
        case 'name':
          if (!value || value.trim().length === 0) {
            return 'Name is required';
          }
          if (value.length > 200) {
            return 'Name must be 200 characters or less';
          }
          return undefined;

        case 'relationship_type':
          if (!value || value.trim().length === 0) {
            return 'Relationship type is required';
          }
          if (value.length > 50) {
            return 'Relationship type must be 50 characters or less';
          }
          return undefined;

        case 'date_of_birth':
          if (!value) return undefined; // Optional field

          // Check if valid date
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return 'Please enter a valid date';
          }

          // Check if not in future
          if (date > new Date()) {
            return 'Date cannot be in the future';
          }

          // Check age range (0-120 years)
          const age = differenceInYears(new Date(), date);
          if (age < 0 || age > 120) {
            return 'Age must be between 0 and 120 years';
          }

          return undefined;

        case 'email':
          if (!value) return undefined; // Optional field

          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) {
            return 'Please enter a valid email address';
          }
          return undefined;

        case 'phone_number':
          if (!value) return undefined; // Optional field

          const phoneRegex = /^[0-9\s\+\-\(\)]+$/;
          if (!phoneRegex.test(value)) {
            return 'Please enter a valid phone number';
          }
          if (value.replace(/[\s\+\-\(\)]/g, '').length < 10) {
            return 'Phone number must be at least 10 digits';
          }
          return undefined;

        case 'status':
          if (!value) {
            return 'Status is required';
          }
          if (!['Active', 'Inactive', 'Deceased'].includes(value)) {
            return 'Invalid status value';
          }
          return undefined;

        default:
          return undefined;
      }
    },
    []
  );

  // Validate entire form
  const validateForm = useCallback(
    (formData: SpecialRelationshipFormData): ValidationErrors => {
      const newErrors: ValidationErrors = {};

      // Validate all required and filled fields
      Object.keys(formData).forEach((key) => {
        const error = validateField(
          key as keyof SpecialRelationshipFormData,
          formData[key as keyof SpecialRelationshipFormData]
        );
        if (error) {
          newErrors[key as keyof ValidationErrors] = error;
        }
      });

      setErrors(newErrors);
      return newErrors;
    },
    [validateField]
  );

  // Handle field blur (validate on blur)
  const handleBlur = useCallback(
    (fieldName: keyof SpecialRelationshipFormData, value: any) => {
      touchField(fieldName);

      const error = validateField(fieldName, value);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error,
      }));
    },
    [validateField, touchField]
  );

  // Handle field change (clear error when user starts typing)
  const handleChange = useCallback(
    (fieldName: keyof SpecialRelationshipFormData, value: any) => {
      // Clear error when user starts fixing field
      if (errors[fieldName as keyof ValidationErrors]) {
        setErrors(prev => ({
          ...prev,
          [fieldName]: undefined,
        }));
      }

      // For email and phone, validate on change for real-time feedback
      if (fieldName === 'email' || fieldName === 'phone_number') {
        const error = validateField(fieldName, value);
        if (touchedFields.has(fieldName)) {
          setErrors(prev => ({
            ...prev,
            [fieldName]: error,
          }));
        }
      }
    },
    [errors, validateField, touchedFields]
  );

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
    setTouchedFields(new Set());
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    handleBlur,
    handleChange,
    clearErrors,
    hasErrors: Object.keys(errors).some(key => errors[key as keyof ValidationErrors]),
  };
};
```

## Required Field Indicators

```typescript
// components/FormField.tsx

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  children,
}) => {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && (
          <>
            <span className="text-red-500 ml-1" aria-label="required">
              *
            </span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>

      {children}

      {error && (
        <p
          className="mt-1 text-sm text-red-600"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
};
```

## Form Layout and Grouping

```typescript
// components/CreateSpecialRelationshipModal.tsx

export const CreateSpecialRelationshipModal: React.FC<Props> = ({
  isOpen,
  onClose,
  clientGroupId,
  isProfessional,
}) => {
  const [formData, setFormData] = useState<SpecialRelationshipFormData>({
    name: '',
    relationship_type: '',
    is_professional: isProfessional,
    status: 'Active',
  });

  const { errors, validateForm, handleBlur, handleChange, clearErrors } =
    useRelationshipValidation();

  const createMutation = useCreateSpecialRelationship();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate entire form
    const validationErrors = validateForm(formData);

    if (Object.keys(validationErrors).length > 0) {
      // Focus first invalid field
      const firstErrorField = Object.keys(validationErrors)[0];
      document.getElementById(firstErrorField)?.focus();
      return;
    }

    // Submit if valid
    createMutation.mutate(
      { ...formData, client_group_id: clientGroupId },
      {
        onSuccess: () => {
          onClose();
          clearErrors();
          toast.success(`${formData.name} added successfully`);
        },
        onError: (error) => {
          toast.error(`Failed to add relationship: ${error.message}`);
        },
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Add ${isProfessional ? 'Professional' : 'Personal'} Relationship`}>
      <form onSubmit={handleSubmit} className="p-6">
        {/* Basic Information Section */}
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-900 mb-3">
            Basic Information
          </h3>

          <FormField label="Name" required error={errors.name}>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                handleChange('name', e.target.value);
              }}
              onBlur={(e) => handleBlur('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter full name"
              aria-required="true"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
          </FormField>

          <FormField label="Relationship Type" required error={errors.relationship_type}>
            <ComboDropdown
              options={isProfessional ? professionalTypes : personalTypes}
              value={formData.relationship_type}
              onChange={(value) => {
                setFormData({ ...formData, relationship_type: value });
                handleChange('relationship_type', value);
              }}
              onBlur={(value) => handleBlur('relationship_type', value)}
              allowCustomValue={true}
              placeholder="Select or type relationship type"
              error={!!errors.relationship_type}
            />
          </FormField>

          {!isProfessional && (
            <FormField label="Date of Birth" error={errors.date_of_birth}>
              <DateInput
                value={formData.date_of_birth}
                onChange={(value) => {
                  setFormData({ ...formData, date_of_birth: value });
                  handleChange('date_of_birth', value);
                }}
                onBlur={(value) => handleBlur('date_of_birth', value)}
                format="dd/MM/yyyy"
                error={!!errors.date_of_birth}
                placeholder="DD/MM/YYYY"
              />
            </FormField>
          )}
        </div>

        {/* Contact Information Section */}
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-900 mb-3">
            Contact Information
          </h3>

          <FormField label="Email" error={errors.email}>
            <input
              type="email"
              id="email"
              value={formData.email || ''}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                handleChange('email', e.target.value);
              }}
              onBlur={(e) => handleBlur('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="example@email.com"
            />
          </FormField>

          <FormField label="Phone Number" error={errors.phone_number}>
            <input
              type="tel"
              id="phone_number"
              value={formData.phone_number || ''}
              onChange={(e) => {
                setFormData({ ...formData, phone_number: e.target.value });
                handleChange('phone_number', e.target.value);
              }}
              onBlur={(e) => handleBlur('phone_number', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md ${
                errors.phone_number ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="01234 567890"
            />
          </FormField>
        </div>

        {/* Status Section */}
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-900 mb-3">Status</h3>

          <FormField label="Status" required error={errors.status}>
            <select
              id="status"
              value={formData.status}
              onChange={(e) => {
                setFormData({ ...formData, status: e.target.value });
                handleChange('status', e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              {!isProfessional && <option value="Deceased">Deceased</option>}
            </select>
          </FormField>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={createMutation.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {createMutation.isLoading ? 'Adding...' : 'Add Relationship'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
```

---

# Responsive Design for Tablet

## Overview

**Issue**: "Responsive table design for tablet not detailed - 7-9 columns won't fit on 768px screen."

## Breakpoints

| Breakpoint | Width | Strategy |
|------------|-------|----------|
| Desktop | ≥1280px | Show all columns |
| Laptop | 1024-1279px | Show all columns (compact spacing) |
| Tablet | 768-1023px | Hide non-essential columns, show expand icon |
| Mobile | <768px | Out of scope for initial implementation |

## Column Priority

### Personal Relationships Table

| Column | Priority | Desktop (≥1024px) | Tablet (768-1023px) |
|--------|----------|-------------------|---------------------|
| Name | P0 (Critical) | ✅ Show | ✅ Show |
| Relationship | P0 (Critical) | ✅ Show | ✅ Show |
| Age | P1 (Important) | ✅ Show | ✅ Show |
| Status | P1 (Important) | ✅ Show | ✅ Show |
| Actions | P0 (Critical) | ✅ Show | ✅ Show |
| Date of Birth | P2 (Optional) | ✅ Show | ❌ Hide (show in expand) |
| Email | P2 (Optional) | ✅ Show | ❌ Hide (show in expand) |
| Phone | P2 (Optional) | ✅ Show | ❌ Hide (show in expand) |
| Dependency | P2 (Optional) | ✅ Show | ❌ Hide (show in expand) |

### Professional Relationships Table

| Column | Priority | Desktop (≥1024px) | Tablet (768-1023px) |
|--------|----------|-------------------|---------------------|
| Name | P0 (Critical) | ✅ Show | ✅ Show |
| Relationship | P0 (Critical) | ✅ Show | ✅ Show |
| Relationship With | P1 (Important) | ✅ Show | ⚠️ Show first 2 pills |
| Status | P1 (Important) | ✅ Show | ✅ Show |
| Actions | P0 (Critical) | ✅ Show | ✅ Show |
| Email | P2 (Optional) | ✅ Show | ❌ Hide (show in expand) |
| Phone | P2 (Optional) | ✅ Show | ❌ Hide (show in expand) |

## Implementation

```typescript
// PersonalRelationshipsTable.tsx

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export const PersonalRelationshipsTable: React.FC<Props> = ({ relationships }) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpand = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            {/* Always visible on tablet */}
            <th className="px-4 py-3 text-left">
              <span className="md:hidden sr-only">Expand</span>
            </th>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Relationship</th>
            <th className="px-4 py-3 text-left">Age</th>
            <th className="px-4 py-3 text-left">Status</th>

            {/* Hidden on tablet, visible on desktop */}
            <th className="hidden lg:table-cell px-4 py-3 text-left">DOB</th>
            <th className="hidden lg:table-cell px-4 py-3 text-left">Email</th>
            <th className="hidden lg:table-cell px-4 py-3 text-left">Phone</th>
            <th className="hidden lg:table-cell px-4 py-3 text-left">Dependent</th>

            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          {relationships.map(relationship => (
            <React.Fragment key={relationship.id}>
              {/* Main row */}
              <tr className="border-b hover:bg-gray-50">
                {/* Expand button (tablet only) */}
                <td className="px-4 py-3 lg:hidden">
                  <button
                    onClick={() => toggleRowExpand(relationship.id)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label={`${expandedRows.has(relationship.id) ? 'Collapse' : 'Expand'} details for ${relationship.name}`}
                  >
                    {expandedRows.has(relationship.id) ? (
                      <ChevronDown size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>
                </td>

                {/* Always visible columns */}
                <td className="px-4 py-3 font-medium">{relationship.name}</td>
                <td className="px-4 py-3">{relationship.relationship_type}</td>
                <td className="px-4 py-3">{relationship.age || 'N/A'}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={relationship.status} />
                </td>

                {/* Desktop-only columns */}
                <td className="hidden lg:table-cell px-4 py-3">
                  {relationship.date_of_birth ? format(parseISO(relationship.date_of_birth), 'dd/MM/yyyy') : 'N/A'}
                </td>
                <td className="hidden lg:table-cell px-4 py-3">{relationship.email || 'N/A'}</td>
                <td className="hidden lg:table-cell px-4 py-3">{relationship.phone_number || 'N/A'}</td>
                <td className="hidden lg:table-cell px-4 py-3">
                  {relationship.is_dependent ? 'Yes' : 'No'}
                </td>

                <td className="px-4 py-3 text-right">
                  <SpecialRelationshipActions relationship={relationship} />
                </td>
              </tr>

              {/* Expanded details row (tablet only) */}
              {expandedRows.has(relationship.id) && (
                <tr className="lg:hidden bg-gray-50 border-b">
                  <td colSpan={6} className="px-4 py-3">
                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="font-medium text-gray-500">Date of Birth</dt>
                        <dd className="text-gray-900">
                          {relationship.date_of_birth ? format(parseISO(relationship.date_of_birth), 'dd/MM/yyyy') : 'N/A'}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-medium text-gray-500">Dependent</dt>
                        <dd className="text-gray-900">
                          {relationship.is_dependent ? 'Yes' : 'No'}
                        </dd>
                      </div>

                      <div>
                        <dt className="font-medium text-gray-500">Email</dt>
                        <dd className="text-gray-900">{relationship.email || 'N/A'}</dd>
                      </div>

                      <div>
                        <dt className="font-medium text-gray-500">Phone</dt>
                        <dd className="text-gray-900">{relationship.phone_number || 'N/A'}</dd>
                      </div>
                    </dl>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

**Effort**: 4 hours (tablet responsive design + testing)

---

# UAT Process and Checklist

## Overview

**Issue**: "UAT process underspecified - Schedule Kingston review session at end of Week 2, prepare 25-30 item checklist."

## UAT Timeline

| Phase | When | Duration | Participants |
|-------|------|----------|--------------|
| **Pre-UAT Setup** | Day 13-14 (end of Week 2) | 2 hours | Developer |
| **UAT Session** | Day 15 (Week 3, Day 1) | 2 hours | Kingston + Developer |
| **Feedback Implementation** | Day 16-18 | 4-6 hours | Developer |
| **Final Review** | Day 19 | 1 hour | Kingston |
| **Deployment** | Day 20 | 1 hour | Developer |

## Pre-UAT Setup Checklist

- [ ] Deploy feature to staging environment
- [ ] Create test client group with sample data:
  - [ ] 5 personal relationships (variety: spouse, children, parent, sibling)
  - [ ] 3 professional relationships (accountant, solicitor, financial advisor)
  - [ ] Mix of statuses (Active, Inactive, Deceased)
- [ ] Prepare UAT checklist document
- [ ] Test all functionality on staging
- [ ] Verify no console errors
- [ ] Run accessibility audit (axe-core)
- [ ] Prepare demo script

## UAT Acceptance Checklist

### Functional Requirements (20 items)

**Tab Navigation**
- [ ] 1. Personal and Professional tabs display correctly
- [ ] 2. Tab switching works smoothly (no lag)
- [ ] 3. Active tab has clear visual indicator
- [ ] 4. Tab switching preserves sort state

**Personal Relationships Table**
- [ ] 5. All columns display: Name, DOB, Age, Relationship, Dependency, Email, Phone, Status, Actions
- [ ] 6. Age calculates correctly from DOB
- [ ] 7. Dependency shows Yes/No correctly
- [ ] 8. Status badge displays with correct color (Active=green, Inactive=yellow, Deceased=grey)

**Professional Relationships Table**
- [ ] 9. All columns display: Name, Relationship, Relationship With, Phone, Email, Status, Actions
- [ ] 10. Product owner pills display correctly (max 5 shown)
- [ ] 11. "+X more" indicator shows if > 5 product owners

**Sorting**
- [ ] 12. Click column header to sort ascending
- [ ] 13. Click again to sort descending
- [ ] 14. Visual arrow indicator shows sort direction
- [ ] 15. Inactive/Deceased relationships sort to bottom (greyed out)

**CRUD Operations**
- [ ] 16. Click "Add Relationship" button opens create modal
- [ ] 17. Fill form and submit successfully creates relationship
- [ ] 18. Click table row opens edit modal with pre-filled data
- [ ] 19. Edit and save successfully updates relationship
- [ ] 20. Click Delete button shows confirmation modal
- [ ] 21. Confirm deletion removes relationship from table
- [ ] 22. Undo button appears after deletion (5 seconds)
- [ ] 23. Click Undo restores deleted relationship

**Status Changes**
- [ ] 24. Activate/Deactivate buttons change status immediately (optimistic update)
- [ ] 25. "Mark Deceased" button changes status to Deceased (Personal only)

### Non-Functional Requirements (10 items)

**Performance**
- [ ] 26. Table renders in < 200ms with 20 relationships
- [ ] 27. Modal opens in < 50ms
- [ ] 28. Status change reflects in < 50ms (optimistic update)

**Kingston Preferences**
- [ ] 29. Body text is 16px+ (readable for elderly users)
- [ ] 30. Dates display in DD/MM/YYYY format (English dates)
- [ ] 31. Relationship type dropdown allows typing custom values
- [ ] 32. Color palette is modest (no harsh white on white)

**Accessibility**
- [ ] 33. All interactive elements accessible via keyboard (Tab, Enter, Escape)
- [ ] 34. Screen reader announces headings, buttons, form labels correctly (test with NVDA)
- [ ] 35. Focus outline visible on all focused elements
- [ ] 36. Color contrast meets WCAG 2.1 AA (4.5:1 minimum)

**Error Handling**
- [ ] 37. Form validation shows clear error messages
- [ ] 38. Required fields marked with asterisk
- [ ] 39. API errors display user-friendly messages
- [ ] 40. Empty state shows helpful guidance ("No relationships yet. Click Add Relationship.")

## UAT Session Agenda

**Duration**: 2 hours

| Time | Activity | Notes |
|------|----------|-------|
| 0:00-0:10 | Introduction | Explain feature purpose, scope, what feedback we're looking for |
| 0:10-0:30 | Guided Walkthrough | Developer demonstrates all functionality following checklist |
| 0:30-1:00 | Kingston Independent Testing | Kingston explores feature freely, tries edge cases |
| 1:00-1:30 | Feedback Discussion | Review checklist, note issues, prioritize fixes |
| 1:30-1:45 | Edge Case Testing | Test unusual scenarios Kingston suggests |
| 1:45-2:00 | Next Steps | Agree on priority fixes, timeline for re-review |

## Feedback Prioritization

| Priority | Criteria | Response Time |
|----------|----------|---------------|
| **P0 - Blocker** | Feature doesn't work, data loss risk, accessibility violation | Fix immediately (same day) |
| **P1 - Critical** | Major UX issue, incorrect behavior, hard to use | Fix before production (1-2 days) |
| **P2 - Important** | Minor UX issue, enhancement request | Fix if time allows (2-4 days) |
| **P3 - Nice-to-Have** | Cosmetic issue, future enhancement | Document for future iteration |

## Post-UAT Actions

1. **Categorize Feedback** (30 minutes)
   - Group feedback by priority
   - Create GitHub issues for each item
   - Estimate effort for fixes

2. **Implement P0/P1 Fixes** (4-6 hours)
   - Fix blockers and critical issues
   - Re-test thoroughly
   - Deploy to staging

3. **Schedule Final Review** (15 minutes)
   - Book 1-hour session with Kingston
   - Send updated checklist showing fixes

4. **Final Review** (1 hour)
   - Kingston verifies fixes
   - Sign-off for production deployment

5. **Production Deployment** (1 hour)
   - Deploy to production
   - Monitor for errors
   - Notify Kingston feature is live

**Total UAT Effort**: 8-10 hours (setup + session + fixes + review)

---

# Data Validation Service Layer

## Overview

**Issue**: "Add data validation service layer - Create specialRelationshipValidation.ts utility, centralize business rules."

## Purpose

Centralize validation logic in a shared service layer that can be used by:
1. Frontend form validation
2. Backend API validation
3. Data migration scripts
4. Testing utilities

## Implementation

```typescript
// utils/specialRelationshipValidation.ts

import { differenceInYears, parseISO, isValid } from 'date-fns';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class SpecialRelationshipValidator {
  // Name validation
  static validateName(name: string): ValidationResult {
    const errors: string[] = [];

    if (!name || name.trim().length === 0) {
      errors.push('Name is required');
    } else if (name.length > 200) {
      errors.push('Name must be 200 characters or less');
    } else if (name.length < 2) {
      errors.push('Name must be at least 2 characters');
    }

    // Check for valid characters (letters, spaces, hyphens, apostrophes, periods)
    const validNamePattern = /^[a-zA-Z\s\-'\.]+$/;
    if (name && !validNamePattern.test(name)) {
      errors.push('Name can only contain letters, spaces, hyphens, apostrophes, and periods');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Relationship type validation
  static validateRelationshipType(relationshipType: string, isProfessional: boolean): ValidationResult {
    const errors: string[] = [];

    if (!relationshipType || relationshipType.trim().length === 0) {
      errors.push('Relationship type is required');
    } else if (relationshipType.length > 50) {
      errors.push('Relationship type must be 50 characters or less');
    }

    // Business rule: Check for appropriate type based on isProfessional flag
    const personalTypes = ['Spouse', 'Partner', 'Child', 'Parent', 'Sibling', 'Grandchild', 'Grandparent', 'Other Family'];
    const professionalTypes = ['Accountant', 'Solicitor', 'Doctor', 'Financial Advisor', 'Estate Planner', 'Other Professional'];

    if (isProfessional && personalTypes.includes(relationshipType)) {
      errors.push(`"${relationshipType}" is a personal relationship type. Please select a professional type.`);
    } else if (!isProfessional && professionalTypes.includes(relationshipType)) {
      errors.push(`"${relationshipType}" is a professional relationship type. Please select a personal type.`);
    }

    return { isValid: errors.length === 0, errors };
  }

  // Date of birth validation
  static validateDateOfBirth(dateOfBirth: string | null): ValidationResult {
    const errors: string[] = [];

    if (!dateOfBirth) {
      return { isValid: true, errors: [] }; // Optional field
    }

    // Parse date
    const date = parseISO(dateOfBirth);

    if (!isValid(date)) {
      errors.push('Please enter a valid date');
      return { isValid: false, errors };
    }

    // Check if in future
    if (date > new Date()) {
      errors.push('Date of birth cannot be in the future');
    }

    // Check age range (0-120 years)
    const age = differenceInYears(new Date(), date);
    if (age < 0) {
      errors.push('Date of birth cannot be in the future');
    } else if (age > 120) {
      errors.push('Age cannot exceed 120 years. Please check the date of birth.');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Email validation
  static validateEmail(email: string | null): ValidationResult {
    const errors: string[] = [];

    if (!email) {
      return { isValid: true, errors: [] }; // Optional field
    }

    // RFC 5322 compliant email regex (simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      errors.push('Please enter a valid email address');
    } else if (email.length > 255) {
      errors.push('Email must be 255 characters or less');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Phone number validation (UK format)
  static validatePhoneNumber(phoneNumber: string | null): ValidationResult {
    const errors: string[] = [];

    if (!phoneNumber) {
      return { isValid: true, errors: [] }; // Optional field
    }

    // UK phone number pattern (flexible)
    const phoneRegex = /^[0-9\s\+\-\(\)]+$/;

    if (!phoneRegex.test(phoneNumber)) {
      errors.push('Phone number can only contain numbers, spaces, +, -, and parentheses');
    }

    // Check minimum digit count (10 digits for UK)
    const digitsOnly = phoneNumber.replace(/[\s\+\-\(\)]/g, '');
    if (digitsOnly.length < 10) {
      errors.push('Phone number must contain at least 10 digits');
    } else if (digitsOnly.length > 15) {
      errors.push('Phone number must not exceed 15 digits');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Status validation
  static validateStatus(status: string, isProfessional: boolean): ValidationResult {
    const errors: string[] = [];

    const validStatuses = isProfessional
      ? ['Active', 'Inactive']
      : ['Active', 'Inactive', 'Deceased'];

    if (!status) {
      errors.push('Status is required');
    } else if (!validStatuses.includes(status)) {
      errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
    }

    // Business rule: Professional relationships cannot be Deceased
    if (isProfessional && status === 'Deceased') {
      errors.push('Professional relationships cannot have "Deceased" status. Use "Inactive" instead.');
    }

    return { isValid: errors.length === 0, errors };
  }

  // Comprehensive validation (all fields)
  static validateRelationship(data: {
    name: string;
    relationship_type: string;
    is_professional: boolean;
    date_of_birth?: string | null;
    email?: string | null;
    phone_number?: string | null;
    status: string;
  }): ValidationResult {
    const allErrors: string[] = [];

    // Validate each field
    const nameResult = this.validateName(data.name);
    allErrors.push(...nameResult.errors);

    const typeResult = this.validateRelationshipType(data.relationship_type, data.is_professional);
    allErrors.push(...typeResult.errors);

    if (data.date_of_birth) {
      const dobResult = this.validateDateOfBirth(data.date_of_birth);
      allErrors.push(...dobResult.errors);
    }

    if (data.email) {
      const emailResult = this.validateEmail(data.email);
      allErrors.push(...emailResult.errors);
    }

    if (data.phone_number) {
      const phoneResult = this.validatePhoneNumber(data.phone_number);
      allErrors.push(...phoneResult.errors);
    }

    const statusResult = this.validateStatus(data.status, data.is_professional);
    allErrors.push(...statusResult.errors);

    return { isValid: allErrors.length === 0, errors: allErrors };
  }
}
```

### Usage Examples

**Frontend Form Validation**:
```typescript
const handleSubmit = (formData: SpecialRelationshipFormData) => {
  const result = SpecialRelationshipValidator.validateRelationship(formData);

  if (!result.isValid) {
    setErrors(result.errors);
    toast.error(result.errors[0]); // Show first error
    return;
  }

  // Submit if valid
  createMutation.mutate(formData);
};
```

**Backend API Validation** (Python - requires translation of logic):
```python
# backend/app/utils/validation.py

def validate_special_relationship(data: dict) -> tuple[bool, list[str]]:
    errors = []

    # Name validation
    if not data.get('name') or len(data['name'].strip()) == 0:
        errors.append('Name is required')
    elif len(data['name']) > 200:
        errors.append('Name must be 200 characters or less')

    # ... (translate other validations from TypeScript)

    return (len(errors) == 0, errors)
```

**Effort**: 2 hours (create validation layer + integrate into forms + backend)

---

# Additional Specifications

## Sort State Persistence

**Decision**: Reset sort to default (Name ascending) on page navigation, preserve within session only

**Implementation**:
```typescript
// Use component state (not localStorage) for sort
const [sortConfig, setSortConfig] = useState({ column: 'name', direction: 'asc' });

// No useEffect to sync with localStorage
// Sort resets to default when user navigates away and returns
```

**Rationale**: Simpler UX, no confusion about "why is it sorted this way?"

---

## Age Display Enhancement

**Implementation**:
```typescript
// Show both age and DOB for verification
<td className="px-4 py-3">
  {relationship.age ? (
    <span>
      Age {relationship.age}
      <span className="text-gray-500 text-sm ml-1">
        (DOB: {format(parseISO(relationship.date_of_birth), 'dd/MM/yyyy')})
      </span>
    </span>
  ) : (
    'N/A'
  )}
</td>
```

**Effort**: 1 hour

---

## Product Owner Pill Limits

**Implementation**:
```typescript
// Limit to 5 pills, show "+X more"
<td className="px-4 py-3">
  <div className="flex flex-wrap gap-1">
    {relationship.product_owner_names?.slice(0, 5).map((name, index) => (
      <span key={index} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
        {name}
      </span>
    ))}

    {relationship.product_owner_names && relationship.product_owner_names.length > 5 && (
      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
        +{relationship.product_owner_names.length - 5} more
      </span>
    )}
  </div>
</td>
```

**Pills are non-interactive** (no click to navigate) to prevent confusion

**Effort**: 1 hour

---

## React Query Cache Optimization

**Implementation**:
```typescript
// Set cache time limit (10 minutes)
export function useSpecialRelationships(clientGroupId: string) {
  return useQuery({
    queryKey: [SPECIAL_RELATIONSHIPS_QUERY_KEY, clientGroupId],
    queryFn: () => fetchSpecialRelationships(clientGroupId),
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes (renamed from cacheTime in React Query v5)
  });
}
```

**Effort**: 30 minutes

---

## Code Splitting for Modals

**Implementation**:
```typescript
// Lazy load modals
const CreateSpecialRelationshipModal = lazy(() =>
  import('./CreateSpecialRelationshipModal')
);

const EditSpecialRelationshipModal = lazy(() =>
  import('./EditSpecialRelationshipModal')
);

// Wrap in Suspense
{showCreateModal && (
  <Suspense fallback={<div>Loading...</div>}>
    <CreateSpecialRelationshipModal ... />
  </Suspense>
)}
```

**Benefit**: Reduces initial bundle by ~40-60KB

**Effort**: 30 minutes

---

## Feature Flag for Rollback

**Implementation**:
```typescript
// .env
REACT_APP_FEATURE_SPECIAL_RELATIONSHIPS=true

// App.tsx or feature toggle utility
const isFeatureEnabled = (featureName: string) => {
  return process.env[`REACT_APP_FEATURE_${featureName}`] === 'true';
};

// BasicDetailsTab.tsx
{isFeatureEnabled('SPECIAL_RELATIONSHIPS') && (
  <SpecialRelationshipsSubTab clientGroupId={clientGroupId} />
)}
```

**Benefit**: Can disable feature instantly if critical bug found in production

**Effort**: 1 hour

---

## Summary

| Specification | Effort | Status |
|---------------|--------|--------|
| Modal Form Validation | 2 hours | ✅ Documented |
| Responsive Tablet Design | 4 hours | ✅ Documented |
| UAT Process & Checklist | 1 hour setup + 8-10 hours total | ✅ Documented |
| Data Validation Service | 2 hours | ✅ Documented |
| Sort State Persistence | 30 min documentation | ✅ Documented |
| Age Display Enhancement | 1 hour | ✅ Documented |
| Product Owner Pill Limits | 1 hour | ✅ Documented |
| React Query Cache Optimization | 30 min | ✅ Documented |
| Code Splitting for Modals | 30 min | ✅ Documented |
| Feature Flag for Rollback | 1 hour | ✅ Documented |

**Total Additional Effort**: ~14-17 hours for all medium priority items

This consolidated specification addresses all remaining medium priority issues and provides comprehensive, production-ready guidance for implementation.
