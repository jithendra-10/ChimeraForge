"""
Unit tests for Eye Module.
"""

import asyncio
import base64
import pytest
import cv2
import numpy as np
from backend.core.event_bus import EventBus, EventType
from backend.core.module_registry import ModuleRegistry
from backend.modules.eye import EyeModule, FaceDetection, BoundingBox


@pytest.fixture
def event_bus():
    """Create an event bus for testing."""
    return EventBus()


@pytest.fixture
def registry():
    """Create a module registry for testing."""
    return ModuleRegistry()


@pytest.fixture
def eye_module(event_bus, registry):
    """Create an Eye module for testing."""
    return EyeModule(event_bus, registry)


def create_test_image(width=640, height=480, with_face=False):
    """
    Create a test image as base64 string.
    
    Args:
        width: Image width
        height: Image height
        with_face: Whether to draw a simple face-like pattern
        
    Returns:
        Base64-encoded image string
    """
    # Create a blank image
    image = np.zeros((height, width, 3), dtype=np.uint8)
    
    if with_face:
        # Draw a simple face-like pattern (circle for head, rectangles for eyes)
        center_x, center_y = width // 2, height // 2
        cv2.circle(image, (center_x, center_y), 100, (255, 255, 255), -1)
        cv2.rectangle(image, (center_x - 40, center_y - 20), (center_x - 20, center_y), (0, 0, 0), -1)
        cv2.rectangle(image, (center_x + 20, center_y - 20), (center_x + 40, center_y), (0, 0, 0), -1)
    
    # Encode to JPEG
    _, buffer = cv2.imencode('.jpg', image)
    
    # Convert to base64
    image_base64 = base64.b64encode(buffer).decode('utf-8')
    
    return image_base64


@pytest.mark.asyncio
async def test_eye_module_initialization(eye_module):
    """Test that Eye module initializes correctly."""
    assert eye_module.module_id == "eye"
    assert eye_module.event_bus is not None
    assert eye_module.registry is not None
    assert eye_module.face_cascade is not None


@pytest.mark.asyncio
async def test_eye_module_processes_frame_when_enabled(eye_module, registry, event_bus):
    """Test that Eye module processes frames when enabled."""
    # Enable the Eye module
    registry.toggle_module("eye")
    assert registry.is_enabled("eye")
    
    # Create a test image
    test_image = create_test_image()
    
    # Process the frame
    await eye_module.process_frame(test_image)
    
    # Check that a VISION_EVENT was published
    events = event_bus.get_all_events()
    assert len(events) == 1
    assert events[0].type == EventType.VISION_EVENT
    assert events[0].source_module == "eye"
    assert "detected" in events[0].payload


@pytest.mark.asyncio
async def test_eye_module_ignores_frame_when_disabled(eye_module, registry, event_bus):
    """Test that Eye module does not process frames when disabled."""
    # Ensure Eye module is disabled
    assert not registry.is_enabled("eye")
    
    # Create a test image
    test_image = create_test_image()
    
    # Process the frame
    await eye_module.process_frame(test_image)
    
    # Check that no events were published
    events = event_bus.get_all_events()
    assert len(events) == 0


@pytest.mark.asyncio
async def test_eye_module_publishes_vision_event_structure(eye_module, registry, event_bus):
    """Test that VISION_EVENT has correct structure."""
    # Enable the Eye module
    registry.toggle_module("eye")
    
    # Create a test image
    test_image = create_test_image()
    
    # Process the frame
    await eye_module.process_frame(test_image)
    
    # Check event structure
    events = event_bus.get_all_events()
    assert len(events) == 1
    
    event = events[0]
    assert event.type == EventType.VISION_EVENT
    assert event.source_module == "eye"
    assert "detected" in event.payload
    assert isinstance(event.payload["detected"], bool)
    assert "confidence" in event.payload
    assert isinstance(event.payload["confidence"], (int, float))


@pytest.mark.asyncio
async def test_detect_face_returns_face_detection(eye_module):
    """Test that detect_face returns FaceDetection object."""
    # Create a test image
    image = np.zeros((480, 640, 3), dtype=np.uint8)
    
    # Detect face
    result = eye_module.detect_face(image)
    
    # Check result type
    assert isinstance(result, FaceDetection)
    assert isinstance(result.detected, bool)
    assert isinstance(result.confidence, float)


@pytest.mark.asyncio
async def test_eye_module_handles_invalid_base64(eye_module, registry, event_bus):
    """Test that Eye module handles invalid base64 gracefully."""
    # Enable the Eye module
    registry.toggle_module("eye")
    
    # Process invalid base64
    await eye_module.process_frame("invalid_base64_data")
    
    # Should publish an ERROR event and a VISION_EVENT indicating no detection (graceful degradation)
    events = event_bus.get_all_events()
    assert len(events) == 2
    
    # First event should be an error event
    error_event = events[0]
    assert error_event.type == EventType.ACTION_ERROR
    assert error_event.payload["error_type"] == "validation"
    assert "Invalid base64" in error_event.payload["message"]
    
    # Second event should be a vision event with no detection
    vision_event = events[1]
    assert vision_event.type == EventType.VISION_EVENT
    assert vision_event.payload["detected"] == False


@pytest.mark.asyncio
async def test_eye_module_handles_data_url_prefix(eye_module, registry, event_bus):
    """Test that Eye module handles data URL prefix correctly."""
    # Enable the Eye module
    registry.toggle_module("eye")
    
    # Create a test image with data URL prefix
    test_image = create_test_image()
    data_url = f"data:image/jpeg;base64,{test_image}"
    
    # Process the frame
    await eye_module.process_frame(data_url)
    
    # Check that event was published
    events = event_bus.get_all_events()
    assert len(events) == 1
    assert events[0].type == EventType.VISION_EVENT
