"""
Background Jobs Package

This package contains background job implementations for scheduled tasks,
cleanup operations, and maintenance procedures.

Available Jobs:
- cleanup_idempotency_keys: Removes expired idempotency keys from database
- cleanup_orphaned_addresses: Removes addresses not referenced by any product owners (7-day grace period)
"""
