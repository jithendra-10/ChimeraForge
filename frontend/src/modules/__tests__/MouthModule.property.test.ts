/**
 * Property-Based Tests for Mouth Module
 * Feature: chimeraforge, Property 10: Mouth converts text to speech
 * Validates: Requirements 4.1
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { MouthModule } from '../MouthModule';
import type { Event, SystemActionPayload } from '../../types';

// Mock the API client to avoid network calls
vi.mock('../../api/client', () => ({
  apiClient: {
    publishEvent: vi.fn().mockResolvedValue({}),
  },
}));

// Import after mocking
import { apiClient } from '../../api/client';

describe('MouthModule Property Tests', () => {
  let mouthModule: MouthModule;
  let speakSpy: any;
  let cancelSpy: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create fresh spies
    speakSpy = vi.fn((utterance: SpeechSynthesisUtterance) => {
      // Simulate successful speech by calling onend immediately (synchronously)
      if (utterance.onend) {
        // Use queueMicrotask to make it async but fast
        queueMicrotask(() => {
          utterance.onend!(new Event('end') as any);
        });
      }
    });
    
    cancelSpy = vi.fn();
    
    // Mock speechSynthesis
    global.speechSynthesis = {
      speaking: false,
      pending: false,
      paused: false,
      speak: speakSpy,
      cancel: cancelSpy,
      pause: vi.fn(),
      resume: vi.fn(),
      getVoices: vi.fn(() => []),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as any;

    mouthModule = new MouthModule();
    mouthModule.initialize();
    mouthModule.setEnabled(true);
  });

  afterEach(() => {
    mouthModule.destroy();
  });

  /**
   * Property 10: Mouth converts text to speech
   * For any SYSTEM_ACTION event with a non-empty speak field received while 
   * the Mouth module is enabled, the Mouth module should convert the text to speech.
   */
  it('should convert any non-empty text to speech when enabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate non-empty strings (at least one non-whitespace character)
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.uuid(),
        async (speakText, eventId) => {
          // Reset the spy for each iteration
          speakSpy.mockClear();
          
          // Create a SYSTEM_ACTION event with speak field
          const event: Event = {
            id: eventId,
            source_module: 'brain',
            type: 'SYSTEM_ACTION',
            timestamp: new Date().toISOString(),
            payload: {
              text: 'Some response',
              speak: speakText,
            } as SystemActionPayload,
          };

          // Handle the event
          await mouthModule.handleEvent(event);

          // Verify that speechSynthesis.speak was called
          expect(speakSpy).toHaveBeenCalled();
          
          // Verify that the utterance contains the correct text
          const utterance = speakSpy.mock.calls[0][0];
          expect(utterance).toBeInstanceOf(SpeechSynthesisUtterance);
          expect(utterance.text).toBe(speakText);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Property 10 (Edge Case): Empty or whitespace-only text should not trigger speech
   * Validates: Requirements 4.5
   */
  it('should not produce audio for empty or whitespace-only speak text', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate whitespace-only strings
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.constant('\t'),
          fc.constant('\n'),
          fc.constant('  \t\n  ')
        ),
        fc.uuid(),
        async (speakText, eventId) => {
          // Reset the spy for each iteration
          speakSpy.mockClear();
          
          // Create a SYSTEM_ACTION event with empty/whitespace speak field
          const event: Event = {
            id: eventId,
            source_module: 'brain',
            type: 'SYSTEM_ACTION',
            timestamp: new Date().toISOString(),
            payload: {
              text: 'Some response',
              speak: speakText,
            } as SystemActionPayload,
          };

          // Handle the event
          await mouthModule.handleEvent(event);

          // Verify that speechSynthesis.speak was NOT called
          expect(speakSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10 (Disabled State): Disabled module should not process events
   * Validates: Requirements 4.2
   */
  it('should not convert text to speech when module is disabled', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.uuid(),
        async (speakText, eventId) => {
          // Disable the module
          mouthModule.setEnabled(false);
          
          // Reset the spy for each iteration
          speakSpy.mockClear();
          
          // Create a SYSTEM_ACTION event with speak field
          const event: Event = {
            id: eventId,
            source_module: 'brain',
            type: 'SYSTEM_ACTION',
            timestamp: new Date().toISOString(),
            payload: {
              text: 'Some response',
              speak: speakText,
            } as SystemActionPayload,
          };

          // Handle the event
          await mouthModule.handleEvent(event);

          // Verify that speechSynthesis.speak was NOT called
          expect(speakSpy).not.toHaveBeenCalled();
          
          // Re-enable for next iteration
          mouthModule.setEnabled(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10 (Event Type Filter): Module should only process SYSTEM_ACTION events
   */
  it('should only process SYSTEM_ACTION events with speak field', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('VISION_EVENT', 'SPEECH_COMPLETE', 'ACTION_COMPLETE', 'ACTION_ERROR'),
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.uuid(),
        async (eventType, speakText, eventId) => {
          // Reset the spy for each iteration
          speakSpy.mockClear();
          
          // Create an event of different type
          const event: Event = {
            id: eventId,
            source_module: 'eye',
            type: eventType,
            timestamp: new Date().toISOString(),
            payload: {
              speak: speakText,
            },
          };

          // Handle the event
          await mouthModule.handleEvent(event);

          // Verify that speechSynthesis.speak was NOT called for non-SYSTEM_ACTION events
          expect(speakSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: chimeraforge, Property 11: Mouth publishes completion events
   * Validates: Requirements 4.4
   * 
   * Property 11: Mouth publishes completion events
   * For any speech output completed by the Mouth module, a SPEECH_COMPLETE event 
   * should be published to the event bus.
   */
  it('should publish SPEECH_COMPLETE event after completing speech output', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate non-empty strings (at least one non-whitespace character)
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        fc.uuid(),
        async (speakText, eventId) => {
          // Reset the mocks for each iteration
          speakSpy.mockClear();
          vi.mocked(apiClient.publishEvent).mockClear();
          
          // Create a SYSTEM_ACTION event with speak field
          const event: Event = {
            id: eventId,
            source_module: 'brain',
            type: 'SYSTEM_ACTION',
            timestamp: new Date().toISOString(),
            payload: {
              text: 'Some response',
              speak: speakText,
            } as SystemActionPayload,
          };

          // Handle the event
          await mouthModule.handleEvent(event);

          // Wait a bit for async operations to complete
          await new Promise(resolve => setTimeout(resolve, 10));

          // Verify that publishEvent was called
          expect(apiClient.publishEvent).toHaveBeenCalled();
          
          // Verify that the published event is a SPEECH_COMPLETE event
          const publishedEvent = vi.mocked(apiClient.publishEvent).mock.calls[0][0];
          expect(publishedEvent.source_module).toBe('mouth');
          expect(publishedEvent.type).toBe('SPEECH_COMPLETE');
          expect(publishedEvent.payload).toBeDefined();
          expect(publishedEvent.payload.completed_at).toBeDefined();
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });
});
