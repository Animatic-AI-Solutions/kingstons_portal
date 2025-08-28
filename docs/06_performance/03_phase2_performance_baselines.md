# Phase 2 Performance Baselines

## Overview

This document establishes performance baselines for Kingston's Portal Phase 2 implementation. These metrics serve as the foundation for measuring system performance changes and ensuring the ±25% performance tolerance requirement is maintained throughout the rollout.

## Table of Contents

1. [Current System Performance Metrics](#current-system-performance-metrics)
2. [Phase 2 Performance Targets](#phase-2-performance-targets)
3. [Monitoring Framework Setup](#monitoring-framework-setup)
4. [Baseline Establishment Procedures](#baseline-establishment-procedures)
5. [Performance Testing Methodology](#performance-testing-methodology)
6. [Regression Detection](#regression-detection)

---

## Current System Performance Metrics

### Backend API Performance

#### Existing API Route Baselines (22 Routes)
| Route Category | Endpoint Examples | Target Response Time | Current Baseline |
|----------------|-------------------|---------------------|------------------|
| Client Management | `/api/clients`, `/api/client_groups` | <200ms | **Baseline Required** |
| Product Operations | `/api/products`, `/api/portfolios` | <300ms | **Baseline Required** |
| Fund Management | `/api/funds`, `/api/valuations` | <250ms | **Baseline Required** |
| Analytics | `/api/analytics/*` | <500ms | **67s→2s optimized** |
| Bulk Operations | `/api/bulk_client_data` | <2s | **Baseline Required** |

#### Database Query Performance
| Operation Type | Query Pattern | Target Time | Current Baseline |
|----------------|---------------|-------------|------------------|
| Simple Lookups | Single table SELECT | <50ms | **Baseline Required** |
| Portfolio Aggregations | Multi-table JOIN | <200ms | **Baseline Required** |
| IRR Calculations | Complex mathematical operations | <1s | **Baseline Required** |
| Bulk Data Retrieval | Large dataset operations | <3s | **Baseline Required** |

### Frontend Performance

#### Page Load Performance (38 Pages)
| Page Category | Component Count | Target Load Time | Current Baseline |
|---------------|-----------------|------------------|------------------|
| Dashboard | 10-15 components | <1s | **Baseline Required** |
| Client Details | 20+ components | <1.5s | **Baseline Required** |
| Reports | 15-25 components | <2s | **Baseline Required** |
| Analytics | 8-12 components | <1s | **2s (optimized)** |

#### Component Performance
| Component Type | Usage Frequency | Target Render Time | Current Baseline |
|----------------|-----------------|-------------------|------------------|
| DataTable | High (>50 instances) | <100ms | **Baseline Required** |
| SearchableDropdown | Medium (20-30 instances) | <50ms | **Baseline Required** |
| FundDistributionChart | Low (<10 instances) | <300ms | **Baseline Required** |
| StatBox/StatCard | High (>100 instances) | <25ms | **Baseline Required** |

### System Resource Usage

#### Current Capacity Metrics
| Resource | Current Usage | Maximum Capacity | Utilization % |
|----------|---------------|------------------|---------------|
| Concurrent Users | 4 users | 4 users (design limit) | 100% |
| Database Connections | **Baseline Required** | 20 connections | **TBD** |
| Memory Usage (Backend) | **Baseline Required** | 2GB allocated | **TBD** |
| Memory Usage (Frontend) | **Baseline Required** | Browser dependent | **TBD** |

---

## Phase 2 Performance Targets

### Enhanced API Performance Targets

#### New API Endpoints
| New Endpoint | Operation Type | Target Response Time | SLA Requirement |
|--------------|----------------|---------------------|------------------|
| Enhanced Client Details | Complex aggregation | <500ms | 95% compliance |
| Advanced Search | Full-text search | <1s | 90% compliance |
| Real-time Collaboration | WebSocket operations | <100ms latency | 99% compliance |
| JSON Query Engine | Dynamic filtering | <2s | 90% compliance |

#### Database Migration Performance
| Migration Operation | Target Duration | Rollback Time | Downtime Window |
|-------------------|-----------------|---------------|-----------------|
| Schema Updates | <30 minutes | <10 minutes | Maintenance window |
| Data Migration | <2 hours | <1 hour | Off-hours |
| Index Creation | <45 minutes | <15 minutes | Background operation |

### Frontend Enhancement Targets

#### Enhanced User Experience
| Feature | Performance Target | User Experience Goal |
|---------|-------------------|---------------------|
| Enhanced Client Details Page | <500ms load time | Instant navigation feel |
| Real-time Updates | <200ms update propagation | Seamless collaboration |
| Advanced Filtering | <1s filter application | Responsive interaction |
| Report Generation | <3s for standard reports | Acceptable wait time |

### Scalability Targets

#### Concurrent User Support
| Metric | Current Limit | Phase 2 Target | Infrastructure Requirement |
|---------|---------------|----------------|---------------------------|
| Maximum Users | 4 concurrent | 8-12 concurrent | Database connection scaling |
| Session Duration | Unlimited | Unlimited | Session management optimization |
| Concurrent Report Generation | 2 reports | 5 reports | Background processing |

---

## Monitoring Framework Setup

### Performance Monitoring Tools

#### Backend Monitoring
```python
# FastAPI middleware for request timing
from fastapi import Request
import time

async def performance_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    # Log performance metrics
    logger.info(f"Route: {request.url.path}, Duration: {process_time:.3f}s")
    return response
```

#### Frontend Performance Tracking
```typescript
// React performance monitoring
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Log to console during baseline establishment
  console.log('Performance Metric:', metric);
  
  // Future: Send to monitoring service
  // analytics.track('performance', metric);
}

// Track Core Web Vitals
getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

#### Database Performance Monitoring
```sql
-- PostgreSQL query performance tracking
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor slow queries
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements
WHERE mean_time > 100
ORDER BY mean_time DESC
LIMIT 10;
```

### Alerting Configuration

#### Performance Alert Thresholds
| Metric | Warning Threshold | Critical Threshold | Action Required |
|--------|-------------------|-------------------|-----------------|
| API Response Time | >500ms | >2s | Investigate immediately |
| Database Query Time | >1s | >5s | Review query optimization |
| Page Load Time | >3s | >10s | Check frontend performance |
| Error Rate | >1% | >5% | Emergency response |

#### Alert Escalation Procedures
1. **Warning Level**: Log to monitoring system, notify development team
2. **Critical Level**: Page on-call engineer, initiate incident response
3. **Emergency Level**: Escalate to system administrator, consider rollback

### Performance SLA Definitions

#### Service Level Agreements
| Service | Availability | Response Time | Error Rate |
|---------|-------------|---------------|------------|
| Core API | 99.5% | <500ms (95th percentile) | <0.5% |
| Frontend Application | 99.0% | <3s page load | <1% JavaScript errors |
| Database | 99.9% | <200ms query time | <0.1% failed queries |
| Real-time Features | 99.0% | <100ms latency | <2% connection drops |

---

## Baseline Establishment Procedures

### Pre-Implementation Baseline Capture

#### Step 1: Environment Preparation
```bash
# Ensure system is in steady state
# Stop unnecessary processes
# Clear logs for clean measurement
sudo systemctl status nginx postgresql
```

#### Step 2: Backend Performance Baseline
```bash
# API endpoint performance testing
# Run from backend/ directory
pip install locust

# Create baseline test script
cat > baseline_test.py << 'EOF'
from locust import HttpUser, task, between

class BaselineUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login and get auth token
        response = self.client.post("/api/auth/login", json={
            "username": "test_user",
            "password": "test_password"
        })
        
    @task(3)
    def test_clients_list(self):
        self.client.get("/api/clients")
        
    @task(2)
    def test_client_details(self):
        self.client.get("/api/clients/1")
        
    @task(1)
    def test_analytics(self):
        self.client.get("/api/analytics/dashboard")
EOF

# Run baseline test
locust -f baseline_test.py --host=http://127.0.0.1:8001
```

#### Step 3: Frontend Performance Baseline
```bash
# Frontend performance measurement
# Run from frontend/ directory
npm install lighthouse-cli --save-dev

# Run Lighthouse audits on key pages
npx lighthouse http://localhost:3000 --output json --output-path ./baseline/dashboard.json
npx lighthouse http://localhost:3000/clients --output json --output-path ./baseline/clients.json
npx lighthouse http://localhost:3000/reports --output json --output-path ./baseline/reports.json
```

#### Step 4: Database Performance Baseline
```sql
-- Capture database performance baseline
-- Run during typical usage period

-- Reset statistics
SELECT pg_stat_reset();

-- Wait for typical usage period (1 hour recommended)
-- Then capture baseline metrics

-- Query performance baseline
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    avg_width
FROM pg_stats 
WHERE schemaname = 'public';

-- Index usage baseline  
SELECT 
    indexrelname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Baseline Documentation Template

#### Performance Baseline Report
```markdown
# Performance Baseline Report
Date: [YYYY-MM-DD]
Environment: [Development/Staging/Production]
System Load: [Light/Medium/Heavy]

## API Performance Results
- Average response time: XXXms
- 95th percentile: XXXms  
- Maximum response time: XXXms
- Requests per second: XXX

## Frontend Performance Results
- First Contentful Paint: XXXms
- Largest Contentful Paint: XXXms
- Cumulative Layout Shift: X.XXX
- First Input Delay: XXXms

## Database Performance Results
- Average query time: XXXms
- Slowest queries: [List top 5]
- Index hit ratio: XX.X%
- Connection usage: XX/XX

## Resource Utilization
- CPU usage: XX%
- Memory usage: X.XGB
- Disk I/O: XXX ops/sec
- Network throughput: XXX MB/s
```

---

## Performance Testing Methodology

### Load Testing Strategy

#### Test Scenarios
1. **Normal Load Testing**
   - 4 concurrent users (current capacity)
   - Typical usage patterns
   - 1-hour sustained load

2. **Stress Testing**  
   - 8-12 concurrent users (Phase 2 target)
   - Peak usage simulation
   - 30-minute stress test

3. **Spike Testing**
   - Sudden load increase simulation
   - Recovery time measurement
   - System stability validation

#### Test Data Preparation
```sql
-- Create performance test dataset
-- Scale up existing data for realistic testing

INSERT INTO clients (name, type, created_at)
SELECT 
    'Test Client ' || generate_series,
    'individual',
    NOW() - (random() * interval '365 days')
FROM generate_series(1, 1000);

-- Add portfolio and fund data proportionally
-- Ensure data relationships maintain integrity
```

### Automated Performance Regression Detection

#### Continuous Performance Monitoring
```python
# Performance regression detection
import json
from datetime import datetime, timedelta

class PerformanceRegression:
    def __init__(self, baseline_file):
        with open(baseline_file, 'r') as f:
            self.baseline = json.load(f)
    
    def check_regression(self, current_metrics):
        regressions = []
        tolerance = 0.25  # ±25% tolerance
        
        for metric, baseline_value in self.baseline.items():
            current_value = current_metrics.get(metric, 0)
            
            if current_value > baseline_value * (1 + tolerance):
                regression_percent = ((current_value - baseline_value) / baseline_value) * 100
                regressions.append({
                    'metric': metric,
                    'baseline': baseline_value,
                    'current': current_value,
                    'regression_percent': regression_percent
                })
        
        return regressions

    def alert_on_regression(self, regressions):
        if regressions:
            print("🚨 PERFORMANCE REGRESSION DETECTED")
            for reg in regressions:
                print(f"- {reg['metric']}: {reg['regression_percent']:.1f}% slower")
```

---

## Regression Detection

### Automated Monitoring Setup

#### Performance Dashboard Configuration
```javascript
// Real-time performance dashboard component
const PerformanceDashboard = () => {
  const [metrics, setMetrics] = useState({});
  const [baseline, setBaseline] = useState({});
  
  useEffect(() => {
    const fetchMetrics = async () => {
      const response = await fetch('/api/performance/metrics');
      const currentMetrics = await response.json();
      setMetrics(currentMetrics);
      
      // Compare with baseline
      const regressions = detectRegressions(baseline, currentMetrics);
      if (regressions.length > 0) {
        notifyPerformanceTeam(regressions);
      }
    };
    
    // Update every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [baseline]);
  
  return (
    <div className="performance-dashboard">
      <MetricCard title="API Response Time" value={metrics.apiResponseTime} />
      <MetricCard title="Page Load Time" value={metrics.pageLoadTime} />
      <MetricCard title="Database Query Time" value={metrics.dbQueryTime} />
      <RegressionAlerts regressions={detectRegressions(baseline, metrics)} />
    </div>
  );
};
```

#### Alert Integration
```python
# Integration with notification systems
async def send_performance_alert(regression_data):
    """Send performance regression alert to development team"""
    
    alert_message = f"""
    🚨 Performance Regression Detected
    
    Metric: {regression_data['metric']}
    Baseline: {regression_data['baseline']}ms
    Current: {regression_data['current']}ms
    Regression: {regression_data['regression_percent']:.1f}%
    
    Threshold: ±25% tolerance exceeded
    Action Required: Investigate immediately
    """
    
    # Send to monitoring service
    await notify_team("performance-alerts", alert_message)
    
    # Log to audit trail
    logger.error(f"Performance regression: {regression_data}")
```

### Manual Performance Review Process

#### Weekly Performance Review Checklist
- [ ] Review automated performance metrics
- [ ] Compare against established baselines
- [ ] Identify any degradation trends
- [ ] Verify monitoring system health
- [ ] Update baseline metrics if system changes occurred
- [ ] Document any performance improvements or optimizations
- [ ] Plan performance improvement initiatives

#### Monthly Performance Assessment
- [ ] Comprehensive performance report generation
- [ ] Stakeholder performance review meeting
- [ ] Performance target adjustment (if needed)
- [ ] Capacity planning review
- [ ] Performance testing schedule review
- [ ] Monitoring tool effectiveness assessment

---

## Implementation Timeline

### Phase 2 Performance Baseline Schedule

#### Week 1: Baseline Establishment
- **Day 1-2**: Install monitoring tools and configure metrics collection
- **Day 3-4**: Run comprehensive baseline tests on current system
- **Day 5**: Document baseline metrics and establish alert thresholds

#### Week 2: Monitoring Framework
- **Day 1-2**: Implement automated performance monitoring
- **Day 3-4**: Configure alert systems and notification workflows  
- **Day 5**: Test regression detection and alert mechanisms

#### Week 3: Validation and Documentation
- **Day 1-2**: Validate baseline accuracy through repeated testing
- **Day 3-4**: Create performance monitoring documentation
- **Day 5**: Training session for development team on monitoring tools

### Success Criteria
- [ ] All current system performance metrics documented
- [ ] Automated monitoring system operational
- [ ] Alert thresholds configured and tested
- [ ] Development team trained on performance monitoring
- [ ] Performance regression detection validated
- [ ] Baseline documentation completed and approved

---

## Conclusion

This performance baseline documentation provides the foundation for successful Phase 2 implementation while maintaining system performance within acceptable tolerances. The established monitoring framework will enable proactive identification and resolution of performance issues throughout the development and deployment process.

**Next Steps:**
1. Execute baseline establishment procedures
2. Implement monitoring framework
3. Validate regression detection systems
4. Begin Phase 2 development with continuous performance tracking

For questions or clarification on performance baseline procedures, refer to the development team or system architecture documentation in `docs/03_architecture/`.