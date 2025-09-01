# Architectural Changes - Phase 2 Client Feedback Implementation

## Overview

This document outlines the architectural changes required to implement client feedback from the Phase 2 demo.

## Database Schema Changes

### Product Owners Table Enhancements
```sql
-- Enhanced phone number support with international format and flexible types
-- Remove old phone columns if they exist
ALTER TABLE product_owners DROP COLUMN IF EXISTS phone;
ALTER TABLE product_owners DROP COLUMN IF EXISTS primary_phone;
ALTER TABLE product_owners DROP COLUMN IF EXISTS secondary_phone;
ALTER TABLE product_owners DROP COLUMN IF EXISTS work_phone;

-- Create flexible phone numbers table for multiple phone types
CREATE TABLE product_owner_phones (
    id SERIAL PRIMARY KEY,
    product_owner_id BIGINT NOT NULL REFERENCES product_owners(id) ON DELETE CASCADE,
    phone_type VARCHAR(20) NOT NULL, -- 'mobile', 'house_phone', 'work', 'other'
    phone_number VARCHAR(25) NOT NULL, -- Supports international format (+44 1234 567890)
    label VARCHAR(50), -- Optional custom label for 'other' type
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100)
);

CREATE INDEX idx_product_owner_phones_owner_id ON product_owner_phones(product_owner_id);
CREATE INDEX idx_product_owner_phones_type ON product_owner_phones(phone_type);

-- Ensure only one primary phone per product owner
CREATE UNIQUE INDEX idx_product_owner_phones_primary 
    ON product_owner_phones(product_owner_id) 
    WHERE is_primary = true;
ALTER TABLE product_owners ADD COLUMN security_words TEXT; -- Requires encryption at rest
ALTER TABLE product_owners ADD COLUMN notes TEXT; -- Requires encryption at rest
ALTER TABLE product_owners ADD COLUMN next_meeting_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE product_owners ADD COLUMN date_signed_tc DATE;
ALTER TABLE product_owners ADD COLUMN last_fee_agreement_date DATE;
ALTER TABLE product_owners ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE product_owners ADD COLUMN updated_by VARCHAR(100);

-- Add constraints for phone number validation (flexible international format support)
ALTER TABLE product_owner_phones ADD CONSTRAINT chk_phone_number_format 
    CHECK (phone_number ~ '^[+]?[0-9\s\-\(\)\.]{7,25}$'); -- Expanded for international variety, includes periods
ALTER TABLE product_owner_phones ADD CONSTRAINT chk_phone_type_valid 
    CHECK (phone_type IN ('mobile', 'house_phone', 'work', 'other'));
ALTER TABLE product_owner_phones ADD CONSTRAINT chk_other_requires_label 
    CHECK (phone_type != 'other' OR label IS NOT NULL);
ALTER TABLE product_owners ADD CONSTRAINT chk_meeting_date_future 
  CHECK (next_meeting_date IS NULL OR next_meeting_date > NOW());

-- Create audit log table for sensitive field changes
CREATE TABLE product_owners_audit_log (
    id SERIAL PRIMARY KEY,
    product_owner_id BIGINT NOT NULL REFERENCES product_owners(id),
    field_changed VARCHAR(50) NOT NULL,
    old_value_hash TEXT, -- Store hash for sensitive fields
    new_value_hash TEXT,
    changed_by VARCHAR(100) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

CREATE INDEX idx_product_owners_audit_log_owner_id ON product_owners_audit_log(product_owner_id);
CREATE INDEX idx_product_owners_audit_log_changed_at ON product_owners_audit_log(changed_at);
```

### Information Items Table Updates
```sql
-- Add priority and status tracking
ALTER TABLE information_items ADD COLUMN priority VARCHAR(20) DEFAULT 'standard';
ALTER TABLE information_items ADD COLUMN status VARCHAR(50) DEFAULT 'current';
ALTER TABLE information_items ADD COLUMN quick_summary TEXT;
```

### Objectives/Actions Separation
```sql
-- Remove objective_id foreign key from actions table
ALTER TABLE client_actions DROP CONSTRAINT IF EXISTS fk_actions_objectives;
ALTER TABLE client_actions DROP COLUMN objective_id;

-- Add global actions capability with proper normalization
ALTER TABLE client_actions ADD COLUMN is_global BOOLEAN DEFAULT false;
ALTER TABLE client_actions ADD COLUMN created_by VARCHAR(100) NOT NULL DEFAULT 'system';
ALTER TABLE client_actions ADD COLUMN updated_by VARCHAR(100);
ALTER TABLE client_actions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create proper junction table instead of array field for better performance
CREATE TABLE client_action_groups (
    id SERIAL PRIMARY KEY,
    action_id BIGINT NOT NULL REFERENCES client_actions(id) ON DELETE CASCADE,
    client_group_id BIGINT NOT NULL REFERENCES client_groups(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by VARCHAR(100) NOT NULL,
    UNIQUE(action_id, client_group_id)
);

-- Add indexes for optimal query performance
CREATE INDEX idx_client_action_groups_action_id ON client_action_groups(action_id);
CREATE INDEX idx_client_action_groups_client_group_id ON client_action_groups(client_group_id);
CREATE INDEX idx_client_action_groups_assigned_at ON client_action_groups(assigned_at);

-- Create view for easier querying of global actions
CREATE VIEW global_actions_with_clients AS
SELECT 
    ca.id as action_id,
    ca.title,
    ca.description,
    ca.status,
    ca.target_date,
    ca.drop_dead_date,
    ca.is_global,
    STRING_AGG(cg.name, ', ' ORDER BY cg.name) as assigned_client_groups,
    COUNT(cag.client_group_id) as client_group_count
FROM client_actions ca
LEFT JOIN client_action_groups cag ON ca.id = cag.action_id
LEFT JOIN client_groups cg ON cag.client_group_id = cg.id
WHERE ca.is_global = true
GROUP BY ca.id, ca.title, ca.description, ca.status, ca.target_date, ca.drop_dead_date, ca.is_global;
```

