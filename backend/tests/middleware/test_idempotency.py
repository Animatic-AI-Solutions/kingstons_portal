"""
RED PHASE: Idempotency Key Infrastructure Tests

These tests verify the idempotency key middleware prevents duplicate records
from network retries, double-clicks, and ensures security through request hashing.

Architecture Reference:
- docs/specifications/Phase2_People_Tab_Architecture.md Section 4.3

All tests should FAIL until the idempotency middleware is implemented.
This is the expected RED phase behavior in TDD.
"""
import pytest
import pytest_asyncio
import hashlib
import uuid
from httpx import AsyncClient, ASGITransport
from datetime import datetime, timedelta
import json


@pytest.mark.asyncio
class TestBasicIdempotency:
    """
    Tests for basic idempotency functionality - preventing duplicate creation.
    """

    async def test_idempotency_prevents_duplicate_creation(
        self,
        db_with_idempotency_table,
        test_client_group,
        authenticated_user
    ):
        """
        Test that same Idempotency-Key prevents duplicate product owner creation.

        RED PHASE: This test should FAIL until middleware is implemented.

        Given: A valid client group and authentication
        When: Two requests with same Idempotency-Key are sent
        Then: Only ONE product owner should be created in database
        And: Both responses should be identical
        """
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            idempotency_key = str(uuid.uuid4())
            request_data = {
                "firstname": "John",
                "surname": "Doe",
                "date_of_birth": "1980-01-01"
            }

            # First request - should create product owner
            response1 = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            # Second request with same idempotency key - should return cached response
            response2 = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            # Both requests should succeed
            assert response1.status_code == 201, f"First request failed: {response1.text}"
            assert response2.status_code == 201, f"Second request failed: {response2.text}"

            # Both should return identical responses
            assert response1.json() == response2.json(), \
                "Cached response should match original response"

            # Verify only ONE product owner was created
            count = await db_with_idempotency_table.fetchval(
                """
                SELECT COUNT(*)
                FROM client_group_product_owners
                WHERE client_group_id = $1
                """,
                test_client_group['id']
            )

            assert count == 1, \
                f"Expected 1 product owner, but found {count}. Idempotency failed!"

    async def test_idempotency_returns_cached_status_code(
        self,
        db_with_idempotency_table,
        test_client_group,
        authenticated_user
    ):
        """
        Test that cached response returns same status code as original.

        RED PHASE: This test should FAIL until middleware is implemented.

        Given: An idempotency key was used for successful creation (201)
        When: The same key is reused
        Then: The cached response should also return 201
        """
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            idempotency_key = str(uuid.uuid4())
            request_data = {
                "firstname": "Jane",
                "surname": "Smith",
                "date_of_birth": "1985-05-15"
            }

            # Original request
            response1 = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            original_status = response1.status_code

            # Cached request
            response2 = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            assert response2.status_code == original_status, \
                f"Cached status code {response2.status_code} != original {original_status}"
            assert response2.status_code == 201, \
                "Expected 201 Created for both original and cached response"

    async def test_idempotency_returns_cached_response_body(
        self,
        db_with_idempotency_table,
        test_client_group,
        authenticated_user
    ):
        """
        Test that cached response returns exact same JSON body as original.

        RED PHASE: This test should FAIL until middleware is implemented.

        Given: An idempotency key was used for successful creation
        When: The same key is reused
        Then: Response body should be byte-for-byte identical
        """
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            idempotency_key = str(uuid.uuid4())
            request_data = {
                "firstname": "Robert",
                "surname": "Johnson",
                "date_of_birth": "1975-12-25",
                "email": "robert.johnson@example.com"
            }

            # Original request
            response1 = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            original_body = response1.json()

            # Cached request
            response2 = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            cached_body = response2.json()

            # Verify exact match
            assert cached_body == original_body, \
                "Cached response body should exactly match original"

            # Verify key fields are present and identical
            assert cached_body.get('id') == original_body.get('id'), \
                "Product owner ID should match"
            assert cached_body.get('firstname') == original_body.get('firstname'), \
                "First name should match"
            assert cached_body.get('surname') == original_body.get('surname'), \
                "Surname should match"


