"""Add composite index on client_group_product_owners for display order queries

Revision ID: 003_composite_display_order
Revises: 002_product_owner_indexes
Create Date: 2025-12-04

This migration adds a composite index on client_group_product_owners table to optimize
display order queries in the People tab. The index enables efficient filtering by
client_group_id and sorting by display_order.
"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '003_composite_display_order'
down_revision = '002_product_owner_indexes'
branch_labels = None
depends_on = None


def upgrade():
    """
    Create composite index idx_cgpo_display_order on client_group_product_owners table.

    Index columns (in order):
    1. client_group_id - Enables filtering by client group
    2. display_order - Enables sorting within a client group

    This index optimizes queries like:
    - SELECT * FROM client_group_product_owners WHERE client_group_id = ? ORDER BY display_order
    - SELECT MAX(display_order) FROM client_group_product_owners WHERE client_group_id = ?
    - SELECT COUNT(*) FROM client_group_product_owners WHERE client_group_id = ? AND display_order = ?

    Column order is critical: client_group_id first allows the index to be used for
    filtering by client group, then display_order allows sorting within that filtered set.
    """
    # Composite index for display order queries
    op.create_index(
        'idx_cgpo_display_order',
        'client_group_product_owners',
        ['client_group_id', 'display_order']
    )


def downgrade():
    """
    Remove composite index from client_group_product_owners table.
    """
    op.drop_index('idx_cgpo_display_order', table_name='client_group_product_owners')
