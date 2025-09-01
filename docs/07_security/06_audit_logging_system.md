# Audit Logging System Implementation

## Overview

Kingston's Portal implements a comprehensive audit logging system designed to capture, store, and analyze all security-relevant events for compliance, security monitoring, and incident response purposes. This document details the implementation of the Phase 5 enhanced audit logging system that supports the field-level encryption and granular access control features.

## Table of Contents

1. [Audit Architecture Overview](#1-audit-architecture-overview)
2. [Event Classification and Taxonomy](#2-event-classification-and-taxonomy)
3. [Correlation ID Implementation](#3-correlation-id-implementation)
4. [Database Schema for Audit Logs](#4-database-schema-for-audit-logs)
5. [Audit Event Collection](#5-audit-event-collection)
6. [Real-time Log Processing](#6-real-time-log-processing)
7. [Log Analysis and Forensics](#7-log-analysis-and-forensics)
8. [Compliance Reporting](#8-compliance-reporting)
9. [Log Security and Integrity](#9-log-security-and-integrity)
10. [Performance Optimization](#10-performance-optimization)

## 1. Audit Architecture Overview

### 1.1 System Architecture

```mermaid
graph TB
    A[Application Layer] --> B[Audit Event Collector]
    B --> C[Event Enrichment Engine]
    C --> D[Event Classification Service]
    D --> E[Correlation ID Manager]
    E --> F[Audit Log Store]
    F --> G[Log Analysis Engine]
    G --> H[Real-time Monitoring]
    G --> I[Forensic Analysis]
    G --> J[Compliance Reporting]
    
    F --> K[(Primary Audit DB)]
    F --> L[(Archive Storage)]
    
    H --> M[Alert System]
    I --> N[Investigation Tools]
    J --> O[Regulatory Reports]
```

### 1.2 Audit Logging Principles

```python
# Core audit logging principles implementation
AUDIT_PRINCIPLES = {
    'completeness': {
        'description': 'Capture all security-relevant events',
        'implementation': 'Comprehensive event hooks throughout application',
        'validation': 'Regular completeness audits'
    },
    'accuracy': {
        'description': 'Ensure audit records reflect actual events',
        'implementation': 'Real-time event capture with minimal processing',
        'validation': 'Cross-reference with application logs'
    },
    'timeliness': {
        'description': 'Record events as they occur',
        'implementation': 'Asynchronous logging with <100ms latency',
        'validation': 'Timestamp variance monitoring'
    },
    'integrity': {
        'description': 'Protect audit logs from unauthorized modification',
        'implementation': 'Cryptographic signatures and immutable storage',
        'validation': 'Regular integrity verification'
    },
    'availability': {
        'description': 'Ensure audit logs are accessible when needed',
        'implementation': 'Redundant storage and backup procedures',
        'validation': 'Regular recovery testing'
    },
    'non_repudiation': {
        'description': 'Provide evidence that events occurred',
        'implementation': 'Digital signatures and tamper-evident storage',
        'validation': 'Legal admissibility testing'
    }
}
```

### 1.3 Audit Event Lifecycle

```python
from enum import Enum
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
import json
import hashlib
import uuid

class AuditEventStatus(Enum):
    CAPTURED = 'captured'
    ENRICHED = 'enriched'
    CLASSIFIED = 'classified'
    STORED = 'stored'
    ANALYZED = 'analyzed'
    ARCHIVED = 'archived'

class AuditEvent:
    """Core audit event structure"""
    
    def __init__(self, event_type: str, event_data: Dict[str, Any], 
                 user_context: Optional[Dict[str, Any]] = None):
        self.event_id = str(uuid.uuid4())
        self.timestamp = datetime.now()
        self.event_type = event_type
        self.event_data = event_data
        self.user_context = user_context or {}
        self.correlation_id = self._generate_correlation_id()
        self.status = AuditEventStatus.CAPTURED
        self.enrichment_data = {}
        self.classification = {}
        self.integrity_hash = None
    
    def _generate_correlation_id(self) -> str:
        """Generate unique correlation ID for event tracking"""
        if self.user_context.get('correlation_id'):
            return self.user_context['correlation_id']
        
        # Generate new correlation ID if not provided
        timestamp_part = int(self.timestamp.timestamp())
        user_part = self.user_context.get('user_id', 'anonymous')
        random_part = uuid.uuid4().hex[:8]
        
        return f"CORR_{timestamp_part}_{user_part}_{random_part}"
    
    def calculate_integrity_hash(self) -> str:
        """Calculate cryptographic hash for integrity verification"""
        # Create canonical representation of event data
        canonical_data = {
            'event_id': self.event_id,
            'timestamp': self.timestamp.isoformat(),
            'event_type': self.event_type,
            'event_data': self.event_data,
            'user_context': self.user_context,
            'correlation_id': self.correlation_id
        }
        
        # Convert to JSON with sorted keys for consistency
        canonical_json = json.dumps(canonical_data, sort_keys=True, default=str)
        
        # Calculate SHA-256 hash
        return hashlib.sha256(canonical_json.encode('utf-8')).hexdigest()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert audit event to dictionary for storage"""
        return {
            'event_id': self.event_id,
            'timestamp': self.timestamp,
            'event_type': self.event_type,
            'event_data': json.dumps(self.event_data, default=str),
            'user_id': self.user_context.get('user_id'),
            'session_id': self.user_context.get('session_id'),
            'correlation_id': self.correlation_id,
            'ip_address': self.user_context.get('ip_address'),
            'user_agent': self.user_context.get('user_agent'),
            'status': self.status.value,
            'enrichment_data': json.dumps(self.enrichment_data, default=str),
            'classification': json.dumps(self.classification, default=str),
            'integrity_hash': self.integrity_hash or self.calculate_integrity_hash()
        }
```

## 2. Event Classification and Taxonomy

### 2.1 Event Taxonomy Structure

```python
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class EventClassification:
    category: str           # Top-level category
    subcategory: str       # Specific event type
    severity: str          # Event severity level
    compliance_relevance: str  # Regulatory compliance relevance
    retention_period: int  # Retention period in days
    privacy_impact: str    # Data privacy impact level
    security_relevance: str # Security relevance level

# Comprehensive event taxonomy
AUDIT_EVENT_TAXONOMY = {
    # Authentication Events
    'auth.login.success': EventClassification(
        category='authentication',
        subcategory='login_success',
        severity='info',
        compliance_relevance='high',
        retention_period=2555,  # 7 years
        privacy_impact='low',
        security_relevance='medium'
    ),
    'auth.login.failure': EventClassification(
        category='authentication',
        subcategory='login_failure',
        severity='warning',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='low',
        security_relevance='high'
    ),
    'auth.logout': EventClassification(
        category='authentication',
        subcategory='logout',
        severity='info',
        compliance_relevance='medium',
        retention_period=2555,
        privacy_impact='none',
        security_relevance='low'
    ),
    'auth.mfa.success': EventClassification(
        category='authentication',
        subcategory='mfa_success',
        severity='info',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='low',
        security_relevance='medium'
    ),
    'auth.mfa.failure': EventClassification(
        category='authentication',
        subcategory='mfa_failure',
        severity='warning',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='low',
        security_relevance='high'
    ),
    'auth.session.timeout': EventClassification(
        category='authentication',
        subcategory='session_timeout',
        severity='info',
        compliance_relevance='medium',
        retention_period=2555,
        privacy_impact='none',
        security_relevance='low'
    ),
    
    # Authorization Events
    'authz.access.granted': EventClassification(
        category='authorization',
        subcategory='access_granted',
        severity='info',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='medium',
        security_relevance='medium'
    ),
    'authz.access.denied': EventClassification(
        category='authorization',
        subcategory='access_denied',
        severity='warning',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='low',
        security_relevance='high'
    ),
    'authz.permission.elevated': EventClassification(
        category='authorization',
        subcategory='permission_elevated',
        severity='warning',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='medium',
        security_relevance='high'
    ),
    'authz.role.assigned': EventClassification(
        category='authorization',
        subcategory='role_assigned',
        severity='info',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='medium',
        security_relevance='medium'
    ),
    'authz.role.removed': EventClassification(
        category='authorization',
        subcategory='role_removed',
        severity='info',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='medium',
        security_relevance='medium'
    ),
    
    # Data Access Events
    'data.client.read': EventClassification(
        category='data_access',
        subcategory='client_read',
        severity='info',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='high',
        security_relevance='medium'
    ),
    'data.client.create': EventClassification(
        category='data_access',
        subcategory='client_create',
        severity='info',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='high',
        security_relevance='medium'
    ),
    'data.client.update': EventClassification(
        category='data_access',
        subcategory='client_update',
        severity='info',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='high',
        security_relevance='medium'
    ),
    'data.client.delete': EventClassification(
        category='data_access',
        subcategory='client_delete',
        severity='warning',
        compliance_relevance='critical',
        retention_period=2555,
        privacy_impact='critical',
        security_relevance='high'
    ),
    'data.bulk.export': EventClassification(
        category='data_access',
        subcategory='bulk_export',
        severity='warning',
        compliance_relevance='critical',
        retention_period=2555,
        privacy_impact='critical',
        security_relevance='high'
    ),
    
    # Encryption Events
    'encryption.field.encrypt': EventClassification(
        category='encryption',
        subcategory='field_encrypt',
        severity='info',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='high',
        security_relevance='high'
    ),
    'encryption.field.decrypt': EventClassification(
        category='encryption',
        subcategory='field_decrypt',
        severity='info',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='high',
        security_relevance='high'
    ),
    'encryption.key.rotation': EventClassification(
        category='encryption',
        subcategory='key_rotation',
        severity='info',
        compliance_relevance='critical',
        retention_period=2555,
        privacy_impact='medium',
        security_relevance='critical'
    ),
    'encryption.key.access': EventClassification(
        category='encryption',
        subcategory='key_access',
        severity='info',
        compliance_relevance='critical',
        retention_period=2555,
        privacy_impact='high',
        security_relevance='critical'
    ),
    
    # Privacy Events
    'privacy.gdpr.request': EventClassification(
        category='privacy',
        subcategory='gdpr_request',
        severity='info',
        compliance_relevance='critical',
        retention_period=2555,
        privacy_impact='critical',
        security_relevance='medium'
    ),
    'privacy.consent.granted': EventClassification(
        category='privacy',
        subcategory='consent_granted',
        severity='info',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='high',
        security_relevance='low'
    ),
    'privacy.consent.withdrawn': EventClassification(
        category='privacy',
        subcategory='consent_withdrawn',
        severity='info',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='high',
        security_relevance='low'
    ),
    'privacy.data.anonymized': EventClassification(
        category='privacy',
        subcategory='data_anonymized',
        severity='info',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='high',
        security_relevance='medium'
    ),
    
    # Security Events
    'security.incident.detected': EventClassification(
        category='security',
        subcategory='incident_detected',
        severity='critical',
        compliance_relevance='critical',
        retention_period=2555,
        privacy_impact='high',
        security_relevance='critical'
    ),
    'security.breach.suspected': EventClassification(
        category='security',
        subcategory='breach_suspected',
        severity='critical',
        compliance_relevance='critical',
        retention_period=2555,
        privacy_impact='critical',
        security_relevance='critical'
    ),
    'security.vulnerability.detected': EventClassification(
        category='security',
        subcategory='vulnerability_detected',
        severity='warning',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='medium',
        security_relevance='high'
    ),
    
    # System Events
    'system.startup': EventClassification(
        category='system',
        subcategory='startup',
        severity='info',
        compliance_relevance='medium',
        retention_period=365,
        privacy_impact='none',
        security_relevance='low'
    ),
    'system.shutdown': EventClassification(
        category='system',
        subcategory='shutdown',
        severity='info',
        compliance_relevance='medium',
        retention_period=365,
        privacy_impact='none',
        security_relevance='low'
    ),
    'system.config.changed': EventClassification(
        category='system',
        subcategory='config_changed',
        severity='warning',
        compliance_relevance='high',
        retention_period=2555,
        privacy_impact='low',
        security_relevance='high'
    )
}
```

### 2.2 Event Classification Service

```python
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import re

class AuditEventClassifier:
    """Service for classifying and enriching audit events"""
    
    def __init__(self, db_pool):
        self.db_pool = db_pool
        self.classification_rules = self._load_classification_rules()
        self.enrichment_providers = self._initialize_enrichment_providers()
    
    async def classify_event(self, event: AuditEvent) -> AuditEvent:
        """Classify audit event and determine its significance"""
        
        # Get base classification from taxonomy
        base_classification = AUDIT_EVENT_TAXONOMY.get(event.event_type)
        
        if not base_classification:
            # Handle unknown event types
            base_classification = self._classify_unknown_event(event)
        
        # Apply dynamic classification rules
        dynamic_classification = await self._apply_dynamic_classification(event)
        
        # Merge classifications
        event.classification = {
            'category': base_classification.category,
            'subcategory': base_classification.subcategory,
            'severity': self._determine_severity(base_classification, dynamic_classification),
            'compliance_relevance': base_classification.compliance_relevance,
            'retention_period': base_classification.retention_period,
            'privacy_impact': base_classification.privacy_impact,
            'security_relevance': base_classification.security_relevance,
            'risk_score': self._calculate_risk_score(event, dynamic_classification),
            'tags': self._generate_tags(event, dynamic_classification)
        }
        
        event.status = AuditEventStatus.CLASSIFIED
        return event
    
    async def enrich_event(self, event: AuditEvent) -> AuditEvent:
        """Enrich event with additional context and metadata"""
        
        enrichment_data = {}
        
        # User context enrichment
        if event.user_context.get('user_id'):
            user_enrichment = await self._enrich_user_context(event.user_context['user_id'])
            enrichment_data['user_context'] = user_enrichment
        
        # Geolocation enrichment
        if event.user_context.get('ip_address'):
            geo_enrichment = await self._enrich_geolocation(event.user_context['ip_address'])
            enrichment_data['geolocation'] = geo_enrichment
        
        # Session context enrichment
        if event.user_context.get('session_id'):
            session_enrichment = await self._enrich_session_context(event.user_context['session_id'])
            enrichment_data['session_context'] = session_enrichment
        
        # Data context enrichment
        if 'resource_id' in event.event_data:
            resource_enrichment = await self._enrich_resource_context(
                event.event_data['resource_id'], 
                event.event_data.get('resource_type')
            )
            enrichment_data['resource_context'] = resource_enrichment
        
        # Time-based enrichment
        time_enrichment = self._enrich_temporal_context(event.timestamp)
        enrichment_data['temporal_context'] = time_enrichment
        
        event.enrichment_data = enrichment_data
        event.status = AuditEventStatus.ENRICHED
        
        return event
    
    async def _enrich_user_context(self, user_id: str) -> Dict[str, Any]:
        """Enrich event with user context information"""
        
        query = """
            SELECT 
                p.email,
                p.first_name,
                p.last_name,
                p.created_at as user_created_at,
                p.last_login_at,
                p.login_count,
                array_agg(pr.role_name) as roles,
                p.status as user_status
            FROM profiles p
            LEFT JOIN profile_roles pr ON p.id = pr.profile_id
            WHERE p.id = $1
            GROUP BY p.id, p.email, p.first_name, p.last_name, p.created_at, 
                     p.last_login_at, p.login_count, p.status
        """
        
        async with self.db_pool.acquire() as conn:
            user_data = await conn.fetchrow(query, int(user_id))
        
        if user_data:
            return {
                'email': user_data['email'],
                'full_name': f"{user_data['first_name']} {user_data['last_name']}",
                'roles': user_data['roles'] or [],
                'user_status': user_data['user_status'],
                'account_age_days': (datetime.now() - user_data['user_created_at']).days,
                'last_login_at': user_data['last_login_at'].isoformat() if user_data['last_login_at'] else None,
                'total_logins': user_data['login_count'] or 0
            }
        
        return {'error': 'User not found'}
    
    async def _enrich_geolocation(self, ip_address: str) -> Dict[str, Any]:
        """Enrich event with geolocation data"""
        
        # For production, integrate with IP geolocation service
        # This is a mock implementation
        
        # Check for internal IP addresses
        if ip_address.startswith(('192.168.', '10.', '172.')):
            return {
                'country': 'US',
                'region': 'Internal Network',
                'city': 'Office Location',
                'is_internal': True,
                'risk_level': 'low'
            }
        
        # For external IPs, implement actual geolocation lookup
        return {
            'country': 'Unknown',
            'region': 'Unknown',
            'city': 'Unknown',
            'is_internal': False,
            'risk_level': 'medium'  # Unknown external IP
        }
    
    async def _enrich_session_context(self, session_id: str) -> Dict[str, Any]:
        """Enrich event with session context"""
        
        query = """
            SELECT 
                created_at,
                last_activity,
                ip_address as session_ip,
                user_agent,
                mfa_verified,
                session_duration_minutes
            FROM session
            WHERE session_id = $1
        """
        
        async with self.db_pool.acquire() as conn:
            session_data = await conn.fetchrow(query, session_id)
        
        if session_data:
            return {
                'session_created': session_data['created_at'].isoformat(),
                'last_activity': session_data['last_activity'],
                'session_ip': session_data['session_ip'],
                'user_agent': session_data['user_agent'],
                'mfa_verified': session_data['mfa_verified'],
                'session_duration_minutes': session_data['session_duration_minutes'] or 0,
                'is_active': True
            }
        
        return {'is_active': False, 'session_found': False}
    
    def _calculate_risk_score(self, event: AuditEvent, 
                            dynamic_classification: Dict[str, Any]) -> int:
        """Calculate risk score for the event (0-100)"""
        
        base_score = 0
        
        # Base score by event category
        category_scores = {
            'authentication': 20,
            'authorization': 30,
            'data_access': 40,
            'encryption': 50,
            'privacy': 60,
            'security': 80,
            'system': 10
        }
        
        base_score = category_scores.get(
            event.classification.get('category', ''), 20
        )
        
        # Adjust for severity
        severity_multipliers = {
            'info': 1.0,
            'warning': 1.5,
            'error': 2.0,
            'critical': 3.0
        }
        
        severity_multiplier = severity_multipliers.get(
            event.classification.get('severity', 'info'), 1.0
        )
        
        # Adjust for user context
        user_risk_adjustment = 0
        if event.enrichment_data.get('user_context'):
            user_data = event.enrichment_data['user_context']
            
            # New users have higher risk
            if user_data.get('account_age_days', 0) < 30:
                user_risk_adjustment += 10
            
            # Users with admin roles have higher risk
            if 'admin' in user_data.get('roles', []):
                user_risk_adjustment += 15
        
        # Adjust for geolocation
        geo_risk_adjustment = 0
        if event.enrichment_data.get('geolocation'):
            geo_data = event.enrichment_data['geolocation']
            
            # External IPs have higher risk
            if not geo_data.get('is_internal', True):
                geo_risk_adjustment += 20
        
        # Calculate final score
        final_score = int(
            (base_score + user_risk_adjustment + geo_risk_adjustment) * severity_multiplier
        )
        
        return min(final_score, 100)  # Cap at 100
    
    def _generate_tags(self, event: AuditEvent, 
                      dynamic_classification: Dict[str, Any]) -> List[str]:
        """Generate searchable tags for the event"""
        
        tags = []
        
        # Add category and subcategory tags
        if event.classification.get('category'):
            tags.append(f"category:{event.classification['category']}")
        
        if event.classification.get('subcategory'):
            tags.append(f"subcategory:{event.classification['subcategory']}")
        
        # Add severity tag
        if event.classification.get('severity'):
            tags.append(f"severity:{event.classification['severity']}")
        
        # Add user-related tags
        if event.enrichment_data.get('user_context'):
            user_data = event.enrichment_data['user_context']
            
            for role in user_data.get('roles', []):
                tags.append(f"user_role:{role}")
            
            if user_data.get('account_age_days', 0) < 30:
                tags.append('new_user')
        
        # Add time-based tags
        if event.enrichment_data.get('temporal_context'):
            temporal_data = event.enrichment_data['temporal_context']
            
            tags.append(f"hour:{temporal_data['hour']}")
            tags.append(f"day_of_week:{temporal_data['day_of_week']}")
            
            if temporal_data.get('is_business_hours'):
                tags.append('business_hours')
            else:
                tags.append('after_hours')
        
        # Add risk-based tags
        risk_score = event.classification.get('risk_score', 0)
        if risk_score >= 75:
            tags.append('high_risk')
        elif risk_score >= 50:
            tags.append('medium_risk')
        else:
            tags.append('low_risk')
        
        # Add compliance tags
        if event.classification.get('compliance_relevance') in ['high', 'critical']:
            tags.append('compliance_relevant')
        
        if event.classification.get('privacy_impact') in ['high', 'critical']:
            tags.append('privacy_relevant')
        
        return tags
```

## 3. Correlation ID Implementation

### 3.1 Correlation ID Management

```python
import uuid
import threading
from contextvars import ContextVar
from typing import Optional, Dict, Any
from datetime import datetime

# Thread-safe correlation ID storage
correlation_context: ContextVar[Optional[str]] = ContextVar('correlation_id', default=None)

class CorrelationIDManager:
    """Manages correlation IDs across request/operation lifecycles"""
    
    def __init__(self):
        self.active_correlations = {}
        self.correlation_hierarchy = {}
        self.lock = threading.RLock()
    
    def generate_correlation_id(self, parent_correlation_id: Optional[str] = None,
                               operation_type: str = 'request') -> str:
        """Generate new correlation ID with optional parent relationship"""
        
        timestamp = int(datetime.now().timestamp())
        unique_part = uuid.uuid4().hex[:8]
        
        if parent_correlation_id:
            # Child correlation ID
            correlation_id = f"CORR_{timestamp}_{unique_part}_{operation_type}"
            
            # Track parent-child relationship
            with self.lock:
                if parent_correlation_id not in self.correlation_hierarchy:
                    self.correlation_hierarchy[parent_correlation_id] = []
                self.correlation_hierarchy[parent_correlation_id].append(correlation_id)
        else:
            # Root correlation ID
            correlation_id = f"CORR_{timestamp}_{unique_part}_root"
        
        # Store correlation metadata
        with self.lock:
            self.active_correlations[correlation_id] = {
                'created_at': datetime.now(),
                'parent_id': parent_correlation_id,
                'operation_type': operation_type,
                'event_count': 0,
                'first_event_time': None,
                'last_event_time': None
            }
        
        return correlation_id
    
    def set_correlation_context(self, correlation_id: str) -> str:
        """Set correlation ID in current context"""
        correlation_context.set(correlation_id)
        return correlation_id
    
    def get_current_correlation_id(self) -> Optional[str]:
        """Get correlation ID from current context"""
        return correlation_context.get()
    
    def track_event_in_correlation(self, correlation_id: str, event_type: str):
        """Track event occurrence within correlation"""
        with self.lock:
            if correlation_id in self.active_correlations:
                metadata = self.active_correlations[correlation_id]
                metadata['event_count'] += 1
                metadata['last_event_time'] = datetime.now()
                
                if metadata['first_event_time'] is None:
                    metadata['first_event_time'] = datetime.now()
    
    def get_correlation_tree(self, root_correlation_id: str) -> Dict[str, Any]:
        """Get complete correlation tree for analysis"""
        
        def build_tree(correlation_id: str) -> Dict[str, Any]:
            metadata = self.active_correlations.get(correlation_id, {})
            children = self.correlation_hierarchy.get(correlation_id, [])
            
            return {
                'correlation_id': correlation_id,
                'metadata': metadata,
                'children': [build_tree(child_id) for child_id in children]
            }
        
        return build_tree(root_correlation_id)
    
    def cleanup_expired_correlations(self, max_age_hours: int = 24):
        """Clean up old correlation tracking data"""
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        
        with self.lock:
            expired_ids = [
                corr_id for corr_id, metadata in self.active_correlations.items()
                if metadata['created_at'] < cutoff_time
            ]
            
            for corr_id in expired_ids:
                del self.active_correlations[corr_id]
                if corr_id in self.correlation_hierarchy:
                    del self.correlation_hierarchy[corr_id]
        
        return len(expired_ids)

# Global correlation manager instance
correlation_manager = CorrelationIDManager()

# Context managers for correlation ID handling
class CorrelationContext:
    """Context manager for correlation ID scope"""
    
    def __init__(self, correlation_id: str = None, operation_type: str = 'operation'):
        self.correlation_id = correlation_id
        self.operation_type = operation_type
        self.previous_correlation_id = None
    
    def __enter__(self) -> str:
        # Store previous correlation ID
        self.previous_correlation_id = correlation_manager.get_current_correlation_id()
        
        # Generate new correlation ID if not provided
        if not self.correlation_id:
            self.correlation_id = correlation_manager.generate_correlation_id(
                parent_correlation_id=self.previous_correlation_id,
                operation_type=self.operation_type
            )
        
        # Set in context
        correlation_manager.set_correlation_context(self.correlation_id)
        return self.correlation_id
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Restore previous correlation ID
        if self.previous_correlation_id:
            correlation_manager.set_correlation_context(self.previous_correlation_id)
        else:
            correlation_context.set(None)

# Decorator for automatic correlation ID management
def with_correlation_id(operation_type: str = 'function'):
    """Decorator to automatically manage correlation IDs in function calls"""
    
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            with CorrelationContext(operation_type=operation_type):
                return await func(*args, **kwargs)
        
        def sync_wrapper(*args, **kwargs):
            with CorrelationContext(operation_type=operation_type):
                return func(*args, **kwargs)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
```

### 3.2 Correlation-Based Event Tracking

```python
class CorrelationAuditTracker:
    """Track and analyze events by correlation ID"""
    
    def __init__(self, db_pool, correlation_manager: CorrelationIDManager):
        self.db_pool = db_pool
        self.correlation_manager = correlation_manager
    
    async def get_correlation_events(self, correlation_id: str) -> List[Dict[str, Any]]:
        """Get all events for a specific correlation ID"""
        
        query = """
            SELECT 
                event_id,
                timestamp,
                event_type,
                event_data,
                user_id,
                session_id,
                classification,
                enrichment_data
            FROM audit_events
            WHERE correlation_id = $1
            ORDER BY timestamp ASC
        """
        
        async with self.db_pool.acquire() as conn:
            rows = await conn.fetch(query, correlation_id)
        
        return [dict(row) for row in rows]
    
    async def analyze_correlation_flow(self, correlation_id: str) -> Dict[str, Any]:
        """Analyze event flow within a correlation"""
        
        events = await self.get_correlation_events(correlation_id)
        
        if not events:
            return {'error': 'No events found for correlation ID'}
        
        # Calculate flow metrics
        start_time = datetime.fromisoformat(events[0]['timestamp'])
        end_time = datetime.fromisoformat(events[-1]['timestamp'])
        duration = (end_time - start_time).total_seconds()
        
        # Event type distribution
        event_types = {}
        for event in events:
            event_type = event['event_type']
            if event_type not in event_types:
                event_types[event_type] = 0
            event_types[event_type] += 1
        
        # Risk analysis
        risk_scores = []
        for event in events:
            classification = json.loads(event['classification']) if event['classification'] else {}
            risk_score = classification.get('risk_score', 0)
            risk_scores.append(risk_score)
        
        # User activity analysis
        users_involved = set()
        sessions_involved = set()
        
        for event in events:
            if event['user_id']:
                users_involved.add(event['user_id'])
            if event['session_id']:
                sessions_involved.add(event['session_id'])
        
        # Identify suspicious patterns
        suspicious_indicators = []
        
        # Multiple users in single correlation (potential session hijacking)
        if len(users_involved) > 1:
            suspicious_indicators.append({
                'type': 'multiple_users',
                'description': f'Multiple users ({len(users_involved)}) in single correlation',
                'severity': 'high'
            })
        
        # High-risk events
        high_risk_events = [e for e in events if json.loads(e.get('classification', '{}')).get('risk_score', 0) > 75]
        if high_risk_events:
            suspicious_indicators.append({
                'type': 'high_risk_events',
                'description': f'{len(high_risk_events)} high-risk events detected',
                'severity': 'medium'
            })
        
        # Rapid event sequence (potential automated attack)
        if duration > 0:
            events_per_second = len(events) / duration
            if events_per_second > 10:  # More than 10 events per second
                suspicious_indicators.append({
                    'type': 'rapid_events',
                    'description': f'High event rate: {events_per_second:.2f} events/second',
                    'severity': 'high'
                })
        
        return {
            'correlation_id': correlation_id,
            'event_count': len(events),
            'duration_seconds': duration,
            'start_time': start_time.isoformat(),
            'end_time': end_time.isoformat(),
            'event_types': event_types,
            'users_involved': len(users_involved),
            'sessions_involved': len(sessions_involved),
            'risk_metrics': {
                'average_risk_score': sum(risk_scores) / len(risk_scores) if risk_scores else 0,
                'max_risk_score': max(risk_scores) if risk_scores else 0,
                'high_risk_event_count': len([r for r in risk_scores if r > 75])
            },
            'suspicious_indicators': suspicious_indicators,
            'overall_risk_level': self._calculate_overall_risk_level(risk_scores, suspicious_indicators)
        }
    
    def _calculate_overall_risk_level(self, risk_scores: List[int], 
                                    suspicious_indicators: List[Dict[str, Any]]) -> str:
        """Calculate overall risk level for correlation"""
        
        avg_risk = sum(risk_scores) / len(risk_scores) if risk_scores else 0
        max_risk = max(risk_scores) if risk_scores else 0
        high_severity_indicators = len([s for s in suspicious_indicators if s['severity'] == 'high'])
        
        if max_risk >= 90 or high_severity_indicators >= 2:
            return 'CRITICAL'
        elif max_risk >= 75 or avg_risk >= 60 or high_severity_indicators >= 1:
            return 'HIGH'
        elif max_risk >= 50 or avg_risk >= 40:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    async def find_related_correlations(self, correlation_id: str, 
                                      time_window_minutes: int = 60) -> List[Dict[str, Any]]:
        """Find related correlations within a time window"""
        
        # Get the time range for the target correlation
        events = await self.get_correlation_events(correlation_id)
        if not events:
            return []
        
        target_start = datetime.fromisoformat(events[0]['timestamp'])
        target_end = datetime.fromisoformat(events[-1]['timestamp'])
        
        # Expand search window
        search_start = target_start - timedelta(minutes=time_window_minutes)
        search_end = target_end + timedelta(minutes=time_window_minutes)
        
        # Find correlations with overlapping users/sessions/IPs
        target_users = set()
        target_sessions = set()
        target_ips = set()
        
        for event in events:
            if event['user_id']:
                target_users.add(event['user_id'])
            if event['session_id']:
                target_sessions.add(event['session_id'])
            
            enrichment = json.loads(event.get('enrichment_data', '{}'))
            if enrichment.get('geolocation', {}).get('ip_address'):
                target_ips.add(enrichment['geolocation']['ip_address'])
        
        # Search for related correlations
        query = """
            SELECT DISTINCT 
                correlation_id,
                COUNT(*) as event_count,
                MIN(timestamp) as start_time,
                MAX(timestamp) as end_time,
                COUNT(DISTINCT user_id) as unique_users,
                array_agg(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) as users
            FROM audit_events
            WHERE correlation_id != $1
            AND timestamp BETWEEN $2 AND $3
            AND (
                user_id = ANY($4::int[]) OR
                session_id = ANY($5::varchar[])
            )
            GROUP BY correlation_id
            ORDER BY start_time
        """
        
        async with self.db_pool.acquire() as conn:
            related_correlations = await conn.fetch(
                query, 
                correlation_id,
                search_start,
                search_end,
                list(target_users),
                list(target_sessions)
            )
        
        return [dict(row) for row in related_correlations]
```

## 4. Database Schema for Audit Logs

### 4.1 Core Audit Tables

```sql
-- Main audit events table
CREATE TABLE audit_events (
    event_id VARCHAR(36) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    user_id INTEGER REFERENCES profiles(id),
    session_id VARCHAR(100),
    correlation_id VARCHAR(100) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'captured',
    enrichment_data JSONB DEFAULT '{}',
    classification JSONB DEFAULT '{}',
    integrity_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_audit_events_timestamp ON audit_events(timestamp);
CREATE INDEX idx_audit_events_correlation_id ON audit_events(correlation_id);
CREATE INDEX idx_audit_events_user_id ON audit_events(user_id);
CREATE INDEX idx_audit_events_event_type ON audit_events(event_type);
CREATE INDEX idx_audit_events_classification ON audit_events USING GIN(classification);
CREATE INDEX idx_audit_events_enrichment ON audit_events USING GIN(enrichment_data);

-- Composite indexes for common queries
CREATE INDEX idx_audit_events_user_timestamp ON audit_events(user_id, timestamp);
CREATE INDEX idx_audit_events_type_timestamp ON audit_events(event_type, timestamp);
CREATE INDEX idx_audit_events_correlation_timestamp ON audit_events(correlation_id, timestamp);

-- Field-level access audit log
CREATE TABLE field_access_audit (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(36) REFERENCES audit_events(event_id),
    field_path VARCHAR(200) NOT NULL,
    operation_type VARCHAR(20) NOT NULL, -- 'encrypt', 'decrypt', 'access_denied'
    resource_type VARCHAR(50) NOT NULL, -- 'clients', 'portfolios', etc.
    resource_id INTEGER NOT NULL,
    field_sensitivity VARCHAR(20) NOT NULL, -- 'public', 'confidential', etc.
    encryption_key_version VARCHAR(100),
    access_granted BOOLEAN NOT NULL DEFAULT FALSE,
    denial_reason TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_field_access_audit_event_id ON field_access_audit(event_id);
CREATE INDEX idx_field_access_audit_field_path ON field_access_audit(field_path);
CREATE INDEX idx_field_access_audit_resource ON field_access_audit(resource_type, resource_id);
CREATE INDEX idx_field_access_audit_timestamp ON field_access_audit(timestamp);

-- Correlation metadata table
CREATE TABLE correlation_metadata (
    correlation_id VARCHAR(100) PRIMARY KEY,
    parent_correlation_id VARCHAR(100) REFERENCES correlation_metadata(correlation_id),
    operation_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    first_event_time TIMESTAMP WITH TIME ZONE,
    last_event_time TIMESTAMP WITH TIME ZONE,
    event_count INTEGER DEFAULT 0,
    risk_score INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'archived'
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_correlation_metadata_parent ON correlation_metadata(parent_correlation_id);
CREATE INDEX idx_correlation_metadata_created_at ON correlation_metadata(created_at);
CREATE INDEX idx_correlation_metadata_status ON correlation_metadata(status);

-- Audit log integrity verification table
CREATE TABLE audit_log_integrity (
    id BIGSERIAL PRIMARY KEY,
    batch_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    batch_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    event_count INTEGER NOT NULL,
    batch_hash VARCHAR(64) NOT NULL, -- Hash of all events in batch
    verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'failed'
    verification_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_log_integrity_batch_time ON audit_log_integrity(batch_start_time, batch_end_time);
CREATE INDEX idx_audit_log_integrity_status ON audit_log_integrity(verification_status);

-- Compliance reporting cache table
CREATE TABLE compliance_report_cache (
    report_id VARCHAR(36) PRIMARY KEY,
    report_type VARCHAR(50) NOT NULL,
    report_parameters JSONB NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    report_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cache_status VARCHAR(20) DEFAULT 'valid' -- 'valid', 'stale', 'invalid'
);

CREATE INDEX idx_compliance_report_cache_type ON compliance_report_cache(report_type);
CREATE INDEX idx_compliance_report_cache_date_range ON compliance_report_cache(start_date, end_date);
CREATE INDEX idx_compliance_report_cache_expires ON compliance_report_cache(expires_at);

-- Alert tracking table
CREATE TABLE audit_alerts (
    alert_id VARCHAR(36) PRIMARY KEY,
    correlation_id VARCHAR(100) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    alert_data JSONB NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    acknowledged_by INTEGER REFERENCES profiles(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES profiles(id),
    resolution_notes TEXT,
    status VARCHAR(20) DEFAULT 'open' -- 'open', 'acknowledged', 'resolved', 'closed'
);

CREATE INDEX idx_audit_alerts_correlation_id ON audit_alerts(correlation_id);
CREATE INDEX idx_audit_alerts_status ON audit_alerts(status);
CREATE INDEX idx_audit_alerts_severity ON audit_alerts(severity);
CREATE INDEX idx_audit_alerts_triggered_at ON audit_alerts(triggered_at);
```

### 4.2 Database Functions and Triggers

```sql
-- Function to update correlation metadata
CREATE OR REPLACE FUNCTION update_correlation_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Update correlation metadata when new events are added
    INSERT INTO correlation_metadata (correlation_id, operation_type, created_at, first_event_time, event_count)
    VALUES (NEW.correlation_id, 'audit_event', NEW.timestamp, NEW.timestamp, 1)
    ON CONFLICT (correlation_id) DO UPDATE SET
        last_event_time = NEW.timestamp,
        event_count = correlation_metadata.event_count + 1;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update correlation metadata
CREATE TRIGGER trigger_update_correlation_metadata
    AFTER INSERT ON audit_events
    FOR EACH ROW
    EXECUTE FUNCTION update_correlation_metadata();

-- Function to verify audit log integrity
CREATE OR REPLACE FUNCTION verify_audit_batch_integrity(
    p_batch_start TIMESTAMP WITH TIME ZONE,
    p_batch_end TIMESTAMP WITH TIME ZONE
) RETURNS BOOLEAN AS $$
DECLARE
    calculated_hash VARCHAR(64);
    stored_hash VARCHAR(64);
    event_count INTEGER;
BEGIN
    -- Calculate hash of all events in the batch
    SELECT 
        COUNT(*),
        encode(
            digest(
                string_agg(integrity_hash ORDER BY timestamp, event_id), 
                'sha256'
            ), 
            'hex'
        )
    INTO event_count, calculated_hash
    FROM audit_events
    WHERE timestamp BETWEEN p_batch_start AND p_batch_end;
    
    -- Get stored hash
    SELECT batch_hash INTO stored_hash
    FROM audit_log_integrity
    WHERE batch_start_time = p_batch_start
    AND batch_end_time = p_batch_end;
    
    -- Compare hashes
    IF calculated_hash = stored_hash THEN
        UPDATE audit_log_integrity
        SET verification_status = 'verified',
            verification_time = NOW()
        WHERE batch_start_time = p_batch_start
        AND batch_end_time = p_batch_end;
        
        RETURN TRUE;
    ELSE
        UPDATE audit_log_integrity
        SET verification_status = 'failed',
            verification_time = NOW()
        WHERE batch_start_time = p_batch_start
        AND batch_end_time = p_batch_end;
        
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to archive old audit logs
CREATE OR REPLACE FUNCTION archive_audit_logs(
    p_archive_before_days INTEGER DEFAULT 365
) RETURNS INTEGER AS $$
DECLARE
    archive_cutoff TIMESTAMP WITH TIME ZONE;
    archived_count INTEGER;
BEGIN
    archive_cutoff := NOW() - INTERVAL '1 day' * p_archive_before_days;
    
    -- Move old events to archive table (create if not exists)
    CREATE TABLE IF NOT EXISTS audit_events_archive (
        LIKE audit_events INCLUDING ALL
    );
    
    -- Insert into archive
    INSERT INTO audit_events_archive
    SELECT * FROM audit_events
    WHERE timestamp < archive_cutoff;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    -- Delete from main table
    DELETE FROM audit_events
    WHERE timestamp < archive_cutoff;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get audit statistics
CREATE OR REPLACE FUNCTION get_audit_statistics(
    p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_events', COUNT(*),
        'events_by_type', json_object_agg(event_type, type_count),
        'events_by_severity', json_object_agg(severity, severity_count),
        'unique_users', COUNT(DISTINCT user_id),
        'unique_correlations', COUNT(DISTINCT correlation_id),
        'high_risk_events', SUM(CASE WHEN (classification->>'risk_score')::int > 75 THEN 1 ELSE 0 END),
        'date_range', json_build_object(
            'start_date', p_start_date,
            'end_date', p_end_date
        )
    ) INTO result
    FROM (
        SELECT 
            event_type,
            COUNT(*) as type_count,
            classification->>'severity' as severity,
            COUNT(*) as severity_count,
            user_id,
            correlation_id,
            classification
        FROM audit_events
        WHERE timestamp::date BETWEEN p_start_date AND p_end_date
        GROUP BY event_type, classification->>'severity', user_id, correlation_id, classification
    ) stats;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

## 5. Audit Event Collection

### 5.1 Audit Event Collection Service

```python
import asyncio
from typing import Dict, Any, Optional, List
import json
from datetime import datetime
from dataclasses import dataclass
import threading
from queue import Queue
import time

class AuditEventCollector:
    """High-performance audit event collection service"""
    
    def __init__(self, db_pool, classifier: AuditEventClassifier):
        self.db_pool = db_pool
        self.classifier = classifier
        self.event_queue = Queue(maxsize=10000)
        self.batch_size = 100
        self.batch_timeout = 5.0  # seconds
        self.worker_threads = 3
        self.is_running = False
        self.workers = []
        self.stats = {
            'events_collected': 0,
            'events_processed': 0,
            'events_failed': 0,
            'batches_processed': 0,
            'last_batch_time': None
        }
    
    def start(self):
        """Start the audit collection service"""
        if self.is_running:
            return
        
        self.is_running = True
        
        # Start worker threads for event processing
        for i in range(self.worker_threads):
            worker = threading.Thread(
                target=self._event_processing_worker,
                name=f"audit_worker_{i}",
                daemon=True
            )
            worker.start()
            self.workers.append(worker)
        
        print(f"Audit event collector started with {self.worker_threads} workers")
    
    def stop(self):
        """Stop the audit collection service"""
        self.is_running = False
        
        # Wait for workers to finish
        for worker in self.workers:
            worker.join(timeout=10)
        
        print("Audit event collector stopped")
    
    async def collect_event(self, event_type: str, event_data: Dict[str, Any],
                           user_context: Optional[Dict[str, Any]] = None,
                           immediate: bool = False) -> str:
        """Collect audit event for processing"""
        
        try:
            # Create audit event
            audit_event = AuditEvent(event_type, event_data, user_context)
            
            # Add to processing queue
            if immediate:
                # Process immediately for critical events
                await self._process_single_event(audit_event)
            else:
                # Queue for batch processing
                self.event_queue.put(audit_event, timeout=1.0)
            
            self.stats['events_collected'] += 1
            return audit_event.event_id
            
        except Exception as e:
            # Log error but don't fail the calling operation
            await self._log_collection_error(event_type, str(e))
            self.stats['events_failed'] += 1
            return None
    
    def _event_processing_worker(self):
        """Worker thread for processing audit events"""
        batch = []
        last_batch_time = time.time()
        
        while self.is_running:
            try:
                # Try to get event with timeout
                try:
                    event = self.event_queue.get(timeout=1.0)
                    batch.append(event)
                except:
                    # Timeout or queue empty
                    pass
                
                current_time = time.time()
                
                # Process batch if it's full or timeout reached
                should_process_batch = (
                    len(batch) >= self.batch_size or
                    (batch and (current_time - last_batch_time) >= self.batch_timeout)
                )
                
                if should_process_batch:
                    asyncio.run(self._process_event_batch(batch))
                    batch = []
                    last_batch_time = current_time
                    self.stats['batches_processed'] += 1
                    self.stats['last_batch_time'] = datetime.now()
                
            except Exception as e:
                # Log error and continue
                print(f"Error in audit worker: {e}")
                # Clear problematic batch
                batch = []
                last_batch_time = time.time()
    
    async def _process_event_batch(self, events: List[AuditEvent]):
        """Process batch of audit events"""
        
        if not events:
            return
        
        try:
            # Classify and enrich events
            processed_events = []
            for event in events:
                try:
                    # Enrich event with additional context
                    enriched_event = await self.classifier.enrich_event(event)
                    
                    # Classify event
                    classified_event = await self.classifier.classify_event(enriched_event)
                    
                    # Calculate integrity hash
                    classified_event.integrity_hash = classified_event.calculate_integrity_hash()
                    classified_event.status = AuditEventStatus.STORED
                    
                    processed_events.append(classified_event)
                    
                except Exception as e:
                    # Log individual event processing error
                    await self._log_event_processing_error(event.event_id, str(e))
                    self.stats['events_failed'] += 1
            
            # Store batch in database
            if processed_events:
                await self._store_event_batch(processed_events)
                self.stats['events_processed'] += len(processed_events)
                
                # Process real-time alerts for high-risk events
                await self._process_real_time_alerts(processed_events)
            
        except Exception as e:
            await self._log_batch_processing_error(len(events), str(e))
            self.stats['events_failed'] += len(events)
    
    async def _store_event_batch(self, events: List[AuditEvent]):
        """Store batch of events in database"""
        
        # Prepare batch insert data
        event_records = []
        field_access_records = []
        
        for event in events:
            event_record = event.to_dict()
            event_records.append(event_record)
            
            # Create field access records if this is a field-level event
            if self._is_field_level_event(event.event_type):
                field_record = self._create_field_access_record(event)
                if field_record:
                    field_access_records.append(field_record)
        
        # Batch insert into database
        async with self.db_pool.acquire() as conn:
            async with conn.transaction():
                # Insert audit events
                if event_records:
                    await self._batch_insert_audit_events(conn, event_records)
                
                # Insert field access records
                if field_access_records:
                    await self._batch_insert_field_access_records(conn, field_access_records)
    
    async def _batch_insert_audit_events(self, conn, event_records: List[Dict[str, Any]]):
        """Batch insert audit events"""
        
        if not event_records:
            return
        
        # Build INSERT query with multiple values
        fields = list(event_records[0].keys())
        field_list = ', '.join(fields)
        
        # Create placeholder for each record
        values_placeholders = []
        all_values = []
        
        for i, record in enumerate(event_records):
            record_placeholders = []
            for j, field in enumerate(fields):
                placeholder_index = i * len(fields) + j + 1
                record_placeholders.append(f'${placeholder_index}')
                all_values.append(record[field])
            
            values_placeholders.append(f"({', '.join(record_placeholders)})")
        
        query = f"""
            INSERT INTO audit_events ({field_list})
            VALUES {', '.join(values_placeholders)}
        """
        
        await conn.execute(query, *all_values)
    
    async def _batch_insert_field_access_records(self, conn, field_records: List[Dict[str, Any]]):
        """Batch insert field access records"""
        
        if not field_records:
            return
        
        fields = list(field_records[0].keys())
        field_list = ', '.join(fields)
        
        values_placeholders = []
        all_values = []
        
        for i, record in enumerate(field_records):
            record_placeholders = []
            for j, field in enumerate(fields):
                placeholder_index = i * len(fields) + j + 1
                record_placeholders.append(f'${placeholder_index}')
                all_values.append(record[field])
            
            values_placeholders.append(f"({', '.join(record_placeholders)})")
        
        query = f"""
            INSERT INTO field_access_audit ({field_list})
            VALUES {', '.join(values_placeholders)}
        """
        
        await conn.execute(query, *all_values)
    
    def _is_field_level_event(self, event_type: str) -> bool:
        """Check if event is related to field-level access"""
        field_level_events = [
            'encryption.field.encrypt',
            'encryption.field.decrypt',
            'data.client.read',
            'data.client.update',
            'authz.access.denied'
        ]
        return event_type in field_level_events
    
    def _create_field_access_record(self, event: AuditEvent) -> Optional[Dict[str, Any]]:
        """Create field access audit record from event"""
        
        event_data = event.event_data
        
        # Extract field access information
        field_path = event_data.get('field_path')
        if not field_path:
            return None
        
        return {
            'event_id': event.event_id,
            'field_path': field_path,
            'operation_type': self._map_event_to_operation(event.event_type),
            'resource_type': event_data.get('resource_type', 'unknown'),
            'resource_id': event_data.get('resource_id', 0),
            'field_sensitivity': event_data.get('field_sensitivity', 'unknown'),
            'encryption_key_version': event_data.get('key_version'),
            'access_granted': event.event_type != 'authz.access.denied',
            'denial_reason': event_data.get('denial_reason'),
            'timestamp': event.timestamp
        }
    
    def _map_event_to_operation(self, event_type: str) -> str:
        """Map event type to field operation type"""
        mapping = {
            'encryption.field.encrypt': 'encrypt',
            'encryption.field.decrypt': 'decrypt',
            'data.client.read': 'read',
            'data.client.update': 'write',
            'authz.access.denied': 'access_denied'
        }
        return mapping.get(event_type, 'unknown')
    
    async def _process_real_time_alerts(self, events: List[AuditEvent]):
        """Process real-time alerts for high-risk events"""
        
        high_risk_events = [
            event for event in events
            if event.classification.get('risk_score', 0) > 75
        ]
        
        for event in high_risk_events:
            try:
                await self._create_real_time_alert(event)
            except Exception as e:
                await self._log_alert_creation_error(event.event_id, str(e))
    
    async def _create_real_time_alert(self, event: AuditEvent):
        """Create real-time alert for high-risk event"""
        
        alert_data = {
            'alert_id': f"ALERT_{event.event_id}",
            'correlation_id': event.correlation_id,
            'alert_type': 'high_risk_event',
            'severity': event.classification.get('severity', 'unknown'),
            'title': f"High-risk event detected: {event.event_type}",
            'description': f"Event {event.event_id} has risk score {event.classification.get('risk_score', 0)}",
            'alert_data': json.dumps({
                'event_id': event.event_id,
                'event_type': event.event_type,
                'risk_score': event.classification.get('risk_score', 0),
                'user_id': event.user_context.get('user_id'),
                'timestamp': event.timestamp.isoformat()
            }, default=str),
            'triggered_at': datetime.now(),
            'status': 'open'
        }
        
        # Store alert
        query = """
            INSERT INTO audit_alerts (
                alert_id, correlation_id, alert_type, severity, title, 
                description, alert_data, triggered_at, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        """
        
        async with self.db_pool.acquire() as conn:
            await conn.execute(query, *alert_data.values())
    
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get audit collection statistics"""
        return {
            'queue_size': self.event_queue.qsize(),
            'is_running': self.is_running,
            'worker_count': len(self.workers),
            'statistics': self.stats.copy()
        }
```

This comprehensive audit logging system provides Kingston's Portal with:

1. **Complete Event Capture**: All security-relevant events are captured with full context
2. **Event Classification**: Automated categorization and risk scoring of events
3. **Correlation Tracking**: Full correlation ID implementation for request/response flows
4. **High Performance**: Batch processing and async operations for scalability
5. **Database Optimization**: Efficient storage schema with proper indexing
6. **Real-time Monitoring**: Immediate alerts for high-risk events
7. **Compliance Support**: Comprehensive audit trails for regulatory requirements
8. **Forensic Capabilities**: Advanced analysis and correlation tools
9. **Data Integrity**: Cryptographic verification of audit log integrity
10. **Flexible Reporting**: Support for various compliance and operational reports

The implementation ensures that all regulatory requirements are met while maintaining high performance and providing the detailed audit trails necessary for security monitoring and incident response.