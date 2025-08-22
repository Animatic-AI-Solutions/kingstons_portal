# Kingston's Portal Debugging Quick Start Guide

## 🚀 Emergency Debugging Commands

```bash
# Start interactive debugging session
python debugging_agent.py --interactive

# Analyze specific issue
python debugging_agent.py --issue "Login form not working" --component auth --severity high

# Quick specialized debugging
python debugging_agent.py --auth           # Authentication issues
python debugging_agent.py --database       # Database connectivity
python debugging_agent.py --performance    # Performance & analytics
```

## 🔥 Critical Issue Triage (First 5 Minutes)

### 1. System Status Check
```bash
# Backend running?
curl http://localhost:8001/docs

# Frontend running?
curl http://localhost:3000

# Database connectivity - Test with direct connection
python -c "import asyncpg; import os; print('DATABASE_URL configured' if os.getenv('DATABASE_URL') else 'Missing DATABASE_URL')"
```

### 2. Authentication Quick Fix
```bash
# Check configuration
grep -r "JWT_SECRET\|DATABASE_URL\|CORS" backend/.env backend/main.py

# Test login endpoint
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'
```

### 3. Database Emergency Check
```bash
# Test connection
python -c "
import os
from sqlalchemy import create_engine
engine = create_engine(os.getenv('DATABASE_URL'))
print('✅ Database connected' if engine.connect() else '❌ Connection failed')
"
```

## 🎯 Common Issue Patterns & Quick Fixes

### Authentication Issues
**Symptoms:** Login fails, 401 errors, CORS errors
```bash
# Quick diagnostic
python debugging_agent.py --auth

# Manual checks
1. Verify backend/.env has JWT_SECRET and DATABASE_URL
2. Check CORS configuration in backend/main.py
3. Test httpOnly cookie settings
4. Verify AuthContext.tsx state management
```

### Database Connectivity
**Symptoms:** Connection refused, query failures, data not loading
```bash
# Quick diagnostic
python debugging_agent.py --database

# Manual checks
1. PostgreSQL service running?
2. DATABASE_URL format correct?
3. Schema migrations applied?
4. Foreign key constraints intact?
```

### Performance Issues
**Symptoms:** Slow dashboard, analytics timeout, UI freezing
```bash
# Quick diagnostic
python debugging_agent.py --performance

# Manual checks
1. Analytics views populated? (company_irr_cache)
2. React Query cache configuration
3. Database query performance
4. Network waterfall analysis
```

### Portfolio Workflow Issues
**Symptoms:** Creation fails, data sync problems, cascade errors
```bash
# Quick diagnostic
python debugging_agent.py --issue "Portfolio workflow failing" --component workflow

# Manual checks
1. 5-level hierarchy integrity
2. Transaction rollback mechanisms
3. Activity log entries
4. Business logic validation
```

## 🔍 Systematic Investigation Process (SPARC)

### Specification (Define the Problem)
```bash
# Describe issue clearly
python debugging_agent.py --issue "Specific description of what's failing"

# Include context
- What user action triggered it?
- What was expected vs actual behavior?
- When did it start happening?
- Which environment? (dev/prod)
```

### Pseudocode (Plan Investigation)
```bash
# Interactive session for step-by-step analysis
python debugging_agent.py --interactive

# Follow generated investigation plan
1. System status verification
2. Component-specific analysis
3. Data flow tracing
4. Error reproduction
```

### Architecture (Identify Components)
The debugging agent automatically identifies affected components:
- **Frontend:** React components, hooks, services, context
- **Backend:** FastAPI routes, models, services, database
- **Database:** Tables, views, constraints, relationships
- **Auth:** JWT, cookies, CORS, security middleware

### Refinement (Execute Investigation)
```bash
# Use specialized debugging modes
python debugging_agent.py --auth      # Auth flow analysis
python debugging_agent.py --database  # DB connectivity check
python debugging_agent.py --performance # Performance profiling
```

