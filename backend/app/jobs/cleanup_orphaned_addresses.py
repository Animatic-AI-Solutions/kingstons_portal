"""
Orphaned Address Cleanup Job

This module handles the cleanup of orphaned address records that are no longer
referenced by any product owners. This is a critical maintenance job that prevents
unbounded growth of the addresses table.

CONTEXT:
The "create new address" strategy (used in product owner updates to prevent
unintended side effects) creates orphaned address records over time. When a product
owner's address is updated, a new address record is created and the old reference
is removed, leaving the old address orphaned. Without regular cleanup, the
addresses table grows unbounded, impacting query performance.

GRACE PERIOD:
To prevent accidental deletion of recently created addresses (which might still be
in use during update operations), orphaned addresses are only deleted if they are
older than 7 days. This provides a safety window for address cleanup after updates.

Reference: docs/specifications/Phase2_People_Tab_Architecture.md Section 9.2

USAGE:
    From Python code:
        from app.jobs.cleanup_orphaned_addresses import cleanup_orphaned_addresses
        deleted_count = await cleanup_orphaned_addresses(db_connection)

    From command line (manual execution):
        python -m app.jobs.cleanup_orphaned_addresses

SCHEDULING:
    Recommended: Run weekly via cron job (e.g., Sunday at 2 AM)
    Example cron: 0 2 * * 0
    Or use a background task scheduler in the application
"""
import asyncio
import logging
import os
from typing import Union

# Type hints for database connections
try:
    import asyncpg
except ImportError:
    asyncpg = None

logger = logging.getLogger(__name__)

# Configuration constants
GRACE_PERIOD_DAYS = 7
"""Number of days to wait before deleting orphaned addresses (safety window)."""

CLEANUP_QUERY = """
    DELETE FROM addresses
    WHERE id NOT IN (
        SELECT DISTINCT address_id
        FROM product_owners
        WHERE address_id IS NOT NULL
    )
    AND created_at < NOW() - INTERVAL '{grace_days} days 1 second'
"""
"""
SQL query to delete orphaned addresses older than grace period.

The query uses:
- NOT IN subquery to find addresses not referenced by any product owner
- WHERE address_id IS NOT NULL to correctly handle NULL values
- INTERVAL with '1 second' added to ensure boundary is strictly > grace_days
  (addresses exactly N days old will NOT be deleted)
"""


async def cleanup_orphaned_addresses(db: Union['asyncpg.Connection', 'asyncpg.Pool']) -> int:
    """
    Delete address records that are no longer referenced by any product owners.

    This cleanup job prevents unbounded growth of the addresses table due to the
    "create new address" strategy used in product owner updates. When an address is
    updated, a new address record is created and the old reference removed, leaving
    the old address orphaned.

    GRACE PERIOD:
    Only deletes addresses older than 7 days to prevent accidental deletion of
    recently created addresses during update operations. This safety window ensures
    that addresses in use during concurrent updates are never deleted.

    ALGORITHM:
    1. Identifies orphaned addresses (id NOT IN product_owners.address_id)
    2. Filters to only addresses older than grace period (created_at < now - 7 days)
    3. Handles NULL address_id values correctly (they don't protect any addresses)
    4. Deletes matching records in a single efficient SQL operation
    5. Returns the count of deleted addresses for monitoring

    Args:
        db: Database connection or pool (asyncpg.Connection or asyncpg.Pool)

    Returns:
        int: Number of orphaned addresses deleted (0 if none eligible for cleanup)

    Raises:
        asyncpg.Error: If database connection fails or query execution fails
        ValueError: If result parsing fails (internal consistency error)

    Example:
        >>> deleted_count = await cleanup_orphaned_addresses(db_connection)
        >>> print(f"Cleanup complete: {deleted_count} addresses deleted")
        Cleanup complete: 42 addresses deleted
    """
    # Build the query with the configured grace period
    query = CLEANUP_QUERY.format(grace_days=GRACE_PERIOD_DAYS)

    try:
        logger.debug(f"Starting orphaned address cleanup with {GRACE_PERIOD_DAYS} day grace period")

        # Execute the DELETE query and capture result
        # asyncpg returns a string like "DELETE N" where N is the row count
        result = await db.execute(query)

        # Parse the deleted count from the result string
        # Format is "DELETE N" where N is an integer
        if not result:
            deleted_count = 0
        else:
            try:
                # Extract the count (last element after split on whitespace)
                deleted_count = int(result.split()[-1])
            except (IndexError, ValueError) as parse_error:
                error_msg = (
                    f"Failed to parse delete count from database result: {result!r}. "
                    f"Expected format 'DELETE N' where N is integer."
                )
                logger.error(error_msg)
                raise ValueError(error_msg) from parse_error

        # Log the cleanup result for monitoring, auditing, and operational visibility
        if deleted_count > 0:
            logger.info(
                f"Orphaned address cleanup successful: {deleted_count} unreferenced addresses deleted "
                f"(grace period: {GRACE_PERIOD_DAYS} days)"
            )
        else:
            logger.debug("Orphaned address cleanup: No addresses eligible for deletion")

        return deleted_count

    except ValueError:
        # Re-raise parsing errors as they indicate an internal consistency issue
        raise
    except Exception as e:
        # Log any database or execution errors with full context
        logger.error(
            f"Error during orphaned address cleanup: {type(e).__name__}: {e}",
            exc_info=True,
            extra={
                'grace_period_days': GRACE_PERIOD_DAYS,
                'query': query,
            }
        )
        raise


