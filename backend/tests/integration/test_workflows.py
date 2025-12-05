"""
Integration tests for ChimeraForge full workflows.

These tests verify end-to-end functionality across multiple modules:
- Vision pipeline: frame → detection → reasoning → speech
- Module enable/disable affecting event processing
- Error recovery scenarios
"""

import pytest
import asyncio
import base64
import cv2
import numpy as np
from unittest.mock import AsyncMock, MagicMock, patch
from backend.core.event_bus import Event, EventBus, EventType
from backend.core.module_registry import ModuleRegistry
from backend.modules.eye import EyeModule
from backend.modules.brain import BrainModule


def create_test_image_base64(with_face: bool = True) -> str:
    """
    Create a test image with or without a face for testing.
    
    Args:
        with_face: Whether to include a face-like pattern
        
    Returns:
        Base64-encoded image string
    """
    # Create a simple test image
    if with_face:
        # Create an image with a face-like pattern (rectangle that might be detected)
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        # Draw a face-like oval
        cv2.ellipse(img, (320, 240), (100, 130), 0, 0, 360, (255, 255, 255), -1)
        # Draw eyes
        cv2.circle(img, (290, 220), 15, (0, 0, 0), -1)
        cv2.circle(img, (350, 220), 15, (0, 0, 0), -1)
        # Draw mouth
        cv2.ellipse(img, (320, 270), (40, 20), 0, 0, 180, (0, 0, 0), 2)
    else:
        # Create a blank image
        img = np.zeros((480, 640, 3), dtype=np.uint8)
    
    # Encode to JPEG
    _, buffer = cv2.imencode('.jpg', img)
    # Convert to base64
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    return img_base64


