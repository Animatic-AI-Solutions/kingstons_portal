---
title: "Documentation Maintenance Guide"
tags: ["documentation", "maintenance", "governance"]
---

# Documentation Maintenance Guide

> **Recent Updates (January 2025)**: 
> - **Ultra-Fast Analytics Performance System**: Resolved critical 67+ second analytics dashboard loading times by implementing specialized performance optimization system. Created pre-computed database views (`company_irr_cache`, `analytics_dashboard_summary`, `fund_distribution_fast`, `provider_distribution_fast`) and new ultra-fast API endpoint (`/analytics/dashboard-fast`) with background IRR refresh capability. Reduced response time from 67+ seconds to sub-second performance (<2 seconds target). Integrated revenue data display and renamed "Active Holdings" to "Total Funds Managed" across frontend and backend. Updated analytics views deployment process with error handling and graceful fallback mechanisms.
> - **Advisor Display Fix**: Fixed advisor assignment display issue in ClientDetails.tsx where advisor name showed "Unassigned" during viewing but displayed correctly during editing. Updated `/client_groups/{id}/complete` endpoint to include advisor information from the complete data view in the client_group response. Separated display and editing logic in frontend for clear advisor name presentation in both modes.
>
> **Previous Updates (December 2024)**: 
> - **Revenue Configuration Made Compulsory**: Updated CreateClientProducts.tsx to make fixed fee and percentage fee fields required without default values. Users must now explicitly enter values (including 0 if no fees apply) before creating products. Enhanced validation messages and UI indicators to clearly communicate required nature of fee fields.
> - **Portfolio Generation Refactor**: Removed version numbers from portfolio template generations system across backend and frontend. All generation ordering now uses `created_at` chronological order instead of version numbers, supporting proper backlogged generation creation and display.
> - **Client Page Performance Fixes**: Fixed infinite loop in ClientDetails.tsx by removing IIFE wrapper from PreviousFundsIRRDisplay component, eliminating browser freezing and improving page stability.
> - **Product Fund Visibility Fix**: Updated ProductOverview.tsx filtering logic to prioritize explicit database status over date-based inference, ensuring reactivated funds display correctly regardless of timing (fixed missing portfolio fund 715).
> - **IRR Calculation Accuracy**: Enhanced client total IRR calculation using proper standardized endpoints with cash flow-based mathematics instead of incorrect weighted averages. Fixed IRR display synchronization between backend calculations and frontend presentation.
> - **Product Owner Integration**: Updated client_groups.py backend endpoint to include product owners in API response, enabling complete product owner relationship visibility across client interfaces.
> 
> **Previous Updates (July 2025)**:
> - **Documentation Validation**: Updated test coverage counts to reflect accurate test distributions: 26 formatter tests, 13 constants tests, and 53 service tests. Smart formatting functionality validated - tests show intelligent decimal formatting working correctly (removing unnecessary trailing zeros).
> - **UX Pattern Updates**: Updated design philosophy document to include new UX patterns: Intelligent Workflow Assistance (auto-selection of previous generation funds) and Expanded Interaction Areas (clickable rows for improved usability).
> - **IRR Calculation Fix**: Fixed client details page to use proper standardized multiple portfolio fund IRR calculation instead of mathematically incorrect weighted averages. Client IRR now uses `/analytics/client/{client_id}/irr` endpoint for accurate cash flow-based calculations.
> - **Port Standardization**: Corrected backend default port from 8000 to 8001 to maintain consistency with frontend proxy configuration and production environment.
> 
> **Previous Updates (December 2024)**: Documentation has been updated to reflect the new production architecture with Kingston03 server hosting, environment-based API configuration, and direct FastAPI service communication. See deployment process documentation for details.

## Overview

This guide provides comprehensive operational procedures for maintaining Kingston's Portal enhanced client data functionality and supporting systems. It covers all enhanced components from Phase 2 database enhancements through Phase 6 performance optimization systems, ensuring operational excellence across the complete enhanced architecture.

**Enhanced Operations Coverage:**
- **Phase 2 Enhanced Client Data**: Information-dense interfaces, professional workflows, advanced analytics
- **Phase 3 Advanced API Architecture**: Comprehensive endpoints, bulk operations, real-time features
- **Phase 4 Professional Frontend**: Responsive design, optimized user experience, mobile compatibility
- **Phase 5 Multi-Layer Security**: Field-level encryption, authentication systems, access control
- **Phase 6 Performance Monitoring**: Real-time metrics, automated optimization, capacity planning
- **Phase 7 Comprehensive Operations**: Integrated maintenance, monitoring, and incident response

**Core Principles:**
- **Holistic Operations**: Maintain all enhanced systems as an integrated ecosystem
- **Proactive Monitoring**: Continuous surveillance of performance, security, and compliance
- **Data Protection**: Field-level encryption and audit trail integrity at all times
- **Performance Optimization**: Maintain sub-second response times across all enhanced features
- **Regulatory Compliance**: Ongoing adherence to financial services regulations
- **When you change the code, change the docs**

**Enhanced Architecture Coverage:**
- Phase 2: Enhanced client data functionality with professional workflows
- Phase 3: Advanced API architecture with comprehensive endpoints  
- Phase 4: Information-dense frontend with advanced user experience
- Phase 5: Multi-layer security framework with field-level encryption
- Phase 6: Performance monitoring and optimization systems
- Phase 7: Comprehensive operations and maintenance procedures

## 1. Update Triggers and Corresponding Actions

