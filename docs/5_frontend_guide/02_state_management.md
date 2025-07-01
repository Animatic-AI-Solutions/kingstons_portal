---
title: "Frontend State Management"
tags: ["frontend", "state_management", "react_query", "hooks"]
related_docs:
  - "./01_design_philosophy.md"
  - "../3_architecture/02_architecture_diagrams.md"
---
# Frontend State Management

This document explains the state management strategy for the Kingston's Portal React frontend. A clear and consistent approach to state management is crucial for building a scalable and maintainable application.

## 1. Core Philosophy

We divide state into two primary categories:

1.  **Server State:** Data that originates from the backend, is stored on the server, and may be modified by server-side operations. This includes client data, portfolios, funds, etc. This state is asynchronous.
2.  **Client State (UI State):** Data that is specific to the local client interface and is not persisted on the server. This includes things like form inputs, modal visibility, and selected UI tabs. This state is synchronous.

Our strategy is to use the best tool for each type of state.

## 2. Server State Management: React Query

We use **TanStack React Query** (`@tanstack/react-query`) as our primary tool for managing all server state. It is not a global state manager but rather a powerful server state synchronization library.

### Why React Query?
- **Caching:** It provides intelligent, out-of-the-box caching, which significantly improves perceived performance and reduces the number of redundant API calls.
- **Automatic Refetching:** It can automatically refetch data in the background to keep the UI in sync with the server.
- **Declarative API:** It allows us to fetch, cache, and update server data with a simple, declarative hook-based API.
- **Error Handling & Loading States:** It provides a standardized way to handle loading and error states for asynchronous data.

### Implementation
- **Custom Hooks:** All React Query logic is encapsulated within custom hooks, typically located in `frontend/src/hooks/`. This keeps our components clean and separates data-fetching logic from the UI.
  - **Example:** `useDashboardData.ts`, `useClientData.ts`
- **Query Keys:** We use structured, serializable query keys to manage the cache. A common pattern is `['resource', 'id', { filters }]`.
- **QueryClient Configuration:** A global `QueryClient` is instantiated in `App.tsx` with default options, such as `staleTime` and `retry` behavior.

### Data Modification (Mutations)
For creating, updating, or deleting data, we use React Query's `useMutation` hook.
- **Pessimistic Updates:** By default, we use pessimistic updates. The UI is only updated after the API call has successfully completed.
- **Query Invalidation:** After a mutation is successful, we use `queryClient.invalidateQueries()` to invalidate stale data in the cache, which triggers an automatic refetch to ensure the UI displays the latest information.

## 3. Client State (UI State) Management

For client-only state, we use React's built-in state management tools.

### `useState`
- **Default Choice:** For simple, component-local state (like form inputs, toggles, or modal visibility), we use the `useState` hook. It is simple, effective, and keeps state co-located with the component that uses it.

### `useReducer`
- **For Complex State:** For more complex state logic that involves multiple sub-values or has predictable state transitions, we use the `useReducer` hook. This is often preferable to `useState` when the next state depends on the previous one.

### `useContext`
- **For Global UI State:** For state that needs to be shared across many components at different levels of the component tree, we use the `useContext` hook. This is used sparingly to avoid unnecessary re-renders.
- **Primary Use Case:** Our primary use case for `useContext` is for **Authentication State** (`AuthContext.tsx`). This context provides information about the current user and authentication status to all components in the application.

By using this combination of tools, we can manage state in a way that is both powerful and maintainable, using the simplest effective tool for each specific use case. 