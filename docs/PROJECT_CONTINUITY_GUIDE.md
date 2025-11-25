# Kingston's Portal - Project Continuity Guide
## Emergency Handover Documentation

> **⚠️ CRITICAL BUSINESS DOCUMENT**  
> This guide ensures Kingston's Portal can continue operating if the primary developer (Jacob) becomes unavailable.  
> **Last Updated:** September 11, 2025

---

## 🚨 EMERGENCY QUICK REFERENCE

### **System Status Dashboard**
- **Production URL:** `http://intranet.kingston.local`
- **Backend API:** `http://intranet.kingston.local:8001/docs`
- **Database Status:** Check `psql $DATABASE_URL -c "SELECT 1"`
- **Application Health:** Check backend `/health` endpoint at `http://intranet.kingston.local:8001/api/health`
- **Server Location:** Kingston03 VM (192.168.0.223)

### **Critical Credentials Locations**
- **Environment Variables:** Single `.env` file at project root
- **Database Connection:** `$DATABASE_URL` environment variable
- **Deployment Credentials:** See "Deployment Access" section below
- **Local Development:** See `C:\Users\jacob\Documents\kingstons_portal` on development machine

### **Emergency Contacts**
- **Technical Support:** Jacob McNulty (07505755664) or Gabriella Cuba (07715898405)
- **Server Location:** Kingston03 VM (192.168.0.223) - Internal network
- **Database:** Local PostgreSQL on Kingston03 server
- **Backups:** Local storage at C:\DatabaseBackups\KingstonsPortal\

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Database Management](#database-management)
3. [Deployment & Infrastructure](#deployment--infrastructure)
4. [Development Environment](#development-environment)
5. [Source Code Navigation](#source-code-navigation)
6. [System Limitations & Pitfalls](#system-limitations--pitfalls)
7. [Future Development Plans](#future-development-plans)
8. [Operational Procedures](#operational-procedures)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Vendor Relationships](#vendor-relationships)

---

## 🏗️ SYSTEM OVERVIEW

### **Architecture**
Kingston's Portal is a comprehensive wealth management system with:

- **Backend:** FastAPI (Python) with PostgreSQL database
- **Frontend:** React 18 + TypeScript with Vite build system
- **Database:** PostgreSQL with 22+ tables and optimized views
- **Authentication:** JWT tokens with HttpOnly cookies
- **Deployment:** Windows Server (Kingston03 VM) with IIS + NSSM service

### **Core Functionality**
- Client group management (wealth management clients)
- Financial product tracking (portfolios, funds, valuations)
- Performance analytics (IRR calculations, revenue analytics)
- Report generation (PDF exports, performance reports)
- User management with role-based access

### **Technology Stack**
```
Frontend: React 18, TypeScript, Tailwind CSS, React Query
Backend:  FastAPI, Python 3.8+, asyncpg, Pydantic
Database: PostgreSQL, asyncio connection pooling
Testing:  Jest (frontend), pytest (backend)
Build:    Vite (frontend), uvicorn (backend)
```

---

## 🗄️ DATABASE MANAGEMENT

### **Database Location & Access**

**Connection Details:**
```bash
# Database URL format (stored in environment variable)
DATABASE_URL=postgresql://kingstons_app:KingstonApp2024!@192.168.0.223:5432/kingstons_portal

# Connect via psql
psql $DATABASE_URL

# Alternative connection method
psql -h 192.168.0.223 -p 5432 -U kingstons_app -d kingstons_portal
```

**Current Database Configuration:**
- **Provider:** Local PostgreSQL server
- **Access:** Via DATABASE_URL environment variable
- **Connection:** asyncpg (async) and psycopg2-binary (sync)
- **Location:** Same network as Kingston03 VM

### **Database Schema**
The database contains 22+ core tables organized in a 5-level hierarchy:
```
client_groups → client_products → portfolios → portfolio_funds → valuations
```

### **Database Hierarchy and Relationships**

**5-Level Data Hierarchy:**
```
client_groups (Level 1)
    ↓ (one-to-many)
client_products (Level 2)
    ↓ (one-to-one)
portfolios (Level 3)
    ↓ (one-to-many)
portfolio_funds (Level 4)
    ↓ (one-to-many)  
valuations (Level 5)
```

**Key Tables and Relationships:**

**Level 1: Client Groups**
```sql
-- Main client entities (wealth management clients)
client_groups
├── id (Primary Key)
├── name (Client name)
├── status (active/dormant)
├── advisor (Assigned advisor)
└── type (Client type)
```

**Level 2: Client Products**
```sql
-- Financial products owned by each client
client_products  
├── id (Primary Key)
├── client_id → client_groups.id (Foreign Key)
├── product_name (Product name)
├── product_type (Product type)
├── provider_id → available_providers.id (Foreign Key)
├── portfolio_id → portfolios.id (Foreign Key)
├── fixed_fee_facilitated (Annual fixed fees)
├── percentage_fee (Percentage of FUM fee)
└── status (active/inactive/lapsed)
```

**Level 3: Portfolios**
```sql
-- Portfolio configurations for products
portfolios
├── id (Primary Key) 
├── portfolio_name (Portfolio name)
├── status (active/inactive)
├── start_date (Portfolio start date)
└── template_id → portfolio_templates.id (Foreign Key)
```

**Level 4: Portfolio Funds**
```sql
-- Individual fund holdings within portfolios
portfolio_funds
├── id (Primary Key)
├── portfolio_id → portfolios.id (Foreign Key)
├── available_funds_id → available_funds.id (Foreign Key)
├── amount_invested (Initial investment amount)
├── target_weighting (Target allocation %)
└── status (active/inactive)
```

**Level 5: Valuations**
```sql
-- Current and historical fund values
latest_portfolio_fund_valuations (View)
├── portfolio_fund_id → portfolio_funds.id (Foreign Key)
├── valuation (Current market value)
├── valuation_date (Date of valuation)
└── created_at (Record creation timestamp)
```

**Product Owner Relationships:**
```sql
-- Product owners link to client groups and products
product_owners
├── id (Primary Key)
├── firstname, surname, known_as (Names)
└── status (active/inactive)

-- Many-to-many: Product owners can own multiple products
product_owner_products
├── product_owner_id → product_owners.id (Foreign Key)
├── product_id → client_products.id (Foreign Key)
└── ownership_percentage (Ownership share)

-- Many-to-many: Product owners can be linked to multiple client groups  
client_group_product_owners
├── client_group_id → client_groups.id (Foreign Key)
├── product_owner_id → product_owners.id (Foreign Key)
└── relationship_type (Primary/Secondary/etc.)
```

**IRR (Internal Rate of Return) Storage:**
```sql
-- Portfolio-level IRR values (aggregated)
latest_portfolio_irr_values (View)
├── portfolio_id → portfolios.id (Foreign Key)  
├── irr_result (IRR percentage value)
├── date (Calculation date)
└── created_at (Record timestamp)

-- Fund-level IRR values (individual funds)
portfolio_fund_irr_values
├── id (Primary Key)
├── fund_id → portfolio_funds.id (Foreign Key)
├── irr_result (Fund-specific IRR percentage)
├── date (Calculation date)
└── created_at (Record timestamp)

-- Company-level IRR cache (performance optimization)
company_irr_cache
├── calculation_type ('company_irr' or 'last_update')
├── irr_value (Cached company IRR result)
└── cache_timestamp (Last calculation time)
```

**Key Relationships Summary:**
1. **Client Groups** have multiple **Products**
2. **Products** belong to **Providers** and have one **Portfolio**  
3. **Portfolios** contain multiple **Portfolio Funds**
4. **Portfolio Funds** reference **Available Funds** and have **Valuations**
5. **Product Owners** can own shares in multiple **Products** across multiple **Client Groups**
6. **IRR calculations** are stored at both **Portfolio** and **Fund** levels
7. **Audit trail** captured in `holding_activity_log` for all changes

**Critical Views (Updated Sept 2025):**
- `company_revenue_analytics` - Company-wide revenue metrics
- `analytics_dashboard_summary` - Dashboard summary data
- `fund_distribution_fast` - Fund distribution analytics
- `provider_distribution_fast` - Provider analytics
- `revenue_analytics_optimized` - Optimized revenue calculations

### **Data Migration Procedures**

**Export Full Database:**
```bash
# Create full database dump
pg_dump $DATABASE_URL > kingstons_backup_$(date +%Y%m%d).sql

# Export specific tables only
pg_dump $DATABASE_URL -t table_name > table_backup.sql

# Export data only (no schema)
pg_dump $DATABASE_URL --data-only > data_only_backup.sql
```

**Import to New Database:**
```bash
# Restore full database
psql $NEW_DATABASE_URL < kingstons_backup_20250911.sql

# Restore specific table
psql $NEW_DATABASE_URL < table_backup.sql
```

**Migration Considerations:**
- Always test migrations on a copy first
- Update environment variables after migration
- Verify all views and functions work post-migration
- Update any hardcoded database references in code

### **Backup System**

**Automated Backups:**
The `database_backup_organized.ps1` script creates organized backups with retention policies:
```powershell
# Run manual backup (from project root)
.\database_backup_organized.ps1 -BackupType "daily"    # Daily backup
.\database_backup_organized.ps1 -BackupType "weekly"   # Weekly backup
.\database_backup_organized.ps1 -BackupType "monthly"  # Monthly backup

# Backup locations
# - Local: C:\DatabaseBackups\KingstonsPortal\
#   ├── Daily\    (7 day retention)
#   ├── Weekly\   (4 week retention)
#   └── Monthly\  (12 month retention)
```

**Backup Schedule:**
- **Daily:** Automated via scheduled task
- **Pre-deployment:** Manual backup before major updates
- **Monthly:** Full system backup including code

**Backup Verification:**
```sql
-- Test backup integrity
SELECT COUNT(*) FROM client_groups;
SELECT COUNT(*) FROM client_products; 
SELECT MAX(created_at) FROM holding_activity_log;
```

---

## 🚀 DEPLOYMENT & INFRASTRUCTURE

### **Current Deployment Method**

**Production Environment (Kingston03 VM):**
- **Server:** Kingston03 (192.168.0.223) - Windows Server with IIS
- **Frontend:** IIS hosting static files at `C:\inetpub\wwwroot\OfficeIntranet`  
- **Backend:** Windows service (OfficeFastAPIService) via NSSM at `C:\Apps\portal_api\backend`
- **Domain:** intranet.kingston.local (internal DNS)

**Deployment Process:**
```powershell
# 1. Access Kingston03 server as Administrator
# 2. Navigate to project directory
# 3. Run deployment script
.\deploy_minimal.ps1  # Run as Administrator

# Script performs:
# - Git pull latest changes
# - Install backend dependencies (pip install -r requirements.txt)
# - Install frontend dependencies (npm install)
# - Build frontend (npm run build -> IIS directory)
# - Copy backend to production location
# - Restart OfficeFastAPIService
# - Reset IIS
```

**Development Environment:**
```bash
# Backend (from backend/ directory)
uvicorn main:app --reload --host 127.0.0.1 --port 8001

# Frontend (from frontend/ directory)  
npm start  # Vite dev server on port 3000 with API proxy
```

### **Infrastructure Requirements**

**Server Specifications:**
- **CPU:** Minimum 2 cores (4+ recommended for production)
- **RAM:** Minimum 4GB (8GB+ recommended)
- **Storage:** 100GB+ SSD with room for database growth
- **Network:** Stable internet with static IP (if self-hosting)

**Software Dependencies:**
- **Operating System:** Windows Server (Kingston03)
- **Python:** 3.8+ (with pip and venv)
- **Node.js:** 16+ with npm  
- **PostgreSQL:** Server accessible via network
- **Web Server:** IIS 10.0 with URL Rewrite module
- **Service Manager:** NSSM (Non-Sucking Service Manager)
- **Git:** For version control and deployments

### **Environment Configuration**

**⚠️ IMPORTANT**: There is only ONE `.env` file at the project root (not separate ones for frontend/backend).

**Root .env File Configuration:**
```bash
# Supabase Configuration (authentication service)
SUPABASE_URL=https://oixpqxxnhxtxwkeigjka.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9peHBxeHhuaHh0eHdrZWlnamthIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTgxMTYsImV4cCI6MjA1ODk5NDExNn0.17TmzPmOMJg9pOSpRxcLvE89KqTQjVzzkMia3oJnYO8
SUPABASE_SECRET=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9peHBxeHhuaHh0eHdrZWlnamthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzQxODExNiwiZXhwIjoyMDU4OTk0MTE2fQ.3Polaof2IgQ_Qu7iqoQHIEzdbyYOux7aIHezKmffHkA

# Security Configuration
JWT_SECRET=ZHnZztuLGhW1Hci9FYqjK5HzPsdDnSGEpzBMd9vX09c
# - Used for JWT token signing and verification
# - 32+ character secret key for security
# - Used by app/utils/security.py for token operations

# Database Configuration
DATABASE_URL=postgresql://kingstons_app:KingstonApp2024!@192.168.0.223:5432/kingstons_portal
# - Complete PostgreSQL connection string
# - Used by asyncpg for all database connections
# - Points to Kingston03 server PostgreSQL instance
PGPASSWORD=KingstonApp2024!

# Application Configuration
DEBUG=true
# - Set to 'true' for development (enables detailed error messages)  
# - Set to 'false' for production (hides sensitive error details)
# - Controls logging level and error response detail

API_HOST=0.0.0.0
# - Host address for the FastAPI backend server
# - Use 127.0.0.1 for local development
# - Use 0.0.0.0 for production (Kingston03 deployment)

# NOTE: API_PORT is NOT in the .env file
# The port defaults to 8001 in main.py via: int(os.getenv("API_PORT", 8001))
```

**Frontend Environment Variables:**
```bash
# The frontend does NOT use custom environment variables!
# Instead, it uses automatic environment detection via getApiBaseUrl() function
# Located in: frontend/src/services/api.ts

# Environment Detection Logic:
# - Development: Empty baseURL (proxied through Vite)
# - Production: Direct API calls to http://intranet.kingston.local:8001
```

**Key Points:**
- **Single .env file** at project root - shared by both frontend and backend
- **Frontend has NO custom environment variables** - uses automatic detection
- **Backend reads** from root `.env` using `load_dotenv()` in main.py
- **Never commit `.env` files** to version control
- **Use `.env.example`** as template for new environments

### **SSL/TLS Configuration**
**⚠️ NO SSL CERTIFICATES CURRENTLY CONFIGURED**
- The system runs on HTTP (not HTTPS)
- Production URL: `http://intranet.kingston.local`
- Internal network only - SSL not required for current deployment

---

## 👤 USER ACCOUNT MANAGEMENT

### **Creating New User Accounts**

**⚠️ IMPORTANT:** Currently, user accounts must be created manually through the API documentation interface.

**Step-by-Step Account Creation:**

1. **Access API Documentation:**
   ```
   http://localhost:8001/docs (development)
   http://intranet.kingston.local:8001/docs (production)
   ```

2. **Navigate to Authentication Endpoints:**
   - Look for `/auth/register` endpoint in the API docs
   - Click on the endpoint to expand it

3. **Create Account via API:**
   ```json
   POST /auth/register
   {
     "email": "user@company.com",
     "password": "secure_password_123",
     "full_name": "User Full Name"
   }
   ```

4. **Account Verification:**
   - Check if email verification is required
   - New accounts may need admin approval (check user roles)

**Alternative Account Creation (if available):**
- Admin users can create accounts through the admin panel
- Check for any CLI scripts in `backend/scripts/` directory

**Default User Roles:**
- New accounts typically have basic user permissions
- Admin must manually upgrade user roles as needed
- Role management done through database or admin interface

### **User Management**

**Reset User Password:**
```bash
# Via API endpoint
POST /auth/reset-password
{
  "email": "user@company.com"
}
```

**Check User Status:**
```sql
-- Query user accounts in database
SELECT id, email, full_name, created_at, is_active 
FROM users 
ORDER BY created_at DESC;
```

---

## 💻 DEVELOPMENT ENVIRONMENT

### **Initial Setup**

**Prerequisites:**
1. Install Python 3.8+
2. Install Node.js 16+
3. Install PostgreSQL (compatible version)
4. Install Git
5. Install code editor (VS Code recommended)

**Clone and Setup:**
```bash
# Clone repository (if using Git - currently local development)
# Project is located at: C:\Users\jacob\Documents\kingstons_portal
cd kingstons_portal

# Backend setup
cd backend
pip install -r requirements.txt
cp .env.example .env  # Configure environment variables

# Frontend setup  
cd ../frontend
npm install

# Database setup
psql -c "CREATE DATABASE kingstons_portal;"
# Import database schema (add specific steps)
```

### **Major Package Dependencies**

**Backend Dependencies (Python):**
```python
# Core Framework
fastapi==0.104.1          # Modern Python web framework
uvicorn[standard]==0.24.0 # ASGI server for FastAPI
gunicorn==21.2.0          # Production WSGI server option

# Database
asyncpg==0.30.0           # Async PostgreSQL driver (primary)
psycopg2-binary==2.9.10   # Sync PostgreSQL driver (backup)

# Authentication & Security  
python-jose[cryptography]==3.3.0  # JWT token handling
passlib[bcrypt]==1.7.4    # Password hashing and verification

# Data Processing & Financial Calculations
pydantic>=2.4.0,<2.6.0    # Data validation and parsing
numpy-financial==1.0.0   # IRR and financial calculations
numpy                     # Mathematical operations

# Utilities & Configuration
python-dotenv==1.0.0      # Environment variable loading
psutil==5.9.6            # System monitoring for health checks
websockets==11.0.3       # WebSocket support

# Testing
pytest==7.4.3           # Testing framework
pytest-asyncio==0.21.1  # Async testing support
```

**Frontend Dependencies (Node.js):**
```json
{
  "react": "^18.2.0",           // Core React framework
  "react-dom": "^18.2.0",       // React DOM rendering
  "typescript": "^4.9.5",       // TypeScript support
  "vite": "^6.2.6",             // Build tool and dev server
  
  "react-router-dom": "^6.22.1", // Client-side routing
  "@tanstack/react-query": "^5.75.1", // Server state management
  "@tanstack/react-table": "^8.21.3", // Advanced table component
  
  "tailwindcss": "^3.4.1",      // CSS framework  
  "autoprefixer": "^10.4.17",   // CSS post-processor
  "postcss": "^8.4.35",         // CSS processing
  
  "@headlessui/react": "^1.7.18", // Unstyled accessible UI
  "@heroicons/react": "^2.1.1", // Icon library
  "react-hot-toast": "^2.5.2",  // Toast notifications
  "axios": "^1.6.7",            // HTTP client
  "recharts": "^2.15.3",        // Charts and graphs
  
  "@testing-library/react": "^14.2.1", // Testing utilities
  "jest": "^29.7.0",            // Testing framework
  "ts-jest": "^29.3.1",         // TypeScript Jest support
}
```

**Development Dependencies:**
- **Testing:** pytest (backend), Jest + React Testing Library (frontend)
- **Code Quality:** black, flake8 (backend), ESLint, Prettier (frontend)  
- **Build Tools:** setuptools (backend), Vite (frontend)

### **API Access and Documentation**

**API Documentation Access:**
```bash
# Development Environment
http://localhost:8001/docs          # Swagger UI (recommended)
http://localhost:8001/redoc         # ReDoc alternative interface

# Production Environment (Kingston03)
http://intranet.kingston.local:8001/docs   # Swagger UI
http://intranet.kingston.local:8001/redoc  # ReDoc alternative interface
```

**API Base URL:**
```bash
# Development (proxied through Vite)
http://localhost:3000/api

# Production (direct API calls)
http://intranet.kingston.local:8001/api
```

**Key API Endpoints:**
```bash
# Authentication
POST /auth/login              # User login
POST /auth/register           # User registration  
POST /auth/reset-password     # Password reset
GET  /auth/me                 # Current user info

# Client Management
GET    /clients               # List all clients
POST   /clients               # Create new client
GET    /clients/{id}          # Get client details
PUT    /clients/{id}          # Update client
DELETE /clients/{id}          # Delete client

# Revenue Analytics
GET /revenue/company          # Company revenue metrics
GET /revenue/client-groups    # Revenue by client group
GET /revenue/rate            # Revenue rate analytics

# Products and Portfolios
GET /products                # List all products
GET /portfolios              # List all portfolios
GET /funds                   # List all available funds
```

**API Authentication:**
- All API endpoints require authentication (except registration/login)
- Uses JWT tokens passed in Authorization header
- Frontend automatically handles token management
- Tokens expire after 24 hours (configurable via ACCESS_TOKEN_EXPIRE_MINUTES)

### **Development Workflow**

**Running Development Servers:**
```bash
# Backend (Terminal 1)
cd backend
uvicorn main:app --reload --host 127.0.0.1 --port 8001

# Frontend (Terminal 2)  
cd frontend
npm start  # Runs on port 3000 with proxy to backend
```

**Testing:**
```bash
# Backend tests
cd backend  
pytest

# Frontend tests (has deprecation warnings but works)
cd frontend
npm test
```

**Code Quality:**
```bash
# Frontend testing and build verification  
npm test                # Run Jest tests
npm run build          # Verify build succeeds

# Backend testing
cd backend
pytest                 # Run Python tests (if pytest tests exist)
```

### **Git Workflow**
- **Main Branch:** `main` (production-ready code)
- **Development:** Feature branches with descriptive names
- **Pull Requests:** Required for all changes to main
- **Commit Style:** Clear, descriptive commit messages

---

## 🗂️ SOURCE CODE NAVIGATION

### **Project Structure**
```
kingstons_portal/
├── backend/                 # FastAPI Python backend
│   ├── app/
│   │   ├── api/routes/     # 22 API route modules
│   │   ├── models/         # Pydantic data models  
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utilities (security, email)
│   │   └── db/             # Database connection
│   ├── main.py             # FastAPI app entry point
│   └── requirements.txt    # Python dependencies
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── components/     # 69+ React components
│   │   │   ├── ui/         # Component library (42 components)
│   │   │   ├── auth/       # Authentication components
│   │   │   └── layout/     # Layout components
│   │   ├── pages/          # 38 page components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API clients and services
│   │   └── utils/          # Frontend utilities
│   └── package.json        # Node.js dependencies
├── docs/                   # Comprehensive documentation
├── database_*.ps1          # Database backup scripts
└── deploy_minimal.ps1      # Deployment script
```

### **Key Components Guide**

**Backend Key Files:**
- `backend/main.py` - FastAPI application entry point
- `backend/app/api/routes/revenue.py` - Revenue analytics (recently updated Sept 2025)
- `backend/app/services/irr_cascade_service.py` - IRR calculations
- `backend/app/db/database.py` - Database connection management

**Frontend Key Files:**
- `frontend/src/App.tsx` - Main application with routing
- `frontend/src/components/ui/index.ts` - Component library exports
- `frontend/src/services/api.ts` - API client functions
- `frontend/src/pages/Revenue.tsx` - Revenue analytics page

### **Component Library (42 Components)**
The `frontend/src/components/ui/` directory contains a comprehensive component library:

**Component Groups:**
1. **Inputs:** BaseInput, NumberInput, DateInput, TextArea
2. **Search:** SearchInput, GlobalSearch, AutocompleteSearch  
3. **Dropdowns:** BaseDropdown, MultiSelectDropdown, CreatableDropdown
4. **Buttons:** ActionButton, EditButton, AddButton, DeleteButton, LapseButton
5. **Data Display:** DataTable, FundDistributionChart, StatBox, StatCard

**Usage Pattern:**
```typescript
import { ActionButton, DataTable } from '@/components/ui';
```

### **Development Standards (SPARC Methodology)**
The project follows a 5-phase SPARC development process:
1. **Specification** - Define clear requirements
2. **Pseudocode** - Map logical implementation  
3. **Architecture** - Design modular components
4. **Refinement** - Implement with TDD
5. **Completion** - Test, document, verify

---

## ⚠️ SYSTEM LIMITATIONS & PITFALLS

### **Known Technical Debt**

**Frontend Issues:**
- Jest tests show ts-jest deprecation warnings (functional but needs update)
- Some components exceed 500-line limit (needs refactoring)
- React Query cache management could be optimized further

**Backend Issues:**
- IRR calculations are CPU-intensive for large datasets
- Some database views need regular refresh for optimal performance  
- Error handling in bulk operations could be more granular

### **Performance Bottlenecks**

**Database Performance:**
- Analytics views can be slow with large datasets (>10,000 products)
- IRR calculations should be cached and refreshed periodically
- Bulk operations may timeout with very large client datasets

**Frontend Performance:**  
- Large data tables (1000+ rows) may cause browser lag
- Report generation for all clients simultaneously may be slow
- Image/file uploads not optimized for large files

### **Security Considerations**

**Authentication:**
- JWT tokens expire after 24 hours (configurable)
- Password reset tokens expire after 1 hour
- No current implementation of 2FA (consider for Phase 2)

**Data Protection:**
- Sensitive financial data is stored in database (ensure encryption at rest)
- API endpoints require authentication (verify all routes are protected)
- File uploads need virus scanning (not currently implemented)

### **Browser Compatibility**
- Optimized for modern browsers (Chrome 100+, Firefox 100+, Safari 15+)
- Internet Explorer not supported
- Mobile responsiveness needs improvement

---

## 🚀 FUTURE DEVELOPMENT PLANS

### **Phase 2 Expansion Plans**

**Enhanced Analytics (Priority 1):**
- Real-time dashboard updates with WebSocket connections
- Advanced charting with interactive graphs
- Custom report builder with drag-and-drop interface
- Automated report scheduling and email delivery

**Mobile Application (Priority 2):**
- React Native mobile app for iOS/Android
- Offline mode for field use
- Push notifications for important updates
- Mobile-optimized reporting

**Advanced Features (Priority 3):**
- Document management system with OCR
- Integration with external financial data providers
- Advanced user roles and permissions system
- API for third-party integrations

### **Technical Improvements**

**Infrastructure:**
- Migration to containerized deployment (Docker)
- Implementation of CI/CD pipeline
- Load balancing for high availability
- Database read replicas for performance

**Security Enhancements:**
- Two-factor authentication implementation
- Advanced audit logging
- Data encryption at rest and in transit
- Regular security assessments

### **Scalability Considerations**
- Database partitioning for large datasets
- Microservices architecture consideration
- Caching layer implementation (Redis)
- CDN for static asset delivery

---

## 🔧 OPERATIONAL PROCEDURES

### **Regular Maintenance Tasks**

**Daily:**
- Monitor system health and error logs
- Verify backup completion
- Check database performance metrics

**Weekly:**  
- Review and update security patches
- Clean up old log files
- Monitor disk space usage

**Monthly:**
- Full system backup verification
- Performance optimization review
- User access audit
- Documentation updates

### **Monitoring and Logging**

**System Monitoring:**
- Application logs: `backend/logs/` directory  
- Database logs: PostgreSQL log files
- Web server logs: [Add location based on deployment]

**Key Metrics to Monitor:**
- Database connection pool utilization
- API response times
- Memory and CPU usage
- Disk space availability
- Failed authentication attempts

### **Update Procedures**

**Code Updates:**
```bash
# 1. Backup current system
.\database_backup_organized.ps1

# 2. Pull latest changes
git pull origin main

# 3. Update dependencies
cd backend && pip install -r requirements.txt
cd frontend && npm install

# 4. Run tests
npm test
pytest

# 5. Deploy updates
.\deploy_minimal.ps1
```

**Database Updates:**
- Always backup before schema changes
- Test migrations on development environment first
- Update views and functions as needed
- Verify data integrity post-update

---

## 🛠️ TROUBLESHOOTING GUIDE

### **Common Issues and Solutions**

**Database Connection Issues:**
```bash
# Check database connectivity
psql $DATABASE_URL -c "SELECT 1"

# Common fixes:
# - Verify DATABASE_URL format
# - Check firewall settings
# - Verify PostgreSQL service is running
# - Check connection limits
```

**Frontend Build Issues:**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
npm run dev -- --force
```

**Backend Startup Issues:**
```bash
# Check Python environment
python --version  # Should be 3.11+
pip install -r requirements.txt

# Check environment variables
echo $DATABASE_URL
# Verify all required .env variables are set
```

### **Performance Issues**

**Slow Database Queries:**
```sql
-- Find slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Update table statistics  
ANALYZE;

-- Refresh materialized views if applicable
REFRESH MATERIALIZED VIEW view_name;
```

**High Memory Usage:**
- Check for memory leaks in long-running processes
- Monitor database connection pooling
- Review large dataset operations

### **Emergency Procedures**

**System Down:**
1. Check server status and connectivity
2. Verify database accessibility  
3. Check application logs for errors
4. Restart services in this order: Database → Backend → Frontend
5. Verify functionality with test transactions

**Data Corruption:**
1. **STOP** all write operations immediately
2. Backup current state (even if corrupted)
3. Identify scope of corruption
4. Restore from last known good backup
5. Replay transactions if possible
6. Verify data integrity before resuming operations

---

## 📋 HANDOVER CHECKLIST

### **Immediate Access Requirements**
- [ ] Administrative access to production server
- [ ] Database administrative credentials
- [ ] Source code repository access (GitHub/GitLab)
- [ ] Domain registrar account access
- [ ] Hosting provider account access
- [ ] Email accounts (if configured)
- [ ] SSL certificate management access

### **Documentation Transfer**
- [ ] All passwords securely transferred
- [ ] Environment variable files provided
- [ ] Backup access credentials shared
- [ ] Vendor contact information updated
- [ ] Legal documentation provided
- [ ] Financial account access (if applicable)

### **Knowledge Transfer Sessions**
- [ ] System architecture overview
- [ ] Database schema walkthrough  
- [ ] Deployment process demonstration
- [ ] Common maintenance tasks training
- [ ] Troubleshooting scenarios practice
- [ ] Business logic explanation
- [ ] User management procedures

### **Operational Readiness**
- [ ] Test deployment in development environment
- [ ] Verify all systems are functioning
- [ ] Confirm backup and restore procedures
- [ ] Validate monitoring and alerting
- [ ] Ensure all documentation is accessible
- [ ] Emergency contact list verified

---

## 📚 DOCUMENTATION NAVIGATION GUIDE

### **Understanding the Documentation Structure**
The project documentation is organized in the `docs/` folder with 10 logical sections for easy navigation:

**Documentation Hierarchy:**
```
docs/
├── README.md                           # Main navigation hub - START HERE
├── 01_introduction/                    # Project goals and capabilities
├── 02_getting_started/                # Setup and installation guides  
├── 03_architecture/                   # System design and architecture
├── 04_development_workflow/           # Git, testing, deployment
├── 05_development_standards/          # Code quality and conventions
├── 06_performance/                    # Performance monitoring
├── 07_security/                      # Security and authentication
├── 08_operations/                    # Deployment and maintenance
├── 09_database/                      # Database schema and docs
└── 10_reference/                     # Frontend guide and references
```

### **Key Documentation Files to Know**

**Essential Starting Points:**
- `docs/README.md` - **Main navigation hub for all documentation**
- `docs/03_architecture/01_system_architecture_overview.md` - **Complete system overview**
- `docs/04_development_workflow/01_git_workflow.md` - **Git practices and branching**

**Development Guidance:**
- `docs/05_development_standards/` - **Coding principles and SPARC methodology**
- `docs/10_reference/01_frontend_development_guide.md` - **Component library and patterns**
- `docs/02_getting_started/01_installation_setup.md` - **Environment setup**

**Operational References:**
- `docs/08_operations/01_deployment_procedures.md` - **Production deployment**
- `docs/09_database/01_database_schema.md` - **Database structure and relationships**
- `docs/07_security/01_authentication_flow.md` - **Security implementation**

### **How to Find Information Quickly**

**For New Developers:**
1. Start with `docs/README.md` for the complete overview
2. Follow setup in `docs/02_getting_started/`
3. Understand architecture in `docs/03_architecture/`
4. Learn development standards in `docs/05_development_standards/`

**For Specific Tasks:**
- **Bug Fixes:** Check `docs/04_development_workflow/02_code_review_process.md`
- **New Features:** Follow SPARC methodology in `docs/05_development_standards/`
- **Database Changes:** Reference `docs/09_database/` for schema understanding
- **Deployment Issues:** Use `docs/08_operations/` procedures

**For Business Users:**
- **System Capabilities:** `docs/01_introduction/01_project_overview.md`
- **User Training:** `frontend/src/pages/UserGuide` component
- **Feature Requests:** Process defined in `docs/04_development_workflow/`

### **Documentation Best Practices**

**When Reading Documentation:**
- Always start with the main `README.md` for context
- Follow the numbered sections in logical order for comprehensive understanding
- Use the search functionality in your IDE to find specific topics
- Cross-reference related sections for complete understanding

**When Updating Documentation:**
- Update `docs/README.md` if adding new major sections
- Follow the existing structure and formatting patterns
- Update the "Last Updated" dates in relevant files
- Test any code examples or commands before documenting them

**Documentation Maintenance:**
- Review and update quarterly or after major system changes
- Keep the architecture diagrams current with system changes
- Maintain API documentation alongside code changes
- Update deployment procedures after infrastructure changes

---

## 📧 EMERGENCY CONTACTS

### **Technical Support**
- **Primary Developer:** Jacob McNulty - 07505755664
- **Secondary Technical Contact:** Gabriella Cuba - 07715898405
- **System Administrator:** Same as primary developer

### **Business Contacts**
- **Main Business Contact:** Kingston's internal team
- **Technical Decision Maker:** Jacob McNulty (Primary Developer)
- **System Administrator:** Jacob McNulty

### **Infrastructure Notes**
- **Hosting:** Self-hosted on Kingston03 VM (internal network)
- **Database:** Self-managed PostgreSQL on same server
- **Domain:** Internal DNS (intranet.kingston.local)

---

## ⚡ FINAL NOTES

### **System Health Indicators**
```bash
# Quick system health check commands
curl -f http://localhost:8001/health  # Backend health
psql $DATABASE_URL -c "SELECT COUNT(*) FROM client_groups"  # DB health
npm run build  # Frontend build test
```

### **Critical File Locations**
- **Environment Config:** `.env` (at project root)
- **Database Backups:** C:\DatabaseBackups\KingstonsPortal\
- **Log Files:** `backend/logs/` and system logs
- **SSL Certificates:** Not configured (HTTP only)

### **Remember**
- **Always backup before making changes**
- **Test in development environment first** 
- **Keep this documentation updated**
- **Monitor system health regularly**
- **Have emergency contacts readily available**

---

**Document Version:** 1.0  
**Last Updated:** September 11, 2025  
**Next Review Date:** December 11, 2025

> This document should be reviewed and updated quarterly or after any major system changes.