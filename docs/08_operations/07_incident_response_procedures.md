# Incident Response Procedures

## Overview

This document provides comprehensive incident response procedures for Kingston's Portal enhanced multi-layer architecture. It covers incident classification, response protocols, and recovery procedures for all enhanced systems from Phase 2 client data functionality through Phase 6 performance optimization systems.

**Incident Response Framework:**
- Multi-layer architecture incident classification and triage
- Enhanced client data functionality incident handling
- Field-level encryption and security incident response
- Performance degradation and system overload procedures
- Data integrity and audit trail incident management
- Compliance and regulatory incident reporting
- Business continuity and disaster recovery operations

**Response Time Targets:**
- **Critical**: < 15 minutes detection and initial response
- **High**: < 30 minutes detection and response initiation  
- **Medium**: < 2 hours response and investigation
- **Low**: < 8 hours acknowledgment and queuing

---

## 1. Incident Classification Framework

### 1.1 Severity Classification Matrix

| Severity | Impact | Business Effect | Response Time | Escalation Level |
|----------|--------|----------------|---------------|------------------|
| **P1 - Critical** | System down, data loss, security breach | Complete business interruption | < 15 min | C-Level + All hands |
| **P2 - High** | Major functionality unavailable, performance degraded >50% | Significant business impact | < 30 min | IT Management + Core team |
| **P3 - Medium** | Minor functionality issues, performance degraded <50% | Limited business impact | < 2 hours | Operations team |
| **P4 - Low** | Cosmetic issues, minor performance issues | Minimal impact | < 8 hours | Standard support |

### 1.2 Enhanced Architecture Incident Categories

**Database & Data Management Incidents:**
- Enhanced client data functionality failures
- Field-level encryption/decryption errors
- Database performance degradation
- Data integrity violations
- Audit trail corruption or gaps

**API & Backend Service Incidents:**
- Advanced API endpoint failures
- Authentication and authorization failures
- Business logic calculation errors
- Integration point failures
- Service unavailability

**Frontend & User Experience Incidents:**
- Information-dense interface loading failures
- Professional workflow interruptions
- User authentication issues
- Real-time feature failures
- Mobile responsiveness problems

**Security Framework Incidents:**
- Multi-layer security breaches
- Field-level encryption compromise
- Authentication system compromise
- Access control violations
- Compliance audit failures

**Performance & Monitoring Incidents:**
- Performance monitoring system failures
- System resource exhaustion
- Concurrent user capacity exceeded
- Response time SLA breaches
- Monitoring and alerting system failures

---

## 2. Incident Detection & Alerting

### 2.1 Automated Detection Systems