### Asset Liquidity Rankings
```sql
-- Add liquidity ranking to asset types
CREATE TABLE asset_liquidity_rankings (
    id SERIAL PRIMARY KEY,
    asset_type VARCHAR(100) UNIQUE,
    liquidity_rank INTEGER,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create customizable liquidity rankings system
-- Add user customization support
ALTER TABLE asset_liquidity_rankings ADD COLUMN is_default BOOLEAN DEFAULT true;
ALTER TABLE asset_liquidity_rankings ADD COLUMN created_by VARCHAR(100) DEFAULT 'system';

-- Create user-specific liquidity preferences
CREATE TABLE user_liquidity_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    asset_type VARCHAR(100) NOT NULL,
    custom_rank INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, asset_type)
);

CREATE INDEX idx_user_liquidity_preferences_user ON user_liquidity_preferences(user_id);

-- Insert default liquidity rankings
INSERT INTO asset_liquidity_rankings (asset_type, liquidity_rank, description, is_default) VALUES
('Bank Accounts', 1, 'Most liquid - immediate access', true),
('Cash ISAs', 2, 'High liquidity - instant access savings', true),
('Stocks & Shares ISAs', 3, 'Medium-high liquidity - market dependent', true),
('GIAs', 4, 'Medium liquidity - may have exit fees', true),
('Property', 5, 'Low liquidity - months to sell', true),
('Pensions', 6, 'Least liquid - age restrictions apply', true);

-- Create view for user-specific or default liquidity ordering
CREATE VIEW user_liquidity_rankings AS
SELECT 
    u.user_id,
    COALESCE(ulp.asset_type, alr.asset_type) as asset_type,
    COALESCE(ulp.custom_rank, alr.liquidity_rank) as liquidity_rank,
    alr.description
FROM asset_liquidity_rankings alr
CROSS JOIN (SELECT DISTINCT 'system' as user_id) u  -- This will be replaced with actual user context
LEFT JOIN user_liquidity_preferences ulp ON u.user_id = ulp.user_id AND alr.asset_type = ulp.asset_type
WHERE alr.is_default = true;

-- Business Rules for Asset Liquidity Ordering
/*
COMPLETE LIQUIDITY ORDERING BUSINESS RULES:

1. DEFAULT ORDERING (when user hasn't customized):
   - Bank Accounts (rank 1): Instant access, no penalties
   - Cash ISAs (rank 2): Instant access, annual contribution limits
   - Stocks & Shares ISAs (rank 3): Market-dependent, same-day settlement
   - GIAs (General Investment Accounts) (rank 4): May have exit fees, T+2 settlement
   - Property (rank 5): Months to liquidate, market dependent
   - Pensions (rank 6): Age restrictions, tax penalties for early withdrawal

2. JOINT OWNERSHIP LIQUIDITY RULES:
   - Joint assets appear in BOTH individual columns with (J) indicator
   - Tenants in common show percentage split: "John (60%), Mary (40%)"
   - Joint liquidity = MIN(individual access rights, joint signature requirements)
   - Individual-only assets ranked by individual's customization

3. TIE-BREAKING RULES (same liquidity rank):
   - Within same rank: Sort by asset value (highest first)
   - Same rank + same value: Sort alphabetically by asset name
   - User-customized ranks always override defaults (rank 0.1, 0.2, etc. for custom ordering)

4. USER CUSTOMIZATION RULES:
   - Users can override any default ranking (1-99 scale)
   - Decimal ranks allowed for fine-grained ordering (e.g., 2.5 between 2 and 3)
   - Cannot assign same rank to multiple asset types (system auto-adjusts +0.1)
   - Custom rankings persist per user across all client groups

5. NEW ASSET TYPE HANDLING:
   - New asset types default to rank 10 (between GIAs and Property)
   - System prompts user to assign appropriate liquidity ranking
   - Admin can update default rankings for all users

6. DISPLAY RULES:
   - Asset Type View: Group by type, then sort by value within group
   - Liquidity View: Sort by liquidity rank, then by value within rank
   - Toggle button: "Asset Type View" | "Liquidity View" (per user preference)
   - Joint assets show ownership details in hover tooltip
*/
```

## API Endpoint Changes

### New Endpoints
```
GET /api/client-groups/{id}/objectives
GET /api/client-groups/{id}/actions
GET /api/actions/global
POST /api/actions/export-pdf
GET /api/information-items/{id}/priority-status
PUT /api/information-items/{id}/priority-status
GET /api/product-owners/{id}/phones
POST /api/product-owners/{id}/phones
PUT /api/product-owners/phones/{phoneId}
DELETE /api/product-owners/phones/{phoneId}
GET /api/users/{userId}/liquidity-preferences
PUT /api/users/{userId}/liquidity-preferences
GET /api/networth/{id}/liquidity-ordered
```

### Modified Endpoints
```
GET /api/product-owners/{id} - Returns enhanced contact fields
PUT /api/product-owners/{id} - Accepts new contact and compliance fields
GET /api/information-items - Returns priority, status, summary fields
```

### API Specification Details

#### Product Owner Phone Management

**GET /api/product-owners/{id}/phones**
```typescript
interface PhoneListResponse {
  phones: {
    id: number;
    phone_type: 'mobile' | 'house_phone' | 'work' | 'other';
    phone_number: string;
    label?: string; // Required for 'other' type
    is_primary: boolean;
    updated_at: string;
  }[];
  meta: {
    total_count: number;
    product_owner_name: string;
  };
}

// Authentication: JWT required
// Rate Limit: 100 requests per minute
// Error Responses: 404 (Not Found), 403 (Forbidden)
```

