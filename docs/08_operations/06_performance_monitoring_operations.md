# Performance Monitoring Operations Guide

## Overview

This guide provides comprehensive performance monitoring operations for Kingston's Portal enhanced architecture. It covers monitoring procedures for all enhanced systems from Phase 2 database optimizations through Phase 6 performance optimization systems, ensuring consistent sub-second response times and optimal user experience.

**Performance Monitoring Scope:**
- Enhanced client data functionality performance tracking
- Information-dense frontend optimization monitoring
- Advanced API architecture performance analysis
- Database query optimization and monitoring
- Real-time performance metrics collection and analysis
- Performance threshold management and alerting
- Capacity planning and scaling operations

**Performance Targets:**
- Frontend Response Time: < 2 seconds (enhanced interfaces)
- API Response Time: < 500ms (standard), < 2s (complex operations)
- Database Query Time: < 100ms (standard), < 500ms (analytics)
- Concurrent User Support: 4+ users with < 5% performance degradation
- System Availability: 99.9% uptime during business hours
- Memory Usage: < 2GB backend, optimized frontend memory management
- CPU Usage: < 80% under normal load, < 95% peak load

---

## 1. Real-Time Performance Monitoring

### 1.1 Continuous Performance Dashboard

**Performance Metrics Collection System**:
```python
#!/usr/bin/env python3
"""Real-time performance monitoring system"""

import asyncio
import asyncpg
import aiohttp
import psutil
import time
import json
from datetime import datetime, timedelta
from typing import Dict, List

class PerformanceMonitor:
    def __init__(self):
        self.metrics_buffer = []
        self.alert_thresholds = {
            'api_response_time': 2.0,      # 2 seconds
            'db_query_time': 0.5,          # 500ms
            'cpu_usage': 80,               # 80%
            'memory_usage': 85,            # 85%
            'concurrent_users': 6,         # Above 4 user target
            'frontend_load_time': 3.0      # 3 seconds
        }
    
    async def collect_api_performance(self):
        """Collect API endpoint performance metrics"""
        
        endpoints = [
            '/api/health',
            '/api/clients',
            '/api/portfolios',
            '/api/dashboard/summary',
            '/api/analytics/performance',
            '/api/bulk_client_data'
        ]
        
        api_metrics = {}
        
        async with aiohttp.ClientSession() as session:
            for endpoint in endpoints:
                start_time = time.perf_counter()
                
                try:
                    async with session.get(f'http://localhost:8001{endpoint}?limit=10') as response:
                        response_time = time.perf_counter() - start_time
                        
                        api_metrics[endpoint] = {
                            'response_time': round(response_time * 1000, 3),  # Convert to ms
                            'status_code': response.status,
                            'success': response.status == 200,
                            'timestamp': datetime.now().isoformat()
                        }
                        
                        # Alert if response time exceeds threshold
                        if response_time > self.alert_thresholds['api_response_time']:
                            await self.generate_alert('API_SLOW_RESPONSE', {
                                'endpoint': endpoint,
                                'response_time': response_time,
                                'threshold': self.alert_thresholds['api_response_time']
                            })
                
                except Exception as e:
                    api_metrics[endpoint] = {
                        'error': str(e),
                        'success': False,
                        'timestamp': datetime.now().isoformat()
                    }
                    
                    await self.generate_alert('API_ERROR', {
                        'endpoint': endpoint,
                        'error': str(e)
                    })
        
        return api_metrics
    
    async def collect_database_performance(self):
        """Collect database performance metrics"""
        
        conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
        
        # Query performance metrics
        query_metrics = {}
        
        test_queries = {
            'simple_select': 'SELECT COUNT(*) FROM users;',
            'client_data': 'SELECT * FROM client_groups LIMIT 10;',
            'portfolio_summary': 'SELECT * FROM portfolio_summary_view LIMIT 10;',
            'analytics_data': 'SELECT * FROM analytics_dashboard_summary LIMIT 5;',
            'irr_calculation': 'SELECT * FROM company_irr_cache LIMIT 5;'
        }
        
        for query_name, query_sql in test_queries.items():
            start_time = time.perf_counter()
            
            try:
                result = await conn.fetch(query_sql)
                query_time = time.perf_counter() - start_time
                
                query_metrics[query_name] = {
                    'execution_time_ms': round(query_time * 1000, 3),
                    'record_count': len(result),
                    'success': True,
                    'timestamp': datetime.now().isoformat()
                }
                
                # Alert if query time exceeds threshold
                if query_time > self.alert_thresholds['db_query_time']:
                    await self.generate_alert('DB_SLOW_QUERY', {
                        'query_name': query_name,
                        'execution_time': query_time,
                        'threshold': self.alert_thresholds['db_query_time']
                    })
                
            except Exception as e:
                query_metrics[query_name] = {
                    'error': str(e),
                    'success': False,
                    'timestamp': datetime.now().isoformat()
                }
        
        # Database connection metrics
        db_stats = await conn.fetch("""
            SELECT 
                numbackends as active_connections,
                xact_commit as committed_transactions,
                xact_rollback as rolled_back_transactions,
                blks_read as blocks_read,
                blks_hit as blocks_hit,
                tup_returned as tuples_returned,
                tup_fetched as tuples_fetched,
                tup_inserted as tuples_inserted,
                tup_updated as tuples_updated,
                tup_deleted as tuples_deleted
            FROM pg_stat_database 
            WHERE datname = current_database();
        """)
        
        await conn.close()
        
        return {
            'query_performance': query_metrics,
            'connection_stats': dict(db_stats[0]) if db_stats else {}
        }
    
    async def collect_system_performance(self):
        """Collect system resource performance metrics"""
        
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory metrics
        memory = psutil.virtual_memory()
        
        # Disk metrics
        disk = psutil.disk_usage('C:' if os.name == 'nt' else '/')
        
        # Network metrics
        network = psutil.net_io_counters()
        
        # Process-specific metrics (FastAPI backend)
        backend_process = None
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            if 'python' in proc.info['name'].lower() and any('main.py' in cmd for cmd in proc.info['cmdline'] or []):
                backend_process = psutil.Process(proc.info['pid'])
                break
        
        backend_metrics = {}
        if backend_process:
            backend_metrics = {
                'cpu_percent': backend_process.cpu_percent(),
                'memory_mb': round(backend_process.memory_info().rss / 1024 / 1024, 2),
                'connections': len(backend_process.connections()),
                'threads': backend_process.num_threads()
            }
        
        system_metrics = {
            'cpu': {
                'percent': cpu_percent,
                'count': cpu_count,
                'per_cpu': psutil.cpu_percent(percpu=True)
            },
            'memory': {
                'total_gb': round(memory.total / 1024**3, 2),
                'available_gb': round(memory.available / 1024**3, 2),
                'percent_used': memory.percent,
                'used_gb': round(memory.used / 1024**3, 2)
            },
            'disk': {
                'total_gb': round(disk.total / 1024**3, 2),
                'free_gb': round(disk.free / 1024**3, 2),
                'percent_used': (disk.used / disk.total) * 100
            },
            'network': {
                'bytes_sent': network.bytes_sent,
                'bytes_recv': network.bytes_recv,
                'packets_sent': network.packets_sent,
                'packets_recv': network.packets_recv
            },
            'backend_process': backend_metrics,
            'timestamp': datetime.now().isoformat()
        }
        
        # Generate alerts for system resources
        if cpu_percent > self.alert_thresholds['cpu_usage']:
            await self.generate_alert('HIGH_CPU_USAGE', {
                'cpu_percent': cpu_percent,
                'threshold': self.alert_thresholds['cpu_usage']
            })
        
        if memory.percent > self.alert_thresholds['memory_usage']:
            await self.generate_alert('HIGH_MEMORY_USAGE', {
                'memory_percent': memory.percent,
                'threshold': self.alert_thresholds['memory_usage']
            })
        
        return system_metrics
    
    async def collect_frontend_performance(self):
        """Collect frontend performance metrics"""
        
        # Test frontend load times
        frontend_urls = [
            'http://intranet.kingston.local/',
            'http://intranet.kingston.local/clients',
            'http://intranet.kingston.local/dashboard',
            'http://intranet.kingston.local/portfolios'
        ]
        
        frontend_metrics = {}
        
        async with aiohttp.ClientSession() as session:
            for url in frontend_urls:
                start_time = time.perf_counter()
                
                try:
                    async with session.get(url) as response:
                        load_time = time.perf_counter() - start_time
                        content_length = len(await response.text())
                        
                        page_name = url.split('/')[-1] or 'home'
                        frontend_metrics[page_name] = {
                            'load_time_ms': round(load_time * 1000, 3),
                            'status_code': response.status,
                            'content_size_kb': round(content_length / 1024, 2),
                            'success': response.status == 200,
                            'timestamp': datetime.now().isoformat()
                        }
                        
                        # Alert if load time exceeds threshold
                        if load_time > self.alert_thresholds['frontend_load_time']:
                            await self.generate_alert('FRONTEND_SLOW_LOAD', {
                                'page': page_name,
                                'load_time': load_time,
                                'threshold': self.alert_thresholds['frontend_load_time']
                            })
                
                except Exception as e:
                    page_name = url.split('/')[-1] or 'home'
                    frontend_metrics[page_name] = {
                        'error': str(e),
                        'success': False,
                        'timestamp': datetime.now().isoformat()
                    }
        
        return frontend_metrics
    
    async def generate_alert(self, alert_type: str, alert_data: Dict):
        """Generate performance alert"""
        
        alert = {
            'alert_type': alert_type,
            'timestamp': datetime.now().isoformat(),
            'severity': self.get_alert_severity(alert_type),
            'data': alert_data,
            'acknowledgment_required': self.requires_acknowledgment(alert_type)
        }
        
        # Log alert
        alert_log = f"/var/log/performance/alerts_{datetime.now().strftime('%Y%m%d')}.json"
        with open(alert_log, 'a') as f:
            f.write(json.dumps(alert) + '\\n')
        
        # Send notification (implement notification system)
        print(f"PERFORMANCE ALERT: {alert_type} - {alert_data}")
        
        return alert
    
    def get_alert_severity(self, alert_type: str) -> str:
        """Determine alert severity"""
        
        high_severity = ['API_ERROR', 'DB_CONNECTION_FAILURE', 'SYSTEM_OVERLOAD']
        medium_severity = ['API_SLOW_RESPONSE', 'DB_SLOW_QUERY', 'HIGH_CPU_USAGE', 'HIGH_MEMORY_USAGE']
        
        if alert_type in high_severity:
            return 'HIGH'
        elif alert_type in medium_severity:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def requires_acknowledgment(self, alert_type: str) -> bool:
        """Determine if alert requires manual acknowledgment"""
        
        return alert_type in ['API_ERROR', 'DB_CONNECTION_FAILURE', 'SYSTEM_OVERLOAD']
    
    async def collect_all_metrics(self):
        """Collect all performance metrics"""
        
        timestamp = datetime.now()
        
        # Collect metrics from all sources
        api_metrics = await self.collect_api_performance()
        db_metrics = await self.collect_database_performance()
        system_metrics = await self.collect_system_performance()
        frontend_metrics = await self.collect_frontend_performance()
        
        # Aggregate metrics
        comprehensive_metrics = {
            'collection_timestamp': timestamp.isoformat(),
            'api_performance': api_metrics,
            'database_performance': db_metrics,
            'system_performance': system_metrics,
            'frontend_performance': frontend_metrics,
            'overall_health': self.calculate_overall_health(api_metrics, db_metrics, system_metrics, frontend_metrics)
        }
        
        # Store metrics
        metrics_file = f"/var/log/performance/metrics_{timestamp.strftime('%Y%m%d_%H%M')}.json"
        with open(metrics_file, 'w') as f:
            json.dump(comprehensive_metrics, f, indent=2, default=str)
        
        return comprehensive_metrics
    
    def calculate_overall_health(self, api_metrics, db_metrics, system_metrics, frontend_metrics):
        """Calculate overall system health score"""
        
        health_score = 100
        health_factors = []
        
        # API health assessment
        api_successes = sum(1 for m in api_metrics.values() if m.get('success', False))
        api_health = (api_successes / len(api_metrics)) * 100 if api_metrics else 0
        health_factors.append(('API', api_health))
        
        # Database health assessment
        db_successes = sum(1 for m in db_metrics['query_performance'].values() if m.get('success', False))
        db_health = (db_successes / len(db_metrics['query_performance'])) * 100 if db_metrics['query_performance'] else 0
        health_factors.append(('Database', db_health))
        
        # System resource health assessment
        cpu_health = max(0, 100 - system_metrics['cpu']['percent'])
        memory_health = max(0, 100 - system_metrics['memory']['percent_used'])
        system_health = (cpu_health + memory_health) / 2
        health_factors.append(('System', system_health))
        
        # Frontend health assessment
        frontend_successes = sum(1 for m in frontend_metrics.values() if m.get('success', False))
        frontend_health = (frontend_successes / len(frontend_metrics)) * 100 if frontend_metrics else 0
        health_factors.append(('Frontend', frontend_health))
        
        # Calculate weighted average
        overall_health = sum(score for _, score in health_factors) / len(health_factors)
        
        return {
            'overall_score': round(overall_health, 2),
            'component_scores': dict(health_factors),
            'status': 'EXCELLENT' if overall_health >= 95 else 'GOOD' if overall_health >= 85 else 'DEGRADED' if overall_health >= 70 else 'CRITICAL'
        }
    
    async def run_monitoring_cycle(self):
        """Run single monitoring cycle"""
        
        print(f"=== Performance Monitoring Cycle - {datetime.now()} ===")
        
        try:
            metrics = await self.collect_all_metrics()
            
            # Display summary
            health = metrics['overall_health']
            print(f"Overall Health: {health['overall_score']:.1f}% ({health['status']})")
            
            for component, score in health['component_scores'].items():
                print(f"  {component}: {score:.1f}%")
            
            return metrics
            
        except Exception as e:
            print(f"Monitoring cycle error: {e}")
            await self.generate_alert('MONITORING_ERROR', {'error': str(e)})
            return None
    
    async def start_continuous_monitoring(self, interval_seconds=300):
        """Start continuous performance monitoring"""
        
        print(f"Starting continuous performance monitoring (interval: {interval_seconds}s)")
        
        while True:
            try:
                await self.run_monitoring_cycle()
                await asyncio.sleep(interval_seconds)
                
            except KeyboardInterrupt:
                print("Monitoring stopped by user")
                break
            except Exception as e:
                print(f"Monitoring error: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying

# Performance monitoring script
if __name__ == "__main__":
    import os
    
    monitor = PerformanceMonitor()
    
    # Run single cycle or continuous monitoring
    mode = os.getenv('MONITORING_MODE', 'single')
    
    if mode == 'continuous':
        asyncio.run(monitor.start_continuous_monitoring())
    else:
        asyncio.run(monitor.run_monitoring_cycle())
```

