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

## Risk Assessment Tables Migration

### Overview
This migration creates two tables for tracking financial risk assessments and capacity for loss for product owners. These tables support comprehensive financial planning and compliance requirements.

### Files
- `add_risk_assessment_tables.sql` - Forward migration (creates both tables)
- `rollback_add_risk_assessment_tables.sql` - Rollback migration (removes both tables)
- `test_risk_assessment_tables_migration.sql` - Comprehensive test script

### Schema

**risk_assessments table:**
- `id` (BIGSERIAL, PRIMARY KEY) - Unique risk assessment identifier
- `created_at` (TIMESTAMP WITH TIME ZONE) - Record creation timestamp
- `product_owner_id` (BIGINT, NOT NULL) - Foreign key to product_owners table
- `type` (TEXT) - Assessment type: "FinaMetrica" or "Manual"
- `actual_score` (NUMERIC(5,2)) - Actual risk score (0-100)
- `category_score` (INTEGER) - Risk category score (1-7)
- `risk_group` (TEXT) - Risk group classification (e.g., Conservative, Balanced, Growth)
- `date` (DATE) - Date of assessment
- `status` (TEXT) - Current status (e.g., active, superseded)

**capacity_for_loss table:**
- `id` (BIGSERIAL, PRIMARY KEY) - Unique capacity for loss identifier
- `created_at` (TIMESTAMP WITH TIME ZONE) - Record creation timestamp
- `product_owner_id` (BIGINT, NOT NULL) - Foreign key to product_owners table
- `score` (INTEGER) - Capacity score (1-10)
- `category` (TEXT) - Capacity category (e.g., Low, Medium, High)
- `date_assessed` (DATE) - Date of assessment
- `status` (TEXT) - Current status

### Relationships
- **One-to-Many**: Each product owner can have multiple risk assessments over time
- **One-to-Many**: Each product owner can have multiple capacity for loss assessments
- **Cascade Behavior**: ON DELETE CASCADE - deleting a product owner removes all their assessments

### Score Constraints
- **risk_assessments.actual_score**: Must be between 0 and 100
- **risk_assessments.category_score**: Must be between 1 and 7
- **capacity_for_loss.score**: Must be between 1 and 10

### Indexes Created
**risk_assessments:**
- `idx_risk_assessments_product_owner_id` - For finding assessments by product owner
- `idx_risk_assessments_type` - For filtering by assessment type
- `idx_risk_assessments_date` - For date-based queries and sorting
- `idx_risk_assessments_status` - For filtering by status

**capacity_for_loss:**
- `idx_capacity_for_loss_product_owner_id` - For finding assessments by product owner
- `idx_capacity_for_loss_date_assessed` - For date-based queries
- `idx_capacity_for_loss_status` - For filtering by status

## Client Groups Fields Migration

### Overview
This migration adds compliance tracking and relationship management fields to the client_groups table to support regulatory requirements and ongoing client management.

### Files
- `add_client_groups_fields.sql` - Forward migration (adds fields)
- `rollback_add_client_groups_fields.sql` - Rollback migration (removes fields)
- `test_client_groups_fields_migration.sql` - Comprehensive test script

### New Fields Added

**Compliance Tracking:**
- `ongoing_start` (DATE) - Date when ongoing services commenced
- `client_declaration` (DATE) - Date of client declaration/agreement
- `privacy_declaration` (DATE) - Date of privacy policy acceptance
- `full_fee_agreement` (DATE) - Date of fee agreement signed

**Relationship Management:**
- `last_satisfactory_discussion` (DATE) - Date of last satisfactory client discussion
- `notes` (TEXT) - General notes for client group management

### Indexes Created
- `idx_client_groups_ongoing_start` - For date-based queries
- `idx_client_groups_client_declaration` - For compliance reporting
- `idx_client_groups_privacy_declaration` - For privacy compliance
- `idx_client_groups_full_fee_agreement` - For fee tracking
- `idx_client_groups_last_satisfactory_discussion` - For relationship management queries

### Notes
- All new fields are nullable to support existing records
- Date fields support compliance and regulatory tracking requirements
- Indexes improve query performance for compliance reporting

## Meeting Tables Migration

### Overview
This migration creates tables for tracking expected client meetings (planning) and recording actual meeting occurrences (history). Supports annual meeting planning and comprehensive meeting audit trails.

### Files
- `add_meeting_tables.sql` - Forward migration (creates both tables)
- `rollback_add_meeting_tables.sql` - Rollback migration (removes both tables)
- `test_meeting_tables_migration.sql` - Comprehensive test script

### Schema

**assigned_meetings table:**
- `id` (BIGSERIAL, PRIMARY KEY) - Unique assigned meeting identifier
- `created_at` (TIMESTAMP WITH TIME ZONE) - Record creation timestamp
- `client_group_id` (BIGINT, NOT NULL) - Foreign key to client_groups table
- `meeting_type` (TEXT) - Type of meeting (e.g., "Annual Review", "Quarterly Check-in")
- `expected_month` (INTEGER) - Month when meeting is expected (1-12)
- `status` (TEXT) - Current status
- `notes` (TEXT) - Additional notes