**POST /api/product-owners/{id}/phones**
```typescript
interface CreatePhoneRequest {
  phone_type: 'mobile' | 'house_phone' | 'work' | 'other';
  phone_number: string; // Flexible international format validation (7-25 chars, allows +, digits, spaces, hyphens, parentheses, periods)
  label?: string; // Required for 'other' type
  is_primary?: boolean; // Default false, max 1 primary per owner
}

interface CreatePhoneResponse {
  phone: {
    id: number;
    phone_type: string;
    phone_number: string;
    label?: string;
    is_primary: boolean;
    created_at: string;
  };
  message: string;
}

// Validation:
// - phone_number: /^[+]?[0-9\s\-\(\)]{10,25}$/
// - 'other' type requires label
// - Only one primary phone per owner
// Error Responses: 400 (Validation Error), 409 (Conflict - primary exists)
```

#### Global Actions Management

**GET /api/actions/global**
```typescript
interface GlobalActionsRequest {
  status?: 'pending' | 'in_progress' | 'completed';
  due_date_from?: string; // ISO date
  due_date_to?: string; // ISO date
  client_group_id?: number;
  sort_by?: 'due_date' | 'priority' | 'created_at';
  sort_order?: 'asc' | 'desc';
  limit?: number; // Max 200, default 50
  offset?: number;
}

interface GlobalActionsResponse {
  actions: {
    id: number;
    title: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high' | 'critical';
    target_date: string; // ISO date
    drop_dead_date?: string; // ISO date
    assigned_client_groups: string[]; // Array of client group names
    created_by: string;
    updated_at: string;
    days_until_due: number; // Calculated field
    urgency_color: 'red' | 'yellow' | 'green'; // UI helper
  }[];
  pagination: {
    total_count: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  filters_applied: GlobalActionsRequest;
}

// Authentication: JWT required
// Rate Limit: 200 requests per minute
// Error Responses: 400 (Invalid filters), 422 (Invalid date range)
```

**POST /api/actions/export-pdf**
```typescript
interface PDFExportRequest {
  action_ids?: number[]; // Specific actions to export
  filters?: GlobalActionsRequest; // Or use same filters as GET request
  format: 'summary' | 'detailed';
  include_completed?: boolean; // Default false
  group_by?: 'client' | 'due_date' | 'priority';
}

interface PDFExportResponse {
  export_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  download_url?: string; // Available when status is 'completed'
  expires_at: string; // ISO timestamp
  estimated_completion: string; // ISO timestamp
}

// Authentication: JWT required
// Rate Limit: 10 requests per minute (resource intensive)
// Timeout: 30 seconds for processing
// Error Responses: 429 (Rate Limited), 500 (Processing Error)
```

#### Information Items Priority/Status

**PUT /api/information-items/{id}/priority-status**
```typescript
interface UpdatePriorityStatusRequest {
  priority?: 'low' | 'medium' | 'high' | 'critical';
  status?: 'current' | 'outdated' | 'pending_review' | 'verified';
  quick_summary?: string; // Max 200 characters
  updated_by: string; // Required for audit trail
}

interface UpdatePriorityStatusResponse {
  item: {
    id: number;
    priority: string;
    status: string;
    quick_summary?: string;
    updated_at: string;
    updated_by: string;
  };
  audit_log_id: number; // Reference to audit entry
}

// Authentication: JWT required, must have edit permission for client group
// Rate Limit: 100 requests per minute
// Error Responses: 403 (No permission), 404 (Item not found), 422 (Invalid status)
```

#### User Liquidity Preferences

**GET /api/users/{userId}/liquidity-preferences**
```typescript
interface LiquidityPreferencesResponse {
  preferences: {
    asset_type: string;
    custom_rank: number; // 1-99 scale, allows decimals
    is_customized: boolean; // true if user overrode default
    default_rank: number; // system default for reference
  }[];
  view_preference: 'asset_type' | 'liquidity'; // User's default view
  last_updated: string; // ISO timestamp
}

// Authentication: JWT required
// Rate Limit: 100 requests per minute
// Error Responses: 404 (User not found)
```

**PUT /api/users/{userId}/liquidity-preferences**
```typescript
interface UpdateLiquidityPreferencesRequest {
  preferences: {
    asset_type: string;
    custom_rank: number; // 1-99, decimals allowed for fine ordering
  }[];
  view_preference?: 'asset_type' | 'liquidity';
}

interface UpdateLiquidityPreferencesResponse {
  updated_count: number;
  conflicts_resolved: string[]; // Any auto-adjusted rankings
  preferences: LiquidityPreferencesResponse;
}

// Authentication: JWT required, user can only update their own preferences
// Rate Limit: 50 requests per minute (less frequent operation)
// Error Responses: 403 (Cannot edit other user), 422 (Invalid rankings)
```

#### Net Worth with Liquidity Ordering

