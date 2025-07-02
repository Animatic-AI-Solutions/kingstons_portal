---
title: "Shared Modules Pattern"
tags: ["architecture", "frontend", "modules", "dry", "testing"]
related_docs:
  - "./01_system_architecture_overview.md"
  - "../4_development_standards/01_coding_principles.md"
  - "../4_development_standards/03_testing_strategy.md"
---
# Shared Modules Pattern

This document describes the shared modules architecture pattern implemented in Kingston's Portal frontend to eliminate code duplication and improve maintainability.

## 1. Overview

The shared modules pattern centralizes common functionality into reusable modules, following the DRY (Don't Repeat Yourself) principle. This approach was implemented during a major refactoring effort to address code duplication issues identified in large components.

## 2. Architecture Structure

### Module Organization
```
frontend/src/
├── types/
│   └── reportTypes.ts          # Shared TypeScript interfaces
├── utils/
│   ├── reportFormatters.ts     # Formatting functions
│   ├── reportConstants.ts      # Application constants
│   └── index.ts               # Re-exports for convenience
└── tests/
    ├── reportFormatters.test.ts # Formatter tests (26 tests)
    └── reportConstants.test.ts  # Constants tests (13 tests)
```

## 3. Module Descriptions

### Shared Types (`types/reportTypes.ts`)
Centralizes TypeScript interface definitions used across multiple components:
- `ProductPeriodSummary`: Product summary data structure
- `FundSummary`: Fund information interface
- `SelectedIRRDate`: IRR calculation date selection
- `ProductIRRSelections`: IRR selection configurations
- `ReportData`: Comprehensive report data structure

**Benefits:**
- Single source of truth for data structures
- Prevents interface duplication and inconsistencies
- Improves TypeScript IntelliSense across the application

### Shared Formatters (`utils/reportFormatters.ts`)
Provides consistent formatting functions for data presentation:
- `formatCurrencyWithTruncation()`: Currency formatting with large number truncation
- `formatIrrWithPrecision()`: IRR percentage formatting with precision control
- `formatWithdrawalAmount()`: Withdrawal amount formatting with visual indicators
- `formatCurrencyWithVisualSigning()`: Currency formatting with visual plus/minus indicators
- `calculateNetFundSwitches()`: Business logic for fund switch calculations

**Benefits:**
- Consistent data presentation across all components
- Centralized formatting logic reduces bugs
- Easy to modify formatting rules application-wide

### Shared Constants (`utils/reportConstants.ts`)
Centralizes application-wide constants and configuration:
- `PRODUCT_TYPE_ORDER`: Consistent product type ordering
- `normalizeProductType()`: Product type normalization logic
- Default formatting options and display configurations

**Benefits:**
- Single source of truth for application constants
- Prevents magic numbers and inconsistent values
- Easy configuration management

## 4. Implementation Benefits

### Code Reduction
- **Eliminated 200+ lines** of duplicate code across components
- Reduced `ReportDisplay.tsx` size by removing duplicate interfaces and functions
- Improved maintainability of large components

### Quality Improvements
- **39 comprehensive tests** ensure shared module reliability
- Type safety improvements through centralized interfaces
- Consistent behavior across the application

### Developer Experience
- Improved IntelliSense and auto-completion
- Single location for formatting and constant updates
- Clear separation of concerns

## 5. Usage Examples

### Using Shared Types
```typescript
import { ProductPeriodSummary, ReportData } from '../types/reportTypes';

const processReportData = (data: ReportData): ProductPeriodSummary[] => {
  // Implementation using consistent interfaces
};
```

### Using Shared Formatters
```typescript
import { formatCurrencyWithTruncation, formatIrrWithPrecision } from '../utils/reportFormatters';

const displayValue = formatCurrencyWithTruncation(1250000, true); // "£1.25M"
const displayIRR = formatIrrWithPrecision(0.0875, 2); // "8.75%"
```

### Using Shared Constants
```typescript
import { PRODUCT_TYPE_ORDER, normalizeProductType } from '../utils/reportConstants';

const sortedProducts = products.sort((a, b) => 
  PRODUCT_TYPE_ORDER.indexOf(normalizeProductType(a.type)) -
  PRODUCT_TYPE_ORDER.indexOf(normalizeProductType(b.type))
);
```

## 6. Testing Strategy

### Comprehensive Coverage
- **reportFormatters.test.ts**: 26 tests covering all formatting functions
- **reportConstants.test.ts**: 13 tests ensuring constant reliability
- **Edge Case Testing**: Handles null values, edge cases, and error conditions

### Test Quality Metrics
- 100% function coverage for shared modules
- All 39 tests pass consistently
- Prevents regressions during refactoring

## 7. Future Enhancements

### Planned Improvements
- Extend pattern to other large components
- Add shared modules for API response handling
- Implement shared validation utilities

### Maintenance Guidelines
- All new shared functions must include comprehensive tests
- Update documentation when adding new modules
- Follow naming conventions for consistency

## 8. Best Practices

### When to Create Shared Modules
- Code duplication across 3+ components
- Complex formatting or calculation logic
- Application-wide constants or configurations

### Implementation Guidelines
- Always include comprehensive tests
- Use TypeScript for type safety
- Document all public functions
- Follow single responsibility principle

## Conclusion

The shared modules pattern has significantly improved code quality in Kingston's Portal by eliminating duplication, improving maintainability, and providing a solid foundation for future development. This architecture serves as a model for ongoing refactoring efforts and demonstrates the practical application of SOLID principles and clean code practices. 