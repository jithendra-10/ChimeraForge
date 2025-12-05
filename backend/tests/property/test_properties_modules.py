"""
Property-based tests for Module Registry correctness properties.
"""

import pytest
import asyncio
import base64
import cv2
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch
from hypothesis import given, strategies as st, settings
from backend.core.module_registry import ModuleRegistry, ModuleInfo
from backend.core.event_bus import EventBus, EventType, Event
from backend.modules.eye import EyeModule
from backend.modules.brain import BrainModule, BrainResponse


class TestModuleRegistryProperties:
    """Property-based tests for Module Registry correctness properties."""
    
    @given(module_id=st.sampled_from(["eye", "brain", "mouth", "tentacle"]))
    def test_property_module_toggle_state_persistence(self, module_id):
        """
        Feature: chimeraforge, Property 1: Module toggle state persistence
        Validates: Requirements 1.1, 1.2, 1.5
        
        Property: For any module in the system, toggling its state should result in
        the module registry reflecting the new state and the module's abilities being
        available or unavailable accordingly.
        """
        # Create a fresh registry
        registry = ModuleRegistry()
        
        # Get initial state
        initial_module = registry.get_module(module_id)
        assert initial_module is not None, f"Module {module_id} should exist in registry"
        
        initial_state = initial_module.enabled
        initial_capabilities = initial_module.capabilities.copy()
        
        # Property 1: Toggle should change the enabled state
        toggled_module = registry.toggle_module(module_id)
        assert toggled_module is not None, f"Toggle should return module info for {module_id}"
        assert toggled_module.enabled != initial_state, \
            f"Toggle should change enabled state from {initial_state} to {not initial_state}"
        
        # Property 2: The new state should be persisted in the registry
        persisted_module = registry.get_module(module_id)
        assert persisted_module is not None, f"Module {module_id} should still exist after toggle"
        assert persisted_module.enabled == toggled_module.enabled, \
            f"Persisted state {persisted_module.enabled} should match toggled state {toggled_module.enabled}"
        
        # Property 3: is_enabled should reflect the new state
        is_enabled_result = registry.is_enabled(module_id)
        assert is_enabled_result == toggled_module.enabled, \
            f"is_enabled() returned {is_enabled_result}, expected {toggled_module.enabled}"
        
        # Property 4: Capabilities should remain unchanged after toggle
        assert persisted_module.capabilities == initial_capabilities, \
            f"Capabilities should not change after toggle"
        
        # Property 5: Toggle again should return to original state
        double_toggled_module = registry.toggle_module(module_id)
        assert double_toggled_module is not None, f"Second toggle should return module info"
        assert double_toggled_module.enabled == initial_state, \
            f"Double toggle should return to initial state {initial_state}"
        
        # Property 6: The original state should be persisted after double toggle
        final_module = registry.get_module(module_id)
        assert final_module.enabled == initial_state, \
            f"After double toggle, state should be back to {initial_state}"



# Helper function to generate test images
def generate_test_image(width: int = 640, height: int = 480, seed: int = 0) -> str:
    """
    Generate a test image as base64 string.
    
    Args:
        width: Image width
        height: Image height
        seed: Random seed for reproducibility
        
    Returns:
        Base64-encoded image string
    """
    np.random.seed(seed)
    
    # Create a random image
    image = np.random.randint(0, 256, (height, width, 3), dtype=np.uint8)
    
    # Encode to JPEG
    _, buffer = cv2.imencode('.jpg', image)
    
    # Convert to base64
    image_base64 = base64.b64encode(buffer).decode('utf-8')
    
    return image_base64