**GET /api/networth/{clientGroupId}/liquidity-ordered**
```typescript
interface NetWorthLiquidityRequest {
  user_id: string; // For custom liquidity preferences
  view_type: 'asset_type' | 'liquidity';
  include_liabilities?: boolean; // Default true
  as_of_date?: string; // ISO date, default latest
}

interface NetWorthLiquidityResponse {
  client_group: {
    id: number;
    name: string;
    product_owners: string[]; // Names for display
  };
  assets: {
    category: string; // Either asset type or liquidity level
    category_rank: number; // Ordering within view
    items: {
      id: number;
      name: string;
      asset_type: string;
      liquidity_rank: number;
      ownership: {
        individual_amounts: Record<string, number>; // product owner name -> amount
        joint_amount?: number;
        ownership_type: 'individual' | 'joint' | 'tenants_in_common';
        percentages?: Record<string, number>; // for tenants in common
      };
      total_value: number;
      last_updated: string;
    }[];
    category_total: number;
  }[];
  liabilities: {
    category: string;
    items: {
      id: number;
      name: string;
      liability_type: string;
      ownership: {
        individual_amounts: Record<string, number>;
        joint_amount?: number;
        ownership_type: string;
      };
      total_amount: number;
    }[];
    category_total: number;
  }[];
  summary: {
    total_assets: number;
    total_liabilities: number;
    net_worth: number;
    by_owner: Record<string, {
      assets: number;
      liabilities: number;
      net_worth: number;
    }>;
  };
  view_settings: {
    view_type: 'asset_type' | 'liquidity';
    ordering_source: 'default' | 'user_customized';
    as_of_date: string;
  };
}

// Authentication: JWT required, must have access to client group
// Rate Limit: 200 requests per minute
// Caching: 5 minutes for same client group and date
// Error Responses: 403 (No access to client group), 404 (Client group not found)
```

#### Complete Global Actions Workflow

**POST /api/actions/global**
```typescript
interface CreateGlobalActionRequest {
  title: string; // Max 200 characters
  description?: string;
  action_type?: 'review' | 'follow_up' | 'compliance' | 'general';
  priority: 'low' | 'medium' | 'high' | 'critical';
  due_date?: string; // ISO date
  client_group_ids: number[]; // Which client groups this applies to
  assigned_to?: string; // User ID, defaults to creator
}

interface CreateGlobalActionResponse {
  action: {
    id: number;
    title: string;
    description?: string;
    status: 'pending';
    priority: string;
    due_date?: string;
    created_by: string;
    created_at: string;
  };
  assignments: {
    client_group_id: number;
    client_group_name: string;
    assigned_at: string;
  }[];
  message: string;
}

// Authentication: JWT required, advisor role or higher
// Rate Limit: 50 requests per minute
// Error Responses: 403 (Insufficient permissions), 422 (Invalid client groups)
```

**PUT /api/actions/global/{actionId}/status**
```typescript
interface UpdateActionStatusRequest {
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completion_notes?: string; // Required for 'completed' status
  updated_by: string; // For audit trail
}

interface UpdateActionStatusResponse {
  action: {
    id: number;
    status: string;
    updated_at: string;
    updated_by: string;
  };
  affected_client_groups: string[]; // Names of client groups impacted
}

// Authentication: JWT required, must be assigned to action or senior advisor
// Rate Limit: 100 requests per minute  
// Error Responses: 403 (Not assigned to action), 404 (Action not found)
```

## Complete Global Actions Workflow with State Management

### Business Rules & State Transitions

**Global Action Lifecycle**
```typescript
interface GlobalActionState {
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue';
  assignments: ClientGroupAssignment[];
  history: StateTransition[];
  notifications: NotificationRule[];
}

interface StateTransition {
  from_status: string;
  to_status: string;
  allowed_roles: string[];
  required_fields?: string[];
  validation_rules: ValidationRule[];
  notifications_triggered: string[];
}

// Complete state transition matrix
const GLOBAL_ACTION_TRANSITIONS: StateTransition[] = [
  {
    from_status: 'pending',
    to_status: 'in_progress',
    allowed_roles: ['advisor', 'senior_advisor'],
    required_fields: ['updated_by'],
    validation_rules: [
      { field: 'assigned_to', rule: 'must_be_valid_user' },
      { field: 'due_date', rule: 'cannot_be_past_date' }
    ],
    notifications_triggered: ['assigned_user_email', 'client_portal_update']
  },
  {
    from_status: 'in_progress', 
    to_status: 'completed',
    allowed_roles: ['advisor', 'senior_advisor'],
    required_fields: ['completion_notes', 'updated_by'],
    validation_rules: [
      { field: 'completion_notes', rule: 'min_length_10_characters' }
    ],
    notifications_triggered: ['completion_confirmation', 'manager_summary']
  },
  {
    from_status: 'pending',
    to_status: 'cancelled', 
    allowed_roles: ['senior_advisor', 'manager'],
    required_fields: ['cancellation_reason'],
    validation_rules: [],
    notifications_triggered: ['cancellation_notice']
  },
  // Auto-transition rule
  {
    from_status: 'pending',
    to_status: 'overdue',
    allowed_roles: ['system'],
    validation_rules: [
      { field: 'due_date', rule: 'is_past_date' }
    ],
    notifications_triggered: ['overdue_alert', 'manager_escalation']
  }
];
```

### Workflow State Management Service

**Complete State Manager Implementation**
```typescript
export class GlobalActionStateManager {
  private actionStates: Map<number, GlobalActionState> = new Map();
  
  async transitionState(params: {
    actionId: number;
    newStatus: string;
    userId: string;
    userRole: string;
    additionalData?: Record<string, any>;
  }): Promise<StateTransitionResult> {
    const currentState = await this.getCurrentState(params.actionId);
    const transition = this.findValidTransition(currentState.status, params.newStatus);
    
    if (!transition) {
      throw new Error(`Invalid state transition: ${currentState.status} -> ${params.newStatus}`);
    }
    
    // Validate user permissions
    if (!transition.allowed_roles.includes(params.userRole)) {
      throw new Error(`Role ${params.userRole} cannot perform this transition`);
    }
    
    // Validate required fields
    await this.validateTransition(transition, params.additionalData);
    
    // Execute state change
    const result = await this.executeStateChange({
      actionId: params.actionId,
      newStatus: params.newStatus,
      transition,
      userId: params.userId,
      additionalData: params.additionalData
    });
    
    // Trigger notifications
    await this.triggerNotifications(transition.notifications_triggered, result);
    
    return result;
  }
  
  private async executeStateChange(params: StateChangeParams): Promise<StateTransitionResult> {
    return await db.transaction(async (trx) => {
      // Update action status
      const updatedAction = await trx('global_actions')
        .where('id', params.actionId)
        .update({
          status: params.newStatus,
          updated_at: new Date(),
          updated_by: params.userId,
          ...params.additionalData
        })
        .returning('*');
        
      // Log state transition
      await trx('global_action_history').insert({
        action_id: params.actionId,
        from_status: params.transition.from_status,
        to_status: params.newStatus,
        changed_by: params.userId,
        change_reason: params.additionalData?.reason,
        timestamp: new Date()
      });
      
      // Update client group assignments if needed
      if (params.newStatus === 'completed') {
        await trx('global_action_assignments')
          .where('global_action_id', params.actionId)
          .update({
            completion_date: new Date(),
            completed_by: params.userId
          });
      }
      
      return {
        actionId: params.actionId,
        newStatus: params.newStatus,
        previousStatus: params.transition.from_status,
        updatedAction: updatedAction[0],
        affectedClientGroups: await this.getAffectedClientGroups(params.actionId, trx)
      };
    });
  }
}
```

