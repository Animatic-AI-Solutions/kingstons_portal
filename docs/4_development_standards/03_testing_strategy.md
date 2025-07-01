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
    - **API Mocking:** We use `jest.mock` to mock API calls within our tests.

### Running Frontend Tests
For instructions on running frontend tests, see the [Running the Application](../2_getting_started/02_running_the_application.md#frontend-tests) guide.

## 4. Contribution Guidelines

As outlined in our [Contribution Guidelines](./04_contribution_guidelines.md):
- Every new feature must be accompanied by corresponding tests.
- Every bug fix must include a regression test.
- All tests must pass before a pull request can be merged. 