@pytest.mark.asyncio
class TestRequestHashSecurity:
    """
    Tests for request hash verification - prevents idempotency key reuse attacks.
    """

    async def test_idempotency_rejects_key_reuse_with_different_body(
        self,
        db_with_idempotency_table,
        test_client_group,
        authenticated_user
    ):
        """
        Test that same Idempotency-Key with different request body is rejected.

        RED PHASE: This test should FAIL until middleware is implemented.

        Given: An idempotency key was used with request body A
        When: The same key is reused with request body B (different data)
        Then: Second request should return 422 Unprocessable Entity
        And: Error message should indicate key reuse with different body
        """
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            idempotency_key = str(uuid.uuid4())

            # First request with original data
            request_data_1 = {
                "firstname": "Alice",
                "surname": "Williams",
                "date_of_birth": "1990-03-10"
            }

            response1 = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data_1,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            assert response1.status_code == 201, "First request should succeed"

            # Second request with DIFFERENT data but SAME idempotency key (attack attempt)
            request_data_2 = {
                "firstname": "Bob",  # Different firstname
                "surname": "Williams",
                "date_of_birth": "1990-03-10"
            }

            response2 = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data_2,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            # Should reject the request
            assert response2.status_code == 422, \
                f"Expected 422, got {response2.status_code}. Key reuse attack not prevented!"

            # Verify error message
            error_detail = response2.json().get("detail", "")
            assert "idempotency key reused with different request body" in error_detail.lower(), \
                f"Error message should indicate key reuse. Got: {error_detail}"

    async def test_idempotency_allows_same_key_with_same_body(
        self,
        db_with_idempotency_table,
        test_client_group,
        authenticated_user
    ):
        """
        Test that same Idempotency-Key with same request body returns cached response.

        RED PHASE: This test should FAIL until middleware is implemented.

        Given: An idempotency key was used with request body A
        When: The same key is reused with same request body A (exact match)
        Then: Should return cached response (200 or 201, not 422)
        """
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            idempotency_key = str(uuid.uuid4())
            request_data = {
                "firstname": "Charlie",
                "surname": "Brown",
                "date_of_birth": "1988-07-04"
            }

            # First request
            response1 = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            # Second request with SAME data and SAME key (legitimate retry)
            response2 = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            # Should NOT reject (422)
            assert response2.status_code != 422, \
                "Same key with same body should not be rejected"

            # Should return success
            assert response2.status_code in [200, 201], \
                f"Expected success status, got {response2.status_code}"

            # Should return cached response
            assert response1.json() == response2.json(), \
                "Should return cached response"


