---
title: "Naming Conventions"
tags: ["standards", "development", "conventions", "naming"]
related_docs:
  - "./01_coding_principles.md"
  - "./04_contribution_guidelines.md"
---
# Naming Conventions

Consistent naming conventions are crucial for readability and maintainability. This document outlines the standard conventions used across the Kingston's Portal codebase.

## 1. General Principles

- **Clarity and Descriptiveness:** Names should be explicit and unambiguous. Avoid abbreviations that are not widely understood (e.g., prefer `clientGroup` over `cltGrp`).
- **Use camelCase:** For variables, functions, and non-component file names.
- **Use PascalCase (UpperCamelCase):** For classes and React components.

## 2. Backend (Python/FastAPI)

- **Python Files:** `snake_case` (e.g., `client_groups.py`).
- **Variables:** `snake_case` (e.g., `client_group_id`).
- **Functions:** `snake_case` (e.g., `get_client_group`).
- **Classes:** `PascalCase` (e.g., `ClientGroupCreate`).
- **Pydantic Models:** `PascalCase`, often suffixed with `Create`, `Update`, or `InDB` to denote their purpose (e.g., `ClientGroup`, `ClientGroupUpdate`). See [API Design](../3_architecture/04_api_design.md) for examples.
- **Database Tables & Columns:** `snake_case` (e.g., `client_groups`, `valuation_date`).

## 3. Frontend (TypeScript/React)

- **Component Files:** `PascalCase.tsx` (e.g., `ClientDetails.tsx`).
- **Non-Component TS Files:** `camelCase.ts` (e.g., `authService.ts`, `useClientData.ts`).
- **React Components:** `PascalCase` (e.g., `function ClientDetails() { ... }`).
- **Interfaces and Types:** `PascalCase` (e.g., `interface IClientGroup`, `type ProductOwner`).
- **State Variables:** `camelCase`, often prefixed with `is` or a verb for booleans (e.g., `const [isLoading, setIsLoading] = useState(false)`).
- **Custom Hooks:** `camelCase`, always prefixed with `use` (e.g., `useDashboardData`). See [State Management](../5_frontend_guide/02_state_management.md) for examples.
- **CSS Classes:** `kebab-case` for custom CSS, but primarily use Tailwind CSS utilities.

## 4. API Endpoints

- **URLs:** `snake_case`, plural, and based on the primary resource.
  - **Good:** `/api/client_groups/{client_group_id}/products`
  - **Bad:** `/api/getClientGroupProducts`
- **Path Parameters:** `snake_case` (e.g., `client_group_id`).
- **Query Parameters:** `snake_case` (e.g., `?sort_by=name`).

## 5. Git Conventions

- **Branches & Commits:** We follow specific conventions for branches and commit messages to ensure a clean and understandable project history. These are detailed in the [Contribution Guidelines](./04_contribution_guidelines.md). 