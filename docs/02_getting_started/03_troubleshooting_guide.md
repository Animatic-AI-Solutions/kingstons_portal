---
title: "Troubleshooting Guide"
tags: ["development", "debugging", "troubleshooting", "common_issues"]
related_docs:
  - "./03_testing_strategy.md"
  - "../2_getting_started/02_running_the_application.md"
  - "../6_advanced/03_deployment_process.md"
---
# Troubleshooting Guide

This comprehensive guide helps diagnose and resolve common issues in Kingston's Portal development and production environments.

## 🚀 Quick Emergency Triage (First 5 Minutes)

### 1. System Status Check
```bash
# Backend running?
curl http://localhost:8001/docs

# Frontend running?
curl http://localhost:3000

# Database connectivity
python -c "import asyncpg; import os; print('DATABASE_URL configured' if os.getenv('DATABASE_URL') else 'Missing DATABASE_URL')"
```

### 2. Authentication Quick Check
```bash
# Check configuration
grep -r "JWT_SECRET\|DATABASE_URL\|CORS" backend/.env backend/main.py

# Test login endpoint
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

### 3. Database Emergency Verification
```bash
# Test connection
python -c "
import os
from sqlalchemy import create_engine
engine = create_engine(os.getenv('DATABASE_URL'))
print('✅ Database connected' if engine.connect() else '❌ Connection failed')
"
```

## 🎯 Common Issue Patterns & Solutions

### Authentication Issues
**Symptoms:** Login fails, 401 errors, CORS errors, cookie issues

**Common Causes:**
- Missing or incorrect JWT_SECRET in `.env`
- CORS misconfiguration
- HttpOnly cookie settings
- AuthContext state management issues

**Debugging Steps:**
```bash
# 1. Verify environment variables
cd backend && python -c "
import os
from dotenv import load_dotenv
load_dotenv()
print('JWT_SECRET:', 'SET' if os.getenv('JWT_SECRET') else 'MISSING')
print('DATABASE_URL:', 'SET' if os.getenv('DATABASE_URL') else 'MISSING')
"

# 2. Check CORS configuration
grep -n "CORS\|cors" backend/main.py

# 3. Test httpOnly cookie settings
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  -c cookies.txt -v
```

**Solutions:**
1. Ensure `JWT_SECRET` is set in `backend/.env`
2. Verify CORS configuration allows `http://localhost:3000`
3. Check that httpOnly cookies are properly configured
4. Verify AuthContext.tsx is properly wrapped around the app

### Database Connectivity Issues
**Symptoms:** Connection refused, query failures, data not loading

**Common Causes:**
- PostgreSQL service not running
- Incorrect DATABASE_URL format
- Network connectivity issues
- Database permissions problems

**Debugging Steps:**
```bash
# 1. Check PostgreSQL service status
# Windows:
sc query postgresql-x64-14
# Linux/Mac:
brew services list | grep postgres

# 2. Verify DATABASE_URL format
python -c "
import os
from urllib.parse import urlparse
url = os.getenv('DATABASE_URL')
if url:
    parsed = urlparse(url)
    print(f'Host: {parsed.hostname}')
    print(f'Port: {parsed.port}')
    print(f'Database: {parsed.path[1:]}')
    print(f'User: {parsed.username}')
else:
    print('DATABASE_URL not set')
"

# 3. Test direct connection
psql $DATABASE_URL -c "SELECT version();"
```

**Solutions:**
1. Start PostgreSQL service
2. Verify DATABASE_URL format: `postgresql://user:password@host:port/database`
3. Check database user permissions
4. Ensure database exists and is accessible

### Performance Issues
**Symptoms:** Slow dashboard, analytics timeout, UI freezing

**Common Causes:**
- Analytics views not populated
- React Query cache issues
- Database query performance
- Network bottlenecks

**Debugging Steps:**
```bash
# 1. Check analytics views
psql $DATABASE_URL -c "
SELECT 'company_irr_cache' as table_name, COUNT(*) as rows FROM company_irr_cache
UNION ALL
SELECT 'analytics_dashboard_summary', COUNT(*) FROM analytics_dashboard_summary;
"

# 2. Check React Query cache configuration
# Open browser DevTools → React Query DevTools

# 3. Analyze slow queries
psql $DATABASE_URL -c "
EXPLAIN ANALYZE SELECT * FROM analytics_dashboard_summary LIMIT 1;
"
```

**Solutions:**
1. Refresh analytics cache: `POST /api/analytics/company/irr/refresh-background`
2. Check React Query cache settings (5-minute default)
3. Optimize database queries with indexes
4. Monitor network waterfall in browser DevTools

### Frontend Development Issues
**Symptoms:** Vite dev server won't start, build failures, component errors

**Common Causes:**
- Node modules corruption
- Port conflicts
- TypeScript compilation errors
- Missing dependencies

**Debugging Steps:**
```bash
# 1. Check Node.js and npm versions
node --version
npm --version

# 2. Clean install dependencies
cd frontend
rm -rf node_modules package-lock.json
npm install

# 3. Check for port conflicts
netstat -ano | findstr :3000
# Linux/Mac: lsof -i :3000

# 4. Run TypeScript check
npx tsc --noEmit
```

**Solutions:**
1. Use Node.js LTS version (recommended in package.json)
2. Clear node_modules and reinstall
3. Change port in vite.config.js if needed
4. Fix TypeScript errors before running dev server

### Backend Development Issues
**Symptoms:** FastAPI server won't start, import errors, dependency issues