When a file or concept is modified, the corresponding documentation file(s) should be reviewed and updated.

---

### **Trigger: Database Schema (`database.sql`)**
*If this file changes, the following documentation must be updated:*

1.  **`docs/3_architecture/03_database_schema.md`**
    - **Action:** Update the Core Entity Hierarchy to reflect table/column changes. Update the Performance Optimization Views if any views are changed.
2.  **`docs/3_architecture/02_architecture_diagrams.md`**
    - **Action:** Update the Mermaid ER diagram.

---

### **Trigger: Backend API Routes (`backend/app/api/routes/`)**
*If new endpoints are added, or existing ones are significantly changed:*

1.  **`docs/3_architecture/04_api_design.md`**
    - **Action:** Update the list of key route modules and describe any new architectural patterns. Add examples for the new endpoints if they introduce new patterns.
2.  **`docs/6_advanced/01_security_considerations.md`**
    - **Action:** If the change relates to authentication or authorization, update the relevant sections.

---

### **Trigger: Frontend Routing (`frontend/src/App.tsx`)**
*If new pages (routes) are added or removed:*

1.  **`docs/3_architecture/01_system_architecture_overview.md`**
    - **Action:** Update the list of key pages under the Frontend Architecture section.
2.  **`docs/3_architecture/02_architecture_diagrams.md`**
    - **Action:** Update the Application Data Flow and Component Architecture diagrams.

---

### **Trigger: Frontend Components (`frontend/src/components/` or `frontend/src/pages/`)**
*If a major new component is added or a large one is refactored:*

1.  **`docs/1_introduction/02_project_strengths_and_limitations.md`**
    - **Action:** If a large component from the technical debt list is refactored, remove it from the list.
2.  **`docs/5_frontend_guide/01_design_philosophy.md`**
    - **Action:** If a new component introduces a novel design pattern, update the document.
3.  **`docs/5_frontend_guide/02_state_management.md`**
    - **Action:** If a new state management approach is used, document it.

---

### **Trigger: Shared Modules (`frontend/src/types/`, `frontend/src/utils/` shared modules)**
*If shared modules are added, modified, or extended:*

1.  **`docs/3_architecture/05_shared_modules_pattern.md`**
    - **Action:** Update module descriptions, usage examples, and test coverage information.
2.  **`docs/3_architecture/01_system_architecture_overview.md`**
    - **Action:** Update the shared modules architecture section with new module information.
3.  **`docs/4_development_standards/03_testing_strategy.md`**
    - **Action:** Update test coverage information for new shared module tests.

---

### **Trigger: UI/UX Improvements (auto-save patterns, simplified messaging, etc.)**
*If user interface patterns or user experience improvements are implemented:*

1.  **`docs/5_frontend_guide/01_design_philosophy.md`**
    - **Action:** Update the auto-save patterns, user feedback, or interaction design sections to reflect new UX patterns.

---

### **Trigger: Project Dependencies (`package.json` or `requirements.txt`)**
*If a major new dependency is added:*

1.  **`docs/2_getting_started/01_setup_and_installation.md`**
    - **Action:** Add any new prerequisite installation steps.
2.  **`docs/3_architecture/01_system_architecture_overview.md`**
    - **Action:** Update the technology stack list.

---

### **General Documentation Maintenance**
- When adding a new document, link to it from the main `docs/index.md`.
- Add a YAML frontmatter block to all new documents.
- Review and add cross-links to and from the new document to integrate it with the existing documentation.

## 2. Enhanced System Maintenance Procedures

### 2.1 Daily Operations Checklist

**Morning System Health Validation** (8:00 AM - Automated + Manual Review):
- [ ] **Database Performance**: Query execution times within SLA (< 100ms average)
- [ ] **Field-Level Encryption**: Audit encryption/decryption operations for anomalies
- [ ] **API Response Times**: All endpoints responding within performance targets (< 2s)
- [ ] **Frontend Performance**: Critical path loading times validated (< 3s)
- [ ] **Security Framework**: Authentication and authorization systems operational
- [ ] **Audit Trail Integrity**: Verify no gaps in activity logging
- [ ] **Concurrent User Capacity**: System supporting target concurrent users (4+)
- [ ] **Backup Verification**: Automated backup completion and integrity check

**Evening Operations Review** (6:00 PM):
- [ ] **Performance Metrics Analysis**: Review daily performance trends and patterns
- [ ] **Security Event Review**: Analyze authentication attempts and access patterns  
- [ ] **Data Integrity Validation**: Verify calculated fields and aggregations accuracy
- [ ] **System Resource Utilization**: Memory, CPU, and storage usage assessment
- [ ] **Compliance Report Generation**: Daily regulatory compliance status
- [ ] **Issue Escalation Review**: Address any performance or security concerns
- [ ] **Tomorrow's Preparation**: Queue maintenance tasks and system updates

### 2.2 Weekly Operations Cycle

**Monday: Security & Compliance Focus**
```
08:00 - Security framework comprehensive review
10:00 - Field-level encryption performance analysis
14:00 - Compliance audit trail validation
16:00 - Access control and authentication system review
```

**Tuesday: Performance Optimization**
```
08:00 - Database query performance analysis
10:00 - API endpoint response time optimization review
14:00 - Frontend loading performance assessment
16:00 - Caching strategy effectiveness evaluation
```

**Wednesday: Data Management Operations**
```
08:00 - Enhanced client data functionality validation
10:00 - Professional workflow efficiency analysis
14:00 - Information-dense interface performance review
16:00 - Data accuracy and consistency verification
```

