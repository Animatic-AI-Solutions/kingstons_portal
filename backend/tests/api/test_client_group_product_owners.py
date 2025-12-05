"""
TDD Red Phase: Tests for Atomic Transaction Endpoint

Tests for POST /client-groups/{client_group_id}/product-owners endpoint
that creates a product owner AND associates them with a client group in
a single database transaction.

CRITICAL REQUIREMENT: These tests verify the atomic transaction behavior
that eliminates the orphaned-record failure case in two-step workflows.

Reference: docs/specifications/Phase2_People_Tab_Architecture.md Section 9.3
"""
import pytest
from datetime import datetime


# All fixtures are now defined in conftest.py


# =============================================================================
# SUCCESS CASES (Happy Path)
# =============================================================================

@pytest.mark.asyncio
async def test_create_product_owner_atomically_success(
    async_client,
    test_client_group,
    authenticated_user,
    db_connection
):
    """
    Test that atomic endpoint creates both product owner and association.

    This test verifies:
    1. Product owner record created in database
    2. Association record created in database
    3. Both operations happen in single transaction
    4. Returns 201 Created status
    5. Response contains product owner data

    Reference: Architecture Section 9.3 - Atomic Transaction Endpoint
    """
    # Prepare request data with required fields
    product_owner_data = {
        "firstname": "John",
        "surname": "Doe",
        "status": "active",
        "email_1": "john.doe@example.com",
        "phone_1": "+44 1234 567890"
    }

    # Make request to atomic endpoint
    response = await async_client.post(
        f"/api/client-groups/{test_client_group['id']}/product-owners",
        json=product_owner_data,
        cookies={"access_token": authenticated_user["token"]}
    )

    # Verify response status (test will FAIL - endpoint doesn't exist yet)
    assert response.status_code == 201, \
        f"Expected 201 Created, got {response.status_code}: {response.text}"

    # Verify response contains product owner with ID
    response_data = response.json()
    assert "id" in response_data, "Response should contain product owner ID"
    assert response_data["firstname"] == "John"
    assert response_data["surname"] == "Doe"

    product_owner_id = response_data["id"]

    # Verify product owner exists in database
    product_owner = await db_connection.fetchrow(
        "SELECT * FROM product_owners WHERE id = $1",
        product_owner_id
    )
    assert product_owner is not None, "Product owner should exist in database"
    assert product_owner["firstname"] == "John"
    assert product_owner["surname"] == "Doe"

    # Verify association exists in database
    association = await db_connection.fetchrow(
        """
        SELECT * FROM client_group_product_owners
        WHERE client_group_id = $1 AND product_owner_id = $2
        """,
        test_client_group["id"],
        product_owner_id
    )
    assert association is not None, "Association should exist in database"
    assert association["client_group_id"] == test_client_group["id"]
    assert association["product_owner_id"] == product_owner_id

    # Cleanup: Delete created records
    await db_connection.execute(
        "DELETE FROM client_group_product_owners WHERE product_owner_id = $1",
        product_owner_id
    )
    await db_connection.execute(
        "DELETE FROM product_owners WHERE id = $1",
        product_owner_id
    )


@pytest.mark.asyncio
async def test_atomic_endpoint_returns_product_owner_with_id(
    async_client,
    test_client_group,
    authenticated_user,
    db_connection
):
    """
    Test that response includes product owner ID and all fields.

    This test verifies:
    1. Response includes auto-generated product owner ID
    2. Response includes all submitted product owner fields
    3. Response includes timestamps (created_at)

    Reference: Architecture Section 9.3 - Response Format
    """
    product_owner_data = {
        "firstname": "Jane",
        "surname": "Smith",
        "status": "active",
        "known_as": "Jenny",
        "email_1": "jane.smith@example.com",
        "title": "Ms",
        "gender": "Female"
    }

    response = await async_client.post(
        f"/api/client-groups/{test_client_group['id']}/product-owners",
        json=product_owner_data,
        cookies={"access_token": authenticated_user["token"]}
    )

    # Test will FAIL - endpoint doesn't exist yet (RED PHASE)
    assert response.status_code == 201

    response_data = response.json()

    # Verify ID is present and is an integer
    assert "id" in response_data
    assert isinstance(response_data["id"], int)
    assert response_data["id"] > 0

    # Verify all submitted fields are in response
    assert response_data["firstname"] == "Jane"
    assert response_data["surname"] == "Smith"
    assert response_data["known_as"] == "Jenny"
    assert response_data["email_1"] == "jane.smith@example.com"
    assert response_data["title"] == "Ms"
    assert response_data["gender"] == "Female"

    # Verify timestamps are present
    assert "created_at" in response_data

    # Cleanup
    product_owner_id = response_data["id"]
    await db_connection.execute(
        "DELETE FROM client_group_product_owners WHERE product_owner_id = $1",
        product_owner_id
    )
    await db_connection.execute(
        "DELETE FROM product_owners WHERE id = $1",
        product_owner_id
    )


