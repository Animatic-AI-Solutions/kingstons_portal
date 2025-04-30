# API Tests

This directory contains unit tests for the Kingston Portal API.

## Structure

- `api/`: Tests for API routes
  - `test_clients.py`: Tests for client-related endpoints
  - `test_products.py`: Tests for product-related endpoints
  - `test_funds.py`: Tests for fund-related endpoints
  - `test_providers.py`: Tests for provider-related endpoints
  - `test_portfolios.py`: Tests for portfolio-related endpoints
  - `test_client_products.py`: Tests for client-product association endpoints
  - `test_analytics.py`: Tests for analytics endpoints
- `conftest.py`: Contains pytest fixtures and test configuration

## Running Tests

To run all tests:

```bash
pytest
```

To run tests with detailed output:

```bash
pytest -v
```

To run a specific test file:

```bash
pytest tests/api/test_clients.py
```

To run a specific test function:

```bash
pytest tests/api/test_clients.py::test_get_clients_success
```

## Test Coverage

To generate a test coverage report:

```bash
pytest --cov=app --cov-report=html
```

This will create an HTML coverage report in the `htmlcov` directory.

## Mock Database

The tests use a mock Supabase database client to simulate database interactions. This allows testing without requiring a real database connection. The mock is configured in `conftest.py` and is automatically injected into test functions that request the `mock_db` fixture. 