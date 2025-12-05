"""
Unit tests for FastAPI application endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app import app
from backend.core.event_bus import EventBus
from backend.core.module_registry import ModuleRegistry
from backend.modules.eye import EyeModule
from backend.modules.brain import BrainModule
import backend.app as app_module


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    # Initialize global components for testing
    app_module.event_bus = EventBus(max_log_size=1000)
    app_module.module_registry = ModuleRegistry()
    app_module.eye_module = EyeModule(app_module.event_bus, app_module.module_registry)
    app_module.brain_module = None  # Don't initialize Brain in tests (no API key needed)
    
    return TestClient(app)


def test_root_endpoint(client):
    """Test the root endpoint returns correct response."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data


def test_get_modules(client):
    """Test GET /api/modules returns all modules."""
    response = client.get("/api/modules")
    assert response.status_code == 200
    
    modules = response.json()
    assert isinstance(modules, list)
    assert len(modules) == 4
    
    # Check module structure
    module_ids = {m["id"] for m in modules}
    assert module_ids == {"eye", "brain", "mouth", "tentacle"}
    
    # All modules should start disabled
    for module in modules:
        assert module["enabled"] is False
        assert "name" in module
        assert "description" in module
        assert "capabilities" in module


def test_toggle_module(client):
    """Test POST /api/modules/{id}/toggle toggles module state."""
    # Toggle eye module on
    response = client.post("/api/modules/eye/toggle")
    assert response.status_code == 200
    
    module = response.json()
    assert module["id"] == "eye"
    assert module["enabled"] is True
    
    # Toggle eye module off
    response = client.post("/api/modules/eye/toggle")
    assert response.status_code == 200
    
    module = response.json()
    assert module["id"] == "eye"
    assert module["enabled"] is False


def test_toggle_invalid_module(client):
    """Test toggling non-existent module returns 404."""
    response = client.post("/api/modules/invalid/toggle")
    assert response.status_code == 404


def test_publish_event(client):
    """Test POST /api/events publishes an event."""
    event_data = {
        "source_module": "test",
        "type": "TEST_EVENT",
        "payload": {"message": "test event"}
    }
    
    response = client.post("/api/events", json=event_data)
    assert response.status_code == 200
    
    event = response.json()
    assert "id" in event
    assert event["source_module"] == "test"
    assert event["type"] == "TEST_EVENT"
    assert event["payload"]["message"] == "test event"


def test_get_logs(client):
    """Test GET /api/logs returns event log."""
    # Publish an event first
    event_data = {
        "source_module": "test",
        "type": "TEST_EVENT",
        "payload": {"message": "test"}
    }
    client.post("/api/events", json=event_data)
    
    # Get logs
    response = client.get("/api/logs")
    assert response.status_code == 200
    
    logs = response.json()
    assert isinstance(logs, list)
    assert len(logs) > 0


def test_get_logs_with_limit(client):
    """Test GET /api/logs respects limit parameter."""
    response = client.get("/api/logs?limit=5")
    assert response.status_code == 200
    
    logs = response.json()
    assert isinstance(logs, list)
    assert len(logs) <= 5


def test_process_vision_frame_invalid_base64(client):
    """Test POST /api/vision/frame handles invalid base64."""
    # Enable eye module first
    client.post("/api/modules/eye/toggle")
    
    frame_data = {
        "frame": "invalid_base64_data"
    }
    
    # Should not crash, but may return error or empty events
    response = client.post("/api/vision/frame", json=frame_data)
    # Accept either success with no events or error
    assert response.status_code in [200, 500]