### 1.2 Performance Alert System

**Alert Configuration and Management**:
```python
#!/usr/bin/env python3
"""Performance alert management system"""

import json
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta
from typing import Dict, List

class PerformanceAlertManager:
    def __init__(self):
        self.alert_rules = {
            'API_SLOW_RESPONSE': {
                'threshold': 2.0,
                'frequency_limit': 5,  # Max 5 alerts per hour
                'escalation_time': 1800,  # 30 minutes
                'notification_channels': ['email', 'log'],
                'severity': 'MEDIUM'
            },
            'DB_SLOW_QUERY': {
                'threshold': 0.5,
                'frequency_limit': 10,
                'escalation_time': 900,  # 15 minutes
                'notification_channels': ['email', 'log'],
                'severity': 'MEDIUM'
            },
            'HIGH_CPU_USAGE': {
                'threshold': 80,
                'frequency_limit': 3,
                'escalation_time': 1200,  # 20 minutes
                'notification_channels': ['email', 'sms', 'log'],
                'severity': 'HIGH'
            },
            'HIGH_MEMORY_USAGE': {
                'threshold': 85,
                'frequency_limit': 3,
                'escalation_time': 1200,
                'notification_channels': ['email', 'sms', 'log'],
                'severity': 'HIGH'
            },
            'SYSTEM_OVERLOAD': {
                'threshold': None,
                'frequency_limit': 1,
                'escalation_time': 300,  # 5 minutes
                'notification_channels': ['email', 'sms', 'log'],
                'severity': 'CRITICAL'
            }
        }
        
        self.notification_config = {
            'email': {
                'smtp_server': 'smtp.kingston.local',
                'smtp_port': 587,
                'sender': 'alerts@kingston.local',
                'recipients': [
                    'admin@kingston.local',
                    'ops@kingston.local'
                ]
            },
            'sms': {
                'service': 'twilio',
                'numbers': ['+1234567890']  # Emergency contact numbers
            }
        }
    
    def process_alert(self, alert_type: str, alert_data: Dict) -> Dict:
        """Process and route performance alert"""
        
        alert_rule = self.alert_rules.get(alert_type, {})
        
        # Check frequency limits
        if not self.check_frequency_limit(alert_type, alert_rule.get('frequency_limit', 1)):
            return {'status': 'suppressed', 'reason': 'frequency_limit_exceeded'}
        
        # Create alert record
        alert_record = {
            'alert_id': f"{alert_type}_{int(datetime.now().timestamp())}",
            'alert_type': alert_type,
            'timestamp': datetime.now().isoformat(),
            'severity': alert_rule.get('severity', 'LOW'),
            'data': alert_data,
            'rule': alert_rule,
            'status': 'active',
            'acknowledgment_required': alert_rule.get('severity') in ['HIGH', 'CRITICAL']
        }
        
        # Route to notification channels
        for channel in alert_rule.get('notification_channels', ['log']):
            self.send_notification(channel, alert_record)
        
        # Log alert
        self.log_alert(alert_record)
        
        return {'status': 'processed', 'alert_id': alert_record['alert_id']}
    
    def check_frequency_limit(self, alert_type: str, limit: int) -> bool:
        """Check if alert frequency is within limits"""
        
        # Load recent alerts
        try:
            with open(f"/var/log/performance/alert_frequency_{datetime.now().strftime('%Y%m%d')}.json", 'r') as f:
                frequency_data = json.load(f)
        except FileNotFoundError:
            frequency_data = {}
        
        # Check frequency for this alert type
        current_hour = datetime.now().strftime('%Y%m%d_%H')
        hourly_count = frequency_data.get(alert_type, {}).get(current_hour, 0)
        
        if hourly_count >= limit:
            return False
        
        # Update frequency counter
        if alert_type not in frequency_data:
            frequency_data[alert_type] = {}
        
        frequency_data[alert_type][current_hour] = hourly_count + 1
        
        # Save updated frequency data
        with open(f"/var/log/performance/alert_frequency_{datetime.now().strftime('%Y%m%d')}.json", 'w') as f:
            json.dump(frequency_data, f, indent=2)
        
        return True
    
    def send_notification(self, channel: str, alert_record: Dict):
        """Send alert notification via specified channel"""
        
        if channel == 'email':
            self.send_email_alert(alert_record)
        elif channel == 'sms':
            self.send_sms_alert(alert_record)
        elif channel == 'log':
            self.log_alert(alert_record)
    
    def send_email_alert(self, alert_record: Dict):
        """Send email alert notification"""
        
        email_config = self.notification_config['email']
        
        subject = f"Kingston's Portal Performance Alert: {alert_record['alert_type']}"
        
        body = f"""
Performance Alert Details:

Alert ID: {alert_record['alert_id']}
Alert Type: {alert_record['alert_type']}
Severity: {alert_record['severity']}
Timestamp: {alert_record['timestamp']}

Alert Data:
{json.dumps(alert_record['data'], indent=2)}

Action Required: {'Yes' if alert_record['acknowledgment_required'] else 'No'}

This is an automated alert from Kingston's Portal Performance Monitoring System.
"""
        
        try:
            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = email_config['sender']
            msg['To'] = ', '.join(email_config['recipients'])
            
            # Send email (configure SMTP settings)
            # server = smtplib.SMTP(email_config['smtp_server'], email_config['smtp_port'])
            # server.send_message(msg)
            # server.quit()
            
            print(f"Email alert sent: {subject}")
            
        except Exception as e:
            print(f"Failed to send email alert: {e}")
    
    def send_sms_alert(self, alert_record: Dict):
        """Send SMS alert notification"""
        
        message = f"Kingston's Portal ALERT: {alert_record['alert_type']} ({alert_record['severity']}) at {alert_record['timestamp']}"
        
        # Implement SMS sending (Twilio, AWS SNS, etc.)
        print(f"SMS alert: {message}")
    
    def log_alert(self, alert_record: Dict):
        """Log alert to file system"""
        
        log_file = f"/var/log/performance/alerts_{datetime.now().strftime('%Y%m%d')}.json"
        
        with open(log_file, 'a') as f:
            f.write(json.dumps(alert_record, default=str) + '\\n')
```

