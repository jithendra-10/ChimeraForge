"""
Unit tests for the Brain Module.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from backend.modules.brain import BrainModule, BrainResponse
from backend.core.event_bus import Event, EventBus, EventType
from backend.core.module_registry import ModuleRegistry


@pytest.fixture
def event_bus():
    """Create an event bus for testing."""
    return EventBus()


@pytest.fixture
def registry():
    """Create a module registry for testing."""
    reg = ModuleRegistry()
    # Enable the brain module for testing
    reg.toggle_module("brain")
    return reg


@pytest.fixture
def brain_module(event_bus, registry):
    """Create a Brain module for testing."""
    # Mock the AsyncOpenAI client to avoid initialization issues
    with patch('backend.modules.brain.AsyncOpenAI') as mock_openai:
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        brain = BrainModule(event_bus, registry, api_key="test-key")
        brain.client = mock_client
        yield brain


@pytest.mark.asyncio
async def test_brain_module_initialization(event_bus, registry):
    """Test that Brain module initializes correctly."""
    with patch('backend.modules.brain.AsyncOpenAI') as mock_openai:
        mock_client = MagicMock()
        mock_openai.return_value = mock_client
        brain = BrainModule(event_bus, registry, api_key="test-key")
        assert brain.module_id == "brain"
        assert brain.event_bus == event_bus
        assert brain.registry == registry
        assert brain.client is not None


@pytest.mark.asyncio
async def test_brain_module_requires_api_key(event_bus, registry):
    """Test that Brain module requires an API key."""
    with patch.dict('os.environ', {}, clear=True):
        with pytest.raises(ValueError, match="OpenAI API key not provided"):
            BrainModule(event_bus, registry)


@pytest.mark.asyncio
async def test_brain_processes_vision_event_when_enabled(brain_module):
    """Test that Brain processes VISION_EVENT when enabled."""
    # Mock the generate_response method
    brain_module.generate_response = AsyncMock(return_value=BrainResponse(
        text="Test response",
        speak="Hello there"
    ))
    
    # Create a vision event
    vision_event = Event.create(
        source_module="eye",
        type=EventType.VISION_EVENT,
        payload={"detected": True, "object_type": "face", "confidence": 0.9}
    )
    
    # Process the event
    await brain_module.on_event(vision_event)
    
    # Verify generate_response was called
    brain_module.generate_response.assert_called_once_with(vision_event)


@pytest.mark.asyncio
async def test_brain_ignores_events_when_disabled(brain_module):
    """Test that Brain ignores events when disabled."""
    # Disable the brain module
    brain_module.registry.toggle_module("brain")
    
    # Mock the generate_response method
    brain_module.generate_response = AsyncMock()
    
    # Create a vision event
    vision_event = Event.create(
        source_module="eye",
        type=EventType.VISION_EVENT,
        payload={"detected": True}
    )
    
    # Process the event
    await brain_module.on_event(vision_event)
    
    # Verify generate_response was NOT called
    brain_module.generate_response.assert_not_called()


@pytest.mark.asyncio
async def test_brain_ignores_non_vision_events(brain_module):
    """Test that Brain ignores non-VISION_EVENT events."""
    # Mock the generate_response method
    brain_module.generate_response = AsyncMock()
    
    # Create a non-vision event
    other_event = Event.create(
        source_module="mouth",
        type=EventType.SPEECH_COMPLETE,
        payload={}
    )
    
    # Process the event
    await brain_module.on_event(other_event)
    
    # Verify generate_response was NOT called
    brain_module.generate_response.assert_not_called()


@pytest.mark.asyncio
async def test_brain_publishes_system_action(brain_module, event_bus):
    """Test that Brain publishes SYSTEM_ACTION events."""
    # Track published events
    published_events = []
    
    async def capture_event(event):
        published_events.append(event)
    
    event_bus.subscribe("test", capture_event)
    
    # Create a response
    response = BrainResponse(
        text="Test response",
        speak="Hello",
        open_url="https://example.com"
    )
    
    # Publish the action
    await brain_module._publish_action(response)
    
    # Verify event was published
    assert len(published_events) == 1
    event = published_events[0]
    assert event.type == EventType.SYSTEM_ACTION
    assert event.source_module == "brain"
    assert event.payload["text"] == "Test response"
    assert event.payload["speak"] == "Hello"
    assert event.payload["open_url"] == "https://example.com"


@pytest.mark.asyncio
async def test_brain_handles_api_errors_gracefully(brain_module, event_bus):
    """Test that Brain handles API errors gracefully."""
    # Track published events
    published_events = []
    
    async def capture_event(event):
        published_events.append(event)
    
    event_bus.subscribe("test", capture_event)
    
    # Mock the OpenAI client to raise an error
    brain_module.client.chat.completions.create = AsyncMock(side_effect=Exception("API Error"))
    
    # Create a vision event
    vision_event = Event.create(
        source_module="eye",
        type=EventType.VISION_EVENT,
        payload={"detected": True, "object_type": "face"}
    )
    
    # Process the event
    await brain_module.on_event(vision_event)
    
    # Should publish an ERROR event and a SYSTEM_ACTION with fallback text (graceful degradation)
    error_events = [e for e in published_events if e.type == EventType.ACTION_ERROR]
    action_events = [e for e in published_events if e.type == EventType.SYSTEM_ACTION]
    
    # Should have published an error event
    assert len(error_events) == 1
    assert error_events[0].payload["error_type"] == "external_service"
    assert "OpenAI API call failed" in error_events[0].payload["message"]
    
    # Should also publish a SYSTEM_ACTION with fallback text for graceful degradation
    assert len(action_events) == 1
    assert "difficulties" in action_events[0].payload["text"].lower() or "clouded" in action_events[0].payload["text"].lower()
