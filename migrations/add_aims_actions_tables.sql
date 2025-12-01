-- Migration: Add aims and actions tables
-- Description: Creates tables for tracking client goals/aims and actionable tasks
-- Date: 2024-12-01
-- Author: Claude Code

-- Create aims table
CREATE TABLE IF NOT EXISTS aims (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    client_group_id BIGINT NOT NULL,
    title TEXT,
    description TEXT,
    target_date INTEGER,
    focus TEXT,
    status TEXT,
    notes TEXT,

    -- Foreign key to client_groups
    CONSTRAINT fk_aims_client_group
        FOREIGN KEY (client_group_id)
        REFERENCES client_groups(id)
        ON DELETE CASCADE
);

-- Create actions table
CREATE TABLE IF NOT EXISTS actions (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    client_group_id BIGINT NOT NULL,
    title TEXT,
    description TEXT,
    assigned_advisor_id BIGINT,
    due_date DATE,
    priority TEXT,
    notes TEXT,
    status TEXT,

    -- Foreign key to client_groups
    CONSTRAINT fk_actions_client_group
        FOREIGN KEY (client_group_id)
        REFERENCES client_groups(id)
        ON DELETE CASCADE,

    -- Foreign key to profiles (assigned advisor)
    CONSTRAINT fk_actions_assigned_advisor
        FOREIGN KEY (assigned_advisor_id)
        REFERENCES profiles(id)
        ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_aims_client_group_id ON aims(client_group_id);
CREATE INDEX IF NOT EXISTS idx_aims_status ON aims(status);
CREATE INDEX IF NOT EXISTS idx_aims_target_date ON aims(target_date);
CREATE INDEX IF NOT EXISTS idx_aims_focus ON aims(focus);

CREATE INDEX IF NOT EXISTS idx_actions_client_group_id ON actions(client_group_id);
CREATE INDEX IF NOT EXISTS idx_actions_assigned_advisor_id ON actions(assigned_advisor_id);
CREATE INDEX IF NOT EXISTS idx_actions_due_date ON actions(due_date);
CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_priority ON actions(priority);

-- Migration completed successfully
