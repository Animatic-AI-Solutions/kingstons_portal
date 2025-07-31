# Manual SQL Export from Supabase Dashboard

## 🎯 **Export Process**

### **Step 1: Access Supabase Dashboard**
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your **Kingston's Portal** project
4. Click on **"Table Editor"** in the left sidebar

### **Step 2: Export Tables in Dependency Order**

**IMPORTANT:** Export in this exact order to avoid foreign key conflicts during import:

```
1.  profiles
2.  authentication
3.  session
4.  available_providers
5.  client_groups
6.  product_owners
7.  available_funds
8.  available_portfolios
9.  client_group_product_owners
10. template_portfolio_generations
11. available_portfolio_funds
12. portfolios
13. client_products
14. product_owner_products
15. portfolio_funds
16. portfolio_fund_valuations
17. portfolio_valuations
18. portfolio_fund_irr_values
19. portfolio_irr_values
20. holding_activity_log
21. provider_switch_log
22. user_page_presence
```

### **Step 3: For Each Table**

1. **Click on the table name** in the Table Editor
2. **Select all rows** (if there's a "Select All" option)
3. **Look for Export/Download button** (usually top-right corner)
4. **Choose "SQL" format** (not CSV)
5. **Download the file**
6. **Rename the file** to: `[tablename]_data.sql`
7. **Save in folder:** `migration_data/`

### **Step 4: File Organization**

Create this structure in your project:
```
kingstons_portal/
└── migration_data/
    ├── profiles_data.sql
    ├── authentication_data.sql
    ├── session_data.sql
    ├── available_providers_data.sql
    ├── client_groups_data.sql
    ├── product_owners_data.sql
    ├── available_funds_data.sql
    ├── available_portfolios_data.sql
    ├── client_group_product_owners_data.sql
    ├── template_portfolio_generations_data.sql
    ├── available_portfolio_funds_data.sql
    ├── portfolios_data.sql
    ├── client_products_data.sql
    ├── product_owner_products_data.sql
    ├── portfolio_funds_data.sql
    ├── portfolio_fund_valuations_data.sql
    ├── portfolio_valuations_data.sql
    ├── portfolio_fund_irr_values_data.sql
    ├── portfolio_irr_values_data.sql
    ├── holding_activity_log_data.sql
    ├── provider_switch_log_data.sql
    └── user_page_presence_data.sql
```

## 📋 **Tips for Export**

### **If SQL Export Not Available:**
Some Supabase interfaces might only show CSV export. If that's the case:
1. Export as **CSV**
2. Let me know - I'll create a script to convert CSV to SQL INSERT statements

### **Check File Contents:**
Each SQL file should contain INSERT statements like:
```sql
INSERT INTO table_name (column1, column2, column3) VALUES 
('value1', 'value2', 'value3'),
('value4', 'value5', 'value6');
```

### **Large Tables:**
If any table has many rows and export times out:
1. Try exporting in smaller batches
2. Or let me know which tables are large - I'll create a specialized import strategy

## 🚀 **After Export Complete**

Once you have all 22 SQL files:
1. **Let me know when done** - I'll create the import script
2. **Check file sizes** - empty files might indicate export issues
3. **Verify critical tables** like `profiles`, `client_groups`, `portfolios` have data

## ⚡ **Quick Check Script**

I'll create a script to verify your exports once you're done.

**Start with the first few tables and let me know how the export process goes!** 🎯