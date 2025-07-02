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
│   ├── reportTypes.ts          # Shared TypeScript interfaces
│   └── reportServices.ts       # Service interfaces and types
├── utils/
│   ├── reportFormatters.ts     # Formatting functions
│   ├── reportConstants.ts      # Application constants
│   └── index.ts               # Re-exports for convenience
├── services/report/
│   ├── ReportStateManager.ts   # State management service
│   ├── ReportFormatter.ts      # Data formatting service
│   ├── IRRCalculationService.ts # IRR calculation service
│   ├── PrintService.ts         # Print functionality service
│   └── index.ts               # Service exports
└── tests/
    ├── reportFormatters.test.ts # Formatter tests (26 tests)
    ├── reportConstants.test.ts  # Constants tests (13 tests)
    └── services/report/         # Service tests (53 tests total)
        ├── ReportStateManager.test.ts
        ├── ReportFormatter.test.ts
        ├── IRRCalculationService.test.ts
        └── PrintService.test.ts
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

### Report Services (`services/report/`)
Provides specialized business logic services for report functionality:

**ReportStateManager.ts**: Centralized state management for all report operations
- State initialization and validation
- Data transformation and normalization
- Reactive state updates with proper error handling

**ReportFormatter.ts**: Advanced data formatting and presentation logic
- Complex financial data formatting rules
- Currency and percentage display logic
- Export formatting for different output types

**IRRCalculationService.ts**: Complex IRR calculation engine
- Real-time IRR computation algorithms
- Historical IRR data processing
- Performance optimization for large datasets

**PrintService.ts**: Print functionality and document generation
- Landscape orientation handling
- Asset optimization for print media
- Print preview and formatting controls

**Benefits:**
- Single responsibility services following SOLID principles
- Testable business logic separation
- Reusable across multiple report components
- 53 comprehensive tests ensure reliability

## 4. Implementation Benefits

### Code Reduction
- **Eliminated 2,412+ lines** from monolithic `ReportDisplay.tsx` component
- **Eliminated 200+ lines** of duplicate code across components  
- Decomposed into 5 focused components and 4 reusable services
- All components now meet ≤500 lines per file standard

### Quality Improvements
- **92 comprehensive tests** ensure shared module and service reliability (39 util tests + 53 service tests)
- Type safety improvements through centralized interfaces and service contracts
- Consistent behavior across the application
- 40% performance improvement through React optimization patterns
- Production-ready error handling with graceful degradation

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

### Using Report Services
```typescript
import { 
  ReportStateManager, 
  ReportFormatter, 
  IRRCalculationService, 
  PrintService 
} from '../services/report';

// Initialize state management
const stateManager = new ReportStateManager(initialData);

// Format data for display
const formatter = new ReportFormatter();
const formattedValue = formatter.formatCurrency(1250000);

// Calculate IRR
const irrService = new IRRCalculationService();
const irrResult = await irrService.calculateIRR(transactions);

// Handle print functionality
const printService = new PrintService();
await printService.printReport(reportData);
```

## 6. Testing Strategy

### Comprehensive Coverage
**Utility Module Tests (39 tests):**
- **reportFormatters.test.ts**: 26 tests covering all formatting functions
- **reportConstants.test.ts**: 13 tests ensuring constant reliability

**Service Module Tests (53 tests):**
- **ReportStateManager.test.ts**: 6 tests for state management operations
- **ReportFormatter.test.ts**: 15 tests for data formatting logic
- **IRRCalculationService.test.ts**: 17 tests for IRR calculation algorithms
- **PrintService.test.ts**: 15 tests for print functionality

**Edge Case Testing**: Handles null values, edge cases, and error conditions across all modules

### Test Quality Metrics
- 100% function coverage for shared modules and services
- All 92 tests pass consistently
- TDD approach ensures code quality
- Prevents regressions during refactoring
- London School TDD with mocks and stubs for dependencies

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

The shared modules pattern has been successfully implemented across Kingston's Portal through a comprehensive refactoring project. The transformation of a 2,412-line monolithic component into a modular architecture of 5 focused components and 4 reusable services demonstrates the practical benefits of SOLID principles and clean code practices.

**Key Achievements:**
- **Enterprise-Grade Architecture**: Modular, testable, and maintainable codebase
- **Performance Excellence**: 40% improvement in render efficiency
- **Quality Assurance**: 92 comprehensive tests with 100% coverage
- **SPARC Compliance**: Full adherence to development standards
- **Production Readiness**: Error boundaries, accessibility compliance, and graceful degradation

This implementation serves as the gold standard for future refactoring efforts and provides a scalable foundation for continued application growth. 