**Thursday: System Architecture Review**
```
08:00 - Multi-layer architecture health assessment
10:00 - Integration point stability verification
14:00 - Advanced API architecture performance review
16:00 - Component interaction analysis
```

**Friday: Maintenance & Optimization**
```
08:00 - System maintenance tasks execution
10:00 - Performance tuning and optimization
14:00 - Proactive issue identification and resolution
16:00 - Weekly performance report generation
```

### 2.3 Monthly Operations Assessment

**First Week: Architecture & Performance Deep Dive**
- Complete system architecture health assessment
- Performance optimization system comprehensive review
- Database schema evolution planning and assessment
- API endpoint performance and usage pattern analysis

**Second Week: Security & Compliance Comprehensive Review**
- Multi-layer security framework evaluation
- Field-level encryption effectiveness assessment
- Audit trail completeness and accuracy verification
- Regulatory compliance gap analysis and remediation

**Third Week: User Experience & Frontend Operations**
- Information-dense interface usability assessment
- Professional workflow efficiency evaluation
- Advanced user experience feature performance review
- Client data functionality user satisfaction analysis

**Fourth Week: Strategic Planning & System Evolution**
- Enhanced client data functionality roadmap review
- System capacity planning and scaling assessment
- Technology stack evolution planning
- Operational procedure refinement and documentation updates

### 2.5 Automated Operations Validation