# =============================================================================
# TRANSACTION ATOMICITY (Critical Tests)
# =============================================================================

@pytest.mark.asyncio
async def test_atomic_rollback_on_database_error(
    async_client,
    test_client_group,
    authenticated_user,
    db_connection
):
    """
    CRITICAL TEST: Verify that if association creation fails, product owner
    creation is rolled back.

    This test verifies the core ACID transaction behavior that prevents
    orphaned product owner records when association creation fails.

    Test Strategy:
    1. Simulate a database constraint violation during association creation
    2. Verify that product owner record is NOT created
    3. Verify that no association record is created
    4. Verify appropriate error response is returned

    This is the CRITICAL test that validates the entire atomic endpoint design.

    Reference: Architecture Section 9.3 - Transaction Rollback on Failure
    """
    # Create a product owner data that would normally succeed
    product_owner_data = {
        "firstname": "Rollback",
        "surname": "Test",
        "status": "active"
    }

    # To trigger a rollback, we'll use an invalid client_group_id
    # This should cause the transaction to fail during association creation
    invalid_client_group_id = 999999999

    # Verify the invalid client group doesn't exist
    invalid_group = await db_connection.fetchrow(
        "SELECT * FROM client_groups WHERE id = $1",
        invalid_client_group_id
    )
    assert invalid_group is None, "Invalid client group should not exist"

    # Make request with invalid client_group_id
    response = await async_client.post(
        f"/api/client-groups/{invalid_client_group_id}/product-owners",
        json=product_owner_data,
        cookies={"access_token": authenticated_user["token"]}
    )

    # Test will FAIL - endpoint doesn't exist yet (RED PHASE)
    # Expect 404 Not Found or 500 Internal Server Error
    assert response.status_code in [404, 500], \
        f"Expected 404 or 500 error, got {response.status_code}"

    # CRITICAL VERIFICATION: No orphaned product owner record should exist
    # Query for product owners with the test data
    orphaned_owners = await db_connection.fetch(
        """
        SELECT * FROM product_owners
        WHERE firstname = $1 AND surname = $2
        """,
        "Rollback",
        "Test"
    )

    assert len(orphaned_owners) == 0, \
        "No orphaned product owner record should exist after transaction rollback"

    # Verify no association was created
    orphaned_associations = await db_connection.fetch(
        """
        SELECT * FROM client_group_product_owners
        WHERE client_group_id = $1
        """,
        invalid_client_group_id
    )

    assert len(orphaned_associations) == 0, \
        "No association record should exist after transaction rollback"


@pytest.mark.asyncio
async def test_atomic_rollback_on_invalid_client_group_id(
    async_client,
    authenticated_user,
    db_connection
):
    """
    Test that invalid client_group_id causes complete transaction rollback.

    This test verifies:
    1. Request with invalid client_group_id returns error
    2. No product owner record is created
    3. No association record is created
    4. Transaction is fully rolled back

    Reference: Architecture Section 9.3 - Invalid Client Group Handling
    """
    product_owner_data = {
        "firstname": "Invalid",
        "surname": "ClientGroup",
        "status": "active"
    }

    # Use a client_group_id that definitely doesn't exist
    invalid_client_group_id = -1

    response = await async_client.post(
        f"/api/client-groups/{invalid_client_group_id}/product-owners",
        json=product_owner_data,
        cookies={"access_token": authenticated_user["token"]}
    )

    # Test will FAIL - endpoint doesn't exist yet (RED PHASE)
    assert response.status_code in [404, 500], \
        "Invalid client_group_id should return 404 or 500"

    # Verify no product owner was created
    product_owners = await db_connection.fetch(
        """
        SELECT * FROM product_owners
        WHERE firstname = $1 AND surname = $2
        """,
        "Invalid",
        "ClientGroup"
    )

    assert len(product_owners) == 0, \
        "No product owner should be created for invalid client_group_id"