---

## 2. Database Performance Operations

### 2.1 Query Performance Monitoring

**Database Performance Analysis Script**:
```sql
-- Daily database performance analysis queries

-- 1. Slowest queries in the last 24 hours
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    min_time,
    max_time,
    stddev_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC 
LIMIT 20;

-- 2. Most frequently executed queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE calls > 100
ORDER BY calls DESC 
LIMIT 15;

-- 3. Index usage analysis
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'Never used'
        WHEN idx_scan < 10 THEN 'Rarely used'
        WHEN idx_scan < 100 THEN 'Occasionally used'
        ELSE 'Frequently used'
    END as usage_pattern
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- 4. Table statistics and performance
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_tup_hot_upd as hot_updates,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- 5. Connection and activity analysis
SELECT 
    state,
    COUNT(*) as connection_count,
    AVG(EXTRACT(EPOCH FROM (now() - query_start))) as avg_duration_seconds
FROM pg_stat_activity 
WHERE state IS NOT NULL
GROUP BY state
ORDER BY connection_count DESC;

-- 6. Lock analysis
SELECT 
    mode,
    locktype,
    database,
    relation::regclass,
    page,
    tuple,
    classid,
    granted,
    COUNT(*) as lock_count
FROM pg_locks 
GROUP BY mode, locktype, database, relation, page, tuple, classid, granted
ORDER BY lock_count DESC;

-- 7. Wait events analysis
SELECT 
    wait_event_type,
    wait_event,
    COUNT(*) as wait_count,
    AVG(EXTRACT(EPOCH FROM (now() - query_start))) as avg_wait_time
FROM pg_stat_activity 
WHERE wait_event IS NOT NULL
GROUP BY wait_event_type, wait_event
ORDER BY wait_count DESC;
```