**Daily Automated Health Checks**:
```python
#!/usr/bin/env python3
"""Comprehensive daily operations validation"""

import asyncio
import aiohttp
import asyncpg
import psutil
from datetime import datetime
import json

async def daily_operations_validation():
    """Run comprehensive daily operations validation"""
    
    validation_results = {
        'timestamp': datetime.now().isoformat(),
        'validations': {},
        'alerts': [],
        'overall_status': 'UNKNOWN'
    }
    
    print(f"=== Daily Operations Validation - {datetime.now()} ===")
    
    # 1. API Health Validation
    print("\n1. API Health Validation...")
    api_health = await validate_api_endpoints()
    validation_results['validations']['api_health'] = api_health
    
    if api_health['success_rate'] < 95:
        validation_results['alerts'].append(f"API health below threshold: {api_health['success_rate']}%")
    
    # 2. Database Performance Validation
    print("2. Database Performance Validation...")
    db_performance = await validate_database_performance()
    validation_results['validations']['database_performance'] = db_performance
    
    if db_performance['avg_query_time'] > 500:
        validation_results['alerts'].append(f"Database performance degraded: {db_performance['avg_query_time']}ms avg")
    
    # 3. Security System Validation
    print("3. Security System Validation...")
    security_health = await validate_security_systems()
    validation_results['validations']['security_health'] = security_health
    
    if security_health['encryption_success_rate'] < 98:
        validation_results['alerts'].append(f"Encryption system issues: {security_health['encryption_success_rate']}% success")
    
    # 4. System Resource Validation
    print("4. System Resource Validation...")
    resource_health = validate_system_resources()
    validation_results['validations']['resource_health'] = resource_health
    
    if resource_health['cpu_percent'] > 80:
        validation_results['alerts'].append(f"High CPU usage: {resource_health['cpu_percent']}%")
    
    if resource_health['memory_percent'] > 85:
        validation_results['alerts'].append(f"High memory usage: {resource_health['memory_percent']}%")
    
    # 5. Enhanced Client Data Validation
    print("5. Enhanced Client Data Validation...")
    client_data_health = await validate_client_data_systems()
    validation_results['validations']['client_data_health'] = client_data_health
    
    if client_data_health['data_consistency_score'] < 95:
        validation_results['alerts'].append(f"Data consistency issues: {client_data_health['data_consistency_score']}% score")
    
    # Determine overall status
    if not validation_results['alerts']:
        validation_results['overall_status'] = 'HEALTHY'
    elif len(validation_results['alerts']) <= 2:
        validation_results['overall_status'] = 'WARNING'
    else:
        validation_results['overall_status'] = 'CRITICAL'
    
    # Save validation results
    results_file = f"/var/log/operations/daily_validation_{datetime.now().strftime('%Y%m%d')}.json"
    with open(results_file, 'w') as f:
        json.dump(validation_results, f, indent=2, default=str)
    
    # Display summary
    print(f"\n=== Validation Summary ===")
    print(f"Overall Status: {validation_results['overall_status']}")
    print(f"Validations Completed: {len(validation_results['validations'])}")
    print(f"Alerts Generated: {len(validation_results['alerts'])}")
    
    if validation_results['alerts']:
        print("\nAlerts:")
        for alert in validation_results['alerts']:
            print(f"  ⚠ {alert}")
    
    print(f"\nResults saved: {results_file}")
    
    return validation_results

async def validate_api_endpoints():
    """Validate API endpoint health"""
    
    endpoints = [
        '/api/health',
        '/api/clients?limit=10',
        '/api/portfolios?limit=10',
        '/api/bulk_client_data?limit=5',
        '/api/analytics/dashboard-fast'
    ]
    
    success_count = 0
    response_times = []
    
    async with aiohttp.ClientSession() as session:
        for endpoint in endpoints:
            try:
                start_time = datetime.now()
                async with session.get(f'http://localhost:8001{endpoint}', timeout=10) as response:
                    response_time = (datetime.now() - start_time).total_seconds() * 1000
                    response_times.append(response_time)
                    
                    if response.status == 200:
                        success_count += 1
                        print(f"  ✓ {endpoint}: {response_time:.0f}ms")
                    else:
                        print(f"  ✗ {endpoint}: Status {response.status}")
            
            except Exception as e:
                print(f"  ✗ {endpoint}: {str(e)}")
    
    return {
        'success_rate': (success_count / len(endpoints)) * 100,
        'avg_response_time': sum(response_times) / len(response_times) if response_times else 0,
        'endpoints_tested': len(endpoints),
        'endpoints_successful': success_count
    }

async def validate_database_performance():
    """Validate database performance"""
    
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    # Test query performance
    test_queries = [
        'SELECT COUNT(*) FROM client_groups;',
        'SELECT * FROM portfolio_summary_view LIMIT 10;',
        'SELECT * FROM analytics_dashboard_summary LIMIT 5;'
    ]
    
    query_times = []
    for query in test_queries:
        start_time = datetime.now()
        try:
            await conn.fetch(query)
            query_time = (datetime.now() - start_time).total_seconds() * 1000
            query_times.append(query_time)
            print(f"  ✓ Query completed in {query_time:.0f}ms")
        except Exception as e:
            print(f"  ✗ Query failed: {str(e)}")
    
    # Check connection health
    active_connections = await conn.fetchval("SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';")
    
    await conn.close()
    
    return {
        'avg_query_time': sum(query_times) / len(query_times) if query_times else 0,
        'active_connections': active_connections,
        'queries_tested': len(test_queries),
        'queries_successful': len(query_times)
    }

async def validate_security_systems():
    """Validate security system health"""
    
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    # Check encryption system
    encryption_stats = await conn.fetchrow("""
        SELECT 
            COUNT(*) as total_ops,
            COUNT(*) FILTER (WHERE success = true) as successful_ops
        FROM encryption_audit_log
        WHERE created_at >= NOW() - INTERVAL '24 hours';
    """)
    
    # Check authentication health
    auth_stats = await conn.fetchrow("""
        SELECT 
            COUNT(*) as total_attempts,
            COUNT(*) FILTER (WHERE success = true) as successful_attempts
        FROM auth_log
        WHERE created_at >= NOW() - INTERVAL '24 hours';
    """)
    
    await conn.close()
    
    encryption_success_rate = 100
    if encryption_stats and encryption_stats['total_ops'] > 0:
        encryption_success_rate = (encryption_stats['successful_ops'] / encryption_stats['total_ops']) * 100
    
    auth_success_rate = 100
    if auth_stats and auth_stats['total_attempts'] > 0:
        auth_success_rate = (auth_stats['successful_attempts'] / auth_stats['total_attempts']) * 100
    
    print(f"  ✓ Encryption success rate: {encryption_success_rate:.1f}%")
    print(f"  ✓ Authentication success rate: {auth_success_rate:.1f}%")
    
    return {
        'encryption_success_rate': encryption_success_rate,
        'auth_success_rate': auth_success_rate,
        'encryption_operations_24h': encryption_stats['total_ops'] if encryption_stats else 0,
        'auth_attempts_24h': auth_stats['total_attempts'] if auth_stats else 0
    }

def validate_system_resources():
    """Validate system resource health"""
    
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('C:' if os.name == 'nt' else '/')
    
    print(f"  ✓ CPU usage: {cpu_percent}%")
    print(f"  ✓ Memory usage: {memory.percent}%")
    print(f"  ✓ Disk usage: {(disk.used / disk.total) * 100:.1f}%")
    
    return {
        'cpu_percent': cpu_percent,
        'memory_percent': memory.percent,
        'disk_percent': (disk.used / disk.total) * 100,
        'memory_available_gb': memory.available / 1024**3,
        'disk_free_gb': disk.free / 1024**3
    }

async def validate_client_data_systems():
    """Validate enhanced client data systems"""
    
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    # Data consistency checks
    consistency_checks = await conn.fetch("""
        SELECT 
            'client_portfolio_consistency' as check_name,
            COUNT(*) as total_records,
            COUNT(*) FILTER (WHERE portfolio_count > 0) as consistent_records
        FROM (
            SELECT 
                client_groups.id,
                COUNT(portfolios.id) as portfolio_count
            FROM client_groups
            LEFT JOIN portfolios ON client_groups.id = portfolios.client_group_id
            GROUP BY client_groups.id
        ) consistency_check
        UNION ALL
        SELECT 
            'portfolio_holdings_consistency' as check_name,
            COUNT(*) as total_records,
            COUNT(*) FILTER (WHERE holdings_count >= 0) as consistent_records
        FROM (
            SELECT 
                portfolios.id,
                COUNT(holdings.id) as holdings_count
            FROM portfolios
            LEFT JOIN holdings ON portfolios.id = holdings.portfolio_id
            GROUP BY portfolios.id
        ) holdings_check;
    """)
    
    total_consistency_score = 0
    for check in consistency_checks:
        if check['total_records'] > 0:
            consistency_rate = (check['consistent_records'] / check['total_records']) * 100
            total_consistency_score += consistency_rate
            print(f"  ✓ {check['check_name']}: {consistency_rate:.1f}% consistent")
    
    data_consistency_score = total_consistency_score / len(consistency_checks) if consistency_checks else 100
    
    # Performance checks for enhanced endpoints
    enhanced_endpoint_performance = await validate_enhanced_endpoints()
    
    await conn.close()
    
    return {
        'data_consistency_score': data_consistency_score,
        'consistency_checks_completed': len(consistency_checks),
        'enhanced_endpoint_performance': enhanced_endpoint_performance
    }

async def validate_enhanced_endpoints():
    """Validate enhanced client data endpoints"""
    
    enhanced_endpoints = [
        '/api/bulk_client_data?limit=10',
        '/api/analytics/dashboard-fast',
        '/api/client_groups/1/complete'
    ]
    
    performance_scores = []
    
    async with aiohttp.ClientSession() as session:
        for endpoint in enhanced_endpoints:
            try:
                start_time = datetime.now()
                async with session.get(f'http://localhost:8001{endpoint}', timeout=10) as response:
                    response_time = (datetime.now() - start_time).total_seconds()
                    
                    # Score based on response time (< 2s = 100, 2-5s = 80, >5s = 50)
                    if response_time < 2:
                        score = 100
                    elif response_time < 5:
                        score = 80
                    else:
                        score = 50
                    
                    performance_scores.append(score)
                    print(f"    {endpoint}: {response_time:.2f}s (score: {score})")
            
            except Exception as e:
                performance_scores.append(0)
                print(f"    {endpoint}: Failed - {str(e)}")
    
    return sum(performance_scores) / len(performance_scores) if performance_scores else 0

# Run daily validation
if __name__ == "__main__":
    asyncio.run(daily_operations_validation())
```