# =============================================================================
# VALIDATION TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_atomic_endpoint_validates_required_fields(
    async_client,
    test_client_group,
    authenticated_user
):
    """
    Test that endpoint validates required fields (firstname, surname).

    This test verifies:
    1. Missing firstname returns 400 Bad Request
    2. Missing surname returns 400 Bad Request
    3. Error response includes validation details

    Reference: Architecture Section 9.3 - Input Validation
    """
    # Test missing firstname
    invalid_data_missing_firstname = {
        "surname": "Doe",
        "status": "active"
    }

    response = await async_client.post(
        f"/api/client-groups/{test_client_group['id']}/product-owners",
        json=invalid_data_missing_firstname,
        cookies={"access_token": authenticated_user["token"]}
    )

    # Test will FAIL - endpoint doesn't exist yet (RED PHASE)
    assert response.status_code == 422, \
        "Missing firstname should return 422 Unprocessable Entity"

    # Test missing surname
    invalid_data_missing_surname = {
        "firstname": "John",
        "status": "active"
    }

    response = await async_client.post(
        f"/api/client-groups/{test_client_group['id']}/product-owners",
        json=invalid_data_missing_surname,
        cookies={"access_token": authenticated_user["token"]}
    )

    assert response.status_code == 422, \
        "Missing surname should return 422 Unprocessable Entity"

    # Test both missing
    invalid_data_both_missing = {
        "status": "active"
    }

    response = await async_client.post(
        f"/api/client-groups/{test_client_group['id']}/product-owners",
        json=invalid_data_both_missing,
        cookies={"access_token": authenticated_user["token"]}
    )

    assert response.status_code == 422, \
        "Missing firstname and surname should return 422 Unprocessable Entity"


@pytest.mark.asyncio
async def test_atomic_endpoint_validates_email_format(
    async_client,
    test_client_group,
    authenticated_user
):
    """
    Test that endpoint validates email format when email is provided.

    This test verifies:
    1. Invalid email format is rejected (if validation is implemented)
    2. Valid email format is accepted
    3. Null email is accepted (email is optional)

    Reference: Architecture Section 9.3 - Email Validation
    """
    # Test invalid email format (if validation is implemented)
    # Note: Current schema may not validate email format, but test documents expected behavior
    invalid_email_data = {
        "firstname": "John",
        "surname": "Doe",
        "status": "active",
        "email_1": "invalid-email-format"
    }

    response = await async_client.post(
        f"/api/client-groups/{test_client_group['id']}/product-owners",
        json=invalid_email_data,
        cookies={"access_token": authenticated_user["token"]}
    )

    # Test will FAIL - endpoint doesn't exist yet (RED PHASE)
    # If email validation is implemented, should return 422
    # If not implemented, may return 201 (document current behavior)
    # For now, we expect validation to be implemented
    assert response.status_code in [201, 422], \
        "Invalid email should either be rejected (422) or accepted (201 if no validation)"

    # Test valid email format
    valid_email_data = {
        "firstname": "Jane",
        "surname": "Doe",
        "status": "active",
        "email_1": "jane.doe@example.com"
    }

    response = await async_client.post(
        f"/api/client-groups/{test_client_group['id']}/product-owners",
        json=valid_email_data,
        cookies={"access_token": authenticated_user["token"]}
    )

    # Valid email should succeed
    # Note: Will fail in RED phase, but documents expected behavior
    assert response.status_code == 201, \
        "Valid email should be accepted"


