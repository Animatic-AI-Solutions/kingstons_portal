"""
Idempotency Key Cleanup Job

This job removes expired idempotency keys from the database to prevent
unbounded table growth. Idempotency keys expire after 24 hours.

Architecture Reference:
- docs/specifications/Phase2_People_Tab_Architecture.md Section 4.3

Scheduling:
- Should be run via cron or scheduler (e.g., APScheduler)
- Recommended frequency: Every 6 hours
- Off-peak hours preferred (e.g., 2am, 8am, 2pm, 8pm)

Usage:
    # Manual execution
    python -c "from app.jobs.cleanup_idempotency_keys import cleanup_expired_keys; \
               import asyncio; asyncio.run(cleanup_expired_keys())"

    # With APScheduler
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    scheduler = AsyncIOScheduler()
    scheduler.add_job(cleanup_expired_keys, 'cron', hour='2,8,14,20')
    scheduler.start()

Performance:
- Uses index on expires_at column for efficient filtering
- Batch deletion prevents long-running transactions
- Returns count of deleted keys for monitoring
"""
import asyncpg
import logging
from datetime import datetime, timezone
from typing import Optional
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)

# Constants for cleanup configuration
DEFAULT_BATCH_SIZE = 1000
DATABASE_URL_ENV_PRIMARY = "DATABASE_URL_PHASE2"
DATABASE_URL_ENV_FALLBACK = "DATABASE_URL"


def _get_database_url() -> str:
    """
    Get database URL from environment variables.

    Tries PRIMARY then FALLBACK environment variable.

    Returns:
        str: Database connection URL

    Raises:
        ValueError: If neither DATABASE_URL_PHASE2 nor DATABASE_URL is set
    """
    database_url = (
        os.getenv(DATABASE_URL_ENV_PRIMARY) or
        os.getenv(DATABASE_URL_ENV_FALLBACK)
    )
    if not database_url:
        raise ValueError(
            f"Either {DATABASE_URL_ENV_PRIMARY} or {DATABASE_URL_ENV_FALLBACK} "
            "environment variable must be set"
        )
    return database_url


def _parse_delete_result(result: Optional[str]) -> int:
    """
    Parse asyncpg DELETE result string to extract row count.

    asyncpg returns result in format: "DELETE N" where N is count.

    Args:
        result: Result string from asyncpg execute()

    Returns:
        int: Number of rows deleted, or 0 if parsing fails
    """
    if not result or not result.split():
        return 0
    try:
        # Result format: "DELETE N"
        return int(result.split()[-1])
    except (ValueError, IndexError):
        logger.warning(f"Failed to parse delete result: {result}")
        return 0


async def _create_database_connection() -> asyncpg.Connection:
    """
    Create database connection using environment configuration.

    Returns:
        asyncpg.Connection: New database connection

    Raises:
        Exception: If connection fails
    """
    database_url = _get_database_url()
    logger.info("Creating database connection for cleanup job")
    return await asyncpg.connect(database_url)


async def cleanup_expired_keys(
    db_connection: Optional[asyncpg.Connection] = None
) -> int:
    """
    Delete expired idempotency keys from the database.

    This function removes all idempotency keys where expires_at < NOW().
    It is designed to be run as a scheduled background job to prevent
    the idempotency_keys table from growing indefinitely.

    Performance:
    - Uses index on expires_at column for efficient filtering
    - Single DELETE statement minimizes lock contention
    - Suitable for tables with thousands of expired keys

    Args:
        db_connection: Optional database connection. If not provided,
                      creates a new connection using DATABASE_URL env vars.

    Returns:
        int: Number of keys deleted

    Raises:
        ValueError: If DATABASE_URL environment variable is not set
        Exception: If database connection or deletion fails

    Example:
        >>> deleted_count = await cleanup_expired_keys()
        >>> print(f"Deleted {deleted_count} expired keys")
        Deleted 42 expired keys
    """
    # Determine if we need to manage the connection
    should_close = False
    conn = db_connection

    if conn is None:
        # Create new connection
        conn = await _create_database_connection()
        should_close = True

    try:
        # Use naive UTC datetime for database compatibility
        now = datetime.utcnow()
        logger.info(f"Starting idempotency key cleanup job at {now}")

        # Delete expired keys
        # Uses index on expires_at for efficient filtering
        result = await conn.execute(
            """
            DELETE FROM idempotency_keys
            WHERE expires_at < $1
            """,
            now
        )

        # Parse result to get count
        deleted_count = _parse_delete_result(result)

        logger.info(
            f"Cleanup job completed: deleted {deleted_count} expired keys"
        )

        return deleted_count

    except Exception as e:
        logger.error(
            f"Failed to cleanup expired idempotency keys: {str(e)}",
            exc_info=True
        )
        raise

    finally:
        # Close connection if we created it
        if should_close and conn:
            await conn.close()
            logger.info("Closed database connection")