**Common Causes:**
- Virtual environment not activated
- Missing Python dependencies
- Python version incompatibility
- Environment variable issues

**Debugging Steps:**
```bash
# 1. Check Python version and virtual env
python --version
which python
pip list | grep fastapi

# 2. Verify dependencies
cd backend
pip check

# 3. Test basic imports
python -c "
import fastapi
import asyncpg
import uvicorn
print('All core dependencies imported successfully')
"

# 4. Check environment loading
python -c "
from dotenv import load_dotenv
import os
load_dotenv()
print('Environment variables loaded')
"
```

**Solutions:**
1. Activate virtual environment: `source venv/bin/activate` (Linux/Mac) or `.\venv\Scripts\Activate.ps1` (Windows)
2. Install/update dependencies: `pip install -r requirements.txt`
3. Use Python 3.9+ as specified in documentation
4. Verify `.env` file exists and is properly formatted

### Testing Issues
**Symptoms:** Tests failing, coverage issues, Jest/Pytest errors

**Common Issues & Solutions:**

**Jest ts-jest Warnings (Expected):**
```
ts-jest[ts-jest-transformer] (WARN) Define `ts-jest` config under `globals` is deprecated.
```
- ✅ **These warnings are expected and harmless** - see [Testing Strategy](./03_testing_strategy.md)
- All tests should still pass despite warnings
- Coverage thresholds (70%) should still be met

**Test Database Issues:**
```bash
# Ensure test database is separate from development
export DATABASE_URL_TEST="postgresql://user:password@host:port/test_database"
pytest
```

**Coverage Threshold Failures:**
```bash
# Check current coverage
npm run test:coverage

# Focus on specific files
npm test -- --coverage --collectCoverageFrom="src/path/to/file.ts"
```

## 🛠️ Environment-Specific Debugging

### Development Environment
**Key Configuration Files:**
- `backend/.env` - Database and JWT configuration
- `frontend/vite.config.js` - Dev server and proxy settings
- `frontend/package.json` - Dependencies and scripts

**Common Development Issues:**
1. **API Proxy Not Working**: Check Vite proxy configuration points to `:8001`
2. **Hot Reload Issues**: Restart both frontend and backend servers
3. **CORS Errors**: Verify backend CORS allows `localhost:3000`

### Production Environment
**Key Files:**
- `deploy_minimal.ps1` - Automated deployment script
- `backend/.env` - Production environment variables
- `C:\inetpub\wwwroot\OfficeIntranet` - Frontend build output

**Production-Specific Issues:**
1. **IIS Configuration**: Check web.config for URL rewriting
2. **Service Management**: Verify FastAPI service running via NSSM
3. **Firewall Rules**: Ensure port 8001 is open for API calls

## 🔍 Advanced Debugging Techniques

### Database Query Analysis
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Analyze specific query performance
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM analytics_dashboard_summary;
```

### Network Debugging
```bash
# Test API connectivity
curl -v http://localhost:8001/api/health

# Check DNS resolution (production)
nslookup intranet.kingston.local

# Monitor network traffic
# Use browser DevTools Network tab for frontend debugging
```

### Memory and Performance Profiling
```bash
# Backend memory usage
python -c "
import psutil
import os
process = psutil.Process(os.getpid())
print(f'Memory usage: {process.memory_info().rss / 1024 / 1024:.2f} MB')
"

# Frontend bundle analysis
cd frontend
npm run build
# Analyze build output for large bundles
```

## 📊 Monitoring and Logging

### Backend Logs
```bash
# Check FastAPI logs (development)
# Logs output to console when running with --reload

# Production logs (Windows service)
# Check Event Viewer → Windows Logs → Application
```

### Frontend Debugging
```javascript
// Enable React Query DevTools in development
// Already configured in App.tsx

// Check console for errors
console.log('Environment:', process.env.NODE_ENV);
console.log('API Base URL:', getApiBaseUrl());
```

### Database Monitoring
```sql
-- Active connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- Table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(tablename::text)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::text) DESC;
```

## 🚨 Emergency Recovery Procedures

### System-Wide Failure
1. **Stop all services** immediately
2. **Check logs** for error details
3. **Restore from backup** if data corruption suspected
4. **Restart services** in order: Database → Backend → Frontend

### Authentication System Lockout
```bash
# Reset authentication (if admin access lost)
psql $DATABASE_URL -c "
UPDATE users SET password_hash = 'reset_hash' WHERE username = 'admin';
"
# Then use application to reset password properly
```

### Database Recovery
```bash
# Emergency database backup
pg_dump $DATABASE_URL > emergency_backup.sql

# Restore from backup
psql $DATABASE_URL < latest_backup.sql
```

## 📝 When to Escalate

**Escalate immediately if:**
- Data corruption suspected
- Security breach indicators
- System-wide performance degradation
- Multiple component failures

**Document for future reference:**
- New error patterns encountered
- Solutions that worked
- Configuration changes made
- Performance optimizations applied

## 💡 Prevention Best Practices

1. **Regular Health Checks**: Use the quick triage steps daily
2. **Monitor Logs**: Check for warnings and errors regularly
3. **Test Deployments**: Use staging environment for major changes
4. **Backup Strategy**: Regular database backups with verified restore procedures
5. **Documentation**: Update this guide when new issues are discovered

This troubleshooting guide should be your first resource when encountering issues. For complex problems, follow the systematic debugging approach and document solutions for future reference.