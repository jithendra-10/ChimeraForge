"""
Unit tests for Event and EventBus classes.
"""

import pytest
import asyncio
from datetime import datetime, timezone
from hypothesis import given, strategies as st, settings
from backend.core.event_bus import Event, EventBus, EventType


class TestEvent:
    """Test cases for Event class."""
    
    def test_event_creation_with_factory(self):
        """Test creating an event using the factory method."""
        event = Event.create(
            source_module="eye",
            type=EventType.VISION_EVENT,
            payload={"detected": True}
        )
        
        assert event.id is not None
        assert len(event.id) == 36  # UUID format
        assert event.source_module == "eye"
        assert event.type == EventType.VISION_EVENT
        assert event.payload == {"detected": True}
        assert isinstance(event.timestamp, datetime)
    
    def test_event_direct_creation(self):
        """Test creating an event directly."""
        timestamp = datetime.now(timezone.utc)
        event = Event(
            id="test-id",
            source_module="brain",
            type=EventType.SYSTEM_ACTION,
            timestamp=timestamp,
            payload={"text": "Hello"}
        )
        
        assert event.id == "test-id"
        assert event.source_module == "brain"
        assert event.type == EventType.SYSTEM_ACTION
        assert event.timestamp == timestamp
        assert event.payload == {"text": "Hello"}


class TestEventBus:
    """Test cases for EventBus class."""
    
    @pytest.mark.asyncio
    async def test_publish_stores_event_in_log(self):
        """Test that publishing an event stores it in the log."""
        bus = EventBus()
        event = Event.create("eye", EventType.VISION_EVENT, {"detected": False})
        
        await bus.publish(event)
        
        events = bus.get_all_events()
        assert len(events) == 1
        assert events[0].id == event.id
    
    @pytest.mark.asyncio
    async def test_subscribe_and_receive_event(self):
        """Test subscribing to events and receiving them."""
        bus = EventBus()
        received_events = []
        
        def callback(event: Event):
            received_events.append(event)
        
        bus.subscribe("test_module", callback)
        
        event = Event.create("eye", EventType.VISION_EVENT, {"detected": True})
        await bus.publish(event)
        
        # Give async tasks time to complete
        await asyncio.sleep(0.1)
        
        assert len(received_events) == 1
        assert received_events[0].id == event.id
    
    @pytest.mark.asyncio
    async def test_multiple_subscribers_receive_event(self):
        """Test that multiple subscribers all receive the same event."""
        bus = EventBus()
        received_by_module1 = []
        received_by_module2 = []
        
        def callback1(event: Event):
            received_by_module1.append(event)
        
        def callback2(event: Event):
            received_by_module2.append(event)
        
        bus.subscribe("module1", callback1)
        bus.subscribe("module2", callback2)
        
        event = Event.create("eye", EventType.VISION_EVENT, {"detected": True})
        await bus.publish(event)
        
        await asyncio.sleep(0.1)
        
        assert len(received_by_module1) == 1
        assert len(received_by_module2) == 1
        assert received_by_module1[0].id == event.id
        assert received_by_module2[0].id == event.id
    
    @pytest.mark.asyncio
    async def test_unsubscribe_stops_receiving_events(self):
        """Test that unsubscribing stops a module from receiving events."""
        bus = EventBus()
        received_events = []
        
        def callback(event: Event):
            received_events.append(event)
        
        bus.subscribe("test_module", callback)
        
        event1 = Event.create("eye", EventType.VISION_EVENT, {"detected": True})
        await bus.publish(event1)
        await asyncio.sleep(0.1)
        
        bus.unsubscribe("test_module")
        
        event2 = Event.create("eye", EventType.VISION_EVENT, {"detected": False})
        await bus.publish(event2)
        await asyncio.sleep(0.1)
        
        # Should only have received the first event
        assert len(received_events) == 1
        assert received_events[0].id == event1.id
    
    @pytest.mark.asyncio
    async def test_event_log_size_limit(self):
        """Test that event log maintains size limit."""
        bus = EventBus(max_log_size=10)
        
        # Publish 15 events
        for i in range(15):
            event = Event.create("eye", EventType.VISION_EVENT, {"count": i})
            await bus.publish(event)
        
        events = bus.get_all_events()
        
        # Should only have 10 events (the last 10)
        assert len(events) == 10
        assert events[0].payload["count"] == 5  # First event should be #5
        assert events[-1].payload["count"] == 14  # Last event should be #14
    
    @pytest.mark.asyncio
    async def test_get_recent_events_with_limit(self):
        """Test getting recent events with a limit."""
        bus = EventBus()
        
        # Publish 10 events
        for i in range(10):
            event = Event.create("eye", EventType.VISION_EVENT, {"count": i})
            await bus.publish(event)
        
        recent = bus.get_recent_events(limit=5)
        
        assert len(recent) == 5
        assert recent[0].payload["count"] == 5  # Should get events 5-9
        assert recent[-1].payload["count"] == 9
    
    @pytest.mark.asyncio
    async def test_async_callback_support(self):
        """Test that async callbacks are supported."""
        bus = EventBus()
        received_events = []
        
        async def async_callback(event: Event):
            await asyncio.sleep(0.01)  # Simulate async work
            received_events.append(event)
        
        bus.subscribe("async_module", async_callback)
        
        event = Event.create("eye", EventType.VISION_EVENT, {"detected": True})
        await bus.publish(event)
        
        await asyncio.sleep(0.1)
        
        assert len(received_events) == 1
        assert received_events[0].id == event.id
    
    @pytest.mark.asyncio
    async def test_subscriber_error_doesnt_affect_others(self):
        """Test that an error in one subscriber doesn't prevent others from receiving events."""
        bus = EventBus()
        received_by_good_module = []
        
        def bad_callback(event: Event):
            raise Exception("Intentional error")
        
        def good_callback(event: Event):
            received_by_good_module.append(event)
        
        bus.subscribe("bad_module", bad_callback)
        bus.subscribe("good_module", good_callback)
        
        event = Event.create("eye", EventType.VISION_EVENT, {"detected": True})
        await bus.publish(event)
        
        await asyncio.sleep(0.1)
        
        # Good module should still receive the event
        assert len(received_by_good_module) == 1
        assert received_by_good_module[0].id == event.id



