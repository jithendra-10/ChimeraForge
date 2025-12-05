/**
 * Property-Based Tests for Webcam Panel
 * Feature: chimeraforge, Property 26: Webcam panel shows detection overlays
 * Validates: Requirements 9.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import { WebcamPanel } from '../WebcamPanel';
import type { VisionEventPayload } from '../../types';

describe('WebcamPanel Property Tests', () => {
  // Mock canvas context for testing
  let mockCanvasContext: any;

  beforeEach(() => {
    // Mock canvas getContext
    mockCanvasContext = {
      clearRect: vi.fn(),
      strokeRect: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockdata'),
    };

    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext);

    // Mock video element properties
    Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
      get: () => 640,
      configurable: true,
    });

    Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
      get: () => 480,
      configurable: true,
    });

    // Mock MediaDevices API
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [],
        }),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 26: Webcam panel shows detection overlays
   * For any face detection result, the Webcam Panel should display a bounding box 
   * around the detected face.
   */
  it('should display bounding boxes for all detected faces', () => {
    fc.assert(
      fc.property(
        // Generate random face detections with bounding boxes
        fc.array(
          fc.record({
            detected: fc.constant(true),
            object_type: fc.constantFrom('face', 'unknown') as fc.Arbitrary<'face' | 'unknown'>,
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
            bounding_box: fc.record({
              x: fc.integer({ min: 0, max: 640 }),
              y: fc.integer({ min: 0, max: 480 }),
              width: fc.integer({ min: 10, max: 200 }),
              height: fc.integer({ min: 10, max: 200 }),
            }),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (detections: VisionEventPayload[]) => {
          // Reset mock calls
          mockCanvasContext.strokeRect.mockClear();
          mockCanvasContext.fillText.mockClear();
          mockCanvasContext.clearRect.mockClear();

          // Render the component with detections
          render(
            <WebcamPanel
              eyeEnabled={true}
              detections={detections}
            />
          );

          // Count how many detections have bounding boxes
          const detectionsWithBoxes = detections.filter(
            (d) => d.detected && d.bounding_box
          );

          // Verify that strokeRect was called for each detection with a bounding box
          expect(mockCanvasContext.strokeRect).toHaveBeenCalledTimes(
            detectionsWithBoxes.length
          );

          // Verify each bounding box was drawn with correct parameters
          detectionsWithBoxes.forEach((_detection, index) => {
            // Get the call arguments for this detection
            const call = mockCanvasContext.strokeRect.mock.calls[index];
            expect(call).toBeDefined();

            // Verify the bounding box coordinates were used
            // (they may be scaled, but should be proportional)
            const [drawnX, drawnY, drawnWidth, drawnHeight] = call;
            
            // Check that values are numbers and positive
            expect(typeof drawnX).toBe('number');
            expect(typeof drawnY).toBe('number');
            expect(typeof drawnWidth).toBe('number');
            expect(typeof drawnHeight).toBe('number');
            expect(drawnWidth).toBeGreaterThan(0);
            expect(drawnHeight).toBeGreaterThan(0);
          });

          // Verify confidence labels were drawn for detections with confidence
          const detectionsWithConfidence = detectionsWithBoxes.filter(
            (d) => d.confidence !== undefined
          );
          
          expect(mockCanvasContext.fillText).toHaveBeenCalledTimes(
            detectionsWithConfidence.length
          );

          // Verify each confidence label was drawn
          detectionsWithConfidence.forEach((detection, index) => {
            const call = mockCanvasContext.fillText.mock.calls[index];
            expect(call).toBeDefined();

            // First argument should be the confidence percentage
            const [text] = call;
            expect(text).toMatch(/\d+%/);
            
            // Extract percentage and verify it matches the confidence
            const percentage = parseInt(text);
            const expectedPercentage = Math.round(detection.confidence! * 100);
            expect(percentage).toBe(expectedPercentage);
          });
        }
      ),
      { numRuns: 100 } // Run 100 iterations as specified in design doc
    );
  });

  /**
   * Property 26 (Edge Case): No detections
   * Verifies that when there are no detections, no bounding boxes are drawn
   */
  it('should not display bounding boxes when there are no detections', () => {
    mockCanvasContext.strokeRect.mockClear();
    mockCanvasContext.fillText.mockClear();

    render(
      <WebcamPanel
        eyeEnabled={true}
        detections={[]}
      />
    );

    // No bounding boxes should be drawn
    expect(mockCanvasContext.strokeRect).not.toHaveBeenCalled();
    expect(mockCanvasContext.fillText).not.toHaveBeenCalled();
  });

  /**
   * Property 26 (Edge Case): Detection without bounding box
   * Verifies that detections without bounding boxes don't cause errors
   */
  it('should handle detections without bounding boxes gracefully', () => {
    fc.assert(
      fc.property(
        // Generate detections without bounding boxes
        fc.array(
          fc.record({
            detected: fc.boolean(),
            object_type: fc.constantFrom('face', 'unknown') as fc.Arbitrary<'face' | 'unknown'>,
            confidence: fc.option(fc.float({ min: 0, max: 1 }), { nil: undefined }),
            // No bounding_box field
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (detections: VisionEventPayload[]) => {
          mockCanvasContext.strokeRect.mockClear();
          mockCanvasContext.fillText.mockClear();

          // Should not throw an error
          expect(() => {
            render(
              <WebcamPanel
                eyeEnabled={true}
                detections={detections}
              />
            );
          }).not.toThrow();

          // No bounding boxes should be drawn since none have bounding_box field
          expect(mockCanvasContext.strokeRect).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 26 (Edge Case): Detection with detected=false
   * Verifies that detections marked as not detected don't show bounding boxes
   */
  it('should not display bounding boxes for detections marked as not detected', () => {
    fc.assert(
      fc.property(
        // Generate detections with detected=false but with bounding boxes
        fc.array(
          fc.record({
            detected: fc.constant(false),
            object_type: fc.constantFrom('face', 'unknown') as fc.Arbitrary<'face' | 'unknown'>,
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
            bounding_box: fc.record({
              x: fc.integer({ min: 0, max: 640 }),
              y: fc.integer({ min: 0, max: 480 }),
              width: fc.integer({ min: 10, max: 200 }),
              height: fc.integer({ min: 10, max: 200 }),
            }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (detections: VisionEventPayload[]) => {
          mockCanvasContext.strokeRect.mockClear();
          mockCanvasContext.fillText.mockClear();

          render(
            <WebcamPanel
              eyeEnabled={true}
              detections={detections}
            />
          );

          // No bounding boxes should be drawn since detected=false
          expect(mockCanvasContext.strokeRect).not.toHaveBeenCalled();
          expect(mockCanvasContext.fillText).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 26 (Mixed Detections): Mix of detected and not detected
   * Verifies that only detected faces show bounding boxes
   */
  it('should only display bounding boxes for detected faces in mixed detection arrays', () => {
    fc.assert(
      fc.property(
        // Generate a mix of detected and not detected faces
        fc.array(
          fc.record({
            detected: fc.boolean(),
            object_type: fc.constantFrom('face', 'unknown') as fc.Arbitrary<'face' | 'unknown'>,
            confidence: fc.option(fc.float({ min: 0, max: 1, noNaN: true }), { nil: undefined }),
            bounding_box: fc.option(
              fc.record({
                x: fc.integer({ min: 0, max: 640 }),
                y: fc.integer({ min: 0, max: 480 }),
                width: fc.integer({ min: 10, max: 200 }),
                height: fc.integer({ min: 10, max: 200 }),
              }),
              { nil: undefined }
            ),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (detections: VisionEventPayload[]) => {
          mockCanvasContext.strokeRect.mockClear();
          mockCanvasContext.fillText.mockClear();

          render(
            <WebcamPanel
              eyeEnabled={true}
              detections={detections}
            />
          );

          // Count how many should be drawn (detected=true AND has bounding_box)
          const shouldDrawCount = detections.filter(
            (d) => d.detected && d.bounding_box
          ).length;

          // Verify correct number of bounding boxes drawn
          expect(mockCanvasContext.strokeRect).toHaveBeenCalledTimes(shouldDrawCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 26 (Boundary Values): Bounding boxes at canvas edges
   * Verifies that bounding boxes at canvas boundaries are drawn correctly
   */
  it('should correctly draw bounding boxes at canvas boundaries', () => {
    fc.assert(
      fc.property(
        // Generate detections with bounding boxes at various positions including edges
        fc.array(
          fc.record({
            detected: fc.constant(true),
            object_type: fc.constant('face') as fc.Arbitrary<'face'>,
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
            bounding_box: fc.record({
              x: fc.integer({ min: 0, max: 640 }),
              y: fc.integer({ min: 0, max: 480 }),
              width: fc.integer({ min: 1, max: 640 }),
              height: fc.integer({ min: 1, max: 480 }),
            }),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        (detections: VisionEventPayload[]) => {
          mockCanvasContext.strokeRect.mockClear();

          // Should not throw even with edge cases
          expect(() => {
            render(
              <WebcamPanel
                eyeEnabled={true}
                detections={detections}
              />
            );
          }).not.toThrow();

          // All bounding boxes should be drawn
          expect(mockCanvasContext.strokeRect).toHaveBeenCalledTimes(detections.length);

          // Verify all drawn boxes have valid dimensions
          mockCanvasContext.strokeRect.mock.calls.forEach((call: any[]) => {
            const width = call[2];
            const height = call[3];
            expect(width).toBeGreaterThan(0);
            expect(height).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 26 (Visual Properties): Bounding boxes have correct visual styling
   * Verifies that bounding boxes are drawn with the correct color and line width
   */
  it('should draw bounding boxes with correct visual styling', () => {
    fc.assert(
      fc.property(
        // Generate at least one detection
        fc.array(
          fc.record({
            detected: fc.constant(true),
            object_type: fc.constant('face') as fc.Arbitrary<'face'>,
            confidence: fc.float({ min: 0, max: 1, noNaN: true }),
            bounding_box: fc.record({
              x: fc.integer({ min: 0, max: 640 }),
              y: fc.integer({ min: 0, max: 480 }),
              width: fc.integer({ min: 10, max: 200 }),
              height: fc.integer({ min: 10, max: 200 }),
            }),
          }),
          { minLength: 1, maxLength: 3 }
        ),
        (detections: VisionEventPayload[]) => {
          mockCanvasContext.strokeRect.mockClear();

          render(
            <WebcamPanel
              eyeEnabled={true}
              detections={detections}
            />
          );

          // Verify stroke style is set to green (#00ff00)
          expect(mockCanvasContext.strokeStyle).toBe('#00ff00');
          
          // Verify line width is set to 3
          expect(mockCanvasContext.lineWidth).toBe(3);

          // Verify fill style for confidence labels is green
          expect(mockCanvasContext.fillStyle).toBe('#00ff00');
        }
      ),
      { numRuns: 100 }
    );
  });
});
