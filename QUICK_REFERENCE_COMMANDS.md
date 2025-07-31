# 🚀 **Quick Reference Commands - Kingston's Portal**

## 📋 **Database Connection Test**
```powershell
# Test PostgreSQL connection and verify data
$env:PGPASSWORD = "KingstonApp2024!"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -p 5432 -U kingstons_app -d kingstons_portal -c "SELECT COUNT(*) FROM client_products;"
```

## 📊 **Verify Migration Data**
```powershell
# Check all table row counts
$env:PGPASSWORD = "KingstonApp2024!"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -h localhost -p 5432 -U kingstons_app -d kingstons_portal -c "
SELECT 
    tablename,
    n_tup_ins as rows
FROM pg_stat_user_tables 
WHERE n_tup_ins > 0
ORDER BY n_tup_ins DESC;"
```

## 🔧 **Backend Integration Commands**
```bash
# Install PostgreSQL adapter
pip install psycopg2-binary

# Start backend (from backend/ directory)
python main.py

# Test backend API
curl.exe -X GET http://localhost:8001/api/test-simple
```

## 🌐 **Frontend Testing**
```bash
# Start frontend (from frontend/ directory)
npm start

# Test login API
$body = @{email="admin@admin.com"; password="adminadmin"} | ConvertTo-Json
Invoke-RestMethod -Uri "http://localhost:8001/api/auth/login" -Method POST -Body $body -ContentType "application/json"
```

## 🗄️ **Database Connection String**
```
postgresql://kingstons_app:KingstonApp2024!@localhost:5432/kingstons_portal
```

## 📁 **Key Files Location**
- **Summary:** `MIGRATION_COMPLETION_SUMMARY.md`
- **Migration Scripts:** `migration_scripts/`
- **Data Files:** `migration_scripts/migration_data/`
- **Backend Config:** `backend/app/db/database.py`

## 🎯 **Expected Results**
- **Total Rows:** 4,198
- **Client Products:** 43
- **Activity Log:** 1,036 transactions
- **All Tables:** 21/21 successful 