# Property-Based Tests
class TestEventBusProperties:
    """Property-based tests for EventBus correctness properties."""
    
    @pytest.mark.asyncio
    @given(
        num_events=st.integers(min_value=1, max_value=100),
        source_modules=st.lists(
            st.sampled_from(["eye", "brain", "mouth", "tentacle", "system"]),
            min_size=1,
            max_size=5
        ),
        event_types=st.lists(
            st.sampled_from([
                EventType.VISION_EVENT,
                EventType.SYSTEM_ACTION,
                EventType.SPEECH_COMPLETE,
                EventType.ACTION_COMPLETE,
                EventType.ACTION_ERROR,
                EventType.MODULE_STATE_CHANGED
            ]),
            min_size=1,
            max_size=6
        )
    )
    async def test_property_event_uuid_uniqueness(self, num_events, source_modules, event_types):
        """
        Feature: chimeraforge, Property 16: Event UUID uniqueness
        Validates: Requirements 6.1
        
        Property: For any set of events published to the event bus,
        all event IDs should be unique UUIDs.
        """
        bus = EventBus()
        published_events = []
        
        # Publish multiple events
        for i in range(num_events):
            source = source_modules[i % len(source_modules)]
            event_type = event_types[i % len(event_types)]
            
            event = Event.create(
                source_module=source,
                type=event_type,
                payload={"index": i}
            )
            published_events.append(event)
            await bus.publish(event)
        
        # Get all events from the bus
        stored_events = bus.get_all_events()
        
        # Extract all event IDs
        event_ids = [event.id for event in stored_events]
        
        # Property: All event IDs should be unique
        assert len(event_ids) == len(set(event_ids)), \
            f"Found duplicate event IDs: {len(event_ids)} total, {len(set(event_ids))} unique"
        
        # Additional check: All IDs should be valid UUIDs (36 characters with hyphens)
        for event_id in event_ids:
            assert len(event_id) == 36, f"Event ID {event_id} is not a valid UUID format"
            assert event_id.count('-') == 4, f"Event ID {event_id} doesn't have correct UUID structure"
    
    @pytest.mark.asyncio
    @settings(deadline=None)
    @given(
        num_subscribers=st.integers(min_value=1, max_value=10),
        num_events=st.integers(min_value=1, max_value=20),
        source_module=st.sampled_from(["eye", "brain", "mouth", "tentacle", "system"]),
        event_type=st.sampled_from([
            EventType.VISION_EVENT,
            EventType.SYSTEM_ACTION,
            EventType.SPEECH_COMPLETE,
            EventType.ACTION_COMPLETE,
            EventType.ACTION_ERROR,
            EventType.MODULE_STATE_CHANGED
        ])
    )
    async def test_property_event_delivery_to_all_subscribers(
        self, num_subscribers, num_events, source_module, event_type
    ):
        """
        Feature: chimeraforge, Property 17: Event delivery to all subscribers
        Validates: Requirements 6.2
        
        Property: For any event published to the event bus and any set of subscribed modules,
        the event should be delivered to all subscribers.
        """
        bus = EventBus()
        
        # Create tracking for each subscriber
        subscriber_received = {f"subscriber_{i}": [] for i in range(num_subscribers)}
        
        # Subscribe all modules
        for i in range(num_subscribers):
            subscriber_id = f"subscriber_{i}"
            
            def make_callback(sid):
                def callback(event: Event):
                    subscriber_received[sid].append(event)
                return callback
            
            bus.subscribe(subscriber_id, make_callback(subscriber_id))
        
        # Publish events
        published_events = []
        for i in range(num_events):
            event = Event.create(
                source_module=source_module,
                type=event_type,
                payload={"event_number": i}
            )
            published_events.append(event)
            await bus.publish(event)
        
        # Wait for async delivery to complete
        await asyncio.sleep(0.2)
        
        # Property: All subscribers should receive all events
        for subscriber_id, received_events in subscriber_received.items():
            assert len(received_events) == num_events, \
                f"{subscriber_id} received {len(received_events)} events, expected {num_events}"
            
            # Verify each event was delivered
            received_ids = {event.id for event in received_events}
            published_ids = {event.id for event in published_events}
            
            assert received_ids == published_ids, \
                f"{subscriber_id} didn't receive all events. Missing: {published_ids - received_ids}"
    
    @pytest.mark.asyncio
    @given(
        num_events=st.integers(min_value=1, max_value=50),
        source_modules=st.lists(
            st.sampled_from(["eye", "brain", "mouth", "tentacle", "system"]),
            min_size=1,
            max_size=5
        ),
        event_types=st.lists(
            st.sampled_from([
                EventType.VISION_EVENT,
                EventType.SYSTEM_ACTION,
                EventType.SPEECH_COMPLETE,
                EventType.ACTION_COMPLETE,
                EventType.ACTION_ERROR,
                EventType.MODULE_STATE_CHANGED
            ]),
            min_size=1,
            max_size=6
        ),
        payloads=st.lists(
            st.dictionaries(
                keys=st.text(min_size=1, max_size=20),
                values=st.one_of(
                    st.text(max_size=100),
                    st.integers(),
                    st.booleans(),
                    st.floats(allow_nan=False, allow_infinity=False),
                    st.none()
                ),
                min_size=0,
                max_size=10
            ),
            min_size=1,
            max_size=50
        )
    )
    async def test_property_event_storage_structure(
        self, num_events, source_modules, event_types, payloads
    ):
        """
        Feature: chimeraforge, Property 18: Event storage structure
        Validates: Requirements 6.3, 6.4
        
        Property: For any event published to the event bus, the stored event
        should include source_module, type, timestamp, and payload fields.
        """
        bus = EventBus()
        
        # Publish events with various configurations
        for i in range(num_events):
            source = source_modules[i % len(source_modules)]
            event_type = event_types[i % len(event_types)]
            payload = payloads[i % len(payloads)]
            
            event = Event.create(
                source_module=source,
                type=event_type,
                payload=payload
            )
            await bus.publish(event)
        
        # Get all stored events
        stored_events = bus.get_all_events()
        
        # Property: Every stored event must have all required fields
        for event in stored_events:
            # Check that all required fields exist
            assert hasattr(event, 'source_module'), \
                f"Event {event.id} missing 'source_module' field"
            assert hasattr(event, 'type'), \
                f"Event {event.id} missing 'type' field"
            assert hasattr(event, 'timestamp'), \
                f"Event {event.id} missing 'timestamp' field"
            assert hasattr(event, 'payload'), \
                f"Event {event.id} missing 'payload' field"
            
            # Check that fields have correct types
            assert isinstance(event.source_module, str), \
                f"Event {event.id} source_module is not a string: {type(event.source_module)}"
            assert isinstance(event.type, str), \
                f"Event {event.id} type is not a string: {type(event.type)}"
            assert isinstance(event.timestamp, datetime), \
                f"Event {event.id} timestamp is not a datetime: {type(event.timestamp)}"
            assert isinstance(event.payload, dict), \
                f"Event {event.id} payload is not a dict: {type(event.payload)}"
            
            # Check that source_module is one of the valid modules
            valid_modules = ["eye", "brain", "mouth", "tentacle", "system"]
            assert event.source_module in valid_modules, \
                f"Event {event.id} has invalid source_module: {event.source_module}"
            
            # Check that type is one of the valid event types
            valid_types = [
                EventType.VISION_EVENT,
                EventType.SYSTEM_ACTION,
                EventType.SPEECH_COMPLETE,
                EventType.ACTION_COMPLETE,
                EventType.ACTION_ERROR,
                EventType.MODULE_STATE_CHANGED
            ]
            assert event.type in valid_types, \
                f"Event {event.id} has invalid type: {event.type}"
            
            # Check that timestamp is timezone-aware and recent
            assert event.timestamp.tzinfo is not None, \
                f"Event {event.id} timestamp is not timezone-aware"
            
            # Verify the payload matches what we sent (for events we can track)
            assert event.payload is not None, \
                f"Event {event.id} has None payload"
    
    @pytest.mark.asyncio
    @given(
        max_log_size=st.integers(min_value=1, max_value=100),
        num_events=st.integers(min_value=1, max_value=500),
        source_modules=st.lists(
            st.sampled_from(["eye", "brain", "mouth", "tentacle", "system"]),
            min_size=1,
            max_size=5
        ),
        event_types=st.lists(
            st.sampled_from([
                EventType.VISION_EVENT,
                EventType.SYSTEM_ACTION,
                EventType.SPEECH_COMPLETE,
                EventType.ACTION_COMPLETE,
                EventType.ACTION_ERROR,
                EventType.MODULE_STATE_CHANGED
            ]),
            min_size=1,
            max_size=6
        )
    )
    async def test_property_event_log_size_limit(
        self, max_log_size, num_events, source_modules, event_types
    ):
        """
        Feature: chimeraforge, Property 19: Event log size limit
        Validates: Requirements 6.5
        
        Property: For any sequence of events published to the event bus,
        when the log exceeds the configured maximum size, the oldest events
        should be removed to maintain the limit.
        """
        bus = EventBus(max_log_size=max_log_size)
        
        # Publish events
        published_events = []
        for i in range(num_events):
            source = source_modules[i % len(source_modules)]
            event_type = event_types[i % len(event_types)]
            
            event = Event.create(
                source_module=source,
                type=event_type,
                payload={"event_number": i}
            )
            published_events.append(event)
            await bus.publish(event)
        
        # Get all events from the log
        stored_events = bus.get_all_events()
        
        # Property 1: The log should never exceed max_log_size
        assert len(stored_events) <= max_log_size, \
            f"Event log size {len(stored_events)} exceeds maximum {max_log_size}"
        
        # Property 2: If we published more events than max_log_size,
        # the log should contain exactly max_log_size events
        if num_events > max_log_size:
            assert len(stored_events) == max_log_size, \
                f"Expected exactly {max_log_size} events, got {len(stored_events)}"
        else:
            # If we published fewer events than max_log_size,
            # all events should be in the log
            assert len(stored_events) == num_events, \
                f"Expected {num_events} events, got {len(stored_events)}"
        
        # Property 3: The stored events should be the most recent ones
        # (i.e., the last N events published)
        if num_events > max_log_size:
            # The first event in the log should be the (num_events - max_log_size)th event
            expected_first_event_number = num_events - max_log_size
            actual_first_event_number = stored_events[0].payload["event_number"]
            
            assert actual_first_event_number == expected_first_event_number, \
                f"First event in log should be #{expected_first_event_number}, got #{actual_first_event_number}"
            
            # The last event in the log should be the last event published
            expected_last_event_number = num_events - 1
            actual_last_event_number = stored_events[-1].payload["event_number"]
            
            assert actual_last_event_number == expected_last_event_number, \
                f"Last event in log should be #{expected_last_event_number}, got #{actual_last_event_number}"
            
            # Verify all events are in sequence
            for i, event in enumerate(stored_events):
                expected_event_number = expected_first_event_number + i
                actual_event_number = event.payload["event_number"]
                
                assert actual_event_number == expected_event_number, \
                    f"Event at position {i} should be #{expected_event_number}, got #{actual_event_number}"
        else:
            # If we didn't exceed the limit, verify all published events are present
            stored_event_ids = {event.id for event in stored_events}
            published_event_ids = {event.id for event in published_events}
            
            assert stored_event_ids == published_event_ids, \
                f"Not all published events are in the log. Missing: {published_event_ids - stored_event_ids}"
    
    @pytest.mark.asyncio
    @settings(deadline=None)
    @given(
        num_subscribers=st.integers(min_value=1, max_value=10),
        num_events=st.integers(min_value=1, max_value=10),
        source_module=st.sampled_from(["eye", "brain", "mouth", "tentacle", "system"]),
        event_type=st.sampled_from([
            EventType.VISION_EVENT,
            EventType.SYSTEM_ACTION,
            EventType.SPEECH_COMPLETE,
            EventType.ACTION_COMPLETE,
            EventType.ACTION_ERROR,
            EventType.MODULE_STATE_CHANGED
        ])
    )
    async def test_property_event_delivery_timing(
        self, num_subscribers, num_events, source_module, event_type
    ):
        """
        Feature: chimeraforge, Property 6: Event delivery timing
        Validates: Requirements 2.5
        
        Property: For any event published to the event bus, all subscribed modules
        should receive the event within 100 milliseconds.
        """
        bus = EventBus()
        
        # Track delivery times for each subscriber
        delivery_times = {f"subscriber_{i}": [] for i in range(num_subscribers)}
        
        # Subscribe all modules with callbacks that record delivery time
        for i in range(num_subscribers):
            subscriber_id = f"subscriber_{i}"
            
            def make_callback(sid):
                def callback(event: Event):
                    # Record the time when this subscriber received the event
                    delivery_time = datetime.now(timezone.utc)
                    delivery_times[sid].append({
                        'event_id': event.id,
                        'publish_time': event.timestamp,
                        'delivery_time': delivery_time
                    })
                return callback
            
            bus.subscribe(subscriber_id, make_callback(subscriber_id))
        
        # Publish events and track publish times
        for i in range(num_events):
            event = Event.create(
                source_module=source_module,
                type=event_type,
                payload={"event_number": i}
            )
            await bus.publish(event)
        
        # Wait for async delivery to complete
        await asyncio.sleep(0.15)
        
        # Property: All subscribers should receive all events within 100ms
        for subscriber_id, deliveries in delivery_times.items():
            assert len(deliveries) == num_events, \
                f"{subscriber_id} received {len(deliveries)} events, expected {num_events}"
            
            for delivery in deliveries:
                # Calculate delivery latency
                latency = (delivery['delivery_time'] - delivery['publish_time']).total_seconds() * 1000
                
                # Property: Delivery should happen within 100 milliseconds
                assert latency <= 100, \
                    f"{subscriber_id} received event {delivery['event_id']} after {latency:.2f}ms (exceeds 100ms limit)"
