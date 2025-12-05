"""
Idempotency Middleware

Provides idempotency key handling to prevent duplicate API requests from
creating duplicate database records.

Architecture Reference:
- docs/specifications/Phase2_People_Tab_Architecture.md Section 4.3

Key Features:
- Optional Idempotency-Key header
- Request body hash verification (SHA256)
- User-scoped and endpoint-scoped keys
- 24-hour key expiration
- Concurrent request safety (first request wins)

Usage:
    # In endpoint:
    from app.middleware.idempotency import check_idempotency, store_idempotency

    @router.post("/api/resource")
    async def create_resource(request: Request, db=Depends(get_db)):
        # Check for cached response
        cached = await check_idempotency(request, db, current_user)
        if cached:
            return cached

        # Process request...
        result = create_resource_logic()

        # Store idempotency key
        await store_idempotency(request, result, db, current_user)

        return result
"""
import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from fastapi import Request, Response, HTTPException
from fastapi.encoders import jsonable_encoder
import logging

logger = logging.getLogger(__name__)

# Constants for idempotency configuration
IDEMPOTENCY_KEY_EXPIRY_HOURS = 24
IDEMPOTENCY_KEY_HEADER = "Idempotency-Key"
REQUEST_HASH_LENGTH = 64  # SHA256 produces 64 hex characters
KEY_REUSE_ERROR_CODE = "idempotency_key_mismatch"


async def compute_request_hash(request: Request) -> str:
    """
    Compute SHA256 hash of request body.

    This hash is used to verify that the same idempotency key is not
    reused with a different request body, which would be a security issue.
    The hash is deterministic - identical request bodies always produce
    identical hashes.

    Args:
        request: FastAPI Request object containing request body bytes

    Returns:
        str: 64-character hexadecimal SHA256 hash of request body

    Example:
        >>> hash_val = await compute_request_hash(request)
        >>> len(hash_val)
        64
        >>> isinstance(hash_val, str)
        True
    """
    body_bytes = await request.body()
    request_hash = hashlib.sha256(body_bytes).hexdigest()
    logger.debug(f"Computed request hash: {request_hash[:8]}...")
    return request_hash


def _extract_idempotency_key(request: Request) -> Optional[str]:
    """
    Extract Idempotency-Key header from request.

    Args:
        request: FastAPI Request object

    Returns:
        Optional[str]: Idempotency key if present, None otherwise
    """
    return request.headers.get(IDEMPOTENCY_KEY_HEADER)


def _get_request_scope(request: Request, user_id: int) -> tuple[str, int]:
    """
    Extract endpoint and user ID for idempotency key scoping.

    Idempotency keys are scoped to (endpoint, user_id) to allow the same
    key to be used on different endpoints or by different users.

    Args:
        request: FastAPI Request object
        user_id: Authenticated user ID

    Returns:
        tuple: (endpoint_path, user_id)
    """
    endpoint = str(request.url.path)
    return endpoint, user_id


async def _fetch_idempotency_record(
    db,
    idempotency_key: str,
    endpoint: str,
    user_id: int
) -> Optional[Dict[str, Any]]:
    """
    Fetch idempotency key record from database.

    Args:
        db: Database connection
        idempotency_key: The idempotency key to look up
        endpoint: API endpoint path
        user_id: User ID for scoping

    Returns:
        Optional[Dict]: Idempotency record if found, None otherwise
    """
    return await db.fetchrow(
        """
        SELECT key, endpoint, user_id, request_hash, response_status,
               response_body, created_at, expires_at
        FROM idempotency_keys
        WHERE key = $1 AND endpoint = $2 AND user_id = $3
        """,
        idempotency_key,
        endpoint,
        user_id
    )


def _is_key_expired(expires_at: datetime) -> bool:
    """
    Check if idempotency key has expired.

    Args:
        expires_at: Expiration timestamp from database (naive UTC datetime)

    Returns:
        bool: True if key has expired, False otherwise
    """
    # Use naive UTC datetime for comparison (database stores naive UTC)
    now = datetime.utcnow()
    return expires_at < now


