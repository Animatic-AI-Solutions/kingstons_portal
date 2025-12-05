# Database Migration Tests (TDD RED PHASE)

## Overview

This directory contains comprehensive Test-Driven Development (TDD) tests for the Phase 2 People Tab database migrations. These tests are currently in the **RED PHASE** - they define the expected behavior but will fail until the migrations are implemented.

## Test Coverage

### Test Files

1. **test_001_idempotency_keys.py** (20 tests)
   - Tests for creating the `idempotency_keys` table
   - Validates table structure, columns, constraints, and indexes
   - Ensures proper downgrade behavior

2. **test_002_product_owner_indexes.py** (21 tests)
   - Tests for creating performance indexes on `product_owners` table
   - Validates 6 single-column indexes + 1 composite index
   - Tests performance optimization patterns

3. **test_003_composite_display_order.py** (15 tests)
   - Tests for composite display order index
   - Validates index on `client_group_product_owners` table
   - Documents use cases for People tab queries

**Total: 56 tests**

## Running the Tests

### Prerequisites

```bash
# Install required packages
pip install pytest==7.4.3 pytest-asyncio==0.21.1 sqlalchemy python-dotenv

# Set DATABASE_URL_PHASE2 or DATABASE_URL in .env file
DATABASE_URL_PHASE2=postgresql://user:password@host:port/database
```

### Run All Migration Tests

```bash
cd backend
python -m pytest tests/migrations/ -v
```

### Run Specific Test File

```bash
# Test Migration 001
python -m pytest tests/migrations/test_001_idempotency_keys.py -v

# Test Migration 002
python -m pytest tests/migrations/test_002_product_owner_indexes.py -v

# Test Migration 003
python -m pytest tests/migrations/test_003_composite_display_order.py -v
```

### Run Specific Test

```bash
python -m pytest tests/migrations/test_001_idempotency_keys.py::TestMigration001IdempotencyKeys::test_idempotency_keys_table_exists_after_upgrade -v
```

## Current Test Status

**RED PHASE**: All tests are expected to FAIL because migrations have not been implemented yet.

### Test Results Summary

```
56 tests total
- Migration 001: 20 tests (all failing as expected)
- Migration 002: 21 tests (4 passing - existing indexes, 17 failing)
- Migration 003: 15 tests (1 passing - table exists, 14 failing)
```

**Note**: Some tests in Migration 002 and 003 pass because they verify that prerequisite tables exist. The actual migration-specific tests all fail as expected.

## Test Structure

### conftest.py

Provides shared fixtures and utilities:
- `db_engine`: SQLAlchemy engine for database connections
- `db_inspector`: Inspector for schema introspection
- Helper functions:
  - `table_exists()`: Check if table exists
  - `column_exists()`: Check if column exists
  - `index_exists()`: Check if index exists
  - `get_column_type()`: Get column data type
  - `get_primary_keys()`: Get primary key columns
  - `get_index_columns()`: Get columns in an index

### Test Organization

Each test file is organized into test classes:

1. **Main Migration Tests**: Verify migration creates expected objects
2. **Integrity Tests**: Verify constraints and data integrity
3. **Performance Tests**: Document performance optimization patterns
4. **Use Case Tests**: Document business use cases for schema changes

## Migration Specifications

### Migration 001: Idempotency Keys Table

**Purpose**: Prevent duplicate API requests through idempotency key tracking

**Creates**:
- Table: `idempotency_keys`
- Columns: 8 total (key, endpoint, user_id, request_hash, response_status, response_body, created_at, expires_at)
- Primary Key: `key` column
- Index: `idx_idempotency_expires_at` on `expires_at` column

### Migration 002: Product Owner Indexes

**Purpose**: Optimize queries on product_owners table

**Creates**:
- 6 single-column indexes:
  - `idx_product_owners_status`
  - `idx_product_owners_firstname`
  - `idx_product_owners_surname`
  - `idx_product_owners_email_1`
  - `idx_product_owners_dob`
  - `idx_product_owners_created_at`
- 1 composite index:
  - `idx_product_owners_status_created_at` on (status, created_at)

### Migration 003: Composite Display Order Index

**Purpose**: Optimize People tab display order queries

**Creates**:
- Composite index: `idx_cgpo_display_order` on `client_group_product_owners` table
- Columns: (client_group_id, display_order)
- Optimizes: Filter by client group + sort by display order

## Next Steps (GREEN PHASE)

1. **Create Alembic migration files** following the specifications
2. **Run migrations** on test database
3. **Re-run tests** - they should pass (GREEN PHASE)
4. **Refactor if needed** (REFACTOR PHASE)

## Documentation References

- **Architecture**: `docs/specifications/Phase2_People_Tab_Architecture.md` Section 11
- **Implementation Plan**: `docs/specifications/Phase2_People_Tab_TDD_Implementation_Plan.md`
- **Git Workflow**: `docs/04_development_workflow/01_git_workflow.md`

## TDD Principles

This test suite follows TDD best practices:

1. **RED PHASE** (Current): Write failing tests that define expected behavior
2. **GREEN PHASE** (Next): Implement migrations to make tests pass
3. **REFACTOR PHASE**: Optimize and clean up implementation

### Test Quality Characteristics

- **Fast**: Tests run in milliseconds (schema inspection only)
- **Isolated**: Each test is independent
- **Repeatable**: Same result every time
- **Self-validating**: Clear pass/fail with descriptive messages
- **Timely**: Written before implementation (TDD)

## Troubleshooting

### "No module named 'pytest'"

```bash
pip install pytest==7.4.3 pytest-asyncio==0.21.1
```

### "No module named 'sqlalchemy'"

```bash
pip install sqlalchemy
```

### "DATABASE_URL must be set"

Create a `.env` file in the backend directory:

```env
DATABASE_URL_PHASE2=postgresql://user:password@localhost:5432/kingstons_portal_phase2
```

### Tests hang or timeout

Ensure PostgreSQL database is running and accessible at the DATABASE_URL.

## Contributing

When adding new migration tests:

1. Follow existing test structure and naming conventions
2. Use descriptive test names that explain what is being verified
3. Include docstrings explaining the purpose and expected failure
4. Group related tests into test classes
5. Use helper functions from conftest.py for common operations
6. Mark tests with expected failures during RED PHASE