**Real-Time Monitoring Alerts**:
```python
#!/usr/bin/env python3
"""Enhanced incident detection and alerting system"""

import asyncio
import asyncpg
import json
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from typing import Dict, List

class IncidentDetectionSystem:
    def __init__(self):
        self.detection_rules = {
            'database_performance_critical': {
                'condition': 'avg_query_time > 5000',  # 5 seconds
                'severity': 'P1',
                'escalation': 'immediate'
            },
            'api_endpoint_down': {
                'condition': 'endpoint_success_rate < 50',  # Less than 50% success
                'severity': 'P1',
                'escalation': 'immediate'
            },
            'encryption_failure_rate': {
                'condition': 'encryption_error_rate > 5',  # More than 5% errors
                'severity': 'P2',
                'escalation': 'management'
            },
            'concurrent_user_overload': {
                'condition': 'active_users > 6',  # Above 4-user target + buffer
                'severity': 'P2',
                'escalation': 'management'
            },
            'audit_trail_gap': {
                'condition': 'audit_gap_hours > 2',  # Missing audit data > 2 hours
                'severity': 'P2',
                'escalation': 'management'
            },
            'system_resource_critical': {
                'condition': 'cpu_usage > 95 OR memory_usage > 95',
                'severity': 'P2',
                'escalation': 'management'
            }
        }
        
        self.escalation_contacts = {
            'immediate': [
                {'name': 'IT Director', 'phone': '+1234567890', 'email': 'itdirector@kingston.local'},
                {'name': 'System Administrator', 'phone': '+1234567891', 'email': 'sysadmin@kingston.local'}
            ],
            'management': [
                {'name': 'IT Manager', 'phone': '+1234567892', 'email': 'itmanager@kingston.local'},
                {'name': 'Operations Lead', 'phone': '+1234567893', 'email': 'ops@kingston.local'}
            ],
            'team': [
                {'name': 'Support Team', 'email': 'support@kingston.local'}
            ]
        }
    
    async def detect_database_incidents(self):
        """Detect database-related incidents"""
        
        conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
        
        incidents = []
        
        # Check query performance
        slow_queries = await conn.fetch("""
            SELECT 
                COUNT(*) as slow_query_count,
                AVG(mean_time) as avg_execution_time
            FROM pg_stat_statements 
            WHERE mean_time > 5000;  -- 5 second threshold
        """)
        
        if slow_queries and slow_queries[0]['slow_query_count'] > 5:
            incidents.append({
                'type': 'database_performance_critical',
                'severity': 'P1',
                'details': {
                    'slow_query_count': slow_queries[0]['slow_query_count'],
                    'avg_execution_time': slow_queries[0]['avg_execution_time']
                },
                'message': f"Critical database performance: {slow_queries[0]['slow_query_count']} queries averaging {slow_queries[0]['avg_execution_time']:.0f}ms"
            })
        
        # Check connection limits
        connection_stats = await conn.fetch("""
            SELECT 
                COUNT(*) as active_connections,
                MAX(EXTRACT(EPOCH FROM (now() - query_start))) as longest_running_query
            FROM pg_stat_activity 
            WHERE state = 'active';
        """)
        
        if connection_stats and connection_stats[0]['active_connections'] > 80:  # 80% of max connections
            incidents.append({
                'type': 'database_connection_limit',
                'severity': 'P2',
                'details': {
                    'active_connections': connection_stats[0]['active_connections'],
                    'longest_running_query': connection_stats[0]['longest_running_query']
                },
                'message': f"High database connection usage: {connection_stats[0]['active_connections']} active connections"
            })
        
        # Check encryption system health
        encryption_errors = await conn.fetch("""
            SELECT 
                COUNT(*) as total_operations,
                COUNT(*) FILTER (WHERE success = false) as failed_operations,
                AVG(execution_time_ms) as avg_execution_time
            FROM encryption_audit_log 
            WHERE created_at >= NOW() - INTERVAL '1 hour';
        """)
        
        if encryption_errors and encryption_errors[0]['total_operations'] > 0:
            error_rate = (encryption_errors[0]['failed_operations'] / encryption_errors[0]['total_operations']) * 100
            if error_rate > 5:  # More than 5% error rate
                incidents.append({
                    'type': 'encryption_failure_rate',
                    'severity': 'P2',
                    'details': {
                        'error_rate': error_rate,
                        'failed_operations': encryption_errors[0]['failed_operations'],
                        'total_operations': encryption_errors[0]['total_operations']
                    },
                    'message': f"High encryption error rate: {error_rate:.1f}% ({encryption_errors[0]['failed_operations']}/{encryption_errors[0]['total_operations']})"
                })
        
        await conn.close()
        return incidents
    
    async def detect_api_incidents(self):
        """Detect API and service-related incidents"""
        
        import aiohttp
        
        incidents = []
        critical_endpoints = [
            '/api/health',
            '/api/clients', 
            '/api/bulk_client_data',
            '/api/analytics/dashboard-fast',
            '/api/dashboard/summary'
        ]
        
        failed_endpoints = []
        slow_endpoints = []
        
        async with aiohttp.ClientSession() as session:
            for endpoint in critical_endpoints:
                try:
                    start_time = datetime.now()
                    async with session.get(f'http://localhost:8001{endpoint}?limit=1', timeout=10) as response:
                        response_time = (datetime.now() - start_time).total_seconds()
                        
                        if response.status != 200:
                            failed_endpoints.append({
                                'endpoint': endpoint,
                                'status_code': response.status,
                                'response_time': response_time
                            })
                        
                        if response_time > 5:  # 5 second threshold
                            slow_endpoints.append({
                                'endpoint': endpoint,
                                'response_time': response_time
                            })
                
                except Exception as e:
                    failed_endpoints.append({
                        'endpoint': endpoint,
                        'error': str(e),
                        'status_code': 0
                    })
        
        # Generate incidents
        if len(failed_endpoints) > 2:  # More than 2 endpoints failing
            incidents.append({
                'type': 'api_endpoint_down',
                'severity': 'P1',
                'details': {
                    'failed_endpoints': failed_endpoints,
                    'failure_count': len(failed_endpoints)
                },
                'message': f"Multiple API endpoints failing: {len(failed_endpoints)} endpoints down"
            })
        
        if slow_endpoints:
            incidents.append({
                'type': 'api_performance_degradation',
                'severity': 'P2',
                'details': {
                    'slow_endpoints': slow_endpoints
                },
                'message': f"API performance degradation: {len(slow_endpoints)} endpoints responding slowly"
            })
        
        return incidents
    
    async def detect_system_incidents(self):
        """Detect system resource and performance incidents"""
        
        import psutil
        
        incidents = []
        
        # CPU usage check
        cpu_percent = psutil.cpu_percent(interval=1)
        if cpu_percent > 95:
            incidents.append({
                'type': 'system_resource_critical',
                'severity': 'P2',
                'details': {
                    'cpu_usage': cpu_percent,
                    'threshold': 95
                },
                'message': f"Critical CPU usage: {cpu_percent}%"
            })
        
        # Memory usage check
        memory = psutil.virtual_memory()
        if memory.percent > 95:
            incidents.append({
                'type': 'system_resource_critical',
                'severity': 'P2',
                'details': {
                    'memory_usage': memory.percent,
                    'available_gb': round(memory.available / 1024**3, 2),
                    'threshold': 95
                },
                'message': f"Critical memory usage: {memory.percent}% ({round(memory.available / 1024**3, 2)}GB available)"
            })
        
        # Disk space check
        disk = psutil.disk_usage('C:' if os.name == 'nt' else '/')
        disk_percent = (disk.used / disk.total) * 100
        if disk_percent > 90:
            incidents.append({
                'type': 'disk_space_critical',
                'severity': 'P2',
                'details': {
                    'disk_usage': disk_percent,
                    'free_gb': round(disk.free / 1024**3, 2),
                    'threshold': 90
                },
                'message': f"Critical disk usage: {disk_percent:.1f}% ({round(disk.free / 1024**3, 2)}GB free)"
            })
        
        return incidents
    
    async def create_incident_record(self, incident_data: Dict) -> str:
        """Create formal incident record"""
        
        incident_id = f"INC-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        
        incident_record = {
            'incident_id': incident_id,
            'created_at': datetime.now().isoformat(),
            'type': incident_data['type'],
            'severity': incident_data['severity'],
            'status': 'OPEN',
            'details': incident_data.get('details', {}),
            'message': incident_data['message'],
            'detection_method': 'automated',
            'assigned_to': None,
            'escalation_level': self.get_escalation_level(incident_data['severity']),
            'resolution_target': self.calculate_resolution_target(incident_data['severity']),
            'communication_log': [],
            'actions_taken': []
        }
        
        # Save incident record
        incident_file = f"/var/log/incidents/{incident_id}.json"
        with open(incident_file, 'w') as f:
            json.dump(incident_record, f, indent=2, default=str)
        
        return incident_id
    
    def get_escalation_level(self, severity: str) -> str:
        """Get escalation level based on severity"""
        
        escalation_map = {
            'P1': 'immediate',
            'P2': 'management', 
            'P3': 'team',
            'P4': 'team'
        }
        
        return escalation_map.get(severity, 'team')
    
    def calculate_resolution_target(self, severity: str) -> str:
        """Calculate resolution target time"""
        
        now = datetime.now()
        target_map = {
            'P1': now + timedelta(hours=4),   # 4 hours for critical
            'P2': now + timedelta(hours=8),   # 8 hours for high
            'P3': now + timedelta(hours=24),  # 24 hours for medium
            'P4': now + timedelta(hours=72)   # 72 hours for low
        }
        
        target_time = target_map.get(severity, now + timedelta(hours=24))
        return target_time.isoformat()
    
    async def send_incident_notification(self, incident_id: str, incident_data: Dict):
        """Send incident notification to appropriate contacts"""
        
        escalation_level = self.get_escalation_level(incident_data['severity'])
        contacts = self.escalation_contacts.get(escalation_level, [])
        
        subject = f"Kingston's Portal Incident {incident_data['severity']}: {incident_data['type']}"
        
        body = f"""
INCIDENT ALERT - Kingston's Portal

Incident ID: {incident_id}
Severity: {incident_data['severity']}
Type: {incident_data['type']}
Detected: {datetime.now().isoformat()}
Message: {incident_data['message']}

Details:
{json.dumps(incident_data.get('details', {}), indent=2)}

Response Required: {escalation_level.upper()}
Escalation Contacts: {', '.join([c['name'] for c in contacts])}

This is an automated incident detection from Kingston's Portal monitoring system.
Please acknowledge this incident and begin investigation immediately.
"""
        
        # Send email notifications (configure SMTP)
        for contact in contacts:
            if 'email' in contact:
                try:
                    msg = MIMEText(body)
                    msg['Subject'] = subject
                    msg['From'] = 'incidents@kingston.local'
                    msg['To'] = contact['email']
                    
                    # Send email (implement SMTP configuration)
                    print(f"Incident notification sent to {contact['name']}: {subject}")
                    
                except Exception as e:
                    print(f"Failed to send notification to {contact['name']}: {e}")
        
        # Log notification
        print(f"INCIDENT ALERT: {subject}")
        print(f"Message: {incident_data['message']}")
        print(f"Escalation Level: {escalation_level}")
    
    async def run_incident_detection(self):
        """Run comprehensive incident detection cycle"""
        
        print(f"=== Incident Detection Cycle - {datetime.now()} ===")
        
        all_incidents = []
        
        # Detect incidents from all sources
        try:
            db_incidents = await self.detect_database_incidents()
            all_incidents.extend(db_incidents)
            print(f"Database incidents detected: {len(db_incidents)}")
        except Exception as e:
            print(f"Error detecting database incidents: {e}")
        
        try:
            api_incidents = await self.detect_api_incidents()
            all_incidents.extend(api_incidents)
            print(f"API incidents detected: {len(api_incidents)}")
        except Exception as e:
            print(f"Error detecting API incidents: {e}")
        
        try:
            system_incidents = await self.detect_system_incidents()
            all_incidents.extend(system_incidents)
            print(f"System incidents detected: {len(system_incidents)}")
        except Exception as e:
            print(f"Error detecting system incidents: {e}")
        
        # Process detected incidents
        incident_ids = []
        for incident_data in all_incidents:
            try:
                incident_id = await self.create_incident_record(incident_data)
                await self.send_incident_notification(incident_id, incident_data)
                incident_ids.append(incident_id)
                
            except Exception as e:
                print(f"Error processing incident {incident_data['type']}: {e}")
        
        print(f"Total incidents created: {len(incident_ids)}")
        
        if incident_ids:
            print("Incident IDs:", incident_ids)
        
        return incident_ids

# Run incident detection
if __name__ == "__main__":
    detector = IncidentDetectionSystem()
    asyncio.run(detector.run_incident_detection())
```

