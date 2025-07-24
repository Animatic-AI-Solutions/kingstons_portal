---
title: "Coding Principles"
tags: ["standards", "development", "sparc", "solid", "clean_code"]
related_docs:
  - "./02_naming_conventions.md"
  - "./03_testing_strategy.md"
  - "../1_introduction/02_project_strengths_and_limitations.md"
---
# Coding Principles

This document outlines the core principles that guide our development process. Adhering to these principles ensures we build a high-quality, maintainable, and robust application.

## 1. Core Philosophy (SPARC)

Our development workflow is based on the SPARC methodology:

- **Specification:** Define clear objectives, requirements, and acceptance criteria before writing code.
- **Pseudocode:** Map out the logical implementation pathways to identify core functions and algorithms.
- **Architecture:** Design modular components with clear boundaries and a proper separation of concerns.
- **Refinement:** Implement with a focus on Test-Driven Development (TDD), security, and optimization.
- **Completion:** Integrate, document, test, and verify the final implementation against the initial specification.

## 2. Code Quality Rules

- **File & Function Size Limits:**
  - Every file should be **no more than 500 lines**.
  - Every function should be **no more than 50 lines** and have a clear, single responsibility.
  - *Note: As noted in our [Strengths and Limitations](./../1_introduction/02_project_strengths_and_limitations.md), some legacy components do not yet meet this standard and are slated for refactoring.*
- **DRY (Don't Repeat Yourself):** Eliminate code duplication by abstracting common logic into reusable functions, components, or services.
  
  **Example in Practice:** Our shared modules architecture demonstrates DRY principles by centralizing common functionality:
  - `types/reportTypes.ts`: Shared TypeScript interfaces prevent duplicate type definitions
  - `utils/reportFormatters.ts`: Reusable formatting functions eliminate code duplication across components
  - `utils/reportConstants.ts`: Centralized constants ensure consistent values throughout the application
  
  This approach eliminated over 200 lines of duplicate code and provides a single source of truth for common functionality.
- **Clean Code:**
  - Use descriptive names for variables, functions, and classes, following our [Naming Conventions](./02_naming_conventions.md).
  - Maintain consistent formatting (enforced by linters).
  - Minimize nesting and cyclomatic complexity.

## 3. SOLID Principles

We strive to follow the SOLID principles in our object-oriented and component-based design:

- **(S) Single Responsibility Principle:** Every class, function, or component should have one, and only one, reason to change.
- **(O) Open/Closed Principle:** Software entities should be open for extension but closed for modification. We favor composition and dependency injection over inheritance.
- **(L) Liskov Substitution Principle:** Subtypes must be substitutable for their base types without altering the correctness of the program.
- **(I) Interface Segregation Principle:** Clients should not be forced to depend on interfaces they do not use. We prefer smaller, more focused interfaces.
- **(D) Dependency Inversion Principle:** High-level modules should not depend on low-level modules. Both should depend on abstractions.

## 4. Security Essentials

- **No Hard-coded Secrets:** Never commit credentials, API keys, or environment-specific variables. See our [Security Considerations](../6_advanced/01_security_considerations.md) for more.
- **Validate and Sanitize All Inputs:** Treat all data from external sources as untrusted.
- **Proper Error Handling:** Implement comprehensive error handling in all code paths to prevent crashes and avoid leaking sensitive information.

## 5. Frontend Implementation Standards

When implementing new features, maintain consistency with the existing codebase by following established patterns and using existing components.

### Use Consistent Frontend Patterns
- **Follow Existing Architecture:** Study and replicate successful patterns from similar components in the codebase
- **Component Reuse:** Always check `frontend/src/components/ui/` for existing components before creating new ones
- **State Management:** Use established patterns with React Query for server state and useState/useReducer for local state
- **Service Layer:** Follow the service pattern established in `frontend/src/services/` for API communication
- **Hook Patterns:** Create custom hooks following the patterns in `frontend/src/hooks/` for reusable logic

### Leverage Existing Component Library
The frontend features a rich library of 30+ reusable UI components. Always use these instead of creating duplicate functionality:

**Before implementing new UI elements, check these component categories:**
- **Buttons:** `ActionButton`, `AddButton`, `DeleteButton`, `EditButton`
- **Data Display:** `DataTable`, `StatBox`, `StatCard`, `FundDistributionChart`
- **Inputs:** `BaseInput`, `DateInput`, `SearchableDropdown`, `FilterDropdown`
- **Feedback:** `EmptyState`, `ErrorDisplay`, `Skeleton`
- **Search:** `AutocompleteSearch`, `FilterSearch`, `GlobalSearch`

**Component Discovery Process:**
1. Check `frontend/src/components/ui/index.ts` for available exports
2. Review `frontend/src/components/ui/COMPONENT_GUIDE.md` for usage examples
3. Examine existing page implementations for integration patterns
4. Only create new components when existing ones cannot be composed to meet requirements

### Maintain Design System Consistency
- **Typography:** Follow established font sizes, weights, and hierarchy patterns
- **Color Scheme:** Use existing CSS variables and theme colors from the design system
- **Spacing:** Follow established margin and padding patterns using Tailwind utilities
- **Accessibility:** Maintain WCAG 2.1 AA compliance patterns established in existing components

### Follow Established Data Flow Patterns
- **API Integration:** Use the service layer pattern with proper error handling and loading states
- **Form Handling:** Follow established form validation and submission patterns
- **Navigation:** Use the smart navigation pattern for context-aware user flows
- **State Updates:** Follow React Query patterns for optimistic updates and cache invalidation

**Example Implementation Approach:**
```typescript
// 1. Check existing components first
import { ActionButton, DataTable, ErrorDisplay } from '../components/ui';

// 2. Use established service patterns
import { useClientData } from '../hooks/useClientData';

// 3. Follow consistent state management
const MyNewComponent = () => {
  const { data, isLoading, error } = useClientData();
  
  // 4. Use consistent error handling
  if (error) return <ErrorDisplay error={error} />;
  
  // 5. Follow established UI patterns
  return (
    <div className="space-y-4"> {/* Consistent spacing */}
      <DataTable data={data} loading={isLoading} />
      <ActionButton onClick={handleAction}>
        Consistent Action
      </ActionButton>
    </div>
  );
};
```

## 6. Testability

- **Design for Testability:** Write code that is easy to test.
- **TDD (London School):** Follow a "Red-Green-Refactor" [Testing Strategy](./03_testing_strategy.md). 