async def main() -> int:
    """
    Command-line interface for manual execution of the cleanup job.

    This function:
    1. Validates that asyncpg is installed
    2. Loads database URL from environment
    3. Connects to the database
    4. Executes the cleanup operation
    5. Handles errors gracefully with detailed logging
    6. Ensures database connection is closed

    ENVIRONMENT VARIABLES:
    - DATABASE_URL (required): PostgreSQL connection string
      Format: postgresql://user:password@host:port/database

    USAGE:
        python -m app.jobs.cleanup_orphaned_addresses

    EXIT CODES:
    - 0: Success (cleanup completed)
    - 1: Missing dependencies or configuration
    - 2: Database connection or execution error

    Returns:
        int: Exit code (0=success, 1=config error, 2=runtime error)

    Example output:
        INFO:app.jobs.cleanup_orphaned_addresses:Starting database connection...
        INFO:app.jobs.cleanup_orphaned_addresses:Running orphaned address cleanup...
        INFO:app.jobs.cleanup_orphaned_addresses:Cleanup complete: 42 addresses deleted
    """
    # Step 1: Validate asyncpg dependency
    if asyncpg is None:
        logger.error(
            "asyncpg module not installed. Install with: pip install asyncpg"
        )
        return 1

    # Step 2: Load database URL from environment
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        logger.error(
            "DATABASE_URL environment variable not set. "
            "Set it to your PostgreSQL connection string: "
            "postgresql://user:password@host:port/database"
        )
        return 1

    # Step 3: Establish database connection
    conn = None
    try:
        logger.info("Establishing database connection...")
        conn = await asyncpg.connect(database_url)
        logger.debug("Database connection established successfully")

        # Step 4: Execute cleanup job
        logger.info("Starting orphaned address cleanup job...")
        deleted_count = await cleanup_orphaned_addresses(conn)

        # Step 5: Report results
        logger.info(
            f"Cleanup job completed successfully: {deleted_count} addresses deleted"
        )
        return 0

    except asyncpg.exceptions.PostgresError as pg_error:
        # PostgreSQL-specific errors (invalid connection, query syntax, etc.)
        logger.error(
            f"PostgreSQL error during cleanup: {type(pg_error).__name__}: {pg_error}",
            exc_info=True
        )
        return 2
    except Exception as e:
        # Catch-all for unexpected errors
        logger.error(
            f"Unexpected error during cleanup: {type(e).__name__}: {e}",
            exc_info=True
        )
        return 2
    finally:
        # Step 6: Ensure database connection is closed
        if conn is not None:
            try:
                await conn.close()
                logger.debug("Database connection closed")
            except Exception as close_error:
                logger.warning(
                    f"Error closing database connection: {close_error}"
                )


if __name__ == "__main__":
    # Configure logging for command-line execution with clear formatting
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )

    # Run the main function and exit with appropriate status code
    exit_code = asyncio.run(main())
    exit(exit_code)
