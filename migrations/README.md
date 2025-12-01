# Database Migrations

This directory contains SQL migration scripts for Kingston's Portal database schema changes.

## Phase 2 Product Owners Migration

### Overview
This migration adds comprehensive personal, contact, employment, and compliance fields to the `product_owners` table to support Phase 2 client management features.

### Files
- `add_product_owners_phase2_fields.sql` - Forward migration (adds fields)
- `rollback_add_product_owners_phase2_fields.sql` - Rollback migration (removes fields)

### New Fields Added

**Personal Information:**
- `gender` (TEXT) - Gender of the product owner
- `previous_names` (TEXT) - Previous names (maiden names, former names)
- `dob` (DATE) - Date of birth
- `age` (INTEGER) - Current age
- `place_of_birth` (TEXT) - Place/location of birth

**Contact Information:**
- `email_1` (TEXT) - Primary email address
- `email_2` (TEXT) - Secondary email address
- `phone_1` (TEXT) - Primary phone number
- `phone_2` (TEXT) - Secondary phone number

**Residential Information:**
- `moved_in_date` (DATE) - Date moved to current address

**Client Profiling:**
- `three_words` (TEXT) - Three words to describe the client
- `share_data_with` (TEXT) - Data sharing preferences

**Employment Information:**
- `employment_status` (TEXT) - Current employment status
- `occupation` (TEXT) - Current or previous occupation

**Identity & Compliance (KYC/AML):**
- `passport_expiry_date` (DATE) - Passport expiration date
- `ni_number` (TEXT) - National Insurance number
- `aml_result` (TEXT) - AML check result
- `aml_date` (DATE) - Date of last AML check

### Indexes Created
For optimized query performance:
- `idx_product_owners_email_1` - On email_1 field
- `idx_product_owners_email_2` - On email_2 field
- `idx_product_owners_dob` - On dob field
- `idx_product_owners_aml_date` - On aml_date field
- `idx_product_owners_aml_result` - On aml_result field

## How to Apply Migration

### Using psql Command Line:

```bash
# Connect to your database
psql $DATABASE_URL

# Run the migration
\i migrations/add_product_owners_phase2_fields.sql
```

### Using psql with Environment Variable:

```powershell
# Windows PowerShell
$env:DATABASE_URL = "postgresql://username:password@host:port/database"
psql $env:DATABASE_URL -f migrations/add_product_owners_phase2_fields.sql
```

### Direct SQL Execution:

```bash
psql -h hostname -U username -d database_name -f migrations/add_product_owners_phase2_fields.sql
```

## How to Rollback Migration

**⚠️ WARNING: Rollback will permanently delete all data in these columns!**

```bash
# Connect to your database
psql $DATABASE_URL

# Run the rollback
\i migrations/rollback_add_product_owners_phase2_fields.sql
```

## Verification

After applying the migration, verify the changes:

```sql
-- Check that columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'product_owners'
ORDER BY ordinal_position;

-- Check that indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'product_owners'
AND indexname LIKE 'idx_product_owners_%';

-- Verify column comments
SELECT
    cols.column_name,
    pg_catalog.col_description(c.oid, cols.ordinal_position::int)
FROM information_schema.columns cols
JOIN pg_catalog.pg_class c ON c.relname = cols.table_name
WHERE cols.table_name = 'product_owners'
AND cols.column_name IN ('gender', 'dob', 'email_1', 'aml_result');
```

## Next Steps

After applying this migration:

1. **Update Backend Models** - Update Pydantic models in `backend/app/models/` to include new fields
2. **Update API Routes** - Modify API endpoints in `backend/app/api/routes/` to handle new fields
3. **Update Frontend Types** - Add new fields to TypeScript interfaces in `frontend/src/types/`
4. **Update UI Components** - Modify forms and displays to show/edit new fields
5. **Update Tests** - Add test coverage for new fields

## Addresses Table Migration

### Overview
This migration creates an addresses table to store product owner addresses and establishes a one-to-one relationship with product_owners via foreign key.

### Files
- `add_addresses_table.sql` - Forward migration (creates addresses table and foreign key)
- `rollback_add_addresses_table.sql` - Rollback migration (removes table and foreign key)
- `test_addresses_migration.sql` - Comprehensive test script

### Schema