### 2.4 Quarterly Operations Milestones

**Q1: Enhanced Database Operations Excellence**
- Complete Phase 2 database schema optimization review
- Advanced query performance tuning initiatives
- Data integrity and consistency framework enhancement
- Professional workflow database efficiency maximization

**Q2: Advanced Security Framework Maturation**
- Multi-layer security system comprehensive audit
- Field-level encryption performance optimization
- Authentication and authorization system enhancement
- Compliance framework automation improvements

**Q3: Performance Monitoring System Evolution**
- Performance optimization system capability expansion
- Real-time monitoring dashboard enhancement
- Predictive performance analysis implementation
- Capacity planning and scaling strategy refinement

**Q4: Operational Excellence & Strategic Enhancement**
- Complete operational procedure review and optimization
- Enhanced client data functionality evolution planning
- System architecture modernization roadmap development
- Next-generation capabilities research and planning

## 3. Enhanced Client Data Functionality Operations

### 3.1 Information-Dense Interface Performance Monitoring

**Daily Performance Validation** (Every 4 hours during business hours):
- [ ] **Client Data Loading Performance**: All client detail pages load within 2 seconds
- [ ] **Portfolio View Responsiveness**: Portfolio overview displays within 1.5 seconds
- [ ] **Bulk Data Operations**: Bulk client data endpoint responds within 3 seconds
- [ ] **Real-Time Data Updates**: Live portfolio valuations update within 500ms
- [ ] **Search Functionality**: Client/portfolio search results display within 1 second
- [ ] **Navigation Performance**: Page transitions complete within 800ms
- [ ] **Mobile Responsiveness**: All interfaces function optimally on mobile devices

**Weekly Client Data System Review**:
```bash
#!/bin/bash
# Enhanced client data functionality validation script

echo "=== Enhanced Client Data Operations Validation ==="
echo "Validation Date: $(date)"

# Test critical client data endpoints
endpoints=(
    "/api/clients?limit=50"
    "/api/bulk_client_data?include_portfolios=true"
    "/api/client_groups/{id}/complete"
    "/api/portfolios?detailed=true&limit=25"
    "/api/analytics/client-performance"
)

for endpoint in "${endpoints[@]}"; do
    echo "Testing: $endpoint"
    start_time=$(date +%s.%N)
    response=$(curl -s -w "%{http_code}" -o /dev/null "http://localhost:8001$endpoint")
    end_time=$(date +%s.%N)
    duration=$(echo "$end_time - $start_time" | bc)
    
    if [ "$response" -eq 200 ]; then
        echo "  ✓ Status: 200 OK, Duration: ${duration}s"
    else
        echo "  ✗ Status: $response, Duration: ${duration}s"
    fi
done

# Validate data consistency
echo "\nValidating data consistency..."
psql $DATABASE_URL -c "
SELECT 
    'Client Groups' as entity,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '24 hours') as recent_updates
FROM client_groups
UNION ALL
SELECT 
    'Portfolios' as entity,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '24 hours') as recent_updates
FROM portfolios
UNION ALL
SELECT 
    'Holdings' as entity,
    COUNT(*) as total_records,
    COUNT(*) FILTER (WHERE updated_at >= NOW() - INTERVAL '24 hours') as recent_updates
FROM holdings;"

echo "\nClient data validation completed: $(date)"
```

### 3.2 Professional Workflow Operations Maintenance

**Monthly Professional Workflow Optimization**:
- **Workflow Efficiency Analysis**: Measure time-to-completion for key workflows
- **User Interface Optimization**: Review and optimize information density and usability
- **Navigation Path Analysis**: Analyze user navigation patterns and optimize flows
- **Form Validation Performance**: Ensure all form validations perform optimally
- **Data Entry Efficiency**: Optimize data entry workflows for speed and accuracy
- **Integration Point Validation**: Verify all system integrations function seamlessly

### 3.3 Advanced Analytics Operations