**meeting_history table:**
- `id` (BIGSERIAL, PRIMARY KEY) - Unique meeting history identifier
- `created_at` (TIMESTAMP WITH TIME ZONE) - Record creation timestamp
- `assigned_meeting_id` (BIGINT, NOT NULL) - Foreign key to assigned_meetings table
- `date_booked_for` (DATE) - Date meeting was scheduled for
- `date_actually_held` (DATE) - Date meeting actually occurred
- `status` (TEXT) - Meeting status (e.g., "Completed", "Cancelled", "Rescheduled")
- `year` (INTEGER) - Year of meeting
- `notes` (TEXT) - Additional notes about the meeting

### Relationships
- **One-to-Many**: Each client group can have multiple assigned meetings
- **One-to-Many**: Each assigned meeting can have multiple history records (rescheduling, annual recurrence)
- **Cascade Behavior**: ON DELETE CASCADE - deleting a client group removes all assigned meetings and their history; deleting an assigned meeting removes all its history records

### Constraints
- **assigned_meetings.expected_month**: Must be between 1 and 12 (CHECK constraint)

### Indexes Created
**assigned_meetings:**
- `idx_assigned_meetings_client_group_id` - For finding meetings by client group
- `idx_assigned_meetings_meeting_type` - For filtering by meeting type
- `idx_assigned_meetings_expected_month` - For monthly planning queries
- `idx_assigned_meetings_status` - For filtering by status

**meeting_history:**
- `idx_meeting_history_assigned_meeting_id` - For finding history by assigned meeting
- `idx_meeting_history_date_booked_for` - For date-based queries
- `idx_meeting_history_date_actually_held` - For tracking completed meetings
- `idx_meeting_history_year` - For annual reporting
- `idx_meeting_history_status` - For filtering by status

## Aims and Actions Tables Migration

### Overview
This migration creates tables for tracking client goals/aims (long-term objectives) and actionable tasks. Supports comprehensive client relationship management with goal tracking and task delegation to advisors.

### Files
- `add_aims_actions_tables.sql` - Forward migration (creates both tables)
- `rollback_add_aims_actions_tables.sql` - Rollback migration (removes both tables)
- `test_aims_actions_tables_migration.sql` - Comprehensive test script

### Schema

**aims table:**
- `id` (BIGSERIAL, PRIMARY KEY) - Unique aim identifier
- `created_at` (TIMESTAMP WITH TIME ZONE) - Record creation timestamp
- `client_group_id` (BIGINT, NOT NULL) - Foreign key to client_groups table
- `title` (TEXT) - Title of the aim/goal
- `description` (TEXT) - Detailed description of the aim
- `target_date` (INTEGER) - Target year for achieving the aim
- `focus` (TEXT) - Focus area (e.g., "Retirement", "Education", "Wealth Transfer")
- `status` (TEXT) - Current status (e.g., "Active", "Achieved", "Deferred")
- `notes` (TEXT) - Additional notes

**actions table:**
- `id` (BIGSERIAL, PRIMARY KEY) - Unique action identifier
- `created_at` (TIMESTAMP WITH TIME ZONE) - Record creation timestamp
- `client_group_id` (BIGINT, NOT NULL) - Foreign key to client_groups table
- `title` (TEXT) - Title of the action/task
- `description` (TEXT) - Detailed description of the action
- `assigned_advisor_id` (BIGINT, NULLABLE) - Foreign key to profiles table (can be NULL)
- `due_date` (DATE) - Due date for the action
- `priority` (TEXT) - Priority level (e.g., "High", "Medium", "Low")
- `notes` (TEXT) - Additional notes
- `status` (TEXT) - Current status (e.g., "Pending", "In Progress", "Completed", "Cancelled")

### Relationships
- **One-to-Many**: Each client group can have multiple aims
- **One-to-Many**: Each client group can have multiple actions
- **Optional Assignment**: Actions can optionally be assigned to an advisor (profiles table)
- **Cascade Behavior**:
  - ON DELETE CASCADE on client_groups - deleting a client removes all aims and actions
  - ON DELETE SET NULL on profiles - deleting an advisor keeps the action but removes assignment

### Indexes Created
**aims:**
- `idx_aims_client_group_id` - For finding aims by client group
- `idx_aims_status` - For filtering by status
- `idx_aims_target_date` - For date-based queries and reporting
- `idx_aims_focus` - For filtering by focus area

**actions:**
- `idx_actions_client_group_id` - For finding actions by client group
- `idx_actions_assigned_advisor_id` - For finding actions assigned to specific advisors
- `idx_actions_due_date` - For date-based queries and deadline tracking
- `idx_actions_status` - For filtering by status
- `idx_actions_priority` - For filtering by priority level

## Migration History

| Date | Migration | Description | Status |
|------|-----------|-------------|--------|
| 2024-12-01 | `add_product_owners_phase2_fields` | Add Phase 2 fields to product_owners | Completed |
| 2024-12-01 | `add_addresses_table` | Create addresses table with foreign key | Completed |
| 2024-12-01 | `add_special_relationships_table` | Create special_relationships and junction table | Completed |
| 2024-12-01 | `add_health_table` | Create health table for medical records | Completed |
| 2024-12-01 | `add_vulnerabilities_table` | Create vulnerabilities table for accessibility tracking | Completed |
| 2024-12-01 | `add_risk_assessment_tables` | Create risk_assessments and capacity_for_loss tables | Completed |
| 2024-12-01 | `add_client_groups_fields` | Add compliance and tracking fields to client_groups | Completed |
| 2024-12-01 | `add_meeting_tables` | Create assigned_meetings and meeting_history tables | Completed |
| 2024-12-01 | `add_aims_actions_tables` | Create aims and actions tables | Completed |

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
