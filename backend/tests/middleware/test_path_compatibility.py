"""Tests for dual-path compatibility middleware."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.middleware.path_compatibility import DualPathMiddleware


@pytest.fixture
def test_app():
    """Create test FastAPI app with dual-path middleware."""
    app = FastAPI()

    # Add test routes with hyphenated paths
    @app.get("/api/client-groups")
    async def get_client_groups():
        return {"message": "success", "data": []}

    @app.get("/api/product-owners/{id}")
    async def get_product_owner(id: int):
        return {"id": id, "name": "Test Owner"}

    @app.post("/api/portfolio-funds")
    async def create_portfolio_fund():
        return {"id": 1, "created": True}

    app.add_middleware(DualPathMiddleware, enable_legacy_paths=True, log_usage=False)
    return app


def test_hyphenated_path_works(test_app):
    """Test that hyphenated paths work normally."""
    client = TestClient(test_app)
    response = client.get("/api/client-groups")
    assert response.status_code == 200
    assert response.json()["message"] == "success"
    # Should not have conversion header
    assert "X-Path-Converted" not in response.headers


def test_underscore_path_converted(test_app):
    """Test that underscore paths are converted to hyphenated."""
    client = TestClient(test_app)
    response = client.get("/api/client_groups")
    assert response.status_code == 200
    assert response.json()["message"] == "success"
    # Should have conversion header
    assert response.headers.get("X-Path-Converted") == "true"
    assert response.headers.get("X-Original-Path-Format") == "underscore"


def test_underscore_path_with_id(test_app):
    """Test path conversion with numeric IDs."""
    client = TestClient(test_app)
    response = client.get("/api/product_owners/123")
    assert response.status_code == 200
    assert response.json()["id"] == 123
    assert response.headers.get("X-Path-Converted") == "true"


def test_underscore_path_post_request(test_app):
    """Test path conversion works for POST requests."""
    client = TestClient(test_app)
    response = client.post("/api/portfolio_funds", json={})
    assert response.status_code == 200
    assert response.json()["created"] is True
    assert response.headers.get("X-Path-Converted") == "true"


def test_legacy_paths_disabled():
    """Test that legacy paths return 404 when disabled."""
    app = FastAPI()

    @app.get("/api/client-groups")
    async def get_client_groups():
        return {"message": "success"}

    app.add_middleware(DualPathMiddleware, enable_legacy_paths=False, log_usage=False)
    client = TestClient(app)

    # Hyphenated should work
    response = client.get("/api/client-groups")
    assert response.status_code == 200

    # Underscore should fail with helpful message
    response = client.get("/api/client_groups")
    assert response.status_code == 404
    assert "no longer supported" in response.json()["detail"]
    assert response.json()["suggested_path"] == "/api/client-groups"


def test_path_conversion_logic():
    """Test the path conversion function directly."""
    middleware = DualPathMiddleware(None, enable_legacy_paths=True, log_usage=False)

    # Test various path patterns
    assert middleware._convert_to_hyphenated("/api/client_groups") == "/api/client-groups"
    assert middleware._convert_to_hyphenated("/api/product_owners/123") == "/api/product-owners/123"
    assert middleware._convert_to_hyphenated("/api/portfolio_funds/456/irr") == "/api/portfolio-funds/456/irr"
    assert middleware._convert_to_hyphenated("/api/bulk_client_data") == "/api/bulk-client-data"

    # Already hyphenated should remain unchanged
    assert middleware._convert_to_hyphenated("/api/client-groups") == "/api/client-groups"


def test_mixed_underscore_hyphen_paths():
    """Test paths that already have some hyphens."""
    middleware = DualPathMiddleware(None, enable_legacy_paths=True, log_usage=False)

    # Mixed format (worst case)
    assert middleware._convert_to_hyphenated("/api/portfolio_funds/latest-irr") == "/api/portfolio-funds/latest-irr"
    assert middleware._convert_to_hyphenated("/api/client_groups/{id}/product-owners") == "/api/client-groups/{id}/product-owners"
