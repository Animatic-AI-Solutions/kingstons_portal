# DBeaver Setup Guide for Kingston's Portal Migration

## 1. Download and Install DBeaver

1. **Download DBeaver Community Edition**:
   - Visit: https://dbeaver.io/download/
   - Download "DBeaver Community" for Windows
   - Install with default settings

## 2. Create PostgreSQL Connection

### Connection Settings:
```
Host: localhost (or 192.168.0.223 if on different server)
Port: 5432
Database: kingstons_portal
Username: kingstons_app
Password: KingstonApp2024!
```

### Step-by-Step Connection:
1. Open DBeaver
2. Click "New Database Connection" (plug icon)
3. Select "PostgreSQL" 
4. Enter connection details above
5. Click "Test Connection" to verify
6. Click "Finish"

## 3. Essential DBeaver Configuration

### 3.1 Performance Settings
1. Go to **Window > Preferences > DBeaver > Connections**
2. Set these values:
   - Connection timeout: 30 seconds
   - Keep-alive interval: 600 seconds
   - Max connections per datasource: 10

### 3.2 SQL Editor Settings
1. Go to **Window > Preferences > DBeaver > SQL Editor**
2. Configure:
   - Auto-completion: Enable
   - Auto-save: Every 30 seconds
   - Show row numbers: Enable
   - Word wrap: Enable

### 3.3 Data Viewer Settings
1. Go to **Window > Preferences > DBeaver > Data Viewer**
2. Set:
   - Max rows to fetch: 10,000
   - Show nulls as: [NULL]
   - Show boolean as: true/false

## 4. Essential DBeaver Features for Migration

### 4.1 Schema Browser
- **Location**: Left panel under connection
- **Usage**: Navigate tables, views, functions
- **Tip**: Right-click objects for context menu options

### 4.2 SQL Console
- **Access**: Right-click connection > SQL Editor > New SQL Console
- **Usage**: Execute migration scripts and queries
- **Tip**: Use Ctrl+Enter to execute current statement

### 4.3 Data Export/Import
- **Export**: Right-click table > Export Data
- **Import**: Right-click table > Import Data
- **Formats**: CSV, SQL, JSON, Excel

### 4.4 Visual Query Builder
- **Access**: Right-click table > Generate SQL > SELECT
- **Usage**: Build complex queries visually
- **Tip**: Great for testing views and joins

## 5. Migration-Specific DBeaver Tasks

### 5.1 Schema Comparison
1. Install "Database Compare" extension
2. Use for comparing Supabase vs Local schemas
3. Generate migration scripts automatically

### 5.2 Backup and Restore
```sql
-- Create backup
pg_dump -h localhost -U kingstons_app -d kingstons_portal > backup.sql

-- Restore backup
psql -h localhost -U kingstons_app -d kingstons_portal < backup.sql
```

### 5.3 Performance Monitoring
1. Use **Statistics** tab on tables
2. Monitor **Sessions** for active connections
3. Check **Locks** during migration

## 6. Useful DBeaver Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Enter | Execute current SQL statement |
| Ctrl+Shift+Enter | Execute all statements |
| Ctrl+Space | Auto-completion |
| F4 | Edit data in table |
| Ctrl+F | Find/Replace |
| Ctrl+Shift+F | Format SQL |

## 7. Security Best Practices

### 7.1 Connection Security
- Use SSL if connecting remotely
- Store passwords in DBeaver's secure storage
- Limit connection privileges to necessary schemas only

### 7.2 Access Control
- Create read-only connections for reporting
- Use separate admin connection for schema changes
- Regular password rotation

## 8. Troubleshooting Common Issues

### Connection Refused
```
Error: Connection refused
Solution: Check PostgreSQL service is running
Command: services.msc > postgresql-kingston
```

### Authentication Failed
```
Error: password authentication failed
Solution: Verify user exists and password is correct
Command: psql -U postgres -c "\du"
```

### Permission Denied
```
Error: permission denied for table
Solution: Grant proper permissions
Command: GRANT ALL ON ALL TABLES IN SCHEMA public TO kingstons_app;
```

## 9. Migration Workflow in DBeaver

### Pre-Migration Checklist:
- [ ] Connection to local PostgreSQL established
- [ ] Schema browser shows empty database
- [ ] SQL console working
- [ ] Backup location configured

### During Migration:
- [ ] Execute schema creation scripts
- [ ] Import data using DBeaver import wizard
- [ ] Verify table row counts match Supabase
- [ ] Test all views and functions
- [ ] Check indexes and constraints

### Post-Migration:
- [ ] Performance monitoring enabled
- [ ] Backup schedule configured
- [ ] User access verified
- [ ] Documentation updated

This setup will provide you with a robust database management environment for the migration and ongoing maintenance of Kingston's Portal. 