class TestVisionPipeline:
    """Integration tests for the vision pipeline workflow."""
    
    @pytest.mark.asyncio
    async def test_full_vision_pipeline_with_face_detection(self):
        """
        Test the complete vision pipeline: frame → detection → reasoning → action.
        
        Workflow:
        1. Enable Eye and Brain modules
        2. Send a frame with a face
        3. Verify Eye publishes VISION_EVENT
        4. Verify Brain receives event and publishes SYSTEM_ACTION
        5. Verify events are in correct order
        """
        # Initialize components
        event_bus = EventBus(max_log_size=1000)
        module_registry = ModuleRegistry()
        eye_module = EyeModule(event_bus, module_registry)
        
        # Mock OpenAI client for Brain module
        mock_openai_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"text": "Greetings, human!", "speak": "Hello there!"}'
        mock_openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        # Initialize Brain module with mocked client
        brain_module = BrainModule(event_bus, module_registry, api_key="test_key")
        brain_module.client = mock_openai_client
        
        # Enable both modules
        module_registry.toggle_module("eye")
        module_registry.toggle_module("brain")
        
        assert module_registry.is_enabled("eye")
        assert module_registry.is_enabled("brain")
        
        # Create test image with face
        test_frame = create_test_image_base64(with_face=True)
        
        # Process frame through Eye module
        await eye_module.process_frame(test_frame)
        
        # Wait for Brain module to process
        await asyncio.sleep(0.2)
        
        # Verify events were published
        all_events = event_bus.get_all_events()
        
        # Should have at least 2 events: VISION_EVENT, SYSTEM_ACTION
        # (MODULE_STATE_CHANGED events are only published via API, not direct registry calls)
        assert len(all_events) >= 2, f"Expected at least 2 events, got {len(all_events)}"
        
        # Find VISION_EVENT
        vision_events = [e for e in all_events if e.type == EventType.VISION_EVENT]
        assert len(vision_events) >= 1, "Should have at least one VISION_EVENT"
        
        vision_event = vision_events[0]
        assert vision_event.source_module == "eye"
        assert "detected" in vision_event.payload
        
        # Find SYSTEM_ACTION event
        action_events = [e for e in all_events if e.type == EventType.SYSTEM_ACTION]
        assert len(action_events) >= 1, "Should have at least one SYSTEM_ACTION event"
        
        action_event = action_events[0]
        assert action_event.source_module == "brain"
        assert "text" in action_event.payload
        
        # Verify event ordering: VISION_EVENT should come before SYSTEM_ACTION
        vision_index = all_events.index(vision_event)
        action_index = all_events.index(action_event)
        assert vision_index < action_index, "VISION_EVENT should come before SYSTEM_ACTION"
        
        # Verify Brain was called with correct context
        mock_openai_client.chat.completions.create.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_vision_pipeline_without_face(self):
        """
        Test vision pipeline when no face is detected.
        
        Workflow:
        1. Enable Eye and Brain modules
        2. Send a frame without a face
        3. Verify Eye publishes VISION_EVENT with detected=False
        4. Verify Brain still processes and responds
        """
        # Initialize components
        event_bus = EventBus(max_log_size=1000)
        module_registry = ModuleRegistry()
        eye_module = EyeModule(event_bus, module_registry)
        
        # Mock OpenAI client
        mock_openai_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"text": "The darkness is empty...", "speak": null}'
        mock_openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        brain_module = BrainModule(event_bus, module_registry, api_key="test_key")
        brain_module.client = mock_openai_client
        
        # Enable modules
        module_registry.toggle_module("eye")
        module_registry.toggle_module("brain")
        
        # Create test image without face
        test_frame = create_test_image_base64(with_face=False)
        
        # Process frame
        await eye_module.process_frame(test_frame)
        await asyncio.sleep(0.2)
        
        # Verify events
        all_events = event_bus.get_all_events()
        
        vision_events = [e for e in all_events if e.type == EventType.VISION_EVENT]
        assert len(vision_events) >= 1
        
        vision_event = vision_events[0]
        assert vision_event.payload["detected"] is False
        
        # Brain should still respond
        action_events = [e for e in all_events if e.type == EventType.SYSTEM_ACTION]
        assert len(action_events) >= 1, "Brain should respond even when no face detected"
    
    @pytest.mark.asyncio
    async def test_vision_pipeline_event_delivery_timing(self):
        """
        Test that events are delivered within required timing constraints.
        
        Property 6: Event delivery timing - events should be delivered within 100ms.
        """
        import time
        
        # Initialize components
        event_bus = EventBus(max_log_size=1000)
        module_registry = ModuleRegistry()
        
        # Track when events are received
        received_times = []
        
        async def timing_callback(event: Event):
            received_times.append(time.time())
        
        # Subscribe a test module
        event_bus.subscribe("test_module", timing_callback)
        
        # Publish an event and record time
        publish_time = time.time()
        event = Event.create(
            source_module="test",
            type="TEST_EVENT",
            payload={"test": "data"}
        )
        await event_bus.publish(event)
        
        # Wait a bit for delivery
        await asyncio.sleep(0.05)
        
        # Verify delivery timing
        assert len(received_times) == 1, "Event should be delivered once"
        delivery_time_ms = (received_times[0] - publish_time) * 1000
        assert delivery_time_ms < 100, f"Event delivery took {delivery_time_ms:.2f}ms, should be < 100ms"