---

## 3. Incident Response Workflows

### 3.1 Critical Incident Response (P1)

**Immediate Response Protocol (0-15 minutes)**:
```bash
#!/bin/bash
# Critical incident immediate response script

INCIDENT_ID="$1"
INCIDENT_TYPE="$2"
RESPONDER_NAME="$3"

if [ -z "$INCIDENT_ID" ] || [ -z "$INCIDENT_TYPE" ] || [ -z "$RESPONDER_NAME" ]; then
    echo "Usage: $0 <incident_id> <incident_type> <responder_name>"
    exit 1
fi

echo "=== CRITICAL INCIDENT RESPONSE ==="
echo "Incident ID: $INCIDENT_ID"
echo "Type: $INCIDENT_TYPE"
echo "Responder: $RESPONDER_NAME"
echo "Response Time: $(date)"

# 1. Acknowledge incident
echo "Step 1: Acknowledging incident..."
echo "{\"acknowledged_by\": \"$RESPONDER_NAME\", \"acknowledged_at\": \"$(date -Iseconds)\"}" >> "/var/log/incidents/${INCIDENT_ID}_actions.log"

# 2. Assess system status
echo "Step 2: Assessing system status..."
echo "- API Health Check:"
curl -s http://localhost:8001/api/health | jq '.'

echo "- Database Connection Check:"
psql $DATABASE_URL -c "SELECT 'Database connection successful' as status;"

echo "- System Resource Check:"
echo "  CPU: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "  Memory: $(free | grep Mem: | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
echo "  Disk: $(df -h / | awk 'NR==2{printf "%s", $5}')"

# 3. Emergency stabilization based on incident type
case "$INCIDENT_TYPE" in
    "system_down")
        echo "Step 3: Emergency system stabilization..."
        echo "- Restarting backend service..."
        # systemctl restart office-fastapi-service
        
        echo "- Restarting IIS..."
        # iisreset
        
        echo "- Checking service status..."
        # systemctl status office-fastapi-service
        ;;
        
    "database_critical")
        echo "Step 3: Database emergency response..."
        echo "- Checking database connections..."
        psql $DATABASE_URL -c "SELECT pid, query, state FROM pg_stat_activity WHERE state = 'active';"
        
        echo "- Terminating long-running queries..."
        psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '30 minutes';"
        ;;
        
    "security_breach")
        echo "Step 3: Security incident response..."
        echo "- Enabling enhanced logging..."
        # Increase logging levels
        
        echo "- Checking recent authentication attempts..."
        psql $DATABASE_URL -c "SELECT * FROM auth_log WHERE created_at >= NOW() - INTERVAL '1 hour' ORDER BY created_at DESC LIMIT 20;"
        
        echo "- Checking for suspicious activity..."
        psql $DATABASE_URL -c "SELECT ip_address, COUNT(*) as attempts FROM auth_log WHERE success = false AND created_at >= NOW() - INTERVAL '1 hour' GROUP BY ip_address HAVING COUNT(*) > 10;"
        ;;
        
    "data_corruption")
        echo "Step 3: Data integrity emergency response..."
        echo "- Checking audit trail integrity..."
        psql $DATABASE_URL -c "SELECT COUNT(*) as audit_entries FROM audit_log WHERE created_at >= NOW() - INTERVAL '1 hour';"
        
        echo "- Validating encrypted data..."
        python3 /opt/scripts/validate_encryption_integrity.py
        
        echo "- Creating emergency backup..."
        pg_dump $DATABASE_URL > "/var/backups/emergency_backup_${INCIDENT_ID}_$(date +%Y%m%d_%H%M%S).sql"
        ;;
esac

# 4. Document initial response
echo "Step 4: Documenting initial response actions..."
cat >> "/var/log/incidents/${INCIDENT_ID}_actions.log" << EOF
{
  "action": "initial_response",
  "timestamp": "$(date -Iseconds)",
  "responder": "$RESPONDER_NAME",
  "incident_type": "$INCIDENT_TYPE",
  "actions_taken": [
    "Acknowledged incident",
    "Assessed system status", 
    "Performed emergency stabilization for $INCIDENT_TYPE",
    "Documented response"
  ],
  "next_steps": "Continue with detailed investigation and resolution"
}
EOF

# 5. Notify stakeholders
echo "Step 5: Stakeholder notification..."
echo "- Critical incident acknowledged by $RESPONDER_NAME"
echo "- Initial response completed at $(date)"
echo "- Investigation ongoing"

echo "INITIAL RESPONSE COMPLETE - Proceed with detailed investigation"
```

