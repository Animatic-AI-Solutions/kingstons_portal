# Supabase Data Export Guide

## Overview
This guide will help you export all your data from Supabase so we can import it into your local PostgreSQL database.

## Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Access Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Log into your account
3. Select your Kingston's Portal project

### Step 2: Export Each Table
For each of the 22 tables, you'll need to export the data:

**Tables to Export (in this order):**
1. `profiles`
2. `authentication` 
3. `session`
4. `available_providers`
5. `client_groups`
6. `product_owners`
7. `available_funds`
8. `available_portfolios`
9. `client_group_product_owners`
10. `template_portfolio_generations`
11. `available_portfolio_funds`
12. `portfolios`
13. `client_products`
14. `product_owner_products`
15. `portfolio_funds`
16. `portfolio_fund_valuations`
17. `portfolio_valuations`
18. `portfolio_fund_irr_values`
19. `portfolio_irr_values`
20. `holding_activity_log`
21. `provider_switch_log`
22. `user_page_presence`

### Step 3: Export Process for Each Table
1. **Go to Table Editor** in Supabase dashboard
2. **Select the table** from the list
3. **Click the "..." menu** (three dots) in the top right
4. **Select "Download as CSV"**
5. **Save the file** as `tablename.csv` (e.g., `profiles.csv`)

### Step 4: Organize Export Files
Create a folder structure like this:
```
migration_data/
├── profiles.csv
├── authentication.csv
├── session.csv
├── available_providers.csv
├── client_groups.csv
├── product_owners.csv
├── available_funds.csv
├── available_portfolios.csv
├── client_group_product_owners.csv
├── template_portfolio_generations.csv
├── available_portfolio_funds.csv
├── portfolios.csv
├── client_products.csv
├── product_owner_products.csv
├── portfolio_funds.csv
├── portfolio_fund_valuations.csv
├── portfolio_valuations.csv
├── portfolio_fund_irr_values.csv
├── portfolio_irr_values.csv
├── holding_activity_log.csv
├── provider_switch_log.csv
└── user_page_presence.csv
```

## Method 2: Using SQL Dump (Advanced)

If you have direct PostgreSQL access to your Supabase database:

### Step 1: Get Connection Details
1. In Supabase Dashboard → Settings → Database
2. Copy the connection string

### Step 2: Create Full Dump
```bash
pg_dump "postgresql://postgres:[password]@[host]:[port]/postgres" \
  --schema=public \
  --data-only \
  --inserts \
  --file=supabase_data_dump.sql
```

### Step 3: Create Table-Specific Dumps
```bash
# Export specific tables
pg_dump "postgresql://postgres:[password]@[host]:[port]/postgres" \
  --schema=public \
  --data-only \
  --inserts \
  --table=profiles \
  --table=authentication \
  --table=session \
  --table=available_providers \
  --table=client_groups \
  --table=product_owners \
  --table=available_funds \
  --table=available_portfolios \
  --table=client_group_product_owners \
  --table=template_portfolio_generations \
  --table=available_portfolio_funds \
  --table=portfolios \
  --table=client_products \
  --table=product_owner_products \
  --table=portfolio_funds \
  --table=portfolio_fund_valuations \
  --table=portfolio_valuations \
  --table=portfolio_fund_irr_values \
  --table=portfolio_irr_values \
  --table=holding_activity_log \
  --table=provider_switch_log \
  --table=user_page_presence \
  --file=kingston_portal_data.sql
```

## Method 3: Using Supabase API (Programmatic)

If you prefer a programmatic approach, I can create a Python script that uses your Supabase API to export all data.

## Data Validation Checklist

After exporting, verify you have data for these critical tables:
- [ ] `client_groups` - Your main clients
- [ ] `client_products` - Financial products
- [ ] `available_providers` - Provider information
- [ ] `available_funds` - Fund catalog
- [ ] `portfolios` - Portfolio instances
- [ ] `portfolio_funds` - Fund holdings
- [ ] `portfolio_valuations` - Valuation history
- [ ] `portfolio_irr_values` - IRR calculations

## Next Steps

Once you have exported your data:
1. ✅ Verify all CSV files are present
2. ✅ Check file sizes (empty tables will have small files)
3. ✅ Notify me when export is complete
4. 🔄 We'll create import scripts for PostgreSQL
5. 🔄 Test the data migration
6. 🔄 Update your backend code

## Troubleshooting

### Large Tables
If you have very large tables (>10,000 rows):
- Export in smaller chunks using date ranges
- Use the SQL dump method instead of CSV
- Consider using pagination in API exports

### Special Characters
- Ensure CSV exports handle special characters correctly
- Use UTF-8 encoding for all exports
- Check for any data truncation in large text fields

### Timestamps
- Verify timezone handling in exports
- PostgreSQL expects UTC timestamps
- Check date/time format consistency

Let me know which export method you'd prefer to use!