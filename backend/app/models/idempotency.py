"""
Idempotency Key Model

This model stores idempotency keys for preventing duplicate API requests.
Used to ensure that retries, double-clicks, and network issues don't create
duplicate database records.

Architecture Reference:
- docs/specifications/Phase2_People_Tab_Architecture.md Section 4.3

Schema:
- key: Unique idempotency key (client-generated UUID)
- endpoint: API endpoint path (for scoping)
- user_id: User who made the request (for scoping)
- request_hash: SHA256 hash of request body (for security)
- response_status: HTTP status code of cached response
- response_body: JSON body of cached response
- created_at: Timestamp when key was stored
- expires_at: Expiration timestamp (created_at + 24 hours)

Key Features:
- Composite key on (key, endpoint, user_id) for scoping
- Efficient lookups via idx_idempotency_key_lookup
- Fast cleanup via idx_idempotency_expires_at
- ON CONFLICT handling for concurrent requests
"""
from sqlalchemy import Column, String, Integer, Text, DateTime, Index
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class IdempotencyKey(Base):
    """
    Stores idempotency keys with cached responses for 24 hours.

    This model enables idempotent POST requests by caching the response
    of the first request and returning it for subsequent requests with
    the same idempotency key.

    Design:
    --------
    The idempotency key is scoped to a specific (endpoint, user_id) pair,
    allowing the same key to be used safely on different endpoints or by
    different users without conflict.

    Security Features:
    - Request hash verification prevents key reuse with different bodies
    - User scoping prevents cross-user key conflicts
    - Endpoint scoping allows same key on different endpoints
    - 24-hour expiration limits key retention
    - ON CONFLICT handling ensures concurrent requests are safe

    Indexes:
    --------
    - idx_idempotency_key_lookup: Composite index on (key, endpoint, user_id)
      Used for lookups: SELECT ... WHERE key AND endpoint AND user_id
    - idx_idempotency_expires_at: Index on expires_at
      Used for cleanup: SELECT ... WHERE expires_at < NOW()

    Usage:
        >>> from datetime import datetime, timedelta
        >>> record = IdempotencyKey(
        ...     key="uuid-here",
        ...     endpoint="/api/client-groups/1/product-owners",
        ...     user_id=42,
        ...     request_hash="sha256-hash",
        ...     response_status=201,
        ...     response_body='{"id": 1, "name": "John"}',
        ...     created_at=datetime.now(),
        ...     expires_at=datetime.now() + timedelta(hours=24)
        ... )

        >>> # Check for existing key
        >>> existing = session.query(IdempotencyKey).filter_by(
        ...     key=idempotency_key,
        ...     endpoint=endpoint,
        ...     user_id=user_id
        ... ).first()
    """
    __tablename__ = 'idempotency_keys'

    # Primary key: Idempotency key provided by client (UUID)
    # Max length 255 to accommodate standard UUID format + variations
    key = Column(String(255), primary_key=True, nullable=False)

    # Endpoint scoping: API endpoint path
    # Example: /api/client-groups/123/product-owners
    # Allows same key on different endpoints (processed independently)
    endpoint = Column(String(500), nullable=False)

    # User scoping: Authenticated user ID
    # Allows same key by different users (processed independently)
    user_id = Column(Integer, nullable=False)

    # Request hash: SHA256 hash of request body (64 hex characters)
    # Used for security: prevents idempotency key reuse with different bodies
    # If hash doesn't match, returns 422 Unprocessable Entity error
    request_hash = Column(String(64), nullable=False)

    # Cached response data
    # HTTP status code from original response (e.g., 201, 200)
    response_status = Column(Integer, nullable=False)
    # JSON response body stored as text for returning to client
    response_body = Column(Text, nullable=False)

    # Timestamps for tracking and cleanup
    # Timestamp when key was initially stored (now at insertion time)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    # Timestamp when key expires (created_at + 24 hours)
    # After expiration, same key processes as a new request
    expires_at = Column(DateTime, nullable=False)

    # Indexes for efficient lookups
    __table_args__ = (
        # Primary lookup index: Check if key exists for specific endpoint/user
        # Query: WHERE key = ? AND endpoint = ? AND user_id = ?
        # Used by check_idempotency() for quick lookups
        Index('idx_idempotency_key_lookup', 'key', 'endpoint', 'user_id'),

        # Cleanup index: Find expired keys efficiently for removal
        # Query: WHERE expires_at < NOW()
        # Used by cleanup_expired_keys() job for efficient deletion
        Index('idx_idempotency_expires_at', 'expires_at'),
    )

    def __repr__(self) -> str:
        """
        String representation of IdempotencyKey record.

        Returns:
            str: Human-readable representation for debugging

        Example:
            >>> key = IdempotencyKey(...)
            >>> print(key)
            <IdempotencyKey(key='abc123...', endpoint='/api/test', user_id=42, expires_at='2024-01-02T12:00:00')>
        """
        return (
            f"<IdempotencyKey(key='{self.key}', "
            f"endpoint='{self.endpoint}', "
            f"user_id={self.user_id}, "
            f"expires_at='{self.expires_at}')>"
        )
