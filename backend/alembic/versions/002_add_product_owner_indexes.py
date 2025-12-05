"""Add indexes to product_owners table for query optimization

Revision ID: 002_product_owner_indexes
Revises: 001_idempotency_keys
Create Date: 2025-12-04

This migration adds 7 indexes to the product_owners table to optimize query performance:
- 6 single-column indexes for filtering and searching
- 1 composite index for status filtering with created_at sorting
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002_product_owner_indexes'
down_revision = '001_idempotency_keys'
branch_labels = None
depends_on = None


def upgrade():
    """
    Create 7 indexes on product_owners table:

    Single-column indexes:
    1. idx_product_owners_status - Optimizes filtering by status (active/inactive)
    2. idx_product_owners_firstname - Optimizes searching/sorting by first name
    3. idx_product_owners_surname - Optimizes searching/sorting by surname
    4. idx_product_owners_email_1 - Optimizes email lookups and uniqueness checks
    5. idx_product_owners_dob - Optimizes date of birth filtering and age calculations
    6. idx_product_owners_created_at - Optimizes sorting by creation date

    Composite index:
    7. idx_product_owners_status_created_at - Optimizes queries that filter by status
       AND sort by created_at (e.g., "get all active owners sorted by newest first")
    """
    # Get database connection to check existing indexes
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_indexes = {idx['name'] for idx in inspector.get_indexes('product_owners')}

    # Single-column indexes - only create if they don't exist
    if 'idx_product_owners_status' not in existing_indexes:
        op.create_index('idx_product_owners_status', 'product_owners', ['status'])
    if 'idx_product_owners_firstname' not in existing_indexes:
        op.create_index('idx_product_owners_firstname', 'product_owners', ['firstname'])
    if 'idx_product_owners_surname' not in existing_indexes:
        op.create_index('idx_product_owners_surname', 'product_owners', ['surname'])
    if 'idx_product_owners_email_1' not in existing_indexes:
        op.create_index('idx_product_owners_email_1', 'product_owners', ['email_1'])
    if 'idx_product_owners_dob' not in existing_indexes:
        op.create_index('idx_product_owners_dob', 'product_owners', ['dob'])
    if 'idx_product_owners_created_at' not in existing_indexes:
        op.create_index('idx_product_owners_created_at', 'product_owners', ['created_at'])

    # Composite index for filtering by status with sorting by created_at
    # Column order matters: status first allows filtering, created_at second allows sorting
    if 'idx_product_owners_status_created_at' not in existing_indexes:
        op.create_index(
            'idx_product_owners_status_created_at',
            'product_owners',
            ['status', 'created_at']
        )


def downgrade():
    """
    Remove all 7 indexes from product_owners table.
    Indexes are dropped in reverse order to maintain consistency.
    """
    op.drop_index('idx_product_owners_status_created_at', table_name='product_owners')
    op.drop_index('idx_product_owners_created_at', table_name='product_owners')
    op.drop_index('idx_product_owners_dob', table_name='product_owners')
    op.drop_index('idx_product_owners_email_1', table_name='product_owners')
    op.drop_index('idx_product_owners_surname', table_name='product_owners')
    op.drop_index('idx_product_owners_firstname', table_name='product_owners')
    op.drop_index('idx_product_owners_status', table_name='product_owners')