class TestModuleEnableDisable:
    """Integration tests for module enable/disable affecting event processing."""
    
    @pytest.mark.asyncio
    async def test_disabled_eye_module_ignores_frames(self):
        """
        Test that disabled Eye module does not process frames.
        
        Property 3: Disabled modules ignore events.
        """
        # Initialize components
        event_bus = EventBus(max_log_size=1000)
        module_registry = ModuleRegistry()
        eye_module = EyeModule(event_bus, module_registry)
        
        # Eye module starts disabled
        assert not module_registry.is_enabled("eye")
        
        # Create test frame
        test_frame = create_test_image_base64(with_face=True)
        
        # Process frame while disabled
        await eye_module.process_frame(test_frame)
        await asyncio.sleep(0.1)
        
        # Verify no VISION_EVENT was published
        all_events = event_bus.get_all_events()
        vision_events = [e for e in all_events if e.type == EventType.VISION_EVENT]
        assert len(vision_events) == 0, "Disabled Eye module should not publish VISION_EVENT"
    
    @pytest.mark.asyncio
    async def test_disabled_brain_module_ignores_vision_events(self):
        """
        Test that disabled Brain module does not process VISION_EVENT.
        
        Property 3: Disabled modules ignore events.
        """
        # Initialize components
        event_bus = EventBus(max_log_size=1000)
        module_registry = ModuleRegistry()
        
        # Mock OpenAI client
        mock_openai_client = AsyncMock()
        brain_module = BrainModule(event_bus, module_registry, api_key="test_key")
        brain_module.client = mock_openai_client
        
        # Brain module starts disabled
        assert not module_registry.is_enabled("brain")
        
        # Publish a VISION_EVENT
        vision_event = Event.create(
            source_module="eye",
            type=EventType.VISION_EVENT,
            payload={"detected": True, "object_type": "face", "confidence": 0.9}
        )
        await event_bus.publish(vision_event)
        await asyncio.sleep(0.2)
        
        # Verify Brain did not process the event
        all_events = event_bus.get_all_events()
        action_events = [e for e in all_events if e.type == EventType.SYSTEM_ACTION]
        assert len(action_events) == 0, "Disabled Brain module should not publish SYSTEM_ACTION"
        
        # Verify OpenAI was not called
        mock_openai_client.chat.completions.create.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_enabling_module_mid_workflow(self):
        """
        Test enabling a module during workflow execution.
        
        Workflow:
        1. Start with Eye enabled, Brain disabled
        2. Process a frame (Eye publishes event, Brain ignores)
        3. Enable Brain
        4. Process another frame (both modules process)
        """
        # Initialize components
        event_bus = EventBus(max_log_size=1000)
        module_registry = ModuleRegistry()
        eye_module = EyeModule(event_bus, module_registry)
        
        # Mock OpenAI client
        mock_openai_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"text": "I see you now!", "speak": "Hello!"}'
        mock_openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        brain_module = BrainModule(event_bus, module_registry, api_key="test_key")
        brain_module.client = mock_openai_client
        
        # Enable only Eye
        module_registry.toggle_module("eye")
        assert module_registry.is_enabled("eye")
        assert not module_registry.is_enabled("brain")
        
        # Process first frame
        test_frame = create_test_image_base64(with_face=True)
        await eye_module.process_frame(test_frame)
        await asyncio.sleep(0.1)
        
        # Should have VISION_EVENT but no SYSTEM_ACTION
        events_before = event_bus.get_all_events()
        vision_events_before = [e for e in events_before if e.type == EventType.VISION_EVENT]
        action_events_before = [e for e in events_before if e.type == EventType.SYSTEM_ACTION]
        
        assert len(vision_events_before) >= 1, "Eye should publish VISION_EVENT"
        assert len(action_events_before) == 0, "Brain should not publish SYSTEM_ACTION when disabled"
        
        # Enable Brain
        module_registry.toggle_module("brain")
        assert module_registry.is_enabled("brain")
        
        # Process second frame
        await eye_module.process_frame(test_frame)
        await asyncio.sleep(0.2)
        
        # Should now have SYSTEM_ACTION
        events_after = event_bus.get_all_events()
        action_events_after = [e for e in events_after if e.type == EventType.SYSTEM_ACTION]
        
        assert len(action_events_after) >= 1, "Brain should publish SYSTEM_ACTION after being enabled"
    
    @pytest.mark.asyncio
    async def test_disabling_module_mid_workflow(self):
        """
        Test disabling a module during workflow execution.
        
        Workflow:
        1. Start with both modules enabled
        2. Process a frame (both process)
        3. Disable Brain
        4. Process another frame (only Eye processes)
        """
        # Initialize components
        event_bus = EventBus(max_log_size=1000)
        module_registry = ModuleRegistry()
        eye_module = EyeModule(event_bus, module_registry)
        
        # Mock OpenAI client
        mock_openai_client = AsyncMock()
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = '{"text": "I see you!", "speak": "Hello!"}'
        mock_openai_client.chat.completions.create = AsyncMock(return_value=mock_response)
        
        brain_module = BrainModule(event_bus, module_registry, api_key="test_key")
        brain_module.client = mock_openai_client
        
        # Enable both modules
        module_registry.toggle_module("eye")
        module_registry.toggle_module("brain")
        
        # Process first frame
        test_frame = create_test_image_base64(with_face=True)
        await eye_module.process_frame(test_frame)
        await asyncio.sleep(0.2)
        
        # Count initial events
        events_before = event_bus.get_all_events()
        action_events_before = [e for e in events_before if e.type == EventType.SYSTEM_ACTION]
        initial_action_count = len(action_events_before)
        
        assert initial_action_count >= 1, "Brain should have published SYSTEM_ACTION"
        
        # Disable Brain
        module_registry.toggle_module("brain")
        assert not module_registry.is_enabled("brain")
        
        # Process second frame
        await eye_module.process_frame(test_frame)
        await asyncio.sleep(0.2)
        
        # Count events after disabling
        events_after = event_bus.get_all_events()
        action_events_after = [e for e in events_after if e.type == EventType.SYSTEM_ACTION]
        final_action_count = len(action_events_after)
        
        # Should not have new SYSTEM_ACTION events
        assert final_action_count == initial_action_count, \
            "Brain should not publish new SYSTEM_ACTION events when disabled"