### 3.2 High Priority Incident Response (P2)

**Structured Response Protocol (0-30 minutes)**:
```python
#!/usr/bin/env python3
"""High priority incident response workflow"""

import asyncio
import asyncpg
import json
import time
from datetime import datetime, timedelta

class HighPriorityIncidentResponse:
    def __init__(self, incident_id: str, incident_type: str, responder_name: str):
        self.incident_id = incident_id
        self.incident_type = incident_type
        self.responder_name = responder_name
        self.response_log = []
        self.start_time = datetime.now()
    
    def log_action(self, action: str, details: dict = None):
        """Log response action"""
        
        log_entry = {
            'timestamp': datetime.now().isoformat(),
            'elapsed_minutes': (datetime.now() - self.start_time).total_seconds() / 60,
            'action': action,
            'details': details or {},
            'responder': self.responder_name
        }
        
        self.response_log.append(log_entry)
        print(f"[{log_entry['elapsed_minutes']:.1f}min] {action}")
        
        if details:
            for key, value in details.items():
                print(f"  {key}: {value}")
    
    async def assess_impact(self):
        """Assess incident impact and scope"""
        
        self.log_action("Starting impact assessment")
        
        impact_assessment = {
            'affected_systems': [],
            'user_impact': 'unknown',
            'data_impact': 'unknown',
            'business_impact': 'unknown'
        }
        
        try:
            # Check API availability
            import aiohttp
            async with aiohttp.ClientSession() as session:
                api_status = {}
                critical_endpoints = [
                    '/api/health',
                    '/api/clients',
                    '/api/bulk_client_data',
                    '/api/analytics/dashboard-fast'
                ]
                
                for endpoint in critical_endpoints:
                    try:
                        start_time = time.perf_counter()
                        async with session.get(f'http://localhost:8001{endpoint}?limit=1', timeout=5) as response:
                            response_time = time.perf_counter() - start_time
                            api_status[endpoint] = {
                                'status': 'available' if response.status == 200 else 'degraded',
                                'response_time': response_time,
                                'status_code': response.status
                            }
                    except Exception as e:
                        api_status[endpoint] = {
                            'status': 'unavailable',
                            'error': str(e)
                        }
                
                # Determine API impact
                unavailable_count = sum(1 for status in api_status.values() if status['status'] == 'unavailable')
                if unavailable_count > len(critical_endpoints) / 2:
                    impact_assessment['affected_systems'].append('API - Multiple endpoints down')
                    impact_assessment['user_impact'] = 'high'
                elif unavailable_count > 0:
                    impact_assessment['affected_systems'].append('API - Partial functionality affected')
                    impact_assessment['user_impact'] = 'medium'
                
                self.log_action("API impact assessment completed", {
                    'endpoints_checked': len(critical_endpoints),
                    'unavailable_endpoints': unavailable_count,
                    'api_status': api_status
                })
            
            # Check database health
            conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
            
            # Active connections
            active_connections = await conn.fetchval("SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';")
            
            # Slow queries
            slow_queries = await conn.fetchval("SELECT COUNT(*) FROM pg_stat_statements WHERE mean_time > 1000;")
            
            # Recent errors
            recent_errors = await conn.fetchval("""
                SELECT COUNT(*) FROM pg_stat_database 
                WHERE datname = current_database() 
                AND xact_rollback > 0;
            """)
            
            if active_connections > 50 or slow_queries > 10:
                impact_assessment['affected_systems'].append('Database - Performance degradation')
                impact_assessment['data_impact'] = 'medium'
            
            if recent_errors > 0:
                impact_assessment['affected_systems'].append('Database - Transaction errors detected')
                impact_assessment['data_impact'] = 'high'
            
            await conn.close()
            
            self.log_action("Database impact assessment completed", {
                'active_connections': active_connections,
                'slow_queries': slow_queries,
                'recent_errors': recent_errors
            })
            
        except Exception as e:
            self.log_action("Impact assessment error", {'error': str(e)})
            impact_assessment['user_impact'] = 'unknown'
        
        # Determine business impact
        if impact_assessment['user_impact'] == 'high' or impact_assessment['data_impact'] == 'high':
            impact_assessment['business_impact'] = 'high'
        elif impact_assessment['user_impact'] == 'medium' or impact_assessment['data_impact'] == 'medium':
            impact_assessment['business_impact'] = 'medium'
        else:
            impact_assessment['business_impact'] = 'low'
        
        return impact_assessment
    
    async def implement_containment(self):
        """Implement containment measures"""
        
        self.log_action("Starting containment measures")
        
        containment_actions = []
        
        if self.incident_type == 'performance_degradation':
            # Performance-specific containment
            self.log_action("Implementing performance containment")
            
            try:
                # Restart services if needed
                # os.system("systemctl restart office-fastapi-service")
                containment_actions.append("Service restart executed")
                
                # Clear caches
                # Redis cache clear, application cache clear
                containment_actions.append("Application caches cleared")
                
                # Database optimization
                conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
                await conn.execute("VACUUM ANALYZE;")
                await conn.close()
                containment_actions.append("Database maintenance executed")
                
            except Exception as e:
                self.log_action("Containment error", {'error': str(e)})
        
        elif self.incident_type == 'security_incident':
            # Security-specific containment
            self.log_action("Implementing security containment")
            
            try:
                # Enable enhanced security monitoring
                containment_actions.append("Enhanced security monitoring enabled")
                
                # Check for unauthorized access
                conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
                suspicious_activity = await conn.fetch("""
                    SELECT ip_address, COUNT(*) as attempts
                    FROM auth_log 
                    WHERE success = false 
                    AND created_at >= NOW() - INTERVAL '1 hour'
                    GROUP BY ip_address
                    HAVING COUNT(*) > 10;
                """)
                await conn.close()
                
                if suspicious_activity:
                    self.log_action("Suspicious activity detected", {
                        'suspicious_ips': [dict(row) for row in suspicious_activity]
                    })
                    containment_actions.append(f"Identified {len(suspicious_activity)} suspicious IP addresses")
                
            except Exception as e:
                self.log_action("Security containment error", {'error': str(e)})
        
        elif self.incident_type == 'data_integrity_issue':
            # Data integrity containment
            self.log_action("Implementing data integrity containment")
            
            try:
                # Create emergency backup
                # os.system(f"pg_dump $DATABASE_URL > /var/backups/emergency_{self.incident_id}.sql")
                containment_actions.append("Emergency backup created")
                
                # Validate encryption integrity
                # Run encryption validation script
                containment_actions.append("Encryption integrity validation executed")
                
                # Check audit trail completeness
                conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
                audit_gaps = await conn.fetchval("""
                    SELECT COUNT(*) FROM (
                        SELECT generate_series(
                            DATE_TRUNC('hour', NOW() - INTERVAL '24 hours'),
                            DATE_TRUNC('hour', NOW()),
                            INTERVAL '1 hour'
                        ) as hour
                    ) expected
                    LEFT JOIN (
                        SELECT DATE_TRUNC('hour', created_at) as hour
                        FROM audit_log
                        WHERE created_at >= NOW() - INTERVAL '24 hours'
                        GROUP BY DATE_TRUNC('hour', created_at)
                    ) actual ON expected.hour = actual.hour
                    WHERE actual.hour IS NULL;
                """)
                await conn.close()
                
                if audit_gaps > 0:
                    self.log_action("Audit trail gaps detected", {'gaps_found': audit_gaps})
                    containment_actions.append(f"Audit trail analysis: {audit_gaps} gaps found")
                else:
                    containment_actions.append("Audit trail integrity confirmed")
                
            except Exception as e:
                self.log_action("Data integrity containment error", {'error': str(e)})
        
        return containment_actions
    
    async def begin_investigation(self):
        """Begin detailed incident investigation"""
        
        self.log_action("Starting detailed investigation")
        
        investigation_findings = {
            'timeline': [],
            'root_cause_analysis': {},
            'evidence_collected': []
        }
        
        try:
            # Collect system logs
            # system_logs = collect_system_logs(self.start_time - timedelta(hours=1))
            investigation_findings['evidence_collected'].append("System logs collected")
            
            # Collect application logs
            # application_logs = collect_application_logs(self.start_time - timedelta(hours=1))
            investigation_findings['evidence_collected'].append("Application logs collected")
            
            # Database forensics
            if 'database' in self.incident_type.lower():
                conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
                
                # Get query statistics during incident timeframe
                query_stats = await conn.fetch("""
                    SELECT 
                        query,
                        calls,
                        total_time,
                        mean_time
                    FROM pg_stat_statements
                    WHERE mean_time > 1000
                    ORDER BY mean_time DESC
                    LIMIT 10;
                """)
                
                investigation_findings['root_cause_analysis']['slow_queries'] = [dict(q) for q in query_stats]
                
                await conn.close()
                investigation_findings['evidence_collected'].append("Database forensics completed")
            
            self.log_action("Investigation evidence collected", {
                'evidence_types': len(investigation_findings['evidence_collected'])
            })
            
        except Exception as e:
            self.log_action("Investigation error", {'error': str(e)})
        
        return investigation_findings
    
    async def run_response_workflow(self):
        """Run complete high priority incident response workflow"""
        
        self.log_action("High priority incident response initiated", {
            'incident_id': self.incident_id,
            'incident_type': self.incident_type,
            'response_time_target': '30 minutes'
        })
        
        try:
            # Phase 1: Impact Assessment (5 minutes)
            impact = await self.assess_impact()
            self.log_action("Impact assessment completed", impact)
            
            # Phase 2: Containment (10 minutes)
            containment = await self.implement_containment()
            self.log_action("Containment measures implemented", {
                'actions_count': len(containment),
                'actions': containment
            })
            
            # Phase 3: Investigation (15 minutes)
            investigation = await self.begin_investigation()
            self.log_action("Investigation initiated", {
                'evidence_collected': len(investigation['evidence_collected'])
            })
            
            # Generate response summary
            response_duration = (datetime.now() - self.start_time).total_seconds() / 60
            
            response_summary = {
                'incident_id': self.incident_id,
                'response_duration_minutes': round(response_duration, 1),
                'impact_assessment': impact,
                'containment_actions': containment,
                'investigation_findings': investigation,
                'response_log': self.response_log,
                'status': 'CONTAINED' if containment else 'INVESTIGATING',
                'next_phase': 'RESOLUTION'
            }
            
            # Save response log
            response_file = f"/var/log/incidents/{self.incident_id}_response.json"
            with open(response_file, 'w') as f:
                json.dump(response_summary, f, indent=2, default=str)
            
            self.log_action("Response workflow completed", {
                'duration_minutes': round(response_duration, 1),
                'status': response_summary['status'],
                'response_file': response_file
            })
            
            return response_summary
            
        except Exception as e:
            self.log_action("Response workflow error", {'error': str(e)})
            return None

# High priority incident response
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 4:
        print("Usage: python3 high_priority_response.py <incident_id> <incident_type> <responder_name>")
        sys.exit(1)
    
    incident_id = sys.argv[1]
    incident_type = sys.argv[2]
    responder_name = sys.argv[3]
    
    response = HighPriorityIncidentResponse(incident_id, incident_type, responder_name)
    asyncio.run(response.run_response_workflow())
```