@pytest.mark.asyncio
class TestIdempotencyKeyStorage:
    """
    Tests for idempotency key storage in database.
    """

    async def test_idempotency_stores_key_in_database(
        self,
        db_with_idempotency_table,
        test_client_group,
        authenticated_user
    ):
        """
        Test that successful request stores idempotency key in database.

        RED PHASE: This test should FAIL until middleware is implemented.

        Given: A request with Idempotency-Key header
        When: Request completes successfully
        Then: Key should be stored in idempotency_keys table
        And: Record should contain: key, endpoint, user_id, request_hash,
             response_status, response_body, created_at, expires_at
        """
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            idempotency_key = str(uuid.uuid4())
            request_data = {
                "firstname": "David",
                "surname": "Miller",
                "date_of_birth": "1992-11-20"
            }

            # Make request
            response = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            assert response.status_code == 201, "Request should succeed"

            # Verify key is stored in database
            stored_key = await db_with_idempotency_table.fetchrow(
                "SELECT * FROM idempotency_keys WHERE key = $1",
                idempotency_key
            )

            assert stored_key is not None, \
                f"Idempotency key {idempotency_key} not found in database"

            # Verify all required fields are present
            assert stored_key['key'] == idempotency_key, "Key should match"
            assert stored_key['endpoint'] is not None, "Endpoint should be stored"
            assert f"/api/client-groups/{test_client_group['id']}/product-owners" in stored_key['endpoint'], \
                f"Endpoint should match request path, got: {stored_key['endpoint']}"
            assert stored_key['user_id'] == authenticated_user['id'], \
                "User ID should match authenticated user"
            assert stored_key['request_hash'] is not None, "Request hash should be stored"
            assert len(stored_key['request_hash']) == 64, \
                "Request hash should be SHA256 (64 hex chars)"
            assert stored_key['response_status'] == 201, "Response status should be 201"
            assert stored_key['response_body'] is not None, "Response body should be stored"
            assert stored_key['created_at'] is not None, "Created timestamp should be set"
            assert stored_key['expires_at'] is not None, "Expiration timestamp should be set"

    async def test_idempotency_calculates_expires_at_correctly(
        self,
        db_with_idempotency_table,
        test_client_group,
        authenticated_user
    ):
        """
        Test that expires_at is set to created_at + 24 hours.

        RED PHASE: This test should FAIL until middleware is implemented.

        Given: A request with Idempotency-Key header
        When: Key is stored in database
        Then: expires_at should be exactly 24 hours after created_at
        """
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            idempotency_key = str(uuid.uuid4())
            request_data = {
                "firstname": "Emma",
                "surname": "Davis",
                "date_of_birth": "1995-02-14"
            }

            # Make request
            response = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            assert response.status_code == 201, "Request should succeed"

            # Fetch stored key
            stored_key = await db_with_idempotency_table.fetchrow(
                "SELECT created_at, expires_at FROM idempotency_keys WHERE key = $1",
                idempotency_key
            )

            assert stored_key is not None, "Key should be stored"

            created_at = stored_key['created_at']
            expires_at = stored_key['expires_at']

            # Calculate expected expiration (24 hours)
            expected_expires_at = created_at + timedelta(hours=24)

            # Allow 1 second tolerance for processing time
            time_diff = abs((expires_at - expected_expires_at).total_seconds())
            assert time_diff < 1, \
                f"expires_at should be 24 hours after created_at. " \
                f"Difference: {time_diff} seconds"


