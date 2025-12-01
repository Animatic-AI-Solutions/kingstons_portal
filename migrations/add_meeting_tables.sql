-- Migration: Add assigned_meetings and meeting_history tables
-- Description: Creates tables for tracking expected client meetings and recording actual meeting history
-- Date: 2024-12-01
-- Author: Claude Code

-- Create assigned_meetings table
CREATE TABLE IF NOT EXISTS assigned_meetings (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    client_group_id BIGINT NOT NULL,
    meeting_type TEXT,
    expected_month INTEGER,
    status TEXT,
    notes TEXT,

    -- Foreign key to client_groups
    CONSTRAINT fk_assigned_meetings_client_group
        FOREIGN KEY (client_group_id)
        REFERENCES client_groups(id)
        ON DELETE CASCADE,

    -- Constraint for valid month range
    CONSTRAINT chk_expected_month_range
        CHECK (expected_month >= 1 AND expected_month <= 12)
);

-- Create meeting_history table
CREATE TABLE IF NOT EXISTS meeting_history (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    assigned_meeting_id BIGINT NOT NULL,
    date_booked_for DATE,
    date_actually_held DATE,
    status TEXT,
    year INTEGER,
    notes TEXT,

    -- Foreign key to assigned_meetings
    CONSTRAINT fk_meeting_history_assigned_meeting
        FOREIGN KEY (assigned_meeting_id)
        REFERENCES assigned_meetings(id)
        ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assigned_meetings_client_group_id ON assigned_meetings(client_group_id);
CREATE INDEX IF NOT EXISTS idx_assigned_meetings_meeting_type ON assigned_meetings(meeting_type);
CREATE INDEX IF NOT EXISTS idx_assigned_meetings_expected_month ON assigned_meetings(expected_month);
CREATE INDEX IF NOT EXISTS idx_assigned_meetings_status ON assigned_meetings(status);

CREATE INDEX IF NOT EXISTS idx_meeting_history_assigned_meeting_id ON meeting_history(assigned_meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_history_date_booked_for ON meeting_history(date_booked_for);
CREATE INDEX IF NOT EXISTS idx_meeting_history_date_actually_held ON meeting_history(date_actually_held);
CREATE INDEX IF NOT EXISTS idx_meeting_history_year ON meeting_history(year);
CREATE INDEX IF NOT EXISTS idx_meeting_history_status ON meeting_history(status);

-- Migration completed successfully