### Cross-Client Action Assignment Logic

**Multi-Client Assignment Rules**
```typescript
interface ClientGroupAssignment {
  clientGroupId: number;
  clientGroupName: string;
  assignmentType: 'primary' | 'secondary' | 'notification_only';
  priority: 'high' | 'medium' | 'low';
  customInstructions?: string;
  dueDate?: Date; // Can override global due date per client
  status: 'assigned' | 'in_progress' | 'completed' | 'skipped';
}

export class GlobalActionAssignmentService {
  async assignToClientGroups(params: {
    actionId: number;
    clientGroupIds: number[];
    assignmentType: 'uniform' | 'prioritized' | 'custom';
    customAssignments?: Partial<ClientGroupAssignment>[];
  }): Promise<AssignmentResult> {
    
    // Validate client group access permissions
    const accessibleGroups = await this.validateClientGroupAccess(
      params.clientGroupIds, 
      params.userId
    );
    
    if (accessibleGroups.length !== params.clientGroupIds.length) {
      throw new Error('Access denied to some client groups');
    }
    
    // Handle assignment conflicts (same action to same client group)
    await this.resolveAssignmentConflicts(params.actionId, params.clientGroupIds);
    
    // Create assignments based on type
    const assignments = await this.createAssignments(params);
    
    // Set up notification rules per client group
    await this.setupClientGroupNotifications(assignments);
    
    return {
      actionId: params.actionId,
      assignmentsCreated: assignments.length,
      clientGroups: assignments.map(a => ({
        id: a.clientGroupId,
        name: a.clientGroupName,
        dueDate: a.dueDate,
        priority: a.priority
      }))
    };
  }
  
  private async resolveAssignmentConflicts(
    actionId: number, 
    clientGroupIds: number[]
  ): Promise<void> {
    const existingAssignments = await db('global_action_assignments')
      .whereIn('client_group_id', clientGroupIds)
      .andWhere('global_action_id', actionId);
      
    if (existingAssignments.length > 0) {
      // Business rule: Update existing assignments instead of creating duplicates
      await db('global_action_assignments')
        .whereIn('id', existingAssignments.map(a => a.id))
        .update({
          updated_at: new Date(),
          status: 'assigned' // Reset to assigned if previously skipped
        });
    }
  }
}
```

### PDF Export Workflow with State Management

**Export Process State Machine**
```typescript
interface PDFExportState {
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'expired';
  progress: number; // 0-100
  estimatedCompletion: Date;
  errorMessage?: string;
  downloadUrl?: string;
  expiryDate: Date;
}

export class PDFExportWorkflow {
  async exportGlobalActions(params: {
    userId: string;
    actionIds?: number[];
    filters?: GlobalActionsRequest;
    format: 'summary' | 'detailed';
    includeHistory?: boolean;
  }): Promise<PDFExportResponse> {
    
    // Step 1: Create export job
    const exportJob = await db('pdf_export_jobs').insert({
      user_id: params.userId,
      export_type: 'global_actions',
      parameters: JSON.stringify(params),
      status: 'queued',
      created_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    }).returning('*');
    
    // Step 2: Queue for background processing
    await this.queueExportProcessing(exportJob[0]);
    
    return {
      export_id: exportJob[0].id,
      status: 'queued',
      estimated_completion: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
      expires_at: exportJob[0].expires_at
    };
  }
  
  private async processExportJob(jobId: string): Promise<void> {
    try {
      // Update status to processing
      await this.updateExportStatus(jobId, 'processing', 10);
      
      // Fetch data (progress: 10-40%)
      const data = await this.gatherExportData(jobId);
      await this.updateExportStatus(jobId, 'processing', 40);
      
      // Generate PDF (progress: 40-80%)
      const pdfBuffer = await this.generatePDF(data);
      await this.updateExportStatus(jobId, 'processing', 80);
      
      // Store file and create download URL (progress: 80-100%)
      const downloadUrl = await this.storeAndCreateDownloadUrl(jobId, pdfBuffer);
      
      // Complete export
      await this.updateExportStatus(jobId, 'completed', 100, downloadUrl);
      
      // Notify user (email or in-app notification)
      await this.notifyExportCompletion(jobId);
      
    } catch (error) {
      await this.updateExportStatus(jobId, 'failed', 0, null, error.message);
      await this.notifyExportFailure(jobId, error.message);
    }
  }
}
```

### Conflict Resolution & Business Rules

