// Hook for managing SSE event stream

import { useState, useEffect, useCallback } from "react";
import { eventStream } from "../api/eventStream";
import type { Event } from "../types";

export function useEventStream() {
  const [events, setEvents] = useState<Event[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Add a new event to the list
  const addEvent = useCallback((event: Event) => {
    setEvents((prev) => [event, ...prev].slice(0, 100)); // Keep last 100 events
  }, []);

  // Connect to event stream
  useEffect(() => {
    // Subscribe to events
    const unsubscribe = eventStream.subscribe((event) => {
      addEvent(event);
    });

    // Subscribe to errors
    const unsubscribeError = eventStream.onError((err) => {
      setError(err);
      setConnected(false);
    });

    // Connect
    eventStream.connect();

    // Check connection status periodically
    const checkConnection = setInterval(() => {
      setConnected(eventStream.isConnected());
    }, 1000);

    // Cleanup
    return () => {
      unsubscribe();
      unsubscribeError();
      clearInterval(checkConnection);
      eventStream.disconnect();
    };
  }, [addEvent]);

  return {
    events,
    connected,
    error,
    addEvent,
  };
}