**Ultra-Fast Analytics System Maintenance**:
```python
#!/usr/bin/env python3
"""Advanced analytics system operations maintenance"""

import asyncio
import asyncpg
from datetime import datetime, timedelta

async def maintain_analytics_system():
    """Maintain ultra-fast analytics performance system"""
    
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    print(f"=== Analytics System Maintenance - {datetime.now()} ===")
    
    # 1. Refresh pre-computed analytics views
    print("Refreshing analytics views...")
    analytics_views = [
        'company_irr_cache',
        'analytics_dashboard_summary', 
        'fund_distribution_fast',
        'provider_distribution_fast',
        'portfolio_summary_view'
    ]
    
    for view in analytics_views:
        try:
            start_time = datetime.now()
            await conn.execute(f"REFRESH MATERIALIZED VIEW {view};")
            duration = (datetime.now() - start_time).total_seconds()
            print(f"  ✓ {view} refreshed in {duration:.2f}s")
        except Exception as e:
            print(f"  ✗ Error refreshing {view}: {e}")
    
    # 2. Validate analytics performance
    print("\nValidating analytics performance...")
    performance_queries = {
        'dashboard_summary': 'SELECT * FROM analytics_dashboard_summary LIMIT 1;',
        'irr_cache': 'SELECT * FROM company_irr_cache LIMIT 10;',
        'fund_distribution': 'SELECT * FROM fund_distribution_fast LIMIT 5;'
    }
    
    for query_name, query_sql in performance_queries.items():
        start_time = datetime.now()
        try:
            result = await conn.fetch(query_sql)
            duration = (datetime.now() - start_time).total_seconds()
            print(f"  ✓ {query_name}: {duration:.3f}s ({len(result)} records)")
            
            if duration > 2.0:  # Alert if > 2 seconds
                print(f"    ⚠ Performance warning: {query_name} took {duration:.3f}s")
        except Exception as e:
            print(f"  ✗ {query_name} failed: {e}")
    
    # 3. Check IRR calculation accuracy
    print("\nValidating IRR calculation accuracy...")
    irr_validation = await conn.fetch("""
        SELECT 
            client_id,
            portfolio_id,
            calculated_irr,
            last_calculated,
            CASE 
                WHEN last_calculated < NOW() - INTERVAL '7 days' THEN 'STALE'
                WHEN calculated_irr IS NULL THEN 'MISSING'
                ELSE 'CURRENT'
            END as status
        FROM company_irr_cache
        WHERE status != 'CURRENT'
        ORDER BY last_calculated DESC
        LIMIT 10;
    """)
    
    if irr_validation:
        print(f"  ⚠ Found {len(irr_validation)} IRR records needing attention")
        for record in irr_validation:
            print(f"    Client {record['client_id']}, Portfolio {record['portfolio_id']}: {record['status']}")
    else:
        print("  ✓ All IRR calculations current and accurate")
    
    await conn.close()
    
    print("\nAnalytics system maintenance completed")

# Run analytics maintenance
if __name__ == "__main__":
    asyncio.run(maintain_analytics_system())
```

### 3.4 Field-Level Encryption Operations

**Daily Encryption System Monitoring**:
```python
#!/usr/bin/env python3
"""Field-level encryption monitoring and maintenance"""

import asyncio
import asyncpg
from datetime import datetime, timedelta

async def monitor_encryption_system():
    """Monitor field-level encryption system health"""
    
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    print(f"=== Encryption System Monitoring - {datetime.now()} ===")
    
    # 1. Check encryption operation success rates
    encryption_stats = await conn.fetch("""
        SELECT 
            operation_type,
            COUNT(*) as total_operations,
            COUNT(*) FILTER (WHERE success = true) as successful_operations,
            AVG(execution_time_ms) as avg_execution_time,
            MAX(execution_time_ms) as max_execution_time
        FROM encryption_audit_log 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY operation_type;
    """)
    
    print("Encryption Operation Statistics (24h):")
    for stat in encryption_stats:
        success_rate = (stat['successful_operations'] / stat['total_operations']) * 100
        print(f"  {stat['operation_type']}: {success_rate:.1f}% success, avg {stat['avg_execution_time']:.1f}ms")
        
        if success_rate < 95:
            print(f"    ⚠ Low success rate for {stat['operation_type']}: {success_rate:.1f}%")
        if stat['avg_execution_time'] > 100:
            print(f"    ⚠ Slow encryption for {stat['operation_type']}: {stat['avg_execution_time']:.1f}ms")
    
    # 2. Verify encrypted field integrity
    encrypted_fields_check = await conn.fetch("""
        SELECT 
            table_name,
            column_name,
            COUNT(*) as total_records,
            COUNT(*) FILTER (WHERE encrypted_value IS NOT NULL) as encrypted_records
        FROM field_encryption_registry
        JOIN information_schema.tables ON table_name = tables.table_name
        GROUP BY table_name, column_name;
    """)
    
    print("\nEncrypted Fields Integrity:")
    for field in encrypted_fields_check:
        encryption_rate = (field['encrypted_records'] / field['total_records']) * 100
        print(f"  {field['table_name']}.{field['column_name']}: {encryption_rate:.1f}% encrypted")
        
        if encryption_rate < 100:
            print(f"    ⚠ Incomplete encryption: {field['table_name']}.{field['column_name']}")
    
    # 3. Check encryption key health
    key_health = await conn.fetchval("""
        SELECT COUNT(*) FROM encryption_keys 
        WHERE status = 'active' AND expires_at > NOW();
    """)
    
    if key_health > 0:
        print(f"\n✓ {key_health} active encryption keys available")
    else:
        print("\n✗ No active encryption keys found - CRITICAL")
    
    await conn.close()
    print("\nEncryption system monitoring completed")

# Run encryption monitoring
if __name__ == "__main__":
    asyncio.run(monitor_encryption_system())
```