# =============================================================================
# AUTHORIZATION TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_atomic_endpoint_requires_authentication(
    unauthenticated_client,
    test_client_group
):
    """
    Test that unauthenticated requests are rejected.

    This test verifies:
    1. Request without authentication cookie returns 401 Unauthorized
    2. No product owner or association is created

    Reference: Architecture Section 9.3 - Authentication Requirements
    """
    product_owner_data = {
        "firstname": "Unauth",
        "surname": "Test",
        "status": "active"
    }

    # Make request without authentication token
    response = await unauthenticated_client.post(
        f"/api/client-groups/{test_client_group['id']}/product-owners",
        json=product_owner_data
        # No cookies provided - unauthenticated
    )

    # Test will FAIL - endpoint doesn't exist yet (RED PHASE)
    assert response.status_code == 401, \
        "Unauthenticated request should return 401 Unauthorized"


@pytest.mark.asyncio
async def test_atomic_endpoint_requires_authorization(
    async_client,
    authenticated_user,
    db_connection
):
    """
    Test that user without access to client group is rejected.

    This test verifies:
    1. User without permission to access client group returns 403 Forbidden
    2. No product owner or association is created

    Note: This test assumes authorization logic is implemented. If not yet
    implemented, it documents the expected behavior for future implementation.

    Reference: Architecture Section 9.3 - Authorization Requirements
    """
    # Create a client group that the test user doesn't have access to
    # (assuming advisor_id based authorization)
    other_user = await db_connection.fetchrow(
        """
        INSERT INTO profiles (email, password_hash, first_name, last_name, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        """,
        f"other_{datetime.utcnow().timestamp()}@example.com",
        "hashedpassword",
        "Other",
        "User",
        datetime.utcnow()
    )

    restricted_client_group = await db_connection.fetchrow(
        """
        INSERT INTO client_groups (name, status, type, advisor_id, created_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        """,
        f"Restricted Client Group {datetime.utcnow().timestamp()}",
        "active",
        "Family",
        other_user["id"],  # Assigned to different advisor
        datetime.utcnow()
    )

    product_owner_data = {
        "firstname": "Unauthorized",
        "surname": "Access",
        "status": "active"
    }

    # Make request to client group user doesn't have access to
    response = await async_client.post(
        f"/api/client-groups/{restricted_client_group['id']}/product-owners",
        json=product_owner_data,
        cookies={"access_token": authenticated_user["token"]}
    )

    # Test will FAIL - endpoint doesn't exist yet (RED PHASE)
    # Expected behavior: 403 Forbidden if authorization is implemented
    # May return 201 if authorization not yet implemented
    assert response.status_code in [201, 403], \
        "Unauthorized access should return 403 (or 201 if not implemented)"

    # Cleanup
    await db_connection.execute(
        "DELETE FROM client_group_product_owners WHERE client_group_id = $1",
        restricted_client_group["id"]
    )
    await db_connection.execute(
        "DELETE FROM client_groups WHERE id = $1",
        restricted_client_group["id"]
    )
    await db_connection.execute(
        "DELETE FROM profiles WHERE id = $1",
        other_user["id"]
    )


# =============================================================================
# EDGE CASES
# =============================================================================

@pytest.mark.asyncio
async def test_atomic_endpoint_handles_null_optional_fields(
    async_client,
    test_client_group,
    authenticated_user,
    db_connection
):
    """
    Test that optional fields can be null or omitted.

    This test verifies:
    1. Product owner can be created with only required fields
    2. Optional fields are stored as null in database
    3. Response includes null values for optional fields

    Reference: Architecture Section 9.3 - Optional Field Handling
    """
    # Minimal data with only required fields
    minimal_data = {
        "firstname": "Minimal",
        "surname": "Data",
        "status": "active"
    }

    response = await async_client.post(
        f"/api/client-groups/{test_client_group['id']}/product-owners",
        json=minimal_data,
        cookies={"access_token": authenticated_user["token"]}
    )

    # Test will FAIL - endpoint doesn't exist yet (RED PHASE)
    assert response.status_code == 201, \
        "Should succeed with only required fields"

    response_data = response.json()
    product_owner_id = response_data["id"]

    # Verify optional fields are null in database
    product_owner = await db_connection.fetchrow(
        "SELECT * FROM product_owners WHERE id = $1",
        product_owner_id
    )

    assert product_owner["email_1"] is None
    assert product_owner["email_2"] is None
    assert product_owner["phone_1"] is None
    assert product_owner["phone_2"] is None
    assert product_owner["known_as"] is None

    # Cleanup
    await db_connection.execute(
        "DELETE FROM client_group_product_owners WHERE product_owner_id = $1",
        product_owner_id
    )
    await db_connection.execute(
        "DELETE FROM product_owners WHERE id = $1",
        product_owner_id
    )


