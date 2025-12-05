// Event Log Panel - Real-time event stream display

import { useState, useEffect, useRef } from "react";
import type { Event } from "../types";

interface EventLogProps {
  events: Event[];
  maxEvents?: number;
}

export function EventLog({ events, maxEvents = 50 }: EventLogProps) {
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevEventsLengthRef = useRef(events.length);

  const displayEvents = events.slice(0, maxEvents);

  // Auto-scroll to latest events when new events arrive
  useEffect(() => {
    if (autoScroll && scrollContainerRef.current && events.length > prevEventsLengthRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    prevEventsLengthRef.current = events.length;
  }, [events, autoScroll]);

  // Detect manual scrolling to disable auto-scroll
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop } = scrollContainerRef.current;
      // If user scrolls away from top, disable auto-scroll
      setAutoScroll(scrollTop === 0);
    }
  };

  const getEventColor = (type: string): string => {
    const colors: Record<string, string> = {
      VISION_EVENT: "text-blue-400",
      SYSTEM_ACTION: "text-purple-400",
      SPEECH_COMPLETE: "text-green-400",
      ACTION_COMPLETE: "text-green-400",
      ACTION_ERROR: "text-red-400",
      MODULE_STATE_CHANGED: "text-yellow-400",
      ERROR: "text-red-400",
    };
    return colors[type] || "text-gray-400";
  };

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className="bg-dark-panel rounded-lg p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-neon-green">Event Log</h2>
        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={`text-xs px-3 py-1 rounded border transition-colors ${
            autoScroll
              ? "border-neon-green text-neon-green"
              : "border-gray-600 text-gray-400 hover:border-gray-500"
          }`}
          title={autoScroll ? "Auto-scroll enabled" : "Auto-scroll disabled"}
        >
          {autoScroll ? "🔄 Auto" : "⏸ Manual"}
        </button>
      </div>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="space-y-2 max-h-96 overflow-y-auto"
      >
        {displayEvents.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No events yet...</p>
        ) : (
          displayEvents.map((event) => (
            <div
              key={event.id}
              className="bg-dark-bg rounded p-3 border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
              onClick={() =>
                setExpandedEvent(expandedEvent === event.id ? null : event.id)
              }
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${getEventColor(event.type)}`}>
                      {event.type}
                    </span>
                    <span className="text-gray-500 text-sm">
                      from {event.source_module}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {formatTimestamp(event.timestamp)}
                  </div>
                </div>
              </div>
              {expandedEvent === event.id && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <pre className="text-xs text-gray-400 overflow-x-auto">
                    {JSON.stringify(event.payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