**Action Assignment Conflicts**
```typescript
interface ConflictResolutionRule {
  conflictType: 'duplicate_assignment' | 'overdue_dependency' | 'resource_contention';
  resolutionStrategy: 'merge' | 'prioritize' | 'escalate' | 'notify';
  autoResolve: boolean;
}

export class ActionConflictResolver {
  private conflictRules: ConflictResolutionRule[] = [
    {
      conflictType: 'duplicate_assignment',
      resolutionStrategy: 'merge',
      autoResolve: true
    },
    {
      conflictType: 'overdue_dependency', 
      resolutionStrategy: 'escalate',
      autoResolve: false
    },
    {
      conflictType: 'resource_contention',
      resolutionStrategy: 'prioritize',
      autoResolve: true
    }
  ];
  
  async checkAndResolveConflicts(actionId: number): Promise<ConflictResolution[]> {
    const conflicts = await this.detectConflicts(actionId);
    const resolutions: ConflictResolution[] = [];
    
    for (const conflict of conflicts) {
      const rule = this.findResolutionRule(conflict.type);
      
      if (rule.autoResolve) {
        const resolution = await this.autoResolveConflict(conflict, rule);
        resolutions.push(resolution);
      } else {
        // Queue for manual resolution
        await this.queueManualResolution(conflict);
        resolutions.push({
          conflictId: conflict.id,
          status: 'queued_for_manual_resolution',
          escalatedTo: 'senior_advisor'
        });
      }
    }
    
    return resolutions;
  }
}
```

This comprehensive workflow specification provides complete state management, business rule enforcement, conflict resolution, and integration patterns for the global actions system, ensuring robust implementation with proper error handling and user experience flows.

## Frontend Component Changes

### Enhanced Existing Components (Following Best Practices)
```typescript
// Enhance existing DataTable component instead of creating new ones
interface DataTableProps {
  variant?: 'card' | 'dense-table' | 'compact-table';
  density?: 'comfortable' | 'compact' | 'dense';
  virtualization?: boolean; // For large datasets
  pagination?: {
    pageSize: number;
    totalCount: number;
    currentPage: number;
    onPageChange: (page: number) => void;
  };
  accessibility?: {
    ariaLabel: string;
    keyboardNavigation: boolean;
    screenReaderOptimized: boolean;
  };
  performance?: {
    enableVirtualScrolling: boolean;
    rowHeight: number;
    bufferSize: number;
  };
}

// Enhance ProductOwnerCard with layout variants
interface ProductOwnerCardProps {
  layout: 'single-column' | 'two-column' | 'three-column';
  density: 'comfortable' | 'compact';
  securityLevel: 'basic' | 'enhanced'; // Controls sensitive field display
}

// Component performance monitoring
interface ComponentMetrics {
  renderTime: number;
  memoryUsage: number;
  rowCount: number;
  scrollPerformance: number;
}
```

### New Specialized Components
- `GlobalActionsManager` - Manages cross-client actions with PDF export
- `LiquidityHierarchyTable` - Asset ordering with financial compliance
- `SecurePIIDisplay` - Handles sensitive information with audit logging

### Modified Components
- `ClientDetails.tsx` - Enhanced with performance monitoring and accessibility

### Component Architecture Details

#### Dense Information Tables
```typescript
interface DenseTableArchitecture {
  stateManagement: {
    library: 'React Query + Zustand';
    caching: '5-minute default with background refresh';
    errorRecovery: 'Exponential backoff with circuit breaker';
    optimisticUpdates: boolean;
  };
  performance: {
    virtualization: 'React Window for >100 rows';
    rowHeight: 48; // pixels
    bufferRows: 10;
    memoization: 'React.memo for row components';
  };
  accessibility: {
    keyboardNavigation: 'Arrow keys + tab support';
    screenReader: 'Full ARIA table semantics';
    focusManagement: 'Logical focus trapping';
    colorBlindness: 'Pattern-based status indicators';
  };
  errorBoundary: 'TableErrorBoundary with fallback UI';
  testing: 'React Testing Library + user-event';
}

interface DenseTableProps {
  data: InformationItem[];
  loading?: boolean;
  error?: Error | null;
  columns: TableColumn[];
  onRowClick?: (item: InformationItem) => void;
  onEdit?: (item: InformationItem) => void;
  sortable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  accessibility: {
    tableCaption: string;
    rowDescription?: (item: InformationItem) => string;
  };
}
```

#### Global Actions Manager
```typescript
interface GlobalActionsManagerArchitecture {
  stateManagement: {
    actionsList: 'React Query infinite scroll';
    filters: 'URL-synced state with useRouter';
    selection: 'Local state with Set<number>';
    pdfExport: 'Async operation tracking';
  };
  realTimeUpdates: {
    websocket: 'Socket.io for action status updates';
    notifications: 'Toast for status changes';
    backgroundRefresh: 'Every 30 seconds when active';
  };
  errorHandling: {
    boundary: 'ActionManagerErrorBoundary';
    retry: 'Manual retry for failed exports';
    offline: 'Queue actions when offline';
  };
}

interface GlobalActionsManagerProps {
  initialFilters?: GlobalActionsRequest;
  clientGroupId?: number; // Optional client filter
  onActionUpdate?: (action: Action) => void;
  exportOptions: {
    formats: ['pdf', 'csv', 'excel'];
    maxItems: 500;
    timeoutMs: 30000;
  };
}
```