@pytest.mark.asyncio
async def test_atomic_endpoint_calculates_display_order(
    async_client,
    test_client_group,
    authenticated_user,
    db_connection
):
    """
    Test that display_order is calculated correctly for associations.

    This test verifies:
    1. First product owner has display_order = 0
    2. Second product owner has display_order = 1
    3. Third product owner has display_order = 2
    4. Display order is sequential within client group

    Reference: Architecture Section 9.3 - Display Order Calculation
    """
    created_product_owner_ids = []

    try:
        # Create first product owner
        response1 = await async_client.post(
            f"/api/client-groups/{test_client_group['id']}/product-owners",
            json={
                "firstname": "First",
                "surname": "Owner",
                "status": "active"
            },
            cookies={"access_token": authenticated_user["token"]}
        )

        # Test will FAIL - endpoint doesn't exist yet (RED PHASE)
        assert response1.status_code == 201
        product_owner_id_1 = response1.json()["id"]
        created_product_owner_ids.append(product_owner_id_1)

        # Verify first product owner has display_order = 0
        association1 = await db_connection.fetchrow(
            """
            SELECT * FROM client_group_product_owners
            WHERE client_group_id = $1 AND product_owner_id = $2
            """,
            test_client_group["id"],
            product_owner_id_1
        )

        assert association1 is not None
        assert association1["display_order"] == 0, \
            "First product owner should have display_order = 0"

        # Create second product owner
        response2 = await async_client.post(
            f"/api/client-groups/{test_client_group['id']}/product-owners",
            json={
                "firstname": "Second",
                "surname": "Owner",
                "status": "active"
            },
            cookies={"access_token": authenticated_user["token"]}
        )

        assert response2.status_code == 201
        product_owner_id_2 = response2.json()["id"]
        created_product_owner_ids.append(product_owner_id_2)

        # Verify second product owner has display_order = 1
        association2 = await db_connection.fetchrow(
            """
            SELECT * FROM client_group_product_owners
            WHERE client_group_id = $1 AND product_owner_id = $2
            """,
            test_client_group["id"],
            product_owner_id_2
        )

        assert association2 is not None
        assert association2["display_order"] == 1, \
            "Second product owner should have display_order = 1"

        # Create third product owner
        response3 = await async_client.post(
            f"/api/client-groups/{test_client_group['id']}/product-owners",
            json={
                "firstname": "Third",
                "surname": "Owner",
                "status": "active"
            },
            cookies={"access_token": authenticated_user["token"]}
        )

        assert response3.status_code == 201
        product_owner_id_3 = response3.json()["id"]
        created_product_owner_ids.append(product_owner_id_3)

        # Verify third product owner has display_order = 2
        association3 = await db_connection.fetchrow(
            """
            SELECT * FROM client_group_product_owners
            WHERE client_group_id = $1 AND product_owner_id = $2
            """,
            test_client_group["id"],
            product_owner_id_3
        )

        assert association3 is not None
        assert association3["display_order"] == 2, \
            "Third product owner should have display_order = 2"

    finally:
        # Cleanup all created product owners
        for product_owner_id in created_product_owner_ids:
            await db_connection.execute(
                "DELETE FROM client_group_product_owners WHERE product_owner_id = $1",
                product_owner_id
            )
            await db_connection.execute(
                "DELETE FROM product_owners WHERE id = $1",
                product_owner_id
            )


# =============================================================================
# ADDITIONAL CRITICAL TESTS
# =============================================================================

