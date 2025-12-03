# Database Migrations

This directory contains SQL migration scripts for database schema changes.

## How to Run Migrations

### Option 1: Using psql (Recommended)

```bash
# Connect to your database and run the migration
psql $DATABASE_URL -f migrations/add_product_owner_fields.sql
```

### Option 2: Using psql with explicit connection details

```bash
psql -h your_host -U kingstons_app -d kingstons_portal -f migrations/add_product_owner_fields.sql
```

### Option 3: Copy and paste in database client

1. Open your PostgreSQL client (pgAdmin, DBeaver, etc.)
2. Connect to the `kingstons_portal` database
3. Open the migration file
4. Execute the SQL statements

## Migration Log

| Date | File | Description | Status |
|------|------|-------------|--------|
| 2025-12-03 | `add_product_owner_fields.sql` | Add title, middle_names, relationship_status to product_owners | Pending |

## Rollback Instructions

Each migration file includes commented-out rollback SQL at the bottom. To rollback:

1. Uncomment the rollback section
2. Run only those statements
3. Re-comment them after rollback

## Best Practices

- ✅ Always backup database before running migrations
- ✅ Test migrations on development environment first
- ✅ Verify migration success by checking the output
- ✅ Update this README after running migrations
- ✅ Keep migrations in version control