**addresses table:**
- `id` (BIGSERIAL, PRIMARY KEY) - Unique address identifier
- `created_at` (TIMESTAMP WITH TIME ZONE) - Record creation timestamp
- `line_1` (TEXT) - Address line 1
- `line_2` (TEXT) - Address line 2
- `line_3` (TEXT) - Address line 3
- `line_4` (TEXT) - Address line 4
- `line_5` (TEXT) - Address line 5 (typically postcode)

**product_owners changes:**
- `address_id` (BIGINT, NULLABLE) - Foreign key to addresses table
- Foreign key constraint with `ON DELETE SET NULL`
- Index on `address_id` for join performance

### Relationship
- **One-to-One**: Each product owner can have only one address
- **Optional**: address_id is nullable (existing records won't have addresses)
- **Cascade Behavior**: If an address is deleted, product_owner.address_id is set to NULL

## Special Relationships Tables Migration

### Overview
This migration creates tables for tracking personal and professional relationships associated with product owners, including a many-to-many junction table.

### Files
- `add_special_relationships_table.sql` - Forward migration (creates both tables)
- `rollback_add_special_relationships_table.sql` - Rollback migration (removes both tables)
- `test_special_relationships_migration.sql` - Comprehensive test script

### Schema

**special_relationships table:**
- `id` (BIGSERIAL, PRIMARY KEY) - Unique relationship identifier
- `created_at` (TIMESTAMP WITH TIME ZONE) - Record creation timestamp
- `type` (TEXT) - Relationship type (personal/professional)
- `dob` (DATE) - Date of birth
- `name` (TEXT) - Name of the related individual
- `age` (INTEGER) - Age
- `dependency` (BOOLEAN) - Whether this is a dependent relationship
- `address_id` (BIGINT, NULLABLE) - Foreign key to addresses table
- `status` (TEXT) - Status (default: 'active')
- `email` (TEXT) - Email address
- `phone` (TEXT) - Phone number
- `relationship` (TEXT) - Description of relationship (e.g., "Daughter", "Business Partner")
- `notes` (TEXT) - Additional notes

**product_owner_special_relationships junction table:**
- `id` (BIGSERIAL, PRIMARY KEY) - Unique junction record identifier
- `created_at` (TIMESTAMP WITH TIME ZONE) - Record creation timestamp
- `product_owner_id` (BIGINT, NOT NULL) - Foreign key to product_owners table
- `special_relationship_id` (BIGINT, NOT NULL) - Foreign key to special_relationships table
- Unique constraint on (product_owner_id, special_relationship_id) combination

### Relationships
- **Many-to-Many**: Product owners can have multiple special relationships, and special relationships can be associated with multiple product owners
- **Optional Address**: special_relationships can optionally link to addresses table
- **Cascade Behavior**:
  - ON DELETE CASCADE on junction table foreign keys (deleting either side removes the link)
  - ON DELETE SET NULL for address_id (deleting an address doesn't delete the relationship)

### Indexes Created
- `idx_special_relationships_type` - For filtering by relationship type
- `idx_special_relationships_name` - For name searches
- `idx_special_relationships_address_id` - For joins with addresses
- `idx_special_relationships_status` - For filtering by status
- `idx_product_owner_special_relationships_product_owner_id` - For finding relationships by owner
- `idx_product_owner_special_relationships_special_relationship_id` - For finding owners by relationship

## Health Table Migration

### Overview
This migration creates a health table for tracking health conditions and medical information. Uses a polymorphic relationship pattern where health records can be associated with either product owners OR special relationships (but not both).

### Files
- `add_health_table.sql` - Forward migration (creates health table)
- `rollback_add_health_table.sql` - Rollback migration (removes health table)
- `test_health_migration.sql` - Comprehensive test script

### Schema

**health table:**
- `id` (BIGSERIAL, PRIMARY KEY) - Unique health record identifier
- `created_at` (TIMESTAMP WITH TIME ZONE) - Record creation timestamp
- `product_owner_id` (BIGINT, NULLABLE) - Foreign key to product_owners table
- `special_relationship_id` (BIGINT, NULLABLE) - Foreign key to special_relationships table
- `condition` (TEXT) - Medical condition description
- `name` (TEXT) - Name/title of the condition
- `date_of_diagnosis` (DATE) - Date when condition was diagnosed
- `status` (TEXT) - Current status of condition (e.g., active, managed, resolved)
- `medication` (TEXT) - Current medications for this condition
- `date_recorded` (TIMESTAMP WITH TIME ZONE) - Date this record was created (default: NOW())
- `notes` (TEXT) - Additional notes about the condition

### Polymorphic Relationship
- **Pattern**: Each health record belongs to either a product_owner OR a special_relationship
- **Constraint**: CHECK constraint ensures exactly one foreign key is populated (not both, not neither)
- **Use Cases**:
  - Track health conditions for product owners themselves
  - Track health conditions for dependents, family members, or related individuals
- **Cascade Behavior**: ON DELETE CASCADE on both foreign keys - deleting either owner removes their health records

### Indexes Created
- `idx_health_product_owner_id` - For finding health records by product owner
- `idx_health_special_relationship_id` - For finding health records by special relationship
- `idx_health_status` - For filtering health records by status
- `idx_health_date_of_diagnosis` - For date-based queries and sorting
- `idx_health_date_recorded` - For tracking when records were added

## Vulnerabilities Table Migration

### Overview
This migration creates a vulnerabilities table for tracking vulnerabilities, disabilities, and accessibility requirements. Uses a polymorphic relationship pattern where vulnerability records can be associated with either product owners OR special relationships (but not both).

### Files
- `add_vulnerabilities_table.sql` - Forward migration (creates vulnerabilities table)
- `rollback_add_vulnerabilities_table.sql` - Rollback migration (removes vulnerabilities table)
- `test_vulnerabilities_migration.sql` - Comprehensive test script

### Schema

**vulnerabilities table:**
- `id` (BIGSERIAL, PRIMARY KEY) - Unique vulnerability record identifier
- `created_at` (TIMESTAMP WITH TIME ZONE) - Record creation timestamp
- `product_owner_id` (BIGINT, NULLABLE) - Foreign key to product_owners table
- `special_relationship_id` (BIGINT, NULLABLE) - Foreign key to special_relationships table
- `description` (TEXT) - Description of the vulnerability or disability
- `adjustments` (TEXT) - Required adjustments or accommodations
- `diagnosed` (BOOLEAN) - Whether the vulnerability has been formally diagnosed (default: false)
- `date_recorded` (TIMESTAMP WITH TIME ZONE) - Date this record was created (default: NOW())
- `status` (TEXT) - Current status (e.g., active, managed, resolved)
- `notes` (TEXT) - Additional notes about the vulnerability

### Polymorphic Relationship
- **Pattern**: Each vulnerability record belongs to either a product_owner OR a special_relationship
- **Constraint**: CHECK constraint ensures exactly one foreign key is populated (not both, not neither)
- **Use Cases**:
  - Track vulnerabilities for product owners themselves
  - Track vulnerabilities for dependents, family members, or related individuals
  - Support accessibility planning and compliance requirements
- **Cascade Behavior**: ON DELETE CASCADE on both foreign keys - deleting either owner removes their vulnerability records

### Indexes Created
- `idx_vulnerabilities_product_owner_id` - For finding vulnerability records by product owner
- `idx_vulnerabilities_special_relationship_id` - For finding vulnerability records by special relationship
- `idx_vulnerabilities_status` - For filtering vulnerability records by status
- `idx_vulnerabilities_diagnosed` - For filtering by diagnosis status
- `idx_vulnerabilities_date_recorded` - For tracking when records were added

## Migration History

| Date | Migration | Description | Status |
|------|-----------|-------------|--------|
| 2024-12-01 | `add_product_owners_phase2_fields` | Add Phase 2 fields to product_owners | Completed |
| 2024-12-01 | `add_addresses_table` | Create addresses table with foreign key | Completed |
| 2024-12-01 | `add_special_relationships_table` | Create special_relationships and junction table | Completed |
| 2024-12-01 | `add_health_table` | Create health table for medical records | Completed |
| 2024-12-01 | `add_vulnerabilities_table` | Create vulnerabilities table for accessibility tracking | Pending |

## Best Practices

- **Always backup your database before running migrations**
- Test migrations in a development environment first
- Review the migration script before executing
- Keep migration files in version control
- Document any manual data transformations needed
- Plan rollback strategy before applying migrations

## Troubleshooting

### Migration Fails
- Check database connection
- Verify you have ALTER TABLE permissions
- Check for naming conflicts with existing columns
- Review error messages for specific issues

### Performance Issues
- Indexes are created to optimize query performance
- If table is very large, consider running during low-traffic periods
- Monitor query performance after migration

### Data Issues
- All new fields are nullable to avoid breaking existing records
- No default values are set (except where specified)
- Existing records will have NULL values for new fields