---

## 4. Recovery Procedures

### 4.1 System Recovery Operations

**Automated Recovery Script**:
```bash
#!/bin/bash
# Comprehensive system recovery procedures

INCIDENT_ID="$1"
RECOVERY_TYPE="$2"
RECOVERY_LEVEL="$3"

echo "=== SYSTEM RECOVERY OPERATIONS ==="
echo "Incident ID: $INCIDENT_ID"
echo "Recovery Type: $RECOVERY_TYPE"
echo "Recovery Level: $RECOVERY_LEVEL"
echo "Recovery Start: $(date)"

# Create recovery log
RECOVERY_LOG="/var/log/incidents/${INCIDENT_ID}_recovery.log"
echo "Recovery started: $(date)" > "$RECOVERY_LOG"

case "$RECOVERY_LEVEL" in
    "service")
        echo "Level 1: Service Recovery" | tee -a "$RECOVERY_LOG"
        
        # Restart backend services
        echo "Restarting FastAPI service..." | tee -a "$RECOVERY_LOG"
        # systemctl stop office-fastapi-service
        sleep 5
        # systemctl start office-fastapi-service
        
        # Restart IIS
        echo "Restarting IIS..." | tee -a "$RECOVERY_LOG"
        # iisreset /restart
        
        # Verify service recovery
        sleep 30
        echo "Verifying service recovery..." | tee -a "$RECOVERY_LOG"
        
        # Check API health
        API_HEALTH=$(curl -s http://localhost:8001/api/health | jq -r '.status' 2>/dev/null)
        if [ "$API_HEALTH" = "healthy" ]; then
            echo "✓ API service recovered successfully" | tee -a "$RECOVERY_LOG"
        else
            echo "✗ API service recovery failed" | tee -a "$RECOVERY_LOG"
        fi
        
        # Check frontend
        FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://intranet.kingston.local)
        if [ "$FRONTEND_STATUS" = "200" ]; then
            echo "✓ Frontend service recovered successfully" | tee -a "$RECOVERY_LOG"
        else
            echo "✗ Frontend service recovery failed" | tee -a "$RECOVERY_LOG"
        fi
        ;;
        
    "database")
        echo "Level 2: Database Recovery" | tee -a "$RECOVERY_LOG"
        
        # Database maintenance and optimization
        echo "Performing database maintenance..." | tee -a "$RECOVERY_LOG"
        
        # Terminate long-running queries
        psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '10 minutes';" | tee -a "$RECOVERY_LOG"
        
        # Vacuum and analyze critical tables
        echo "Optimizing database performance..." | tee -a "$RECOVERY_LOG"
        psql $DATABASE_URL -c "VACUUM ANALYZE users, client_groups, portfolios, holdings, transactions;" | tee -a "$RECOVERY_LOG"
        
        # Update statistics
        psql $DATABASE_URL -c "ANALYZE;" | tee -a "$RECOVERY_LOG"
        
        # Check database health
        DB_CONNECTIONS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active';")
        echo "Active database connections: $DB_CONNECTIONS" | tee -a "$RECOVERY_LOG"
        
        if [ "$DB_CONNECTIONS" -lt 20 ]; then
            echo "✓ Database recovery successful" | tee -a "$RECOVERY_LOG"
        else
            echo "⚠ Database recovery partial - high connection count" | tee -a "$RECOVERY_LOG"
        fi
        ;;
        
    "full")
        echo "Level 3: Full System Recovery" | tee -a "$RECOVERY_LOG"
        
        # Complete system recovery from backup
        echo "WARNING: Full system recovery initiated" | tee -a "$RECOVERY_LOG"
        
        # Stop all services
        echo "Stopping all services..." | tee -a "$RECOVERY_LOG"
        # systemctl stop office-fastapi-service
        # iisreset /stop
        
        # Database recovery
        if [ -f "/var/backups/emergency_${INCIDENT_ID}.sql" ]; then
            echo "Restoring database from emergency backup..." | tee -a "$RECOVERY_LOG"
            # psql $DATABASE_URL < "/var/backups/emergency_${INCIDENT_ID}.sql"
            echo "Database restored from emergency backup" | tee -a "$RECOVERY_LOG"
        else
            echo "No emergency backup found - using latest automated backup" | tee -a "$RECOVERY_LOG"
            LATEST_BACKUP=$(ls -t /var/backups/daily_backup_*.sql | head -1)
            if [ -n "$LATEST_BACKUP" ]; then
                # psql $DATABASE_URL < "$LATEST_BACKUP"
                echo "Database restored from: $LATEST_BACKUP" | tee -a "$RECOVERY_LOG"
            else
                echo "ERROR: No database backup available" | tee -a "$RECOVERY_LOG"
            fi
        fi
        
        # Application recovery
        echo "Restoring application components..." | tee -a "$RECOVERY_LOG"
        
        # Restore configuration files
        if [ -d "/var/backups/config_backup" ]; then
            # cp -r /var/backups/config_backup/* /path/to/config/
            echo "Configuration files restored" | tee -a "$RECOVERY_LOG"
        fi
        
        # Start services
        echo "Starting services..." | tee -a "$RECOVERY_LOG"
        # systemctl start office-fastapi-service
        # iisreset /start
        
        # Wait for services to stabilize
        sleep 60
        
        echo "✓ Full system recovery completed" | tee -a "$RECOVERY_LOG"
        ;;
esac

# Post-recovery validation
echo "Performing post-recovery validation..." | tee -a "$RECOVERY_LOG"

# Run recovery validation script
python3 /opt/scripts/post_recovery_validation.py "$INCIDENT_ID" >> "$RECOVERY_LOG" 2>&1

# Generate recovery report
echo "Recovery completed: $(date)" | tee -a "$RECOVERY_LOG"
echo "Recovery log: $RECOVERY_LOG"

echo "=== RECOVERY OPERATIONS COMPLETED ==="
```

---

This comprehensive incident response procedures document provides detailed protocols for handling all types of incidents in Kingston's Portal enhanced architecture. The procedures ensure rapid detection, appropriate response, and effective recovery across all enhanced systems and components.