@pytest.mark.asyncio
class TestOptionalHeader:
    """
    Tests that idempotency header is optional.
    """

    async def test_request_without_idempotency_key_succeeds(
        self,
        db_with_idempotency_table,
        test_client_group,
        authenticated_user
    ):
        """
        Test that requests without Idempotency-Key header process normally.

        RED PHASE: This test should PASS even without middleware (no-op behavior).

        Given: A valid request WITHOUT Idempotency-Key header
        When: Request is sent
        Then: Request should process normally and succeed
        """
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            request_data = {
                "firstname": "Frank",
                "surname": "Wilson",
                "date_of_birth": "1987-09-30"
            }

            # Request without Idempotency-Key header
            response = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data,
                headers={
                    "Authorization": f"Bearer {authenticated_user['token']}"
                    # No Idempotency-Key header
                }
            )

            assert response.status_code == 201, \
                f"Request without idempotency key should succeed. Got: {response.status_code}"

            # Make another request without key - should create another record (no deduplication)
            response2 = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data,
                headers={
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            assert response2.status_code == 201, "Second request should also succeed"

            # Verify TWO product owners were created (no idempotency)
            count = await db_with_idempotency_table.fetchval(
                """
                SELECT COUNT(*)
                FROM client_group_product_owners
                WHERE client_group_id = $1
                """,
                test_client_group['id']
            )

            assert count == 2, \
                f"Without idempotency keys, both requests should create records. Found: {count}"


@pytest.mark.asyncio
class TestConcurrentRequests:
    """
    Tests for concurrent requests with same idempotency key.
    """

    async def test_concurrent_requests_with_same_key(
        self,
        db_with_idempotency_table,
        test_client_group,
        authenticated_user
    ):
        """
        Test that concurrent requests with same key only create ONE record.

        RED PHASE: This test should FAIL until middleware is implemented.

        Given: An idempotency key
        When: Two requests with same key are sent concurrently
        Then: Only ONE product owner should be created (first wins)
        And: Second request should receive cached response
        """
        from main import app
        import asyncio

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            idempotency_key = str(uuid.uuid4())
            request_data = {
                "firstname": "Grace",
                "surname": "Martinez",
                "date_of_birth": "1993-06-18"
            }

            # Send two concurrent requests with same idempotency key
            task1 = client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            task2 = client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            # Execute concurrently
            response1, response2 = await asyncio.gather(task1, task2)

            # Both should succeed
            assert response1.status_code == 201, "First request should succeed"
            assert response2.status_code == 201, "Second request should succeed"

            # Verify only ONE product owner was created
            count = await db_with_idempotency_table.fetchval(
                """
                SELECT COUNT(*)
                FROM client_group_product_owners
                WHERE client_group_id = $1
                """,
                test_client_group['id']
            )

            assert count == 1, \
                f"Concurrent requests with same key should only create ONE record. Found: {count}"


@pytest.mark.asyncio
class TestExpirationAndCleanup:
    """
    Tests for idempotency key expiration and cleanup.
    """

    async def test_expired_keys_not_returned(
        self,
        db_with_idempotency_table,
        test_client_group,
        authenticated_user
    ):
        """
        Test that expired idempotency keys are ignored.

        RED PHASE: This test should FAIL until middleware is implemented.

        Given: An idempotency key that expired (>24 hours old)
        When: The same key is reused
        Then: Request should process normally (not return cached response)
        And: New record should be created
        """
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            idempotency_key = str(uuid.uuid4())
            request_data = {
                "firstname": "Henry",
                "surname": "Anderson",
                "date_of_birth": "1991-04-22"
            }
            endpoint = f"/api/client-groups/{test_client_group['id']}/product-owners"

            # Manually insert an expired idempotency key into database
            expired_time = datetime.utcnow() - timedelta(hours=25)  # 25 hours ago
            request_hash = hashlib.sha256(json.dumps(request_data).encode()).hexdigest()

            await db_with_idempotency_table.execute(
                """
                INSERT INTO idempotency_keys
                (key, endpoint, user_id, request_hash, response_status, response_body, created_at, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """,
                idempotency_key,
                endpoint,
                authenticated_user['id'],
                request_hash,
                201,
                '{"id": 999, "firstname": "Old", "surname": "Record"}',
                expired_time,
                expired_time + timedelta(hours=24)
            )

            # Make request with expired key
            response = await client.post(
                endpoint,
                json=request_data,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            assert response.status_code == 201, "Request should succeed"

            # Response should NOT be the cached expired response
            response_body = response.json()
            assert response_body.get('firstname') == 'Henry', \
                "Should process request normally, not return expired cached response"
            assert response_body.get('id') != 999, \
                "Should create new record, not return expired cached ID"

    async def test_cleanup_job_deletes_expired_keys(
        self,
        db_with_idempotency_table,
        test_client_group,
        authenticated_user
    ):
        """
        Test that cleanup job removes expired idempotency keys.

        RED PHASE: This test should FAIL until cleanup job is implemented.

        Given: Multiple idempotency keys, some expired and some active
        When: Cleanup job runs
        Then: Only expired keys (expires_at < NOW()) should be deleted
        And: Active keys should remain
        """
        # Insert test keys
        now = datetime.utcnow()

        # Expired key (25 hours old)
        expired_key = str(uuid.uuid4())
        expired_time = now - timedelta(hours=25)
        await db_with_idempotency_table.execute(
            """
            INSERT INTO idempotency_keys
            (key, endpoint, user_id, request_hash, response_status, response_body, created_at, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            expired_key,
            "/api/test",
            authenticated_user['id'],
            "hash1",
            201,
            '{}',
            expired_time,
            expired_time + timedelta(hours=24)
        )

        # Active key (1 hour old)
        active_key = str(uuid.uuid4())
        active_time = now - timedelta(hours=1)
        await db_with_idempotency_table.execute(
            """
            INSERT INTO idempotency_keys
            (key, endpoint, user_id, request_hash, response_status, response_body, created_at, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            active_key,
            "/api/test",
            authenticated_user['id'],
            "hash2",
            201,
            '{}',
            active_time,
            active_time + timedelta(hours=24)
        )

        # Run cleanup job (this would be a scheduled task)
        # For now, we simulate it with direct SQL
        await db_with_idempotency_table.execute(
            "DELETE FROM idempotency_keys WHERE expires_at < $1",
            now
        )

        # Verify expired key was deleted
        expired_exists = await db_with_idempotency_table.fetchval(
            "SELECT COUNT(*) FROM idempotency_keys WHERE key = $1",
            expired_key
        )
        assert expired_exists == 0, "Expired key should be deleted"

        # Verify active key still exists
        active_exists = await db_with_idempotency_table.fetchval(
            "SELECT COUNT(*) FROM idempotency_keys WHERE key = $1",
            active_key
        )
        assert active_exists == 1, "Active key should remain"


@pytest.mark.asyncio
class TestEndpointScoping:
    """
    Tests that idempotency keys are scoped to specific endpoints.
    """

    async def test_idempotency_scoped_to_endpoint(
        self,
        db_with_idempotency_table,
        test_client_group,
        authenticated_user
    ):
        """
        Test that same key on different endpoints are treated as different requests.

        RED PHASE: This test should FAIL until middleware is implemented.

        Given: An idempotency key used on endpoint A
        When: The same key is used on endpoint B
        Then: Both requests should process independently
        And: No conflict should occur
        """
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            idempotency_key = str(uuid.uuid4())

            # Request 1: POST /client-groups/{id}/product-owners
            request_data_1 = {
                "firstname": "Isabel",
                "surname": "Garcia",
                "date_of_birth": "1989-08-12"
            }

            response1 = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data_1,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            assert response1.status_code == 201, "First request should succeed"
            product_owner_id = response1.json()['id']

            # Request 2: PATCH /product-owners/{id} (DIFFERENT ENDPOINT, SAME KEY)
            request_data_2 = {
                "firstname": "Isabel Updated",
                "surname": "Garcia"
            }

            response2 = await client.patch(
                f"/api/product-owners/{product_owner_id}",
                json=request_data_2,
                headers={
                    "Idempotency-Key": idempotency_key,  # Same key, different endpoint
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            # Should NOT conflict (different endpoints)
            assert response2.status_code in [200, 201], \
                f"Update should succeed despite same key (different endpoint). Got: {response2.status_code}"

            # Verify both operations were processed (not cached)
            # The update should have been applied
            owner = await db_with_idempotency_table.fetchrow(
                "SELECT firstname FROM product_owners WHERE id = $1",
                product_owner_id
            )
            assert owner['firstname'] == 'Isabel Updated', \
                "Update should have been applied, not blocked by idempotency"


@pytest.mark.asyncio
class TestUserScoping:
    """
    Tests that idempotency keys are scoped to specific users.
    """

    async def test_idempotency_scoped_to_user(
        self,
        db_with_idempotency_table,
        test_client_group,
        authenticated_user,
        second_authenticated_user
    ):
        """
        Test that same key used by different users are treated as different requests.

        RED PHASE: This test should FAIL until middleware is implemented.

        Given: User A uses an idempotency key
        When: User B uses the same idempotency key
        Then: Both requests should process independently
        And: Two separate records should be created
        """
        from main import app

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            idempotency_key = str(uuid.uuid4())

            # User A's request
            request_data_1 = {
                "firstname": "Jack",
                "surname": "Taylor",
                "date_of_birth": "1986-10-05"
            }

            response1 = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data_1,
                headers={
                    "Idempotency-Key": idempotency_key,
                    "Authorization": f"Bearer {authenticated_user['token']}"
                }
            )

            assert response1.status_code == 201, "User A's request should succeed"

            # User B's request with SAME idempotency key
            request_data_2 = {
                "firstname": "Kate",
                "surname": "Thomas",
                "date_of_birth": "1994-01-28"
            }

            response2 = await client.post(
                f"/api/client-groups/{test_client_group['id']}/product-owners",
                json=request_data_2,
                headers={
                    "Idempotency-Key": idempotency_key,  # Same key, different user
                    "Authorization": f"Bearer {second_authenticated_user['token']}"
                }
            )

            # Should NOT conflict (different users)
            assert response2.status_code == 201, \
                f"User B's request should succeed despite same key (different user). Got: {response2.status_code}"

            # Verify TWO product owners were created (one per user)
            count = await db_with_idempotency_table.fetchval(
                """
                SELECT COUNT(*)
                FROM client_group_product_owners
                WHERE client_group_id = $1
                """,
                test_client_group['id']
            )

            assert count == 2, \
                f"Both users should create records independently. Found: {count}"

            # Verify they have different IDs
            assert response1.json()['id'] != response2.json()['id'], \
                "Different users should create different records"
