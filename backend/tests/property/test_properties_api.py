"""
Property-based tests for API correctness properties.
"""

import pytest
import asyncio
from hypothesis import given, strategies as st, settings
from fastapi.testclient import TestClient
from backend.app import app
from backend.core.event_bus import EventBus
from backend.core.module_registry import ModuleRegistry
from backend.modules.eye import EyeModule
import backend.app as app_module


def setup_test_app():
    """Initialize global components for testing."""
    app_module.event_bus = EventBus(max_log_size=1000)
    app_module.module_registry = ModuleRegistry()
    app_module.eye_module = EyeModule(app_module.event_bus, app_module.module_registry)
    app_module.brain_module = None  # Don't initialize Brain in tests (no API key needed)
    return TestClient(app)


class TestAPIProperties:
    """Property-based tests for API correctness properties."""
    
    @given(module_id=st.sampled_from(["eye", "brain", "mouth", "tentacle"]))
    @settings(max_examples=100, deadline=None)
    def test_property_api_module_toggle_behavior(self, module_id):
        """
        Feature: chimeraforge, Property 27: API module toggle behavior
        Validates: Requirements 10.2
        
        Property: For any module ID, sending a POST request to /api/modules/{id}/toggle
        should toggle the module's enabled state.
        """
        # Initialize a fresh test client for each test run
        client = setup_test_app()
        
        # Get initial module state via API
        response = client.get("/api/modules")
        assert response.status_code == 200, f"GET /api/modules should return 200, got {response.status_code}"
        
        modules = response.json()
        initial_module = next((m for m in modules if m["id"] == module_id), None)
        assert initial_module is not None, f"Module {module_id} should exist in API response"
        
        initial_state = initial_module["enabled"]
        
        # Property 1: Toggle should change the enabled state
        toggle_response = client.post(f"/api/modules/{module_id}/toggle")
        assert toggle_response.status_code == 200, \
            f"POST /api/modules/{module_id}/toggle should return 200, got {toggle_response.status_code}"
        
        toggled_module = toggle_response.json()
        assert toggled_module["id"] == module_id, \
            f"Response should contain module {module_id}, got {toggled_module['id']}"
        assert toggled_module["enabled"] != initial_state, \
            f"Toggle should change enabled state from {initial_state} to {not initial_state}"
        
        # Property 2: The new state should be persisted and retrievable via GET
        get_response = client.get("/api/modules")
        assert get_response.status_code == 200, "GET /api/modules should return 200 after toggle"
        
        modules_after_toggle = get_response.json()
        persisted_module = next((m for m in modules_after_toggle if m["id"] == module_id), None)
        assert persisted_module is not None, f"Module {module_id} should exist after toggle"
        assert persisted_module["enabled"] == toggled_module["enabled"], \
            f"Persisted state {persisted_module['enabled']} should match toggled state {toggled_module['enabled']}"
        
        # Property 3: Toggle again should return to original state
        second_toggle_response = client.post(f"/api/modules/{module_id}/toggle")
        assert second_toggle_response.status_code == 200, \
            f"Second POST /api/modules/{module_id}/toggle should return 200"
        
        double_toggled_module = second_toggle_response.json()
        assert double_toggled_module["enabled"] == initial_state, \
            f"Double toggle should return to initial state {initial_state}, got {double_toggled_module['enabled']}"
        
        # Property 4: The original state should be persisted after double toggle
        final_get_response = client.get("/api/modules")
        assert final_get_response.status_code == 200, "GET /api/modules should return 200 after double toggle"
        
        final_modules = final_get_response.json()
        final_module = next((m for m in final_modules if m["id"] == module_id), None)
        assert final_module is not None, f"Module {module_id} should exist after double toggle"
        assert final_module["enabled"] == initial_state, \
            f"After double toggle, state should be back to {initial_state}, got {final_module['enabled']}"
        
        # Property 5: Module structure should remain consistent
        assert final_module["id"] == module_id, "Module ID should not change"
        assert final_module["name"] == initial_module["name"], "Module name should not change"
        assert final_module["description"] == initial_module["description"], "Module description should not change"
        assert final_module["capabilities"] == initial_module["capabilities"], "Module capabilities should not change"
    
    def test_property_api_module_toggle_invalid_id(self):
        """
        Test that toggling an invalid module ID returns 404.
        
        This is an edge case property test to ensure proper error handling.
        """
        # Initialize a fresh test client
        client = setup_test_app()
        
        # Try to toggle a non-existent module
        invalid_ids = ["invalid", "nonexistent", "fake_module", ""]
        
        for invalid_id in invalid_ids:
            response = client.post(f"/api/modules/{invalid_id}/toggle")
            assert response.status_code == 404, \
                f"POST /api/modules/{invalid_id}/toggle should return 404, got {response.status_code}"
            
            # Verify error response structure
            error_data = response.json()
            assert "detail" in error_data, "Error response should contain 'detail' field"