def _verify_request_hash(
    stored_hash: str,
    current_hash: str,
    idempotency_key: str
) -> None:
    """
    Verify that request body hash matches stored hash.

    Raises HTTPException if hashes don't match (potential key reuse attack).

    Args:
        stored_hash: Hash from database
        current_hash: Hash of current request
        idempotency_key: The idempotency key (for logging/error detail)

    Raises:
        HTTPException: 422 if hashes don't match (key reuse with different body)
    """
    if stored_hash != current_hash:
        error_message = (
            "Idempotency key reused with different request body"
        )
        logger.warning(
            f"Idempotency key {idempotency_key[:8]}... {error_message}. "
            f"Expected hash: {stored_hash[:8]}..., "
            f"Got hash: {current_hash[:8]}..."
        )
        raise HTTPException(
            status_code=422,
            detail=error_message
        )


def _build_cached_response(
    response_body: str,
    response_status: int
) -> Response:
    """
    Build Response object from cached data.

    Args:
        response_body: Cached response body JSON string
        response_status: Cached HTTP status code

    Returns:
        Response: FastAPI Response with cached data
    """
    return Response(
        content=response_body,
        status_code=response_status,
        media_type="application/json"
    )


async def check_idempotency(
    request: Request,
    db,
    current_user: Dict[str, Any]
) -> Optional[Response]:
    """
    Check if idempotency key exists and return cached response if found.

    This function implements the idempotency check logic:
    1. Extract Idempotency-Key header (optional)
    2. If no key, return None (process request normally)
    3. If key exists, look up in database
    4. If found and not expired, verify request hash matches
    5. If hash matches, return cached response
    6. If hash doesn't match, raise 422 error (key reuse attack)

    The idempotency key is scoped to both endpoint and user to allow:
    - Same key on different endpoints (processed independently)
    - Same key by different users (processed independently)
    - Same key by same user on same endpoint (returns cached response)

    Args:
        request: FastAPI Request object containing headers and body
        db: Database connection (asyncpg)
        current_user: Authenticated user dict with 'id' field

    Returns:
        Optional[Response]: Cached response if key exists, None if new request

    Raises:
        HTTPException(422): If idempotency key reused with different body

    Example:
        cached = await check_idempotency(request, db, current_user)
        if cached:
            return cached  # Return cached response immediately
    """
    # Extract idempotency key from header (optional)
    idempotency_key = _extract_idempotency_key(request)
    if not idempotency_key:
        # No idempotency key provided - process request normally
        return None

    # Compute hash of request body for security verification
    request_hash = await compute_request_hash(request)

    # Extract endpoint path and user ID for scoping
    endpoint, user_id = _get_request_scope(request, current_user['id'])

    logger.info(
        f"Checking idempotency key: {idempotency_key[:8]}... "
        f"for endpoint {endpoint} user {user_id}"
    )

    # Look up existing idempotency key in database
    existing = await _fetch_idempotency_record(
        db,
        idempotency_key,
        endpoint,
        user_id
    )

    if not existing:
        # No existing key found - this is a new request
        logger.info(f"No existing key found for {idempotency_key[:8]}...")
        return None

    # Check if key has expired (expires_at < NOW())
    if _is_key_expired(existing['expires_at']):
        logger.info(
            f"Idempotency key {idempotency_key[:8]}... has expired, "
            f"processing as new request"
        )
        return None

    # Verify request body hash matches stored hash
    _verify_request_hash(
        existing['request_hash'],
        request_hash,
        idempotency_key
    )

    # Key found, not expired, hash matches - return cached response
    logger.info(
        f"Returning cached response for idempotency key {idempotency_key[:8]}..."
    )

    return _build_cached_response(
        existing['response_body'],
        existing['response_status']
    )


def _serialize_response_data(response_data: Dict[str, Any]) -> str:
    """
    Serialize response data to JSON string for storage.

    Uses FastAPI's jsonable_encoder to ensure proper serialization of
    datetime objects and other non-standard types to ISO format.

    Args:
        response_data: Response data to serialize

    Returns:
        str: JSON-serialized response data

    Raises:
        json.JSONDecodeError: If response data cannot be serialized
    """
    jsonable_data = jsonable_encoder(response_data)
    return json.dumps(jsonable_data)