### 3.5 Audit Trail Maintenance Operations

**Weekly Audit Trail Validation**:
```sql
-- Audit trail completeness verification
-- Run weekly to ensure audit trail integrity

-- 1. Check for audit trail gaps
SELECT 
    DATE_TRUNC('hour', expected_hour) as missing_hour
FROM (
    SELECT generate_series(
        DATE_TRUNC('hour', NOW() - INTERVAL '168 hours'),  -- 7 days
        DATE_TRUNC('hour', NOW()),
        INTERVAL '1 hour'
    ) as expected_hour
) expected
LEFT JOIN (
    SELECT DATE_TRUNC('hour', created_at) as audit_hour
    FROM audit_log
    WHERE created_at >= NOW() - INTERVAL '168 hours'
    GROUP BY DATE_TRUNC('hour', created_at)
) actual ON expected.expected_hour = actual.audit_hour
WHERE actual.audit_hour IS NULL
ORDER BY expected_hour DESC;

-- 2. Audit trail volume analysis
SELECT 
    DATE_TRUNC('day', created_at) as audit_date,
    table_name,
    operation_type,
    COUNT(*) as operation_count
FROM audit_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', created_at), table_name, operation_type
ORDER BY audit_date DESC, operation_count DESC;

-- 3. Suspicious activity detection
SELECT 
    user_id,
    COUNT(*) as operation_count,
    COUNT(DISTINCT table_name) as tables_affected,
    MIN(created_at) as first_operation,
    MAX(created_at) as last_operation
FROM audit_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
AND operation_type IN ('DELETE', 'UPDATE')
GROUP BY user_id
HAVING COUNT(*) > 100  -- More than 100 operations in 24h
ORDER BY operation_count DESC;
```

## 4. Multi-Layer Security Operations Maintenance

### 4.1 Authentication System Monitoring

**Daily Authentication Health Checks**:
```python
#!/usr/bin/env python3
"""Authentication system health monitoring"""

import asyncio
import asyncpg
from datetime import datetime, timedelta

async def monitor_authentication_system():
    """Monitor authentication system health and security"""
    
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    print(f"=== Authentication System Monitoring - {datetime.now()} ===")
    
    # 1. Login success/failure analysis
    auth_stats = await conn.fetch("""
        SELECT 
            success,
            COUNT(*) as attempt_count,
            COUNT(DISTINCT ip_address) as unique_ips,
            COUNT(DISTINCT user_email) as unique_users
        FROM auth_log
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY success;
    """)
    
    print("Authentication Statistics (24h):")
    for stat in auth_stats:
        status = "Success" if stat['success'] else "Failed"
        print(f"  {status}: {stat['attempt_count']} attempts, {stat['unique_users']} users, {stat['unique_ips']} IPs")
    
    # 2. Suspicious IP detection
    suspicious_ips = await conn.fetch("""
        SELECT 
            ip_address,
            COUNT(*) as failed_attempts,
            COUNT(DISTINCT user_email) as targeted_users,
            MIN(created_at) as first_attempt,
            MAX(created_at) as last_attempt
        FROM auth_log
        WHERE success = false 
        AND created_at >= NOW() - INTERVAL '1 hour'
        GROUP BY ip_address
        HAVING COUNT(*) >= 5  -- 5+ failed attempts in 1 hour
        ORDER BY failed_attempts DESC;
    """)
    
    if suspicious_ips:
        print(f"\n⚠ Suspicious IP Activity ({len(suspicious_ips)} IPs):")
        for ip in suspicious_ips:
            print(f"  {ip['ip_address']}: {ip['failed_attempts']} failed attempts, {ip['targeted_users']} users targeted")
    else:
        print("\n✓ No suspicious IP activity detected")
    
    # 3. Session management health
    active_sessions = await conn.fetchval("""
        SELECT COUNT(*) FROM user_sessions 
        WHERE expires_at > NOW() AND is_active = true;
    """)
    
    expired_sessions = await conn.fetchval("""
        SELECT COUNT(*) FROM user_sessions 
        WHERE expires_at <= NOW() AND is_active = true;
    """)
    
    print(f"\nSession Management:")
    print(f"  Active sessions: {active_sessions}")
    print(f"  Expired sessions needing cleanup: {expired_sessions}")
    
    # Cleanup expired sessions
    if expired_sessions > 0:
        await conn.execute("""
            UPDATE user_sessions 
            SET is_active = false 
            WHERE expires_at <= NOW() AND is_active = true;
        """)
        print(f"  ✓ Cleaned up {expired_sessions} expired sessions")
    
    # 4. JWT token validation
    recent_token_issues = await conn.fetchval("""
        SELECT COUNT(*) FROM auth_log
        WHERE success = true 
        AND created_at >= NOW() - INTERVAL '1 hour';
    """)
    
    print(f"\n✓ {recent_token_issues} successful authentications in last hour")
    
    await conn.close()
    print("\nAuthentication system monitoring completed")

# Run authentication monitoring
if __name__ == "__main__":
    asyncio.run(monitor_authentication_system())
```

### 4.2 Access Control Validation