class TestEyeModuleProperties:
    """Property-based tests for Eye Module correctness properties."""
    
    @given(
        num_frames=st.integers(min_value=1, max_value=10),
        seed=st.integers(min_value=0, max_value=1000)
    )
    @settings(max_examples=100, deadline=None)
    def test_property_eye_processes_all_frames_when_enabled(self, num_frames, seed):
        """
        Feature: chimeraforge, Property 4: Eye module processes all frames when enabled
        Validates: Requirements 2.1
        
        Property: For any webcam frame received while the Eye module is enabled,
        the Eye module should process the frame for face detection.
        
        We verify this by checking that for each frame processed, a VISION_EVENT
        is published to the event bus.
        """
        # Create fresh instances for each test
        event_bus = EventBus()
        registry = ModuleRegistry()
        eye_module = EyeModule(event_bus, registry)
        
        # Enable the Eye module
        registry.toggle_module("eye")
        assert registry.is_enabled("eye"), "Eye module should be enabled"
        
        # Generate and process multiple frames
        for i in range(num_frames):
            frame_base64 = generate_test_image(seed=seed + i)
            
            # Process the frame synchronously using asyncio.run
            asyncio.run(eye_module.process_frame(frame_base64))
        
        # Property: Each frame should result in exactly one VISION_EVENT
        events = event_bus.get_all_events()
        
        # Check that we have exactly num_frames events
        assert len(events) == num_frames, \
            f"Expected {num_frames} events, but got {len(events)}"
        
        # Check that all events are VISION_EVENTs from the eye module
        for idx, event in enumerate(events):
            assert event.type == EventType.VISION_EVENT, \
                f"Event {idx} should be VISION_EVENT, got {event.type}"
            assert event.source_module == "eye", \
                f"Event {idx} should be from 'eye' module, got {event.source_module}"
            assert "detected" in event.payload, \
                f"Event {idx} should have 'detected' field in payload"
            assert isinstance(event.payload["detected"], bool), \
                f"Event {idx} 'detected' field should be boolean"



class TestBrainModuleProperties:
    """Property-based tests for Brain Module correctness properties."""
    
    @given(
        detected=st.booleans(),
        object_type=st.sampled_from(["face", "person", "unknown"]),
        confidence=st.floats(min_value=0.0, max_value=1.0),
        seed=st.integers(min_value=0, max_value=1000)
    )
    @settings(max_examples=100, deadline=None)
    def test_property_brain_generates_responses_for_vision_events(
        self, detected, object_type, confidence, seed
    ):
        """
        Feature: chimeraforge, Property 7: Brain generates responses for vision events
        Validates: Requirements 3.1
        
        Property: For any VISION_EVENT received while the Brain module is enabled,
        the Brain module should generate a contextual response using LLM reasoning.
        
        We verify this by checking that for each VISION_EVENT processed, a SYSTEM_ACTION
        event is published to the event bus.
        """
        # Create fresh instances for each test
        event_bus = EventBus()
        registry = ModuleRegistry()
        
        # Mock the OpenAI client to avoid actual API calls
        with patch('backend.modules.brain.AsyncOpenAI') as mock_openai:
            # Create a mock client
            mock_client = MagicMock()
            mock_openai.return_value = mock_client
            
            # Create mock response
            mock_response = MagicMock()
            mock_response.choices = [MagicMock()]
            mock_response.choices[0].message.content = '{"text": "Test response", "speak": "Hello"}'
            
            # Set up the async mock
            mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
            
            # Create Brain module with mocked client
            brain_module = BrainModule(event_bus, registry, api_key="test-key")
            
            # Enable the Brain module
            registry.toggle_module("brain")
            assert registry.is_enabled("brain"), "Brain module should be enabled"
            
            # Create a VISION_EVENT with the given parameters
            vision_event = Event.create(
                source_module="eye",
                type=EventType.VISION_EVENT,
                payload={
                    "detected": detected,
                    "object_type": object_type if detected else None,
                    "confidence": confidence if detected else 0.0
                }
            )
            
            # Process the event synchronously using asyncio.run
            asyncio.run(brain_module.on_event(vision_event))
            
            # Property: The Brain should generate a response (call the LLM)
            # Verify that the OpenAI API was called
            mock_client.chat.completions.create.assert_called_once()
            
            # Property: A SYSTEM_ACTION event should be published
            events = event_bus.get_all_events()
            
            # Filter for SYSTEM_ACTION events from brain
            system_action_events = [
                e for e in events 
                if e.type == EventType.SYSTEM_ACTION and e.source_module == "brain"
            ]
            
            # Check that exactly one SYSTEM_ACTION was published
            assert len(system_action_events) == 1, \
                f"Expected 1 SYSTEM_ACTION event, but got {len(system_action_events)}"
            
            # Verify the event structure
            action_event = system_action_events[0]
            assert "text" in action_event.payload, \
                "SYSTEM_ACTION event should have 'text' field in payload"
            assert isinstance(action_event.payload["text"], str), \
                "SYSTEM_ACTION 'text' field should be a string"
            assert len(action_event.payload["text"]) > 0, \
                "SYSTEM_ACTION 'text' field should not be empty"


