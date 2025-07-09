# API Design

This document outlines the design and architecture of the FastAPI backend application.

## 1. API Architecture Overview

The backend is a modern, asynchronous API built with Python and FastAPI. It serves as the single source of truth for the frontend application, handling all business logic, data processing, and communication with the PostgreSQL database.

- **Framework:** FastAPI
- **Language:** Python
- **Server:** Uvicorn (ASGI)
- **Design Principles:** RESTful, modular, and service-oriented.

## 2. Structure and Modularity

The API is organized into distinct modules by resource, promoting a clean separation of concerns and making the codebase easy to navigate.

### Core Structure
```
backend/
├── app/
│   ├── api/
│   │   └── routes/ (25+ route modules)
│   │   └── db/
│   │   └── database.py (database connection)
│   └── models/ (Pydantic data models)
├── main.py (FastAPI app instantiation and middleware)
└── requirements.txt (Python dependencies)
```

### Route Modules
Each resource in the system has its own dedicated route file in `app/api/routes/`. This modularity ensures that all related endpoints are grouped together. Key route modules include:
- `client_groups.py`
- `client_products.py`
- `portfolios.py`
- `portfolio_funds.py`
- `funds.py`
- `analytics.py`
- `auth.py`
- `search.py`

## 3. Key Architectural Patterns

### RESTful Conventions
The API adheres to RESTful design principles for predictable and standardized communication.
- **HTTP Verbs:**
    - `GET`: Retrieve resources.
    - `POST`: Create new resources.
    - `PUT`: Update existing resources.
    - `PATCH`: Partially modify resources.
    - `DELETE`: Remove resources.
- **URL Structure:** Resource-based URLs (e.g., `/api/client_groups/{client_group_id}`).
- **Status Codes:** Standard HTTP status codes are used to indicate the outcome of a request (e.g., `200 OK`, `201 Created`, `404 Not Found`).

### Dependency Injection
FastAPI's dependency injection system is used extensively to manage dependencies like database connections and user authentication.

```python
# Example of dependency injection in a route
@router.get("/client_groups/{client_group_id}")
async def get_client_group(
    client_group_id: int,
    db = Depends(get_db),  # Injects a database session
    current_user: dict = Depends(get_current_user) # Injects authenticated user
):
    # ... business logic ...
```
This pattern improves code testability and decouples the business logic from its dependencies.

### Data Validation with Pydantic
All incoming request bodies and outgoing responses are validated using Pydantic models. This ensures:
- **Type Safety:** Data conforms to the expected data types.
- **Data Integrity:** Required fields are present, and data formats are correct.
- **Clear Contracts:** Pydantic models serve as a clear, machine-readable definition of the API's data structures.

### Bulk Data Optimization
To support the performance needs of the frontend dashboards, the API includes several optimized bulk data endpoints.
- **Example:** `@router.get("/bulk_client_data")` in `client_groups.py`.
- These endpoints are designed to fetch and aggregate large amounts of data in a single, efficient query, often leveraging the optimized views in the database. This minimizes the number of round-trips between the frontend and backend.

### Analytics and IRR Calculations
The analytics module (`analytics.py`) provides specialized endpoints for accurate financial calculations:
- **Standardized IRR Calculations:** The `/analytics/client/{client_id}/irr` and `/analytics/product/{product_id}/irr` endpoints use proper cash flow-based IRR calculations rather than weighted averages.
- **Multiple Portfolio Funds IRR:** Leverages the standardized multiple portfolio funds IRR calculation engine to aggregate IRR across all portfolio funds for accurate client-level and product-level IRR values.
- **Mathematical Accuracy:** Ensures IRR calculations follow proper financial mathematics by analyzing actual cash flows and timing, providing accurate performance metrics for wealth management decision-making.

## 4. Authentication and Security

- **Authentication:** Handled via JWT (JSON Web Tokens). The client receives a token upon successful login, which must be included in the `Authorization` header of subsequent requests.
- **Authorization:** The `get_current_user` dependency protects routes, ensuring that only authenticated users can access them.
- **CORS:** The API is configured with CORS (Cross-Origin Resource Sharing) middleware to securely allow requests from the frontend application's domain.

## 5. Error Handling

The API provides structured JSON error responses. If an internal error occurs, it is logged, and a generic `500 Internal Server Error` is returned to the client with a unique error ID for traceability, avoiding the exposure of sensitive internal details. 