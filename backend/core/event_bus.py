"""
Event Bus implementation for ChimeraForge.

This module provides the central nervous system for module communication
through a publish-subscribe pattern.
"""

import asyncio
import uuid
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional
from dataclasses import dataclass, field
from collections import deque


@dataclass
class Event:
    """
    Represents an event in the ChimeraForge system.
    
    Attributes:
        id: Unique UUID for the event
        source_module: Module that published the event ("eye", "brain", "mouth", "ear", "system")
        type: Event type constant (e.g., "VISION_EVENT", "SYSTEM_ACTION")
        timestamp: When the event was created
        payload: Event-specific data
    """
    id: str
    source_module: str
    type: str
    timestamp: datetime
    payload: Dict[str, Any]
    
    @classmethod
    def create(cls, source_module: str, type: str, payload: Dict[str, Any]) -> "Event":
        """
        Factory method to create a new event with auto-generated ID and timestamp.
        
        Args:
            source_module: Module publishing the event
            type: Event type
            payload: Event data
            
        Returns:
            New Event instance
        """
        return cls(
            id=str(uuid.uuid4()),
            source_module=source_module,
            type=type,
            timestamp=datetime.now(timezone.utc),
            payload=payload
        )


class EventBus:
    """
    Central event bus for publish-subscribe communication between modules.
    
    Features:
    - Async event delivery to subscribers
    - In-memory event log with 1000 event limit
    - Multiple subscribers per module
    """
    
    def __init__(self, max_log_size: int = 1000):
        """
        Initialize the event bus.
        
        Args:
            max_log_size: Maximum number of events to keep in the log
        """
        self._subscribers: Dict[str, List[Callable]] = {}
        self._event_log: deque = deque(maxlen=max_log_size)
        self._lock = asyncio.Lock()
    
    async def publish(self, event: Event) -> None:
        """
        Publish an event to all subscribers asynchronously.
        
        Args:
            event: Event to publish
        """
        # Store event in log
        async with self._lock:
            self._event_log.append(event)
        
        # Deliver to all subscribers asynchronously
        tasks = []
        for module_id, callbacks in self._subscribers.items():
            for callback in callbacks:
                # Create task for each callback to enable concurrent delivery
                tasks.append(self._deliver_event(callback, event))
        
        # Wait for all deliveries to complete
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _deliver_event(self, callback: Callable, event: Event) -> None:
        """
        Deliver an event to a single subscriber callback.
        
        Args:
            callback: Subscriber callback function
            event: Event to deliver
        """
        try:
            # Check if callback is async or sync
            if asyncio.iscoroutinefunction(callback):
                await callback(event)
            else:
                # Run sync callback in executor to avoid blocking
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(None, callback, event)
        except Exception as e:
            # Log error with context but don't let one subscriber failure affect others
            print(f"Error delivering event {event.id} (type: {event.type}) to subscriber: {type(e).__name__}: {e}")
            # Store delivery failure in a separate error log if needed
            # This ensures system resilience - one module failure doesn't crash the event bus
    
    def subscribe(self, module_id: str, callback: Callable) -> None:
        """
        Subscribe a module to receive events.
        
        Args:
            module_id: Unique identifier for the subscribing module
            callback: Function to call when events are published
        """
        if module_id not in self._subscribers:
            self._subscribers[module_id] = []
        self._subscribers[module_id].append(callback)
    
    def unsubscribe(self, module_id: str) -> None:
        """
        Unsubscribe a module from receiving events.
        
        Args:
            module_id: Module to unsubscribe
        """
        if module_id in self._subscribers:
            del self._subscribers[module_id]
    
    def get_recent_events(self, limit: int = 50) -> List[Event]:
        """
        Get the most recent events from the log.
        
        Args:
            limit: Maximum number of events to return
            
        Returns:
            List of recent events in chronological order
        """
        # Convert deque to list and return last N events
        events = list(self._event_log)
        return events[-limit:] if len(events) > limit else events
    
    def get_all_events(self) -> List[Event]:
        """
        Get all events from the log.
        
        Returns:
            List of all events in chronological order
        """
        return list(self._event_log)
    
    def clear_log(self) -> None:
        """Clear all events from the log."""
        self._event_log.clear()


# Event type constants
class EventType:
    """Constants for event types in the system."""
    VISION_EVENT = "VISION_EVENT"
    AUDIO_EVENT = "AUDIO_EVENT"
    SYSTEM_ACTION = "SYSTEM_ACTION"
    SPEECH_COMPLETE = "SPEECH_COMPLETE"
    ACTION_COMPLETE = "ACTION_COMPLETE"
    ACTION_ERROR = "ACTION_ERROR"
    MODULE_STATE_CHANGED = "MODULE_STATE_CHANGED"