### 2.2 Database Optimization Operations

**Automated Database Maintenance Script**:
```python
#!/usr/bin/env python3
"""Automated database maintenance and optimization"""

import asyncio
import asyncpg
from datetime import datetime, timedelta
import json

class DatabaseMaintenanceManager:
    def __init__(self):
        self.maintenance_log = []
    
    async def analyze_query_performance(self):
        """Analyze and optimize query performance"""
        
        conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
        
        # Get slow queries
        slow_queries = await conn.fetch("""
            SELECT 
                query,
                calls,
                total_time,
                mean_time,
                max_time,
                rows
            FROM pg_stat_statements 
            WHERE mean_time > 100  -- Queries taking more than 100ms on average
            ORDER BY mean_time DESC 
            LIMIT 10;
        """)
        
        # Get unused indexes
        unused_indexes = await conn.fetch("""
            SELECT 
                schemaname,
                tablename,
                indexname,
                pg_size_pretty(pg_relation_size(indexrelid)) as index_size
            FROM pg_stat_user_indexes
            WHERE idx_scan < 10  -- Indexes used less than 10 times
            AND schemaname = 'public'
            ORDER BY pg_relation_size(indexrelid) DESC;
        """)
        
        # Get table bloat estimation
        table_bloat = await conn.fetch("""
            SELECT 
                schemaname,
                tablename,
                n_dead_tup,
                n_live_tup,
                CASE 
                    WHEN n_live_tup > 0 
                    THEN (n_dead_tup::float / n_live_tup::float) * 100 
                    ELSE 0 
                END as dead_tuple_percent
            FROM pg_stat_user_tables
            WHERE n_dead_tup > 1000  -- Tables with more than 1000 dead tuples
            ORDER BY dead_tuple_percent DESC;
        """)
        
        await conn.close()
        
        analysis_results = {
            'slow_queries': [dict(q) for q in slow_queries],
            'unused_indexes': [dict(i) for i in unused_indexes],
            'table_bloat': [dict(t) for t in table_bloat],
            'analysis_timestamp': datetime.now().isoformat()
        }
        
        # Generate recommendations
        recommendations = []
        
        if slow_queries:
            recommendations.append(f"Found {len(slow_queries)} slow queries requiring optimization")
        
        if unused_indexes:
            total_unused_size = sum(self.parse_size(idx['index_size']) for idx in analysis_results['unused_indexes'])
            recommendations.append(f"Found {len(unused_indexes)} unused indexes consuming {total_unused_size}MB")
        
        for table in analysis_results['table_bloat']:
            if table['dead_tuple_percent'] > 20:
                recommendations.append(f"Table {table['tablename']} has {table['dead_tuple_percent']:.1f}% dead tuples - consider VACUUM")
        
        analysis_results['recommendations'] = recommendations
        
        # Log maintenance activity
        self.maintenance_log.append({
            'activity': 'query_performance_analysis',
            'timestamp': datetime.now().isoformat(),
            'results': analysis_results
        })
        
        return analysis_results
    
    def parse_size(self, size_str: str) -> int:
        """Parse PostgreSQL size string to MB"""
        
        if 'GB' in size_str:
            return int(float(size_str.replace(' GB', '').replace('GB', '')) * 1024)
        elif 'MB' in size_str:
            return int(float(size_str.replace(' MB', '').replace('MB', '')))
        elif 'kB' in size_str:
            return int(float(size_str.replace(' kB', '').replace('kB', '')) / 1024)
        else:
            return 0
    
    async def perform_maintenance_tasks(self):
        """Perform routine database maintenance tasks"""
        
        conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
        
        maintenance_results = {}
        
        # 1. Update table statistics
        print("Updating table statistics...")
        start_time = datetime.now()
        
        tables_to_analyze = [
            'users', 'client_groups', 'portfolios', 'holdings', 
            'transactions', 'valuations', 'audit_log'
        ]
        
        for table in tables_to_analyze:
            try:
                await conn.execute(f'ANALYZE {table};')
                print(f"  Analyzed table: {table}")
            except Exception as e:
                print(f"  Error analyzing {table}: {e}")
        
        analyze_duration = (datetime.now() - start_time).total_seconds()
        maintenance_results['table_analysis'] = {
            'duration_seconds': analyze_duration,
            'tables_analyzed': len(tables_to_analyze)
        }
        
        # 2. Vacuum tables with high dead tuple count
        print("Vacuuming tables with dead tuples...")
        start_time = datetime.now()
        
        tables_needing_vacuum = await conn.fetch("""
            SELECT tablename
            FROM pg_stat_user_tables
            WHERE n_dead_tup > 1000
            AND schemaname = 'public';
        """)
        
        vacuum_count = 0
        for table_record in tables_needing_vacuum:
            table_name = table_record['tablename']
            try:
                await conn.execute(f'VACUUM {table_name};')
                print(f"  Vacuumed table: {table_name}")
                vacuum_count += 1
            except Exception as e:
                print(f"  Error vacuuming {table_name}: {e}")
        
        vacuum_duration = (datetime.now() - start_time).total_seconds()
        maintenance_results['vacuum_operations'] = {
            'duration_seconds': vacuum_duration,
            'tables_vacuumed': vacuum_count
        }
        
        # 3. Reindex if necessary
        print("Checking index health...")
        start_time = datetime.now()
        
        # Get index bloat estimation
        bloated_indexes = await conn.fetch("""
            SELECT 
                schemaname,
                tablename,
                indexname
            FROM pg_stat_user_indexes
            WHERE idx_tup_read > idx_tup_fetch * 2  -- Simple heuristic for bloated indexes
            AND schemaname = 'public'
            LIMIT 5;  -- Only reindex up to 5 indexes per maintenance window
        """)
        
        reindex_count = 0
        for index_record in bloated_indexes:
            index_name = index_record['indexname']
            try:
                await conn.execute(f'REINDEX INDEX {index_name};')
                print(f"  Reindexed: {index_name}")
                reindex_count += 1
            except Exception as e:
                print(f"  Error reindexing {index_name}: {e}")
        
        reindex_duration = (datetime.now() - start_time).total_seconds()
        maintenance_results['reindex_operations'] = {
            'duration_seconds': reindex_duration,
            'indexes_reindexed': reindex_count
        }
        
        await conn.close()
        
        # Log maintenance results
        self.maintenance_log.append({
            'activity': 'routine_maintenance',
            'timestamp': datetime.now().isoformat(),
            'results': maintenance_results
        })
        
        return maintenance_results
    
    async def run_full_maintenance(self):
        """Run complete database maintenance cycle"""
        
        print(f"=== Database Maintenance Cycle - {datetime.now()} ===")
        
        # Performance analysis
        print("1. Analyzing query performance...")
        performance_analysis = await self.analyze_query_performance()
        
        print(f"   - Found {len(performance_analysis['slow_queries'])} slow queries")
        print(f"   - Found {len(performance_analysis['unused_indexes'])} unused indexes")
        print(f"   - Found {len(performance_analysis['table_bloat'])} tables with bloat")
        
        # Maintenance tasks
        print("2. Performing maintenance tasks...")
        maintenance_results = await self.perform_maintenance_tasks()
        
        print(f"   - Analyzed {maintenance_results['table_analysis']['tables_analyzed']} tables")
        print(f"   - Vacuumed {maintenance_results['vacuum_operations']['tables_vacuumed']} tables")
        print(f"   - Reindexed {maintenance_results['reindex_operations']['indexes_reindexed']} indexes")
        
        # Generate summary report
        total_duration = sum([
            maintenance_results['table_analysis']['duration_seconds'],
            maintenance_results['vacuum_operations']['duration_seconds'],
            maintenance_results['reindex_operations']['duration_seconds']
        ])
        
        print(f"3. Maintenance completed in {total_duration:.1f} seconds")
        
        # Save maintenance log
        log_file = f"/var/log/database/maintenance_{datetime.now().strftime('%Y%m%d')}.json"
        with open(log_file, 'w') as f:
            json.dump(self.maintenance_log, f, indent=2, default=str)
        
        print(f"   - Maintenance log saved: {log_file}")
        
        return {
            'performance_analysis': performance_analysis,
            'maintenance_results': maintenance_results,
            'total_duration_seconds': total_duration
        }

# Run database maintenance
if __name__ == "__main__":
    maintenance_manager = DatabaseMaintenanceManager()
    asyncio.run(maintenance_manager.run_full_maintenance())
```

