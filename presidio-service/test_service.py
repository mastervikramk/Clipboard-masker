"""
Unit and integration tests for the Presidio + GLiNER FastAPI service.
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import SUPPORTED_ENTITIES


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_healthz_endpoint(client):
    response = client.get("/healthz")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] in ["healthy", "initializing"]
    assert "supported_entities" in data
    assert "EMAIL_ADDRESS" in data["supported_entities"]


def test_get_supported_entities(client):
    response = client.get("/entities")
    assert response.status_code == 200
    data = response.json()
    assert "entities" in data
    assert len(data["entities"]) > 0


def test_analyze_email_and_phone(client):
    sample_text = "Please reach out to alice.smith@example.org or call 555-019-2834."
    response = client.post(
        "/analyze",
        json={"text": sample_text, "language": "en"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "entities" in data
    assert len(data["entities"]) >= 1

    entity_types = [e["entity_type"] for e in data["entities"]]
    assert "EMAIL_ADDRESS" in entity_types or "PHONE_NUMBER" in entity_types


def test_anonymize_tag_strategy(client):
    sample_text = "My email is test@company.com"
    response = client.post(
        "/anonymize",
        json={
            "text": sample_text,
            "strategy": "tag"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "<EMAIL_ADDRESS>" in data["text"]
    assert "test@company.com" not in data["text"]


def test_anonymize_redact_strategy(client):
    sample_text = "Contact support@internal.org"
    response = client.post(
        "/anonymize",
        json={
            "text": sample_text,
            "strategy": "redact"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "text" in data
    assert "[REDACTED]" in data["text"]
    assert "support@internal.org" not in data["text"]