async def cleanup_expired_keys_batch(
    db_connection: Optional[asyncpg.Connection] = None,
    batch_size: int = DEFAULT_BATCH_SIZE
) -> int:
    """
    Delete expired idempotency keys in batches.

    This function is useful for very large tables where deleting all
    expired keys at once might cause performance issues or lock timeouts.
    Processes deletions in batches to reduce lock contention.

    Performance:
    - Smaller batches reduce lock contention on large tables
    - Uses subquery with LIMIT for efficient batch selection
    - Suitable for tables with tens of thousands of expired keys
    - Takes longer than cleanup_expired_keys but easier on database

    Args:
        db_connection: Optional database connection. If not provided,
                      creates a new connection using DATABASE_URL env vars.
        batch_size: Number of keys to delete per batch (default: 1000)

    Returns:
        int: Total number of keys deleted across all batches

    Raises:
        ValueError: If DATABASE_URL environment variable is not set
        Exception: If database connection or deletion fails

    Example:
        >>> deleted_count = await cleanup_expired_keys_batch(batch_size=500)
        >>> print(f"Deleted {deleted_count} expired keys in batches")
        Deleted 5000 expired keys in batches
    """
    # Determine if we need to manage the connection
    should_close = False
    conn = db_connection

    if conn is None:
        # Create new connection
        conn = await _create_database_connection()
        should_close = True

    try:
        # Use naive UTC datetime for database compatibility
        now = datetime.utcnow()
        total_deleted = 0

        logger.info(
            f"Starting batched idempotency key cleanup job at {now} "
            f"(batch_size={batch_size})"
        )

        while True:
            # Delete one batch of expired keys
            result = await conn.execute(
                f"""
                DELETE FROM idempotency_keys
                WHERE key IN (
                    SELECT key
                    FROM idempotency_keys
                    WHERE expires_at < $1
                    LIMIT $2
                )
                """,
                now,
                batch_size
            )

            # Parse deleted count
            batch_deleted = _parse_delete_result(result)
            total_deleted += batch_deleted

            logger.info(
                f"Deleted batch of {batch_deleted} keys (total: {total_deleted})"
            )

            # Stop if no more keys to delete
            if batch_deleted == 0:
                break

        logger.info(
            f"Batch cleanup job completed: deleted {total_deleted} expired keys"
        )

        return total_deleted

    except Exception as e:
        logger.error(
            f"Failed to cleanup expired idempotency keys in batches: {str(e)}",
            exc_info=True
        )
        raise

    finally:
        # Close connection if we created it
        if should_close and conn:
            await conn.close()
            logger.info("Closed database connection")


if __name__ == "__main__":
    """
    Allow running cleanup job directly from command line.

    Usage:
        python -m app.jobs.cleanup_idempotency_keys
    """
    import asyncio

    async def main():
        try:
            deleted = await cleanup_expired_keys()
            print(f"✓ Cleanup successful: {deleted} keys deleted")
        except Exception as e:
            print(f"✗ Cleanup failed: {str(e)}")
            return 1
        return 0

    exit(asyncio.run(main()))