class TestModuleErrorHandlingProperties:
    """Property-based tests for Module Error Handling correctness properties."""
    
    @given(
        module_type=st.sampled_from(["eye", "brain"]),
        error_scenario=st.sampled_from([
            "invalid_base64",
            "empty_data",
            "corrupted_image",
            "api_failure"
        ]),
        seed=st.integers(min_value=0, max_value=1000)
    )
    @settings(max_examples=100, deadline=None)
    def test_property_module_error_event_publishing(self, module_type, error_scenario, seed):
        """
        Feature: chimeraforge, Property 31: Module error event publishing
        Validates: Requirements 12.1
        
        Property: For any error encountered during module processing, the module
        should publish an ERROR event to the Event Bus.
        
        We verify this by triggering various error conditions in modules and checking
        that ACTION_ERROR events are published with appropriate error information.
        """
        # Create fresh instances for each test
        event_bus = EventBus()
        registry = ModuleRegistry()
        
        if module_type == "eye":
            # Test Eye module error handling
            eye_module = EyeModule(event_bus, registry)
            registry.toggle_module("eye")
            assert registry.is_enabled("eye"), "Eye module should be enabled"
            
            # Generate error-inducing input based on scenario
            if error_scenario == "invalid_base64":
                # Invalid base64 string
                frame_data = "not_valid_base64!@#$%"
            elif error_scenario == "empty_data":
                # Empty string
                frame_data = ""
            elif error_scenario == "corrupted_image":
                # Valid base64 but not a valid image
                frame_data = base64.b64encode(b"not an image").decode('utf-8')
            else:
                # Use valid image for other scenarios
                frame_data = generate_test_image(seed=seed)
            
            # Process the frame
            asyncio.run(eye_module.process_frame(frame_data))
            
            # Property: An ERROR event should be published for error scenarios
            events = event_bus.get_all_events()
            
            # For error scenarios, we expect an ACTION_ERROR event
            if error_scenario in ["invalid_base64", "empty_data", "corrupted_image"]:
                error_events = [
                    e for e in events 
                    if e.type == EventType.ACTION_ERROR and e.source_module == "eye"
                ]
                
                assert len(error_events) >= 1, \
                    f"Expected at least 1 ACTION_ERROR event for scenario '{error_scenario}', but got {len(error_events)}"
                
                # Verify error event structure
                error_event = error_events[0]
                assert "error_type" in error_event.payload, \
                    "ERROR event should have 'error_type' field in payload"
                assert "message" in error_event.payload, \
                    "ERROR event should have 'message' field in payload"
                assert "details" in error_event.payload, \
                    "ERROR event should have 'details' field in payload"
                assert "recoverable" in error_event.payload, \
                    "ERROR event should have 'recoverable' field in payload"
                
                # Verify error_type is a string
                assert isinstance(error_event.payload["error_type"], str), \
                    "error_type should be a string"
                
                # Verify message is a string
                assert isinstance(error_event.payload["message"], str), \
                    "message should be a string"
                
                # Verify recoverable is a boolean
                assert isinstance(error_event.payload["recoverable"], bool), \
                    "recoverable should be a boolean"
        
        elif module_type == "brain":
            # Test Brain module error handling
            with patch('backend.modules.brain.AsyncOpenAI') as mock_openai:
                # Create a mock client
                mock_client = MagicMock()
                mock_openai.return_value = mock_client
                
                if error_scenario == "api_failure":
                    # Simulate API failure
                    mock_client.chat.completions.create = AsyncMock(
                        side_effect=Exception("API connection failed")
                    )
                else:
                    # For other scenarios, use normal mock
                    mock_response = MagicMock()
                    mock_response.choices = [MagicMock()]
                    mock_response.choices[0].message.content = '{"text": "Test response"}'
                    mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
                
                # Create Brain module with mocked client
                brain_module = BrainModule(event_bus, registry, api_key="test-key")
                
                # Enable the Brain module
                registry.toggle_module("brain")
                assert registry.is_enabled("brain"), "Brain module should be enabled"
                
                # Create a VISION_EVENT
                vision_event = Event.create(
                    source_module="eye",
                    type=EventType.VISION_EVENT,
                    payload={
                        "detected": True,
                        "object_type": "face",
                        "confidence": 0.8
                    }
                )
                
                # Process the event
                asyncio.run(brain_module.on_event(vision_event))
                
                # Property: For API failure, an ERROR event should be published
                if error_scenario == "api_failure":
                    events = event_bus.get_all_events()
                    error_events = [
                        e for e in events 
                        if e.type == EventType.ACTION_ERROR and e.source_module == "brain"
                    ]
                    
                    assert len(error_events) >= 1, \
                        f"Expected at least 1 ACTION_ERROR event for API failure, but got {len(error_events)}"
                    
                    # Verify error event structure
                    error_event = error_events[0]
                    assert "error_type" in error_event.payload, \
                        "ERROR event should have 'error_type' field in payload"
                    assert "message" in error_event.payload, \
                        "ERROR event should have 'message' field in payload"
                    assert "details" in error_event.payload, \
                        "ERROR event should have 'details' field in payload"
                    assert "recoverable" in error_event.payload, \
                        "ERROR event should have 'recoverable' field in payload"
                    
                    # Verify error_type is "external_service" for API failures
                    assert error_event.payload["error_type"] == "external_service", \
                        f"Expected error_type 'external_service', got '{error_event.payload['error_type']}'"