**Weekly Access Control Audit**:
```sql
-- Access control and permissions audit
-- Run weekly to validate security framework

-- 1. User role distribution
SELECT 
    role,
    COUNT(*) as user_count,
    COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '30 days') as active_users
FROM users
GROUP BY role
ORDER BY user_count DESC;

-- 2. Permission usage analysis
SELECT 
    permission_name,
    COUNT(DISTINCT user_id) as users_with_permission,
    COUNT(*) FILTER (WHERE last_used >= NOW() - INTERVAL '7 days') as recent_usage
FROM user_permissions
JOIN permissions ON user_permissions.permission_id = permissions.id
GROUP BY permission_name
ORDER BY users_with_permission DESC;

-- 3. Administrative access review
SELECT 
    u.email,
    u.role,
    u.last_login,
    COUNT(DISTINCT p.permission_name) as permission_count
FROM users u
JOIN user_permissions up ON u.id = up.user_id
JOIN permissions p ON up.permission_id = p.id
WHERE u.role IN ('admin', 'superuser')
GROUP BY u.id, u.email, u.role, u.last_login
ORDER BY permission_count DESC;
```

## 5. Performance Optimization System Operations

### 5.1 Real-Time Performance Dashboard Maintenance

**Continuous Performance Monitoring Setup**:
```bash
#!/bin/bash
# Performance monitoring daemon setup

# Create performance monitoring service
sudo tee /etc/systemd/system/kingston-performance-monitor.service > /dev/null <<EOF
[Unit]
Description=Kingston Portal Performance Monitor
After=network.target

[Service]
Type=simple
User=kingstons_app
WorkingDirectory=/opt/kingston-portal/monitoring
ExecStart=/usr/bin/python3 /opt/kingston-portal/monitoring/performance_monitor.py
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

# Enable and start monitoring service
sudo systemctl enable kingston-performance-monitor.service
sudo systemctl start kingston-performance-monitor.service

echo "Performance monitoring service configured and started"
echo "Monitor logs: journalctl -u kingston-performance-monitor.service -f"
```

### 5.2 Capacity Planning Operations

**Monthly Capacity Assessment**:
```python
#!/usr/bin/env python3
"""Monthly capacity planning and scaling assessment"""

import asyncio
import asyncpg
import psutil
from datetime import datetime, timedelta

async def assess_system_capacity():
    """Assess system capacity and scaling needs"""
    
    print(f"=== System Capacity Assessment - {datetime.now()} ===")
    
    # 1. Database growth analysis
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    db_growth = await conn.fetch("""
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
            n_tup_ins as inserts_total,
            n_tup_upd as updates_total,
            n_tup_del as deletes_total
        FROM pg_stat_user_tables
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
        LIMIT 10;
    """)
    
    print("Database Size Analysis (Top 10 tables):")
    for table in db_growth:
        print(f"  {table['tablename']}: {table['size']} ({table['inserts_total']} inserts)")
    
    # 2. System resource trends
    cpu_usage = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('C:' if os.name == 'nt' else '/')
    
    print(f"\nCurrent Resource Utilization:")
    print(f"  CPU: {cpu_usage}%")
    print(f"  Memory: {memory.percent}% ({memory.available // 1024**3}GB available)")
    print(f"  Disk: {(disk.used / disk.total) * 100:.1f}% ({disk.free // 1024**3}GB free)")
    
    # 3. User capacity analysis
    user_activity = await conn.fetch("""
        SELECT 
            DATE_TRUNC('day', created_at) as activity_date,
            COUNT(DISTINCT user_id) as active_users,
            COUNT(*) as total_operations
        FROM audit_log
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY activity_date DESC
        LIMIT 7;
    """)
    
    print(f"\nUser Activity Trends (7 days):")
    for day in user_activity:
        print(f"  {day['activity_date'].strftime('%Y-%m-%d')}: {day['active_users']} users, {day['total_operations']} operations")
    
    # 4. Performance trend analysis
    slow_queries = await conn.fetchval("""
        SELECT COUNT(*) FROM pg_stat_statements 
        WHERE mean_time > 1000;  -- Queries > 1 second
    """)
    
    print(f"\nPerformance Indicators:")
    print(f"  Slow queries (>1s): {slow_queries}")
    
    # 5. Scaling recommendations
    recommendations = []
    
    if cpu_usage > 80:
        recommendations.append("Consider CPU scaling - usage above 80%")
    
    if memory.percent > 85:
        recommendations.append("Consider memory scaling - usage above 85%")
    
    if (disk.used / disk.total) * 100 > 90:
        recommendations.append("Consider storage scaling - usage above 90%")
    
    if slow_queries > 10:
        recommendations.append(f"Performance optimization needed - {slow_queries} slow queries")
    
    if recommendations:
        print(f"\nScaling Recommendations:")
        for rec in recommendations:
            print(f"  • {rec}")
    else:
        print(f"\n✓ System capacity adequate - no immediate scaling required")
    
    await conn.close()
    print("\nCapacity assessment completed")

# Run capacity assessment
if __name__ == "__main__":
    asyncio.run(assess_system_capacity())
```

## 6. Documentation Maintenance Process

When updating documentation:

1. **Review Related Files**: Check if changes affect other documentation files
2. **Update Cross-References**: Ensure internal links remain accurate
3. **Test Examples**: Verify code examples and commands still work
4. **Version Tracking**: Use git commits to track documentation changes
5. **Enhanced System Impact**: Assess impact on all Phase 2-6 enhanced components
6. **Security Consideration**: Evaluate security implications of any changes
7. **Performance Impact**: Assess performance implications and update monitoring
8. **Compliance Review**: Ensure changes maintain regulatory compliance

For version control practices, see the [Git Workflow](../04_development_workflow/01_git_workflow.md) documentation. 