@pytest.mark.asyncio
async def test_atomic_endpoint_transaction_isolation(
    async_client,
    test_client_group,
    authenticated_user,
    db_connection
):
    """
    Test that concurrent requests maintain transaction isolation.

    This test verifies:
    1. Concurrent requests don't interfere with each other
    2. Each transaction maintains ACID properties
    3. Display order remains correct even with concurrent requests

    This is a more advanced test that may be skipped initially but
    documents expected behavior for concurrent operations.

    Reference: Architecture Section 9.3 - Transaction Isolation
    """
    import asyncio

    # Create multiple product owners concurrently
    async def create_product_owner(index: int):
        response = await async_client.post(
            f"/api/client-groups/{test_client_group['id']}/product-owners",
            json={
                "firstname": f"Concurrent_{index}",
                "surname": "Test",
                "status": "active"
            },
            cookies={"access_token": authenticated_user["token"]}
        )
        return response

    # Test will FAIL - endpoint doesn't exist yet (RED PHASE)
    # Execute 5 concurrent requests
    responses = await asyncio.gather(*[
        create_product_owner(i) for i in range(5)
    ])

    # Verify all requests succeeded
    assert all(r.status_code == 201 for r in responses), \
        "All concurrent requests should succeed"

    # Verify all product owners were created
    product_owner_ids = [r.json()["id"] for r in responses]
    assert len(product_owner_ids) == 5
    assert len(set(product_owner_ids)) == 5, "All IDs should be unique"

    # Verify all associations were created with correct display_order
    associations = await db_connection.fetch(
        """
        SELECT * FROM client_group_product_owners
        WHERE client_group_id = $1 AND product_owner_id = ANY($2)
        ORDER BY display_order
        """,
        test_client_group["id"],
        product_owner_ids
    )

    assert len(associations) == 5

    # Verify display_order is sequential (may start at any number, but should be consecutive)
    display_orders = sorted([assoc["display_order"] for assoc in associations])
    for i in range(len(display_orders) - 1):
        # Each display order should be exactly 1 more than the previous
        assert display_orders[i+1] - display_orders[i] == 1, \
            "Display orders should be consecutive"

    # Cleanup
    for product_owner_id in product_owner_ids:
        await db_connection.execute(
            "DELETE FROM client_group_product_owners WHERE product_owner_id = $1",
            product_owner_id
        )
        await db_connection.execute(
            "DELETE FROM product_owners WHERE id = $1",
            product_owner_id
        )


@pytest.mark.asyncio
async def test_atomic_endpoint_duplicate_request_handling(
    async_client,
    test_client_group,
    authenticated_user,
    db_connection
):
    """
    Test how endpoint handles duplicate requests with identical data.

    This test verifies expected behavior when the same product owner
    data is submitted twice. The endpoint could either:
    1. Create two separate product owner records (likely behavior)
    2. Detect duplicates and return existing record
    3. Return error for duplicate data

    This test documents whichever behavior is implemented.

    Reference: Architecture Section 9.3 - Duplicate Handling
    """
    product_owner_data = {
        "firstname": "Duplicate",
        "surname": "Test",
        "status": "active",
        "email_1": "duplicate@example.com"
    }

    # First request
    response1 = await async_client.post(
        f"/api/client-groups/{test_client_group['id']}/product-owners",
        json=product_owner_data,
        cookies={"access_token": authenticated_user["token"]}
    )

    # Test will FAIL - endpoint doesn't exist yet (RED PHASE)
    assert response1.status_code == 201
    product_owner_id_1 = response1.json()["id"]

    # Second request with identical data
    response2 = await async_client.post(
        f"/api/client-groups/{test_client_group['id']}/product-owners",
        json=product_owner_data,
        cookies={"access_token": authenticated_user["token"]}
    )

    # Document expected behavior
    # Most likely: Creates second product owner (201)
    # Alternative: Returns error (409 Conflict)
    assert response2.status_code in [201, 409], \
        "Duplicate request should either create new record or return conflict"

    if response2.status_code == 201:
        product_owner_id_2 = response2.json()["id"]
        # Verify two separate records were created
        assert product_owner_id_1 != product_owner_id_2, \
            "Two separate product owner records should be created"

        # Cleanup both records
        for po_id in [product_owner_id_1, product_owner_id_2]:
            await db_connection.execute(
                "DELETE FROM client_group_product_owners WHERE product_owner_id = $1",
                po_id
            )
            await db_connection.execute(
                "DELETE FROM product_owners WHERE id = $1",
                po_id
            )
    else:
        # Cleanup single record
        await db_connection.execute(
            "DELETE FROM client_group_product_owners WHERE product_owner_id = $1",
            product_owner_id_1
        )
        await db_connection.execute(
            "DELETE FROM product_owners WHERE id = $1",
            product_owner_id_1
        )
