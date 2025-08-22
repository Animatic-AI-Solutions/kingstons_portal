---
title: "Testing Strategy"
tags: ["standards", "development", "testing", "tdd", "pytest", "jest"]
related_docs:
  - "./01_coding_principles.md"
  - "./04_contribution_guidelines.md"
  - "../2_getting_started/02_running_the_application.md"
---
# Testing Strategy

This document outlines the testing philosophy, tools, and processes for the Kingston's Portal project. Our goal is to build a robust and reliable application by maintaining a high level of test coverage.

## 1. Testing Philosophy

We follow the **Test-Driven Development (TDD)** methodology, specifically the "London School" or "Outside-In" approach, as mentioned in our [Coding Principles](./01_coding_principles.md). This means:
1.  **Red:** We start by writing a failing acceptance or integration test that defines a slice of functionality.
2.  **Green:** We then write the minimal amount of implementation code required to make the test pass.
3.  **Refactor:** Once the functionality is working and tests pass, we refactor the code to improve its design, readability, and performance, ensuring all tests continue to pass.

## 2. Backend Testing (Python/Pytest)

- **Toolchain:** `pytest` is our primary testing framework.
- **Location:** Tests are located in the `backend/tests/` directory.
- **Database:** Tests should run against a dedicated, ephemeral test database to ensure isolation.
- **Types of Tests:**
    - **Unit Tests:** Test individual functions/classes in isolation. Dependencies are mocked using `pytest-mock`.
    - **Integration Tests:** Test the interaction between different components (e.g., API routes and the database layer).
    - **API Endpoint Tests:** Test the full request-response cycle using FastAPI's `TestClient`.

### Running Backend Tests
For instructions on running backend tests, see the [Running the Application](../2_getting_started/02_running_the_application.md#backend-tests) guide.

## 3. Frontend Testing (TypeScript/Jest)

- **Toolchain:**
    - `Jest`: The core testing framework.
    - `React Testing Library`: For rendering components and simulating user interaction.
    - `jest-dom`: Provides custom DOM element matchers.
- **Philosophy:** We test user behavior, not implementation details. We ask "What does the user see?" and "How do they interact with it?".
- **Location:** All frontend tests are currently located in the `frontend/src/tests/` directory.
- **Types of Tests:**
    - **Component Tests (Unit/Integration):** Test individual React components or small compositions of components.
    - **Hook Tests:** Custom hooks are tested in isolation.
    - **Shared Module Tests:** Comprehensive testing of utility functions, formatters, and constants.
    - **API Mocking:** We use `jest.mock` to mock API calls within our tests.

### Shared Modules Test Coverage
Our shared modules and services have comprehensive test coverage to ensure reliability:

**Utility Module Tests (39 tests):**
- **Report Formatters (`reportFormatters.test.ts`):** 26 tests covering all formatting functions including currency formatting, percentage handling, and data transformation utilities.
- **Report Constants (`reportConstants.test.ts`):** 13 tests ensuring consistent behavior of configuration constants and normalization functions.

**Service Module Tests (53 tests):**
- **ReportStateManager.test.ts:** 2 tests for state management operations and data transformation
- **ReportFormatter.test.ts:** 15 tests for advanced data formatting logic and export formatting
- **IRRCalculationService.test.ts:** 3 tests for IRR calculation algorithms and performance optimization
- **PrintService.test.ts:** 33 tests for print functionality and document generation

**Test Quality Metrics:**
- **Total Coverage:** 92 comprehensive tests (39 utility + 53 service tests) with 100% function coverage
- **Edge Case Handling:** Thorough testing of null values, edge cases, and error conditions across all modules
- **TDD Implementation:** London School TDD approach with mocks and stubs for dependencies
- **Regression Prevention:** All tests pass consistently, preventing regressions during refactoring

This comprehensive testing approach provides a solid foundation for application reliability and serves as the gold standard for future testing implementations.

### Frontend Testing Configuration & Known Issues

#### Jest Configuration
Our Jest configuration is located in `jest.config.js` and includes:
- **Coverage Threshold:** 70% minimum coverage across lines, functions, branches, and statements
- **Test Environment:** jsdom for DOM testing
- **TypeScript Support:** ts-jest for TypeScript compilation
- **React Support:** React Testing Library integration

#### Expected Warnings (Safe to Ignore)
When running `npm test`, you will see **expected warnings** that are harmless:

**ts-jest Deprecation Warnings:**
```
ts-jest[ts-jest-transformer] (WARN) Define `ts-jest` config under `globals` is deprecated.
ts-jest[config] (WARN) The "ts-jest" config option "isolatedModules" is deprecated
```

**These warnings are expected and safe to ignore because:**
- ✅ All tests pass successfully despite warnings
- ✅ Coverage thresholds are met (70% minimum enforced)
- ✅ TypeScript compilation works correctly
- ✅ The warnings are from ts-jest version compatibility issues, not functionality problems

**Running Tests:**
```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (development)
npm run test:watch
```

### Running Frontend Tests
For instructions on running frontend tests, see the [Running the Application](../2_getting_started/02_running_the_application.md#frontend-tests) guide.

## 4. Contribution Guidelines

As outlined in our [Contribution Guidelines](./04_contribution_guidelines.md):
- Every new feature must be accompanied by corresponding tests.
- Every bug fix must include a regression test.
- All tests must pass before a pull request can be merged. 