#### Product Owner Cards Enhanced
```typescript
interface ProductOwnerCardArchitecture {
  layout: {
    responsive: 'CSS Grid with mobile stacking';
    sections: {
      personalDetails: 'Left column';
      contactInfo: 'Right column'; 
      additionalInfo: 'Full-width bottom';
    };
    spacing: '16px grid gap, 24px card padding';
  };
  phoneManagement: {
    validation: 'Real-time international format';
    primary: 'Visual indicator + constraint';
    types: ['mobile', 'house_phone', 'work', 'other'];
    maxPhones: 10; // Practical limit
  };
  security: {
    auditLogging: 'All sensitive field changes';
    encryption: 'Client-side for security_words';
    permissions: 'Read/write based on user role';
  };
}

interface ProductOwnerCardProps {
  productOwner: ProductOwner;
  phones: PhoneNumber[];
  editable?: boolean;
  onUpdate?: (updates: Partial<ProductOwner>) => Promise<void>;
  onPhoneUpdate?: (phone: PhoneNumber) => Promise<void>;
  layout: '3-section'; // Personal details (left) + Contact info (right) + Full-width bottom
  securityLevel: 'basic' | 'enhanced';
  auditTrail?: AuditLogEntry[];
}
```

#### Component Error Handling Strategy
```typescript
interface ComponentErrorStrategy {
  errorBoundaries: {
    TableErrorBoundary: 'Fallback to simplified list view';
    CardErrorBoundary: 'Show error card with retry option';
    GlobalErrorBoundary: 'Page-level error with navigation';
  };
  loadingStates: {
    skeleton: 'Skeleton components matching final layout';
    progressive: 'Load critical data first, enhance incrementally';
    background: 'Show stale data while refreshing';
  };
  errorMessages: {
    userFriendly: 'Non-technical language';
    actionable: 'Clear next steps for user';
    contextual: 'Specific to the failed operation';
  };
}
```
- `NetworthTab` - Liquidity ordering with compliance tracking
- `DataTable` - Enhanced with virtualization and density options

## Migration Strategy

### Phase 1: Database Schema
1. Add new columns with default values
2. Populate existing records with sensible defaults
3. Update constraints and indexes

### Phase 2: API Updates
1. Deploy new endpoints alongside existing ones
2. Update frontend to use new endpoints
3. Deprecate old endpoints after migration

### Phase 3: Frontend Rollout
1. Feature flag new components
2. A/B testing with select users
3. Full rollout after validation

### Phase 4: Cleanup
1. Remove deprecated endpoints
2. Remove unused database columns
3. Performance optimization

## Risk Mitigation

### Data Integrity
- All schema changes include proper defaults
- Migration scripts with rollback capabilities  
- Backup procedures before major changes

## Detailed Migration Scripts

### Migration Script 001: Product Owner Phone Number Restructuring
```sql
-- Migration: product_owner_phone_restructuring.sql
-- Author: Phase 2 Implementation Team
-- Date: Implementation Date
-- Dependencies: None
-- Rollback: product_owner_phone_rollback.sql

BEGIN;

-- Step 1: Create backup of existing phone data
CREATE TABLE product_owners_phone_backup AS 
SELECT id, phone, primary_phone, secondary_phone, work_phone 
FROM product_owners 
WHERE phone IS NOT NULL OR primary_phone IS NOT NULL OR secondary_phone IS NOT NULL;

-- Step 2: Create new phone numbers table (already defined above)
CREATE TABLE IF NOT EXISTS product_owner_phones (
    id SERIAL PRIMARY KEY,
    product_owner_id BIGINT NOT NULL REFERENCES product_owners(id) ON DELETE CASCADE,
    phone_type VARCHAR(20) NOT NULL,
    phone_number VARCHAR(25) NOT NULL,
    label VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by VARCHAR(100) DEFAULT 'migration_script'
);

-- Step 3: Migrate existing phone data
INSERT INTO product_owner_phones (product_owner_id, phone_type, phone_number, is_primary)
SELECT 
    id as product_owner_id,
    'mobile' as phone_type,
    COALESCE(primary_phone, phone) as phone_number,
    true as is_primary
FROM product_owners 
WHERE COALESCE(primary_phone, phone) IS NOT NULL
  AND COALESCE(primary_phone, phone) ~ '^[+]?[0-9\s\-\(\)\.]{7,25}$';

INSERT INTO product_owner_phones (product_owner_id, phone_type, phone_number, is_primary)
SELECT 
    id as product_owner_id,
    'house_phone' as phone_type,
    secondary_phone as phone_number,
    false as is_primary
FROM product_owners 
WHERE secondary_phone IS NOT NULL
  AND secondary_phone ~ '^[+]?[0-9\s\-\(\)\.]{7,25}$'
  AND secondary_phone != COALESCE(primary_phone, phone);

INSERT INTO product_owner_phones (product_owner_id, phone_type, phone_number, is_primary)
SELECT 
    id as product_owner_id,
    'work' as phone_type,
    work_phone as phone_number,
    false as is_primary
FROM product_owners 
WHERE work_phone IS NOT NULL
  AND work_phone ~ '^[+]?[0-9\s\-\(\)\.]{7,25}$'
  AND work_phone NOT IN (COALESCE(primary_phone, phone), secondary_phone);

-- Step 4: Add constraints and indexes
CREATE INDEX IF NOT EXISTS idx_product_owner_phones_owner_id ON product_owner_phones(product_owner_id);
CREATE INDEX IF NOT EXISTS idx_product_owner_phones_type ON product_owner_phones(phone_type);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_owner_phones_primary 
    ON product_owner_phones(product_owner_id) 
    WHERE is_primary = true;

-- Step 5: Add new product owner fields
ALTER TABLE product_owners ADD COLUMN IF NOT EXISTS security_words TEXT;
ALTER TABLE product_owners ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE product_owners ADD COLUMN IF NOT EXISTS next_meeting_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE product_owners ADD COLUMN IF NOT EXISTS date_signed_tc DATE;
ALTER TABLE product_owners ADD COLUMN IF NOT EXISTS last_fee_agreement_date DATE;
ALTER TABLE product_owners ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE product_owners ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);

-- Step 6: Validation checks
DO $$
DECLARE
    backup_count INTEGER;
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM product_owners_phone_backup;
    SELECT COUNT(DISTINCT product_owner_id) INTO migrated_count FROM product_owner_phones;
    
    IF migrated_count < backup_count THEN
        RAISE EXCEPTION 'Migration validation failed: Expected %, got % product owners migrated', backup_count, migrated_count;
    END IF;
    
    RAISE NOTICE 'Migration validation passed: % product owners migrated from % backup records', migrated_count, backup_count;
END;
$$;

COMMIT;

-- Success notification
SELECT 'Phase 2 Product Owner Phone Migration Completed Successfully' as migration_status;
```