class TestSystemResilienceProperties:
    """Property-based tests for System Resilience correctness properties."""
    
    @given(
        failing_module=st.sampled_from(["eye", "brain"]),
        num_operations=st.integers(min_value=1, max_value=5),
        seed=st.integers(min_value=0, max_value=1000)
    )
    @settings(max_examples=100, deadline=None)
    def test_property_system_resilience_to_module_failures(
        self, failing_module, num_operations, seed
    ):
        """
        Feature: chimeraforge, Property 32: System resilience to module failures
        Validates: Requirements 12.2
        
        Property: For any module failure, the ChimeraForge System should continue
        operating with the remaining functional modules.
        
        We verify this by:
        1. Simulating a module failure (Eye or Brain)
        2. Ensuring the event bus continues to function
        3. Ensuring other modules can still process events
        4. Ensuring the system publishes error events but doesn't crash
        """
        # Create fresh instances for each test
        event_bus = EventBus()
        registry = ModuleRegistry()
        
        # Enable all modules
        registry.toggle_module("eye")
        registry.toggle_module("brain")
        assert registry.is_enabled("eye"), "Eye module should be enabled"
        assert registry.is_enabled("brain"), "Brain module should be enabled"
        
        if failing_module == "eye":
            # Test Eye module failure resilience
            eye_module = EyeModule(event_bus, registry)
            
            # Property 1: System should handle invalid inputs gracefully
            for i in range(num_operations):
                # Generate invalid input that will cause Eye module to fail
                invalid_inputs = [
                    "invalid_base64_data!@#$",
                    "",
                    "not-valid-base64",
                    base64.b64encode(b"corrupted image data").decode('utf-8')
                ]
                
                invalid_input = invalid_inputs[i % len(invalid_inputs)]
                
                # Process the invalid frame - should not crash
                asyncio.run(eye_module.process_frame(invalid_input))
            
            # Property 2: Event bus should still be operational
            events = event_bus.get_all_events()
            assert len(events) > 0, \
                "Event bus should have events even after Eye module failures"
            
            # Property 3: Error events should be published for failures
            error_events = [
                e for e in events 
                if e.type == EventType.ACTION_ERROR and e.source_module == "eye"
            ]
            assert len(error_events) > 0, \
                "Eye module should publish error events for failures"
            
            # Property 4: Vision events should still be published (graceful degradation)
            vision_events = [
                e for e in events 
                if e.type == EventType.VISION_EVENT and e.source_module == "eye"
            ]
            assert len(vision_events) > 0, \
                "Eye module should still publish vision events even after errors (graceful degradation)"
            
            # Property 5: System should continue accepting new operations
            # Try processing a valid frame after failures
            valid_frame = generate_test_image(seed=seed)
            asyncio.run(eye_module.process_frame(valid_frame))
            
            # Verify the system recovered and processed the valid frame
            events_after_recovery = event_bus.get_all_events()
            assert len(events_after_recovery) > len(events), \
                "System should continue processing after module failures"
        
        elif failing_module == "brain":
            # Test Brain module failure resilience
            with patch('backend.modules.brain.AsyncOpenAI') as mock_openai:
                # Create a mock client that fails
                mock_client = MagicMock()
                mock_openai.return_value = mock_client
                
                # Simulate API failures
                mock_client.chat.completions.create = AsyncMock(
                    side_effect=Exception("API connection failed")
                )
                
                # Create Brain module with failing client
                brain_module = BrainModule(event_bus, registry, api_key="test-key")
                
                # Property 1: System should handle Brain failures gracefully
                for i in range(num_operations):
                    # Create vision events that will trigger Brain processing
                    vision_event = Event.create(
                        source_module="eye",
                        type=EventType.VISION_EVENT,
                        payload={
                            "detected": True,
                            "object_type": "face",
                            "confidence": 0.8
                        }
                    )
                    
                    # Process the event - should not crash
                    asyncio.run(brain_module.on_event(vision_event))
                
                # Property 2: Event bus should still be operational
                events = event_bus.get_all_events()
                assert len(events) > 0, \
                    "Event bus should have events even after Brain module failures"
                
                # Property 3: Error events should be published for failures
                error_events = [
                    e for e in events 
                    if e.type == EventType.ACTION_ERROR and e.source_module == "brain"
                ]
                assert len(error_events) > 0, \
                    "Brain module should publish error events for API failures"
                
                # Property 4: System actions should still be published (graceful degradation)
                # Brain module publishes fallback responses even when API fails
                system_action_events = [
                    e for e in events 
                    if e.type == EventType.SYSTEM_ACTION and e.source_module == "brain"
                ]
                assert len(system_action_events) > 0, \
                    "Brain module should publish fallback system actions even after API failures"
                
                # Property 5: Fallback responses should indicate the error state
                for action_event in system_action_events:
                    assert "text" in action_event.payload, \
                        "System action should have text field"
                    # Fallback text should indicate difficulties
                    assert len(action_event.payload["text"]) > 0, \
                        "Fallback response should not be empty"
                
                # Property 6: System should continue accepting new operations
                # Create another vision event after failures
                recovery_event = Event.create(
                    source_module="eye",
                    type=EventType.VISION_EVENT,
                    payload={
                        "detected": False,
                        "object_type": None,
                        "confidence": 0.0
                    }
                )
                
                asyncio.run(brain_module.on_event(recovery_event))
                
                # Verify the system continues to operate
                events_after_recovery = event_bus.get_all_events()
                assert len(events_after_recovery) > len(events), \
                    "System should continue processing after Brain module failures"
        
        # Property 7: Event bus should never crash regardless of module failures
        # Verify event bus is still functional by publishing a test event
        test_event = Event.create(
            source_module="system",
            type=EventType.MODULE_STATE_CHANGED,
            payload={"module_id": "test", "enabled": True}
        )
        
        asyncio.run(event_bus.publish(test_event))
        
        final_events = event_bus.get_all_events()
        assert any(e.id == test_event.id for e in final_events), \
            "Event bus should still accept and store events after module failures"
        
        # Property 8: Module registry should remain operational
        # Verify we can still query and toggle modules
        all_modules = registry.get_all_modules()
        assert len(all_modules) == 4, \
            "Module registry should still return all modules after failures"
        
        # Toggle a module to verify registry is functional
        registry.toggle_module("mouth")
        mouth_module = registry.get_module("mouth")
        assert mouth_module.enabled == True, \
            "Module registry should still allow toggling after other module failures"
