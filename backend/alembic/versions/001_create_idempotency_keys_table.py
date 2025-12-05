"""Create idempotency_keys table

Revision ID: 001_idempotency_keys
Revises:
Create Date: 2025-12-04

This migration creates the idempotency_keys table for preventing duplicate API requests.
The table stores idempotency keys with their associated responses for a configurable TTL.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001_idempotency_keys'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    """
    Create idempotency_keys table with 8 columns:
    - key: Primary key (VARCHAR 255) - unique idempotency key from client
    - endpoint: API endpoint path (VARCHAR 255, NOT NULL)
    - user_id: User who made the request (BIGINT, NOT NULL)
    - request_hash: SHA-256 hash of request body (VARCHAR 64, NOT NULL)
    - response_status: HTTP response status code (INTEGER, NOT NULL)
    - response_body: Cached response body (TEXT, NOT NULL)
    - created_at: Timestamp of key creation (TIMESTAMP, NOT NULL, default NOW())
    - expires_at: Timestamp when key expires (TIMESTAMP, NOT NULL)

    Also creates an index on expires_at for efficient cleanup operations.
    """
    # Create idempotency_keys table
    op.create_table(
        'idempotency_keys',
        sa.Column('key', sa.String(255), primary_key=True),
        sa.Column('endpoint', sa.String(255), nullable=False),
        sa.Column('user_id', sa.BigInteger, nullable=False),
        sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('response_status', sa.Integer, nullable=False),
        sa.Column('response_body', sa.Text, nullable=False),
        sa.Column('created_at', sa.DateTime, server_default=sa.text('NOW()'), nullable=False),
        sa.Column('expires_at', sa.DateTime, nullable=False),
    )

    # Create index for cleanup job to efficiently find expired keys
    op.create_index(
        'idx_idempotency_expires_at',
        'idempotency_keys',
        ['expires_at']
    )


def downgrade():
    """
    Remove idempotency_keys table and its index.
    """
    op.drop_index('idx_idempotency_expires_at', table_name='idempotency_keys')
    op.drop_table('idempotency_keys')