### Rollback Script 001: Product Owner Phone Number Rollback
```sql
-- Rollback: product_owner_phone_rollback.sql
-- WARNING: This will remove all new phone data and restore original structure

BEGIN;

-- Step 1: Verify backup exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product_owners_phone_backup') THEN
        RAISE EXCEPTION 'Backup table product_owners_phone_backup not found. Cannot rollback safely.';
    END IF;
END;
$$;

-- Step 2: Restore original phone columns if they don't exist
ALTER TABLE product_owners ADD COLUMN IF NOT EXISTS phone VARCHAR(25);
ALTER TABLE product_owners ADD COLUMN IF NOT EXISTS primary_phone VARCHAR(25);
ALTER TABLE product_owners ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(25);
ALTER TABLE product_owners ADD COLUMN IF NOT EXISTS work_phone VARCHAR(25);

-- Step 3: Restore phone data from backup
UPDATE product_owners 
SET 
    phone = backup.phone,
    primary_phone = backup.primary_phone,
    secondary_phone = backup.secondary_phone,
    work_phone = backup.work_phone
FROM product_owners_phone_backup backup
WHERE product_owners.id = backup.id;

-- Step 4: Remove new fields (optional - commented out for safety)
-- ALTER TABLE product_owners DROP COLUMN IF EXISTS security_words;
-- ALTER TABLE product_owners DROP COLUMN IF EXISTS notes;
-- ALTER TABLE product_owners DROP COLUMN IF EXISTS next_meeting_date;
-- ALTER TABLE product_owners DROP COLUMN IF EXISTS date_signed_tc;
-- ALTER TABLE product_owners DROP COLUMN IF EXISTS last_fee_agreement_date;

-- Step 5: Drop new tables
DROP TABLE IF EXISTS product_owner_phones CASCADE;
DROP TABLE IF EXISTS user_liquidity_preferences CASCADE;
DROP TABLE IF EXISTS asset_liquidity_rankings CASCADE;

-- Step 6: Drop backup table
DROP TABLE IF EXISTS product_owners_phone_backup;

COMMIT;

SELECT 'Phase 2 Product Owner Phone Migration Rollback Completed' as rollback_status;
```

### Migration Script 002: Objectives-Actions Separation
```sql
-- Migration: objectives_actions_separation.sql
-- Removes objective_id foreign keys and creates independent action management

BEGIN;

-- Step 1: Backup existing action-objective relationships
CREATE TABLE client_actions_backup AS 
SELECT * FROM client_actions WHERE objective_id IS NOT NULL;

-- Step 2: Create global actions tracking table
CREATE TABLE global_actions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    action_type VARCHAR(50) DEFAULT 'general',
    priority INTEGER DEFAULT 3,
    status VARCHAR(20) DEFAULT 'pending',
    created_by VARCHAR(100) NOT NULL,
    assigned_to VARCHAR(100),
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create client-action assignments for global actions
CREATE TABLE global_action_assignments (
    id SERIAL PRIMARY KEY,
    global_action_id INTEGER NOT NULL REFERENCES global_actions(id) ON DELETE CASCADE,
    client_group_id BIGINT NOT NULL REFERENCES client_groups(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by VARCHAR(100) NOT NULL,
    UNIQUE(global_action_id, client_group_id)
);

-- Step 4: Migrate existing actions to global actions system
INSERT INTO global_actions (title, description, priority, status, created_by, due_date)
SELECT DISTINCT 
    title,
    description,
    priority,
    status,
    created_by,
    due_date
FROM client_actions
WHERE title IS NOT NULL;

-- Step 5: Remove objective_id relationships (make nullable first, then drop)
ALTER TABLE client_actions ALTER COLUMN objective_id DROP NOT NULL;
UPDATE client_actions SET objective_id = NULL;

-- Step 6: Add indexes for performance
CREATE INDEX idx_global_actions_status ON global_actions(status);
CREATE INDEX idx_global_actions_assigned_to ON global_actions(assigned_to);
CREATE INDEX idx_global_action_assignments_client_group ON global_action_assignments(client_group_id);

COMMIT;

SELECT 'Objectives-Actions Separation Migration Completed' as migration_status;
```

### Performance Impact
- New indexes for liquidity rankings
- Query optimization for enhanced fields
- Monitoring for table scan performance

### User Experience
- Gradual rollout with feature flags
- Training documentation for new interfaces
- Rollback plan for user adoption issues

## Testing Strategy

### Database Testing
- Migration script testing on staging
- Performance benchmarking
- Data integrity validation

### API Testing
- Comprehensive endpoint testing
- Load testing for new queries
- Integration testing with frontend

### Frontend Testing
- Component unit testing
- End-to-end user workflow testing
- Cross-browser compatibility testing

## Deployment Plan

1. **Week 1:** Database schema changes on staging
2. **Week 2:** API endpoint development and testing
3. **Week 3:** Frontend component development
4. **Week 4:** Integration testing and bug fixes
5. **Week 5:** Production deployment with feature flags
6. **Week 6:** Full rollout and monitoring

## Success Metrics

- Zero data loss during migration
- Page load times remain under 2 seconds
- User adoption rate > 90% within 2 weeks
- Client satisfaction with information density improvements
- Reduced support tickets for UI confusion