### Completion (Verify Solution)
```bash
# Test fix with minimal reproduction case
# Update relevant documentation
# Commit with detailed message using 'finish commit' workflow
```

## 🛠️ Development Environment Debugging

### Backend Development Issues
```bash
# FastAPI server not starting
uvicorn main:app --reload --host 127.0.0.1 --port 8001

# Dependencies issues
pip install -r requirements.txt

# Database connection verification
python -c "from app.db.database import get_db; print('Database connection OK')"

# Run tests
pytest
```

### Frontend Development Issues
```bash
# Vite dev server not starting
cd frontend && npm start

# Dependencies issues  
npm install

# Build issues
npm run build

# Test failures
npm run test:coverage
```

### Database Issues
```bash
# Direct database connection
psql $DATABASE_URL

# Schema analysis - Check documentation
cat docs/7_database_documentation/database_analysis_report.md

# Migration verification
ls migration_scripts/
```

## 📊 Advanced Debugging Techniques

### London School TDD Debugging
1. **Write failing test** that reproduces the issue
2. **Identify the minimal fix** needed to make test pass
3. **Mock dependencies** to isolate the problem component
4. **Refactor** while keeping tests green

### Financial Domain Debugging
```bash
# IRR calculation accuracy
python -c "
import numpy_financial as npf
# Test with known values
cash_flows = [-1000, 300, 400, 300, 400]
irr = npf.irr(cash_flows)
print(f'IRR: {irr:.4f}')
"

# Portfolio hierarchy validation
python debugging_agent.py --issue "Portfolio fund relationships" --component workflow
```

### Performance Profiling
```bash
# Database query analysis
EXPLAIN ANALYZE SELECT * FROM analytics_dashboard_summary;

# React component profiling
# Use React DevTools Profiler
# Monitor React Query cache in DevTools

# Network analysis
# Use browser DevTools Network tab
# Check for N+1 query patterns
```

## 🚨 Emergency Recovery Procedures

### Critical System Failure
1. **Stop all services** immediately
2. **Check logs** for error details
3. **Restore from backup** if data corruption suspected
4. **Use debugging agent** for systematic diagnosis

### Authentication System Lockout
```bash
# Reset authentication system
python debugging_agent.py --auth

# Manual recovery
1. Verify JWT_SECRET in .env
2. Check database user tables
3. Reset admin credentials if needed
4. Test login flow isolation
```

### Database Corruption
```bash
# Emergency database recovery
1. Stop all application services
2. Run database integrity checks
3. Restore from latest backup
4. Verify data consistency
5. Restart services gradually
```

## 📝 Documentation & Reporting

### Generate Debug Report
```bash
# Comprehensive analysis with report generation
python debugging_agent.py --issue "Detailed issue description" --component affected_component

# Report saved automatically as debug_report_YYYYMMDD_HHMMSS.txt
```

### Update Documentation
```bash
# Only create documentation if explicitly needed
# Follow SPARC methodology for complex architectural changes
# Use 'finish commit' workflow for comprehensive commits
```

## 🔗 Quick Reference Links

- **System Architecture:** `/docs/3_architecture/01_system_architecture_overview.md`
- **Database Schema:** `/docs/3_architecture/03_database_schema.md`
- **API Design:** `/docs/3_architecture/04_api_design.md`
- **Development Standards:** `/docs/4_development_standards/01_coding_principles.md`

## 💡 Pro Tips

1. **Always start with the debugging agent** - it knows the system architecture
2. **Follow SPARC methodology** for systematic problem solving
3. **Use specialized debugging modes** for faster diagnosis
4. **Check git status** for uncommitted changes that might affect behavior
5. **Test with minimal reproduction cases** to isolate issues
6. **Monitor both frontend and backend logs** simultaneously
7. **Use London School TDD** approach for complex debugging scenarios

Remember: The Kingston's Portal debugging agent is designed to understand the complex wealth management domain and can guide you through the most sophisticated debugging scenarios across the full stack.