class TestErrorRecovery:
    """Integration tests for error recovery scenarios."""
    
    @pytest.mark.asyncio
    async def test_eye_module_recovers_from_invalid_frame(self):
        """
        Test that Eye module handles invalid frames gracefully and continues operating.
        
        Property 32: System resilience to module failures.
        """
        # Initialize components
        event_bus = EventBus(max_log_size=1000)
        module_registry = ModuleRegistry()
        eye_module = EyeModule(event_bus, module_registry)
        
        # Enable Eye
        module_registry.toggle_module("eye")
        
        # Send invalid frame
        invalid_frame = "not_valid_base64_data"
        await eye_module.process_frame(invalid_frame)
        await asyncio.sleep(0.1)
        
        # Should have published ERROR event
        all_events = event_bus.get_all_events()
        error_events = [e for e in all_events if e.type == EventType.ACTION_ERROR]
        assert len(error_events) >= 1, "Eye should publish ERROR event for invalid frame"
        
        error_event = error_events[0]
        assert error_event.source_module == "eye"
        assert error_event.payload["recoverable"] is True
        
        # Module should still be enabled and functional
        assert module_registry.is_enabled("eye")
        
        # Send valid frame to verify recovery
        valid_frame = create_test_image_base64(with_face=False)
        await eye_module.process_frame(valid_frame)
        await asyncio.sleep(0.1)
        
        # Should have published VISION_EVENT
        vision_events = [e for e in all_events if e.type == EventType.VISION_EVENT]
        assert len(vision_events) >= 1, "Eye should recover and process valid frames"
    
    @pytest.mark.asyncio
    async def test_brain_module_recovers_from_api_failure(self):
        """
        Test that Brain module handles API failures gracefully.
        
        Property 32: System resilience to module failures.
        """
        # Initialize components
        event_bus = EventBus(max_log_size=1000)
        module_registry = ModuleRegistry()
        
        # Mock OpenAI client to raise exception
        mock_openai_client = AsyncMock()
        mock_openai_client.chat.completions.create = AsyncMock(
            side_effect=Exception("API connection failed")
        )
        
        brain_module = BrainModule(event_bus, module_registry, api_key="test_key")
        brain_module.client = mock_openai_client
        
        # Enable Brain
        module_registry.toggle_module("brain")
        
        # Publish VISION_EVENT
        vision_event = Event.create(
            source_module="eye",
            type=EventType.VISION_EVENT,
            payload={"detected": True, "object_type": "face", "confidence": 0.9}
        )
        await event_bus.publish(vision_event)
        await asyncio.sleep(0.2)
        
        # Should have published ERROR event
        all_events = event_bus.get_all_events()
        error_events = [e for e in all_events if e.type == EventType.ACTION_ERROR]
        assert len(error_events) >= 1, "Brain should publish ERROR event on API failure"
        
        error_event = error_events[0]
        assert error_event.source_module == "brain"
        assert "API" in error_event.payload["message"] or "failed" in error_event.payload["message"]
        
        # Should also have fallback SYSTEM_ACTION
        action_events = [e for e in all_events if e.type == EventType.SYSTEM_ACTION]
        assert len(action_events) >= 1, "Brain should publish fallback SYSTEM_ACTION"
        
        # Module should still be enabled
        assert module_registry.is_enabled("brain")
    
    @pytest.mark.asyncio
    async def test_system_continues_when_one_module_fails(self):
        """
        Test that the system continues operating when one module fails.
        
        Property 32: System resilience to module failures.
        """
        # Initialize components
        event_bus = EventBus(max_log_size=1000)
        module_registry = ModuleRegistry()
        eye_module = EyeModule(event_bus, module_registry)
        
        # Mock OpenAI client to always fail
        mock_openai_client = AsyncMock()
        mock_openai_client.chat.completions.create = AsyncMock(
            side_effect=Exception("Persistent API failure")
        )
        
        brain_module = BrainModule(event_bus, module_registry, api_key="test_key")
        brain_module.client = mock_openai_client
        
        # Enable both modules
        module_registry.toggle_module("eye")
        module_registry.toggle_module("brain")
        
        # Process multiple frames
        for i in range(3):
            test_frame = create_test_image_base64(with_face=(i % 2 == 0))
            await eye_module.process_frame(test_frame)
            await asyncio.sleep(0.2)
        
        # Verify Eye continued to work despite Brain failures
        all_events = event_bus.get_all_events()
        vision_events = [e for e in all_events if e.type == EventType.VISION_EVENT]
        
        assert len(vision_events) >= 3, "Eye should continue processing despite Brain failures"
        
        # Verify Brain published error events
        error_events = [e for e in all_events if e.type == EventType.ACTION_ERROR and e.source_module == "brain"]
        assert len(error_events) >= 3, "Brain should publish error events for each failure"
        
        # Both modules should still be enabled
        assert module_registry.is_enabled("eye")
        assert module_registry.is_enabled("brain")
    
    @pytest.mark.asyncio
    async def test_event_bus_resilience_to_subscriber_failure(self):
        """
        Test that event bus continues delivering to other subscribers when one fails.
        
        Property 32: System resilience to module failures.
        """
        # Initialize event bus
        event_bus = EventBus(max_log_size=1000)
        
        # Track successful deliveries
        successful_deliveries = []
        
        async def failing_callback(event: Event):
            raise Exception("Subscriber failure")
        
        async def successful_callback(event: Event):
            successful_deliveries.append(event.id)
        
        # Subscribe both callbacks
        event_bus.subscribe("failing_module", failing_callback)
        event_bus.subscribe("working_module", successful_callback)
        
        # Publish an event
        event = Event.create(
            source_module="test",
            type="TEST_EVENT",
            payload={"test": "data"}
        )
        await event_bus.publish(event)
        await asyncio.sleep(0.1)
        
        # Verify successful callback received the event
        assert len(successful_deliveries) == 1, "Working subscriber should receive event despite other subscriber failing"
        assert successful_deliveries[0] == event.id
        
        # Event should still be in log
        all_events = event_bus.get_all_events()
        assert len(all_events) == 1
        assert all_events[0].id == event.id