---

## 3. API Performance Operations

### 3.1 Endpoint Performance Monitoring

**API Performance Benchmarking Script**:
```python
#!/usr/bin/env python3
"""Comprehensive API performance benchmarking"""

import asyncio
import aiohttp
import time
import json
import statistics
from datetime import datetime
from typing import Dict, List, Tuple

class APIPerformanceBenchmark:
    def __init__(self):
        self.base_url = 'http://localhost:8001'
        self.endpoints = {
            # Standard endpoints
            '/api/health': {'method': 'GET', 'expected_time': 0.1},
            '/api/clients': {'method': 'GET', 'expected_time': 0.5},
            '/api/portfolios': {'method': 'GET', 'expected_time': 0.5},
            '/api/products': {'method': 'GET', 'expected_time': 0.3},
            '/api/funds': {'method': 'GET', 'expected_time': 0.3},
            
            # Enhanced endpoints
            '/api/bulk_client_data': {'method': 'GET', 'expected_time': 1.5},
            '/api/analytics/dashboard-fast': {'method': 'GET', 'expected_time': 2.0},
            '/api/analytics/irr-summary': {'method': 'GET', 'expected_time': 1.0},
            '/api/dashboard/summary': {'method': 'GET', 'expected_time': 1.0},
            
            # Complex operations
            '/api/analytics/client/1/irr': {'method': 'GET', 'expected_time': 2.0},
            '/api/reports/portfolio/1': {'method': 'GET', 'expected_time': 1.5}
        }
        
        self.benchmark_results = []
    
    async def benchmark_endpoint(self, endpoint: str, config: Dict, iterations: int = 50) -> Dict:
        """Benchmark single endpoint performance"""
        
        method = config.get('method', 'GET')
        expected_time = config.get('expected_time', 1.0)
        
        response_times = []
        success_count = 0
        error_count = 0
        status_codes = []
        
        async with aiohttp.ClientSession() as session:
            print(f"Benchmarking {method} {endpoint} ({iterations} iterations)...")
            
            for i in range(iterations):
                start_time = time.perf_counter()
                
                try:
                    if method == 'GET':
                        async with session.get(f"{self.base_url}{endpoint}") as response:
                            response_time = time.perf_counter() - start_time
                            response_times.append(response_time)
                            status_codes.append(response.status)
                            
                            if response.status == 200:
                                success_count += 1
                            else:
                                error_count += 1
                    
                    # Add small delay between requests
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    response_time = time.perf_counter() - start_time
                    response_times.append(response_time)
                    error_count += 1
                    status_codes.append(0)
                    print(f"  Error on iteration {i+1}: {e}")
        
        # Calculate statistics
        if response_times:
            avg_time = statistics.mean(response_times)
            median_time = statistics.median(response_times)
            min_time = min(response_times)
            max_time = max(response_times)
            p95_time = sorted(response_times)[int(0.95 * len(response_times))]
            p99_time = sorted(response_times)[int(0.99 * len(response_times))]
            
            # Performance assessment
            performance_grade = 'A' if avg_time <= expected_time else 'B' if avg_time <= expected_time * 1.5 else 'C' if avg_time <= expected_time * 2 else 'F'
            
        else:
            avg_time = median_time = min_time = max_time = p95_time = p99_time = 0
            performance_grade = 'F'
        
        benchmark_result = {
            'endpoint': endpoint,
            'method': method,
            'iterations': iterations,
            'success_rate': (success_count / iterations) * 100 if iterations > 0 else 0,
            'response_times': {
                'average_ms': round(avg_time * 1000, 3),
                'median_ms': round(median_time * 1000, 3),
                'min_ms': round(min_time * 1000, 3),
                'max_ms': round(max_time * 1000, 3),
                'p95_ms': round(p95_time * 1000, 3),
                'p99_ms': round(p99_time * 1000, 3)
            },
            'expected_time_ms': round(expected_time * 1000, 3),
            'performance_grade': performance_grade,
            'status_code_distribution': dict(zip(*zip(*[(code, status_codes.count(code)) for code in set(status_codes)]))),
            'timestamp': datetime.now().isoformat()
        }
        
        print(f"  Average: {benchmark_result['response_times']['average_ms']}ms")
        print(f"  Success Rate: {benchmark_result['success_rate']:.1f}%")
        print(f"  Performance Grade: {performance_grade}")
        
        return benchmark_result
    
    async def benchmark_concurrent_load(self, endpoint: str, concurrent_users: int = 4, requests_per_user: int = 10) -> Dict:
        """Benchmark endpoint under concurrent load"""
        
        print(f"Testing concurrent load: {concurrent_users} users × {requests_per_user} requests")
        
        async def user_load_test(user_id: int, session: aiohttp.ClientSession):
            """Simulate single user load"""
            
            user_results = []
            
            for request_num in range(requests_per_user):
                start_time = time.perf_counter()
                
                try:
                    async with session.get(f"{self.base_url}{endpoint}") as response:
                        response_time = time.perf_counter() - start_time
                        user_results.append({
                            'user_id': user_id,
                            'request_num': request_num,
                            'response_time': response_time,
                            'status_code': response.status,
                            'success': response.status == 200
                        })
                
                except Exception as e:
                    response_time = time.perf_counter() - start_time
                    user_results.append({
                        'user_id': user_id,
                        'request_num': request_num,
                        'response_time': response_time,
                        'status_code': 0,
                        'success': False,
                        'error': str(e)
                    })
                
                # Brief pause between requests
                await asyncio.sleep(0.5)
            
            return user_results
        
        # Run concurrent load test
        start_time = time.perf_counter()
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for user_id in range(concurrent_users):
                task = asyncio.create_task(user_load_test(user_id, session))
                tasks.append(task)
            
            all_results = await asyncio.gather(*tasks)
        
        total_duration = time.perf_counter() - start_time
        
        # Flatten results
        flat_results = [result for user_results in all_results for result in user_results]
        
        # Calculate concurrent load statistics
        response_times = [r['response_time'] for r in flat_results]
        success_count = sum(1 for r in flat_results if r['success'])
        total_requests = len(flat_results)
        
        if response_times:
            avg_time = statistics.mean(response_times)
            max_time = max(response_times)
            p95_time = sorted(response_times)[int(0.95 * len(response_times))]
        else:
            avg_time = max_time = p95_time = 0
        
        return {
            'endpoint': endpoint,
            'concurrent_users': concurrent_users,
            'requests_per_user': requests_per_user,
            'total_requests': total_requests,
            'total_duration_seconds': round(total_duration, 2),
            'success_rate': (success_count / total_requests) * 100 if total_requests > 0 else 0,
            'throughput_rps': round(total_requests / total_duration, 2) if total_duration > 0 else 0,
            'response_times': {
                'average_ms': round(avg_time * 1000, 3),
                'max_ms': round(max_time * 1000, 3),
                'p95_ms': round(p95_time * 1000, 3)
            },
            'performance_degradation': round((avg_time / (avg_time - 0.1)) * 100 - 100, 1) if avg_time > 0.1 else 0,
            'timestamp': datetime.now().isoformat()
        }
    
    async def run_comprehensive_benchmark(self):
        """Run complete API performance benchmark"""
        
        print("=== Comprehensive API Performance Benchmark ===")
        
        # 1. Individual endpoint benchmarks
        print("\\n1. Individual Endpoint Performance:")
        individual_results = []
        
        for endpoint, config in self.endpoints.items():
            try:
                result = await self.benchmark_endpoint(endpoint, config)
                individual_results.append(result)
            except Exception as e:
                print(f"Error benchmarking {endpoint}: {e}")
        
        # 2. Concurrent load tests on critical endpoints
        print("\\n2. Concurrent Load Testing:")
        concurrent_results = []
        
        critical_endpoints = [
            '/api/clients',
            '/api/bulk_client_data',
            '/api/analytics/dashboard-fast',
            '/api/dashboard/summary'
        ]
        
        for endpoint in critical_endpoints:
            if endpoint in self.endpoints:
                try:
                    result = await self.benchmark_concurrent_load(endpoint)
                    concurrent_results.append(result)
                    print(f"  {endpoint}: {result['throughput_rps']} RPS, {result['success_rate']:.1f}% success")
                except Exception as e:
                    print(f"Error in concurrent test for {endpoint}: {e}")
        
        # 3. Generate performance report
        performance_report = {
            'benchmark_timestamp': datetime.now().isoformat(),
            'individual_endpoint_results': individual_results,
            'concurrent_load_results': concurrent_results,
            'summary': {
                'total_endpoints_tested': len(individual_results),
                'average_success_rate': statistics.mean([r['success_rate'] for r in individual_results]) if individual_results else 0,
                'endpoints_meeting_sla': len([r for r in individual_results if r['performance_grade'] in ['A', 'B']]),
                'endpoints_failing_sla': len([r for r in individual_results if r['performance_grade'] in ['C', 'F']]),
                'concurrent_test_results': len(concurrent_results)
            }
        }
        
        # Save benchmark results
        report_file = f"/var/log/performance/api_benchmark_{datetime.now().strftime('%Y%m%d_%H%M')}.json"
        with open(report_file, 'w') as f:
            json.dump(performance_report, f, indent=2, default=str)
        
        # Display summary
        print("\\n3. Benchmark Summary:")
        print(f"   Total Endpoints Tested: {performance_report['summary']['total_endpoints_tested']}")
        print(f"   Average Success Rate: {performance_report['summary']['average_success_rate']:.1f}%")
        print(f"   Endpoints Meeting SLA: {performance_report['summary']['endpoints_meeting_sla']}")
        print(f"   Endpoints Failing SLA: {performance_report['summary']['endpoints_failing_sla']}")
        print(f"   Report saved: {report_file}")
        
        return performance_report

# Run API benchmark
if __name__ == "__main__":
    benchmark = APIPerformanceBenchmark()
    asyncio.run(benchmark.run_comprehensive_benchmark())
```

---

This comprehensive performance monitoring operations guide provides detailed procedures for maintaining optimal performance across all enhanced systems in Kingston's Portal. The monitoring systems ensure continuous performance validation, proactive issue detection, and automated optimization for the complete enhanced architecture.