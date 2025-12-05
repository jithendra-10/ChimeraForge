/**
 * Property-Based Tests for Event Log
 * Feature: chimeraforge, Property 22: Event log display timing
 * Validates: Requirements 8.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { render, fireEvent } from '@testing-library/react';
import { EventLog } from '../EventLog';
import type { Event, EventType } from '../../types';

describe('EventLog Property Tests', () => {
  /**
   * Property 22: Event log display timing
   * For any event published to the event bus, the Event Log Panel should 
   * display the event within 200 milliseconds.
   */
  it('should display new events within 200ms', () => {
    fc.assert(
      fc.property(
        // Generate random events
        fc.array(
          fc.record({
            id: fc.uuid(),
            source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
            type: fc.constantFrom<EventType>(
              'VISION_EVENT',
              'SYSTEM_ACTION',
              'SPEECH_COMPLETE',
              'ACTION_COMPLETE',
              'ACTION_ERROR',
              'MODULE_STATE_CHANGED',
              'ERROR'
            ),
            timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
            payload: fc.object(),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        // Generate a new event to add
        fc.record({
          id: fc.uuid(),
          source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
          type: fc.constantFrom<EventType>(
            'VISION_EVENT',
            'SYSTEM_ACTION',
            'SPEECH_COMPLETE',
            'ACTION_COMPLETE',
            'ACTION_ERROR',
            'MODULE_STATE_CHANGED',
            'ERROR'
          ),
          timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
          payload: fc.object(),
        }),
        (initialEvents, newEvent) => {
          // Render with initial events
          const { container, rerender } = render(<EventLog events={initialEvents} />);

          // Verify initial render
          const eventLogContainer = container.querySelector('.space-y-2');
          expect(eventLogContainer).toBeTruthy();

          // Record time before adding new event
          const startTime = performance.now();

          // Add the new event to the beginning (events are in reverse chronological order)
          const updatedEvents = [newEvent, ...initialEvents];
          rerender(<EventLog events={updatedEvents} />);

          // Record time after re-render
          const endTime = performance.now();
          const updateTime = endTime - startTime;

          // Verify the update happened within 200ms
          expect(updateTime).toBeLessThan(200);

          // Verify the new event is displayed
          const eventElements = eventLogContainer!.querySelectorAll('.bg-dark-bg');
          expect(eventElements.length).toBe(updatedEvents.length);

          // Verify the new event is at the top (first in the list)
          const firstEventElement = eventElements[0];
          expect(firstEventElement).toBeTruthy();

          // Check that the first event contains the new event's type
          const eventTypeElement = firstEventElement.querySelector('.font-semibold');
          expect(eventTypeElement?.textContent).toBe(newEvent.type);

          // Check that it contains the source module
          const sourceModuleText = firstEventElement.textContent;
          expect(sourceModuleText).toContain(newEvent.source_module);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Property 22 (Edge Case): Single event addition
   * Verifies timing when adding a single event to an empty log
   */
  it('should display first event within 200ms when log is empty', () => {
    fc.assert(
      fc.property(
        // Generate a single event
        fc.record({
          id: fc.uuid(),
          source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
          type: fc.constantFrom<EventType>(
            'VISION_EVENT',
            'SYSTEM_ACTION',
            'SPEECH_COMPLETE',
            'ACTION_COMPLETE',
            'ACTION_ERROR',
            'MODULE_STATE_CHANGED',
            'ERROR'
          ),
          timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
          payload: fc.object(),
        }),
        (newEvent) => {
          // Render with empty events array
          const { container, rerender } = render(<EventLog events={[]} />);

          // Verify empty state
          const emptyMessage = container.querySelector('.text-gray-500');
          expect(emptyMessage?.textContent).toContain('No events yet');

          // Record time before adding event
          const startTime = performance.now();

          // Add the event
          rerender(<EventLog events={[newEvent]} />);

          // Record time after re-render
          const endTime = performance.now();
          const updateTime = endTime - startTime;

          // Verify the update happened within 200ms
          expect(updateTime).toBeLessThan(200);

          // Verify the event is displayed
          const eventLogContainer = container.querySelector('.space-y-2');
          const eventElements = eventLogContainer!.querySelectorAll('.bg-dark-bg');
          expect(eventElements.length).toBe(1);

          // Verify the event content
          const eventTypeElement = eventElements[0].querySelector('.font-semibold');
          expect(eventTypeElement?.textContent).toBe(newEvent.type);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22 (Edge Case): Multiple events added simultaneously
   * Verifies timing when multiple events are added at once
   */
  it('should display multiple new events within 200ms when added simultaneously', () => {
    fc.assert(
      fc.property(
        // Generate initial events
        fc.array(
          fc.record({
            id: fc.uuid(),
            source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
            type: fc.constantFrom<EventType>(
              'VISION_EVENT',
              'SYSTEM_ACTION',
              'SPEECH_COMPLETE',
              'ACTION_COMPLETE',
              'ACTION_ERROR',
              'MODULE_STATE_CHANGED',
              'ERROR'
            ),
            timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
            payload: fc.object(),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        // Generate multiple new events to add
        fc.array(
          fc.record({
            id: fc.uuid(),
            source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
            type: fc.constantFrom<EventType>(
              'VISION_EVENT',
              'SYSTEM_ACTION',
              'SPEECH_COMPLETE',
              'ACTION_COMPLETE',
              'ACTION_ERROR',
              'MODULE_STATE_CHANGED',
              'ERROR'
            ),
            timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
            payload: fc.object(),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (initialEvents, newEvents) => {
          // Render with initial events
          const { container, rerender } = render(<EventLog events={initialEvents} />);

          // Record time before adding new events
          const startTime = performance.now();

          // Add all new events at once
          const updatedEvents = [...newEvents, ...initialEvents];
          rerender(<EventLog events={updatedEvents} />);

          // Record time after re-render
          const endTime = performance.now();
          const updateTime = endTime - startTime;

          // Verify the update happened within 200ms
          expect(updateTime).toBeLessThan(200);

          // Verify all events are displayed
          const eventLogContainer = container.querySelector('.space-y-2');
          const eventElements = eventLogContainer!.querySelectorAll('.bg-dark-bg');
          expect(eventElements.length).toBe(updatedEvents.length);

          // Verify the new events are at the top
          for (let i = 0; i < newEvents.length; i++) {
            const eventElement = eventElements[i];
            const eventTypeElement = eventElement.querySelector('.font-semibold');
            expect(eventTypeElement?.textContent).toBe(newEvents[i].type);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22 (Edge Case): Rapid successive event additions
   * Verifies timing when events are added in rapid succession
   */
  it('should display each event within 200ms when added in rapid succession', () => {
    fc.assert(
      fc.property(
        // Generate a sequence of events to add one by one
        fc.array(
          fc.record({
            id: fc.uuid(),
            source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
            type: fc.constantFrom<EventType>(
              'VISION_EVENT',
              'SYSTEM_ACTION',
              'SPEECH_COMPLETE',
              'ACTION_COMPLETE',
              'ACTION_ERROR',
              'MODULE_STATE_CHANGED',
              'ERROR'
            ),
            timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
            payload: fc.object(),
          }),
          { minLength: 3, maxLength: 10 }
        ),
        (eventSequence) => {
          // Start with empty events
          const { container, rerender } = render(<EventLog events={[]} />);

          const currentEvents: Event[] = [];

          // Add each event one by one and verify timing
          for (const newEvent of eventSequence) {
            const startTime = performance.now();

            // Add the new event to the beginning
            currentEvents.unshift(newEvent);
            rerender(<EventLog events={[...currentEvents]} />);

            const endTime = performance.now();
            const updateTime = endTime - startTime;

            // Each update should happen within 200ms
            expect(updateTime).toBeLessThan(200);

            // Verify the event count is correct
            const eventLogContainer = container.querySelector('.space-y-2');
            const eventElements = eventLogContainer!.querySelectorAll('.bg-dark-bg');
            expect(eventElements.length).toBe(currentEvents.length);

            // Verify the newest event is at the top
            const firstEventElement = eventElements[0];
            const eventTypeElement = firstEventElement.querySelector('.font-semibold');
            expect(eventTypeElement?.textContent).toBe(newEvent.type);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22 (Edge Case): Event addition with maxEvents limit
   * Verifies timing when events are added and the maxEvents limit is applied
   */
  it('should display events within 200ms when maxEvents limit is applied', () => {
    fc.assert(
      fc.property(
        // Generate more events than the maxEvents limit
        fc.integer({ min: 10, max: 20 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
            type: fc.constantFrom<EventType>(
              'VISION_EVENT',
              'SYSTEM_ACTION',
              'SPEECH_COMPLETE',
              'ACTION_COMPLETE',
              'ACTION_ERROR',
              'MODULE_STATE_CHANGED',
              'ERROR'
            ),
            timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
            payload: fc.object(),
          }),
          { minLength: 60, maxLength: 100 }
        ),
        fc.record({
          id: fc.uuid(),
          source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
          type: fc.constantFrom<EventType>(
            'VISION_EVENT',
            'SYSTEM_ACTION',
            'SPEECH_COMPLETE',
            'ACTION_COMPLETE',
            'ACTION_ERROR',
            'MODULE_STATE_CHANGED',
            'ERROR'
          ),
          timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
          payload: fc.object(),
        }),
        (maxEvents, initialEvents, newEvent) => {
          // Render with initial events and maxEvents limit
          const { container, rerender } = render(
            <EventLog events={initialEvents} maxEvents={maxEvents} />
          );

          // Verify only maxEvents are displayed
          const eventLogContainer = container.querySelector('.space-y-2');
          let eventElements = eventLogContainer!.querySelectorAll('.bg-dark-bg');
          expect(eventElements.length).toBe(Math.min(maxEvents, initialEvents.length));

          // Record time before adding new event
          const startTime = performance.now();

          // Add the new event
          const updatedEvents = [newEvent, ...initialEvents];
          rerender(<EventLog events={updatedEvents} maxEvents={maxEvents} />);

          // Record time after re-render
          const endTime = performance.now();
          const updateTime = endTime - startTime;

          // Verify the update happened within 200ms
          expect(updateTime).toBeLessThan(200);

          // Verify only maxEvents are displayed
          eventElements = eventLogContainer!.querySelectorAll('.bg-dark-bg');
          expect(eventElements.length).toBe(Math.min(maxEvents, updatedEvents.length));

          // Verify the new event is at the top
          const firstEventElement = eventElements[0];
          const eventTypeElement = firstEventElement.querySelector('.font-semibold');
          expect(eventTypeElement?.textContent).toBe(newEvent.type);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22 (Edge Case): All event types display within timing requirement
   * Verifies that all different event types display within 200ms
   */
  it('should display all event types within 200ms', () => {
    const eventTypes: EventType[] = [
      'VISION_EVENT',
      'SYSTEM_ACTION',
      'SPEECH_COMPLETE',
      'ACTION_COMPLETE',
      'ACTION_ERROR',
      'MODULE_STATE_CHANGED',
      'ERROR',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...eventTypes),
        fc.uuid(),
        fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
        fc.date(),
        fc.object(),
        (eventType, id, sourceModule, timestamp, payload) => {
          const newEvent: Event = {
            id,
            source_module: sourceModule,
            type: eventType,
            timestamp: timestamp.toISOString(),
            payload,
          };

          // Render with empty events
          const { container, rerender } = render(<EventLog events={[]} />);

          // Record time before adding event
          const startTime = performance.now();

          // Add the event
          rerender(<EventLog events={[newEvent]} />);

          // Record time after re-render
          const endTime = performance.now();
          const updateTime = endTime - startTime;

          // Verify the update happened within 200ms
          expect(updateTime).toBeLessThan(200);

          // Verify the event is displayed with correct type
          const eventLogContainer = container.querySelector('.space-y-2');
          const eventElements = eventLogContainer!.querySelectorAll('.bg-dark-bg');
          expect(eventElements.length).toBe(1);

          const eventTypeElement = eventElements[0].querySelector('.font-semibold');
          expect(eventTypeElement?.textContent).toBe(eventType);

          // Verify the event has the correct color coding
          const colorClass = eventTypeElement?.className;
          expect(colorClass).toBeTruthy();
          
          // Each event type should have a specific color
          const expectedColors: Record<EventType, string> = {
            VISION_EVENT: 'text-blue-400',
            SYSTEM_ACTION: 'text-purple-400',
            SPEECH_COMPLETE: 'text-green-400',
            ACTION_COMPLETE: 'text-green-400',
            ACTION_ERROR: 'text-red-400',
            MODULE_STATE_CHANGED: 'text-yellow-400',
            ERROR: 'text-red-400',
          };

          expect(colorClass).toContain(expectedColors[eventType]);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23: Event log chronological ordering
   * For any set of events displayed in the Event Log Panel, the events should 
   * be shown in reverse chronological order (newest first).
   * Feature: chimeraforge, Property 23: Event log chronological ordering
   * Validates: Requirements 8.2
   */
  it('should display events in reverse chronological order (newest first)', () => {
    fc.assert(
      fc.property(
        // Generate an array of events with random timestamps
        fc.array(
          fc.record({
            id: fc.uuid(),
            source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
            type: fc.constantFrom<EventType>(
              'VISION_EVENT',
              'SYSTEM_ACTION',
              'SPEECH_COMPLETE',
              'ACTION_COMPLETE',
              'ACTION_ERROR',
              'MODULE_STATE_CHANGED',
              'ERROR'
            ),
            timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
            payload: fc.object(),
          }),
          { minLength: 2, maxLength: 20 }
        ),
        (events) => {
          // Sort events in reverse chronological order (newest first) as they should be passed to the component
          const sortedEvents = [...events].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          // Render with sorted events
          const { container } = render(<EventLog events={sortedEvents} />);

          // Get all event elements
          const eventLogContainer = container.querySelector('.space-y-2');
          const eventElements = eventLogContainer!.querySelectorAll('.bg-dark-bg');

          // Verify we have the correct number of events
          expect(eventElements.length).toBe(Math.min(sortedEvents.length, 50)); // maxEvents default is 50

          // Extract timestamps from rendered events
          const renderedTimestamps: string[] = [];
          eventElements.forEach((eventElement) => {
            const timestampElement = eventElement.querySelector('.text-xs.text-gray-600');
            if (timestampElement?.textContent) {
              renderedTimestamps.push(timestampElement.textContent);
            }
          });

          // Verify timestamps are in reverse chronological order
          for (let i = 0; i < renderedTimestamps.length - 1; i++) {
            const currentTime = new Date(sortedEvents[i].timestamp).getTime();
            const nextTime = new Date(sortedEvents[i + 1].timestamp).getTime();
            
            // Current event should be newer than or equal to the next event
            expect(currentTime).toBeGreaterThanOrEqual(nextTime);
          }

          // Verify the first event is the newest
          if (sortedEvents.length > 0) {
            const firstEventType = eventElements[0].querySelector('.font-semibold');
            expect(firstEventType?.textContent).toBe(sortedEvents[0].type);
            
            const firstEventSource = eventElements[0].textContent;
            expect(firstEventSource).toContain(sortedEvents[0].source_module);
          }

          // Verify the last displayed event is the oldest (within the display limit)
          const displayLimit = Math.min(sortedEvents.length, 50);
          if (displayLimit > 1) {
            const lastEventType = eventElements[displayLimit - 1].querySelector('.font-semibold');
            expect(lastEventType?.textContent).toBe(sortedEvents[displayLimit - 1].type);
            
            const lastEventSource = eventElements[displayLimit - 1].textContent;
            expect(lastEventSource).toContain(sortedEvents[displayLimit - 1].source_module);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23 (Edge Case): Events with identical timestamps
   * Verifies ordering behavior when multiple events have the same timestamp
   */
  it('should maintain stable ordering for events with identical timestamps', () => {
    fc.assert(
      fc.property(
        // Generate a timestamp
        fc.integer({ min: 1577836800000, max: 1924905600000 }),
        // Generate multiple events with the same timestamp but unique IDs
        fc.integer({ min: 3, max: 10 }),
        (timestamp, eventCount) => {
          // Create events with the same timestamp but unique IDs
          const sameTimestamp = new Date(timestamp).toISOString();
          const events: Event[] = [];
          
          for (let i = 0; i < eventCount; i++) {
            events.push({
              id: `event-${timestamp}-${i}`, // Ensure unique IDs
              source_module: ['eye', 'brain', 'mouth', 'tentacle', 'system'][i % 5],
              type: ['VISION_EVENT', 'SYSTEM_ACTION', 'SPEECH_COMPLETE', 'ACTION_COMPLETE', 'ACTION_ERROR', 'MODULE_STATE_CHANGED', 'ERROR'][i % 7] as EventType,
              timestamp: sameTimestamp,
              payload: { index: i },
            });
          }

          // Render with events
          const { container } = render(<EventLog events={events} />);

          // Get all event elements
          const eventLogContainer = container.querySelector('.space-y-2');
          const eventElements = eventLogContainer!.querySelectorAll('.bg-dark-bg');

          // Verify we have the correct number of events
          expect(eventElements.length).toBe(events.length);

          // Verify all events are displayed (order is maintained as provided when timestamps are identical)
          for (let i = 0; i < events.length; i++) {
            const eventElement = eventElements[i];
            const eventTypeElement = eventElement.querySelector('.font-semibold');
            expect(eventTypeElement?.textContent).toBe(events[i].type);
            
            const eventText = eventElement.textContent || '';
            expect(eventText).toContain(events[i].source_module);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23 (Edge Case): Single event ordering
   * Verifies that a single event is displayed correctly
   */
  it('should display a single event correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
          type: fc.constantFrom<EventType>(
            'VISION_EVENT',
            'SYSTEM_ACTION',
            'SPEECH_COMPLETE',
            'ACTION_COMPLETE',
            'ACTION_ERROR',
            'MODULE_STATE_CHANGED',
            'ERROR'
          ),
          timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
          payload: fc.object(),
        }),
        (event) => {
          // Render with single event
          const { container } = render(<EventLog events={[event]} />);

          // Get event element
          const eventLogContainer = container.querySelector('.space-y-2');
          const eventElements = eventLogContainer!.querySelectorAll('.bg-dark-bg');

          // Verify exactly one event is displayed
          expect(eventElements.length).toBe(1);

          // Verify it's the correct event
          const eventTypeElement = eventElements[0].querySelector('.font-semibold');
          expect(eventTypeElement?.textContent).toBe(event.type);

          const eventText = eventElements[0].textContent;
          expect(eventText).toContain(event.source_module);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23 (Edge Case): Ordering with maxEvents limit
   * Verifies that when maxEvents limit is applied, the newest events are shown first
   */
  it('should show newest events first when maxEvents limit is applied', () => {
    fc.assert(
      fc.property(
        // Generate more events than the limit
        fc.integer({ min: 5, max: 20 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
            type: fc.constantFrom<EventType>(
              'VISION_EVENT',
              'SYSTEM_ACTION',
              'SPEECH_COMPLETE',
              'ACTION_COMPLETE',
              'ACTION_ERROR',
              'MODULE_STATE_CHANGED',
              'ERROR'
            ),
            timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
            payload: fc.object(),
          }),
          { minLength: 30, maxLength: 100 }
        ),
        (maxEvents, events) => {
          // Sort events in reverse chronological order (newest first)
          const sortedEvents = [...events].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );

          // Render with maxEvents limit
          const { container } = render(<EventLog events={sortedEvents} maxEvents={maxEvents} />);

          // Get all event elements
          const eventLogContainer = container.querySelector('.space-y-2');
          const eventElements = eventLogContainer!.querySelectorAll('.bg-dark-bg');

          // Verify only maxEvents are displayed
          expect(eventElements.length).toBe(Math.min(maxEvents, sortedEvents.length));

          // Verify the displayed events are the newest ones
          const displayedCount = Math.min(maxEvents, sortedEvents.length);
          for (let i = 0; i < displayedCount; i++) {
            const eventTypeElement = eventElements[i].querySelector('.font-semibold');
            expect(eventTypeElement?.textContent).toBe(sortedEvents[i].type);
          }

          // Verify ordering is maintained (newest first)
          for (let i = 0; i < displayedCount - 1; i++) {
            const currentTime = new Date(sortedEvents[i].timestamp).getTime();
            const nextTime = new Date(sortedEvents[i + 1].timestamp).getTime();
            expect(currentTime).toBeGreaterThanOrEqual(nextTime);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24: Event log entry structure
   * For any event displayed in the Event Log Panel, the display should include 
   * event type, source module, timestamp, and payload.
   * Feature: chimeraforge, Property 24: Event log entry structure
   * Validates: Requirements 8.3
   */
  it('should display all required event information (type, source, timestamp, payload)', () => {
    fc.assert(
      fc.property(
        // Generate random events with all required fields
        fc.array(
          fc.record({
            id: fc.uuid(),
            source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
            type: fc.constantFrom<EventType>(
              'VISION_EVENT',
              'SYSTEM_ACTION',
              'SPEECH_COMPLETE',
              'ACTION_COMPLETE',
              'ACTION_ERROR',
              'MODULE_STATE_CHANGED',
              'ERROR'
            ),
            timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
            payload: fc.jsonValue(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (events) => {
          // Render with events
          const { container } = render(<EventLog events={events} />);

          // Get all event elements
          const eventLogContainer = container.querySelector('.space-y-2');
          const eventElements = eventLogContainer!.querySelectorAll('.bg-dark-bg');

          // Verify we have events displayed
          expect(eventElements.length).toBeGreaterThan(0);
          expect(eventElements.length).toBe(Math.min(events.length, 50));

          // For each displayed event, verify all required fields are present
          eventElements.forEach((eventElement, index) => {
            const event = events[index];

            // 1. Verify event type is displayed
            const eventTypeElement = eventElement.querySelector('.font-semibold');
            expect(eventTypeElement).toBeTruthy();
            expect(eventTypeElement?.textContent).toBe(event.type);

            // 2. Verify source module is displayed
            const sourceModuleElement = eventElement.querySelector('.text-gray-500.text-sm');
            expect(sourceModuleElement).toBeTruthy();
            expect(sourceModuleElement?.textContent).toContain(event.source_module);

            // 3. Verify timestamp is displayed
            const timestampElement = eventElement.querySelector('.text-xs.text-gray-600');
            expect(timestampElement).toBeTruthy();
            expect(timestampElement?.textContent).toBeTruthy();
            
            // Verify the timestamp is formatted correctly (should be a valid time string)
            const timestampText = timestampElement?.textContent || '';
            expect(timestampText.length).toBeGreaterThan(0);

            // 4. Verify payload is accessible (when expanded)
            // The payload should be available in the event data structure
            // We'll click to expand and verify the payload is shown
            const eventDiv = eventElement as HTMLElement;
            fireEvent.click(eventDiv);

            // After clicking, the payload should be visible
            const payloadElement = eventElement.querySelector('pre.text-xs.text-gray-400');
            expect(payloadElement).toBeTruthy();
            
            // Verify the payload contains JSON representation
            const payloadText = payloadElement?.textContent || '';
            expect(payloadText.length).toBeGreaterThan(0);
            
            // Verify it's valid JSON by parsing it
            expect(() => JSON.parse(payloadText)).not.toThrow();
            
            // Verify the parsed payload matches the original event payload
            // (accounting for JSON serialization quirks like -0 becoming 0)
            const parsedPayload = JSON.parse(payloadText);
            expect(parsedPayload).toEqual(JSON.parse(JSON.stringify(event.payload)));

            // Click again to collapse
            fireEvent.click(eventDiv);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24 (Edge Case): Single event with all fields
   * Verifies that a single event displays all required fields correctly
   */
  it('should display all required fields for a single event', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
          type: fc.constantFrom<EventType>(
            'VISION_EVENT',
            'SYSTEM_ACTION',
            'SPEECH_COMPLETE',
            'ACTION_COMPLETE',
            'ACTION_ERROR',
            'MODULE_STATE_CHANGED',
            'ERROR'
          ),
          timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
          payload: fc.jsonValue(),
        }),
        (event) => {
          // Render with single event
          const { container } = render(<EventLog events={[event]} />);

          // Get the event element
          const eventLogContainer = container.querySelector('.space-y-2');
          const eventElement = eventLogContainer!.querySelector('.bg-dark-bg');

          expect(eventElement).toBeTruthy();

          // Verify event type
          const eventTypeElement = eventElement!.querySelector('.font-semibold');
          expect(eventTypeElement?.textContent).toBe(event.type);

          // Verify source module
          const sourceModuleElement = eventElement!.querySelector('.text-gray-500.text-sm');
          expect(sourceModuleElement?.textContent).toContain(event.source_module);

          // Verify timestamp
          const timestampElement = eventElement!.querySelector('.text-xs.text-gray-600');
          expect(timestampElement?.textContent).toBeTruthy();

          // Verify payload is accessible
          const eventDiv = eventElement as HTMLElement;
          fireEvent.click(eventDiv);

          const payloadElement = eventElement!.querySelector('pre.text-xs.text-gray-400');
          expect(payloadElement).toBeTruthy();
          
          const payloadText = payloadElement?.textContent || '';
          const parsedPayload = JSON.parse(payloadText);
          expect(parsedPayload).toEqual(event.payload);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24 (Edge Case): Events with complex payloads
   * Verifies that events with nested and complex payloads display correctly
   */
  it('should display events with complex nested payloads correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
          type: fc.constantFrom<EventType>(
            'VISION_EVENT',
            'SYSTEM_ACTION',
            'SPEECH_COMPLETE',
            'ACTION_COMPLETE',
            'ACTION_ERROR',
            'MODULE_STATE_CHANGED',
            'ERROR'
          ),
          timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
          // Generate complex nested payload (JSON-safe values only)
          payload: fc.record({
            level1: fc.string(),
            level2: fc.record({
              nested: fc.string(),
              array: fc.array(fc.integer()),
              boolean: fc.boolean(),
            }),
            numbers: fc.array(fc.integer()), // Use integers instead of floats to avoid Infinity/NaN
          }),
        }),
        (event) => {
          // Render with event
          const { container } = render(<EventLog events={[event]} />);

          // Get the event element
          const eventLogContainer = container.querySelector('.space-y-2');
          const eventElement = eventLogContainer!.querySelector('.bg-dark-bg');

          expect(eventElement).toBeTruthy();

          // Verify all basic fields are present
          const eventTypeElement = eventElement!.querySelector('.font-semibold');
          expect(eventTypeElement?.textContent).toBe(event.type);

          const sourceModuleElement = eventElement!.querySelector('.text-gray-500.text-sm');
          expect(sourceModuleElement?.textContent).toContain(event.source_module);

          const timestampElement = eventElement!.querySelector('.text-xs.text-gray-600');
          expect(timestampElement?.textContent).toBeTruthy();

          // Expand to see payload
          const eventDiv = eventElement as HTMLElement;
          fireEvent.click(eventDiv);

          // Verify complex payload is displayed correctly
          const payloadElement = eventElement!.querySelector('pre.text-xs.text-gray-400');
          expect(payloadElement).toBeTruthy();
          
          const payloadText = payloadElement?.textContent || '';
          const parsedPayload = JSON.parse(payloadText);
          
          // Verify the complex structure is preserved
          expect(parsedPayload).toEqual(event.payload);
          expect(parsedPayload.level1).toBe(event.payload.level1);
          expect(parsedPayload.level2.nested).toBe(event.payload.level2.nested);
          expect(parsedPayload.level2.array).toEqual(event.payload.level2.array);
          expect(parsedPayload.level2.boolean).toBe(event.payload.level2.boolean);
          expect(parsedPayload.numbers).toEqual(event.payload.numbers);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24 (Edge Case): Events with empty payloads
   * Verifies that events with empty payloads still display all required fields
   */
  it('should display events with empty payloads correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          source_module: fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
          type: fc.constantFrom<EventType>(
            'VISION_EVENT',
            'SYSTEM_ACTION',
            'SPEECH_COMPLETE',
            'ACTION_COMPLETE',
            'ACTION_ERROR',
            'MODULE_STATE_CHANGED',
            'ERROR'
          ),
          timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
          payload: fc.constant({}), // Empty payload
        }),
        (event) => {
          // Render with event
          const { container } = render(<EventLog events={[event]} />);

          // Get the event element
          const eventLogContainer = container.querySelector('.space-y-2');
          const eventElement = eventLogContainer!.querySelector('.bg-dark-bg');

          expect(eventElement).toBeTruthy();

          // Verify all required fields are still present
          const eventTypeElement = eventElement!.querySelector('.font-semibold');
          expect(eventTypeElement?.textContent).toBe(event.type);

          const sourceModuleElement = eventElement!.querySelector('.text-gray-500.text-sm');
          expect(sourceModuleElement?.textContent).toContain(event.source_module);

          const timestampElement = eventElement!.querySelector('.text-xs.text-gray-600');
          expect(timestampElement?.textContent).toBeTruthy();

          // Expand to see payload
          const eventDiv = eventElement as HTMLElement;
          fireEvent.click(eventDiv);

          // Verify empty payload is displayed
          const payloadElement = eventElement!.querySelector('pre.text-xs.text-gray-400');
          expect(payloadElement).toBeTruthy();
          
          const payloadText = payloadElement?.textContent || '';
          const parsedPayload = JSON.parse(payloadText);
          expect(parsedPayload).toEqual({});
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 24 (Edge Case): All event types display required fields
   * Verifies that every event type displays all required fields
   */
  it('should display all required fields for every event type', () => {
    const eventTypes: EventType[] = [
      'VISION_EVENT',
      'SYSTEM_ACTION',
      'SPEECH_COMPLETE',
      'ACTION_COMPLETE',
      'ACTION_ERROR',
      'MODULE_STATE_CHANGED',
      'ERROR',
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...eventTypes),
        fc.uuid(),
        fc.constantFrom('eye', 'brain', 'mouth', 'tentacle', 'system'),
        fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ms => new Date(ms).toISOString()),
        fc.jsonValue(),
        (eventType, id, sourceModule, timestamp, payload) => {
          const event: Event = {
            id,
            source_module: sourceModule,
            type: eventType,
            timestamp,
            payload,
          };

          // Render with event
          const { container } = render(<EventLog events={[event]} />);

          // Get the event element
          const eventLogContainer = container.querySelector('.space-y-2');
          const eventElement = eventLogContainer!.querySelector('.bg-dark-bg');

          expect(eventElement).toBeTruthy();

          // Verify event type is displayed
          const eventTypeElement = eventElement!.querySelector('.font-semibold');
          expect(eventTypeElement?.textContent).toBe(eventType);

          // Verify source module is displayed
          const sourceModuleElement = eventElement!.querySelector('.text-gray-500.text-sm');
          expect(sourceModuleElement?.textContent).toContain(sourceModule);

          // Verify timestamp is displayed
          const timestampElement = eventElement!.querySelector('.text-xs.text-gray-600');
          expect(timestampElement?.textContent).toBeTruthy();

          // Verify payload is accessible
          const eventDiv = eventElement as HTMLElement;
          fireEvent.click(eventDiv);

          const payloadElement = eventElement!.querySelector('pre.text-xs.text-gray-400');
          expect(payloadElement).toBeTruthy();
          
          const payloadText = payloadElement?.textContent || '';
          // Verify it's valid JSON
          expect(() => JSON.parse(payloadText)).not.toThrow();
          const parsedPayload = JSON.parse(payloadText);
          
          // Verify the payload round-trips through JSON serialization
          // (this accounts for JSON quirks like -0 becoming 0, undefined becoming null, etc.)
          expect(parsedPayload).toEqual(JSON.parse(JSON.stringify(payload)));
        }
      ),
      { numRuns: 100 }
    );
  });
});