def _calculate_expiration(hours: int = IDEMPOTENCY_KEY_EXPIRY_HOURS) -> datetime:
    """
    Calculate expiration time for idempotency key.

    Args:
        hours: Number of hours until expiration (default: 24)

    Returns:
        datetime: Expiration timestamp in UTC
    """
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=hours)
    return expires_at


async def _insert_idempotency_record(
    db,
    idempotency_key: str,
    endpoint: str,
    user_id: int,
    request_hash: str,
    response_status: int,
    response_body: str,
    created_at: datetime,
    expires_at: datetime
) -> None:
    """
    Insert idempotency key record into database.

    Uses INSERT ... ON CONFLICT DO NOTHING for thread-safe concurrent
    request handling (first request wins).

    Args:
        db: Database connection
        idempotency_key: The idempotency key
        endpoint: API endpoint path
        user_id: User ID for scoping
        request_hash: SHA256 hash of request body
        response_status: HTTP status code
        response_body: JSON response body
        created_at: Timestamp when key was created
        expires_at: Expiration timestamp

    Raises:
        Exception: If database operation fails
    """
    await db.execute(
        """
        INSERT INTO idempotency_keys
        (key, endpoint, user_id, request_hash, response_status,
         response_body, created_at, expires_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (key) DO NOTHING
        """,
        idempotency_key,
        endpoint,
        user_id,
        request_hash,
        response_status,
        response_body,
        created_at,
        expires_at
    )


async def store_idempotency(
    request: Request,
    response_data: Dict[str, Any],
    status_code: int,
    db,
    current_user: Dict[str, Any]
) -> None:
    """
    Store idempotency key with cached response in database.

    This function stores the response of a successful request so that
    subsequent requests with the same idempotency key can return the
    cached response without re-processing.

    Storage Details:
    - Key expires after 24 hours (expires_at = created_at + 24h)
    - Key is scoped to: (key, endpoint, user_id)
    - Request body hash is stored for verification
    - Response status and body are cached
    - Uses INSERT ... ON CONFLICT for concurrent request safety

    Args:
        request: FastAPI Request object containing headers and body
        response_data: Response data to cache (dict)
        status_code: HTTP status code to cache (e.g., 201, 200)
        db: Database connection (asyncpg)
        current_user: Authenticated user dict with 'id' field

    Returns:
        None

    Note:
        Errors during storage are logged but don't fail the request.
        The request has already succeeded; storing the key is a best-effort
        bonus to enable idempotency for retries.

    Example:
        await store_idempotency(
            request,
            {"id": 123, "name": "John"},
            201,
            db,
            current_user
        )
    """
    # Extract idempotency key from header (optional)
    idempotency_key = _extract_idempotency_key(request)
    if not idempotency_key:
        # No idempotency key provided - nothing to store
        return

    # Compute hash of request body
    request_hash = await compute_request_hash(request)

    # Extract endpoint path and user ID for scoping
    endpoint, user_id = _get_request_scope(request, current_user['id'])

    # Calculate expiration (24 hours from now)
    # Use naive UTC datetime for database compatibility
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=IDEMPOTENCY_KEY_EXPIRY_HOURS)

    # Serialize response data to JSON
    response_body = _serialize_response_data(response_data)

    logger.info(
        f"Storing idempotency key {idempotency_key[:8]}... "
        f"for endpoint {endpoint} user {user_id}, expires at {expires_at}"
    )

    try:
        # Insert idempotency key record
        await _insert_idempotency_record(
            db,
            idempotency_key,
            endpoint,
            user_id,
            request_hash,
            status_code,
            response_body,
            now,
            expires_at
        )

        logger.info(f"Successfully stored idempotency key {idempotency_key[:8]}...")

    except Exception as e:
        # Log error but don't fail the request
        # The request already succeeded, storing the key is a bonus
        logger.error(
            f"Failed to store idempotency key {idempotency_key[:8]}...: {str(e)}",
            exc_info=True
        )
