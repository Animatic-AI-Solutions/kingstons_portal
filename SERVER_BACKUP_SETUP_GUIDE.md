# Kingston's Portal - Database Backup Setup Guide

## Overview
This guide will help you set up automated database backups on the database server (192.168.0.223).

## Files Required
Transfer these files to the database server:
- `database_backup_daily.bat`
- `database_backup_weekly.bat` 
- `database_restore.bat`
- `setup_server_backups.ps1`

## Prerequisites on Database Server

### 1. PostgreSQL Client Tools
Ensure `pg_dump`, `pg_restore`, `psql`, `createdb`, and `dropdb` are installed and accessible in PATH.

**Common installation paths:**
- `C:\Program Files\PostgreSQL\<version>\bin`
- `C:\PostgreSQL\<version>\bin`

**To check if installed:**
```cmd
pg_dump --version
```

### 2. Database Access
Verify the database server has:
- PostgreSQL running on port 5432
- Database: `kingstons_portal`
- User: `kingstons_app` 
- Password: `KingstonApp2024!`

## Installation Steps

### Step 1: Copy Files to Server
1. Copy all 4 files to the database server (192.168.0.223)
2. Place them in a temporary folder (e.g., `C:\temp\backup_scripts\`)

### Step 2: Run Setup Script
1. **Open PowerShell as Administrator** on the database server
2. Navigate to the folder with the scripts
3. Run the setup script:
   ```powershell
   .\setup_server_backups.ps1
   ```

This script will:
- ✅ Create backup directories
- ✅ Set up Windows Task Scheduler jobs
- ✅ Test PostgreSQL connection
- ✅ Create secure authentication (.pgpass file)

### Step 3: Copy Backup Scripts
After running the setup script, copy the .bat files to `C:\Database_Scripts\`:
```cmd
copy database_backup_daily.bat C:\Database_Scripts\
copy database_backup_weekly.bat C:\Database_Scripts\
copy database_restore.bat C:\Database_Scripts\
```

### Step 4: Test Backup System
1. **Test daily backup:**
   ```cmd
   C:\Database_Scripts\database_backup_daily.bat
   ```

2. **Check backup was created:**
   ```cmd
   dir C:\Database_Backups\KingstonsPortal\Daily\
   ```

3. **Test weekly backup:**
   ```cmd
   C:\Database_Scripts\database_backup_weekly.bat
   ```

## Backup Schedule

### Automated Schedule
| Backup Type | Frequency | Time | Retention |
|-------------|-----------|------|-----------|
| Daily | Every day | 2:00 AM | 7 days |
| Weekly | Every Sunday | 3:00 AM | 4 weeks |
| Monthly | First Sunday of month | Automatic | 12 months |

### Manual Backups
You can run backups manually anytime:
```cmd
# Daily backup
C:\Database_Scripts\database_backup_daily.bat

# Weekly backup  
C:\Database_Scripts\database_backup_weekly.bat
```

## Backup Locations

```
C:\Database_Backups\KingstonsPortal\
├── Daily\          # Plain text SQL dumps (7 day retention)
├── Weekly\         # Compressed custom format (28 day retention)  
├── Monthly\        # Compressed custom format (365 day retention)
├── backup_log.txt  # Success/failure log
└── restore_log.txt # Restore operation log
```

## Restore Procedures

### List Available Backups
```cmd
C:\Database_Scripts\database_restore.bat
```
This will show available backups if no file is specified.

### Restore from Backup
```cmd
C:\Database_Scripts\database_restore.bat "C:\Database_Backups\KingstonsPortal\Daily\backup_file.sql"
```

**⚠️ WARNING:** Restore completely replaces the existing database!

### Safety Features
- **Safety backup:** Automatically created before restore
- **Confirmation required:** Must type "YES" to proceed
- **Connection termination:** Existing connections are dropped safely
- **Full logging:** All operations logged to `restore_log.txt`

## Monitoring & Maintenance

### Check Backup Status
1. **View logs:**
   ```cmd
   type C:\Database_Backups\KingstonsPortal\backup_log.txt
   ```

2. **Check scheduled tasks:**
   - Open Task Scheduler
   - Look for tasks: `KingstonsPortal-DailyBackup` and `KingstonsPortal-WeeklyBackup`

3. **Verify recent backups:**
   ```cmd
   dir C:\Database_Backups\KingstonsPortal\Daily\ /od
   dir C:\Database_Backups\KingstonsPortal\Weekly\ /od
   ```

### Storage Management
- **Daily backups:** Automatically deleted after 7 days
- **Weekly backups:** Automatically deleted after 28 days  
- **Monthly backups:** Automatically deleted after 365 days

### Troubleshooting

#### Common Issues

**1. "pg_dump not found"**
- Add PostgreSQL bin directory to Windows PATH
- Or modify scripts with full path to pg_dump

**2. "Authentication failed"** 
- Check database credentials in .env file
- Verify .pgpass file was created correctly
- Test connection: `psql -h localhost -U kingstons_app -d kingstons_portal`

**3. "Permission denied"**
- Run scripts as Administrator
- Check backup directory permissions

**4. Scheduled tasks not running**
- Verify tasks exist in Task Scheduler
- Check task history for errors
- Ensure SYSTEM account has necessary permissions

#### Log Analysis
```cmd
# View recent backup attempts
findstr /C:"backup" C:\Database_Backups\KingstonsPortal\backup_log.txt

# Check for failures
findstr /C:"FAILED" C:\Database_Backups\KingstonsPortal\backup_log.txt
```

## Security Considerations

### Password Security
- Passwords are stored in `.pgpass` file with restricted permissions
- Consider using Windows service accounts for production
- Regularly rotate database passwords and update scripts

### File Permissions  
- Backup directories should have restricted access
- Only necessary users should have read access to backups
- Consider encrypting backup files for sensitive data

### Network Security
- Backup server should be on secure network
- Consider off-site backup replication
- Implement backup integrity checks

## Recovery Testing

### Regular Testing Schedule
- **Monthly:** Test restore procedure on development copy
- **Quarterly:** Full disaster recovery simulation  
- **Annual:** Review and update backup strategy

### Test Restore Procedure
1. Create test database: `createdb test_restore`
2. Restore to test database
3. Verify data integrity
4. Document any issues found

## Monitoring Alerts

Consider implementing:
- **Email alerts** for backup failures
- **Disk space monitoring** for backup directories
- **Performance impact monitoring** during backup windows

---

## Quick Reference

### Key Commands
```cmd
# Manual daily backup
C:\Database_Scripts\database_backup_daily.bat

# Manual weekly backup  
C:\Database_Scripts\database_backup_weekly.bat

# List backups for restore
C:\Database_Scripts\database_restore.bat

# Check backup logs
type C:\Database_Backups\KingstonsPortal\backup_log.txt
```

### Important Paths
- **Scripts:** `C:\Database_Scripts\`
- **Backups:** `C:\Database_Backups\KingstonsPortal\`
- **Logs:** `C:\Database_Backups\KingstonsPortal\backup_log.txt`
- **Authentication:** `%APPDATA%\.pgpass`

---

**For questions or issues, refer to this guide or check the backup logs for specific error messages.**