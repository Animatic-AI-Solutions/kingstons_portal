# Supabase Dashboard Export Guide

Since we're having connectivity issues with the command-line tools, let's use the Supabase Dashboard to export your data.

## 🌐 **Option 1: Supabase Dashboard Export (Recommended)**

### **Step 1: Access Supabase Dashboard**
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in to your account
3. Select your **Kingston's Portal** project

### **Step 2: Export Each Table**
1. Click on **"Table Editor"** in the left sidebar
2. For each table, follow these steps:

#### **Tables to Export (in this order):**
```
1. profiles
2. authentication
3. session
4. available_providers
5. client_groups
6. product_owners
7. available_funds
8. available_portfolios
9. client_group_product_owners
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

#### **For Each Table:**
1. Click on the table name
2. Click the **"Export"** button (usually in the top-right)
3. Choose **"CSV"** format
4. Download the file
5. Save it as `[tablename]_data.csv` in a folder called `migration_data`

### **Step 3: Organize Files**
Create this folder structure:
```
migration_data/
├── profiles_data.csv
├── authentication_data.csv
├── session_data.csv
├── available_providers_data.csv
├── client_groups_data.csv
├── product_owners_data.csv
├── available_funds_data.csv
├── available_portfolios_data.csv
├── client_group_product_owners_data.csv
├── template_portfolio_generations_data.csv
├── available_portfolio_funds_data.csv
├── portfolios_data.csv
├── client_products_data.csv
├── product_owner_products_data.csv
├── portfolio_funds_data.csv
├── portfolio_fund_valuations_data.csv
├── portfolio_valuations_data.csv
├── portfolio_fund_irr_values_data.csv
├── portfolio_irr_values_data.csv
├── holding_activity_log_data.csv
├── provider_switch_log_data.csv
└── user_page_presence_data.csv
```

## 🔧 **Option 2: Fix Network Connectivity**

If you prefer to use the command-line approach, try these fixes:

### **A. Change DNS Settings**
```powershell
# Set DNS to Google's servers
netsh interface ip set dns "Wi-Fi" static 8.8.8.8
netsh interface ip add dns "Wi-Fi" 8.8.4.4 index=2
```

### **B. Check Firewall**
```powershell
# Check if Windows Firewall is blocking
Get-NetFirewallRule -DisplayName "*PostgreSQL*"
```

### **C. Try VPN/Different Network**
- Connect to a different network
- Use mobile hotspot
- Try from a different location

## 📋 **Next Steps**

Once you have the CSV files:
1. Let me know which method you used
2. I'll create import scripts to load the data into your local PostgreSQL
3. We'll verify the data was imported correctly

## 🚀 **Run the Connection Test**

First, let's diagnose the network issue:

```powershell
.\migration_scripts\15_test_supabase_connection.ps1
```

This will help us understand what's causing the connectivity problem.

**Which approach would you like to try first?**
- 🌐 **Dashboard Export** (easier, always works)
- 🔧 **Fix Connectivity** (more technical, but gives SQL dumps)