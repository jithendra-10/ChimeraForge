"""
Eye Module implementation for ChimeraForge.

This module provides vision processing capabilities using OpenCV for face detection.
"""

import base64
import cv2
import numpy as np
from dataclasses import dataclass
from typing import Optional
from backend.core.event_bus import Event, EventBus, EventType
from backend.core.module_registry import ModuleRegistry


@dataclass
class BoundingBox:
    """
    Represents a bounding box for detected objects.
    
    Attributes:
        x: X coordinate of top-left corner
        y: Y coordinate of top-left corner
        width: Width of the bounding box
        height: Height of the bounding box
    """
    x: int
    y: int
    width: int
    height: int


@dataclass
class FaceDetection:
    """
    Result of face detection processing.
    
    Attributes:
        detected: Whether a face was detected
        confidence: Confidence score (0.0 to 1.0)
        bounding_box: Bounding box of detected face, if any
    """
    detected: bool
    confidence: float = 0.0
    bounding_box: Optional[BoundingBox] = None


class EyeModule:
    """
    Vision module that detects faces from webcam input using OpenCV.
    
    The Eye module processes base64-encoded image frames and publishes
    VISION_EVENT events when faces are detected or not detected.
    """
    
    def __init__(self, event_bus: EventBus, registry: ModuleRegistry):
        """
        Initialize the Eye module.
        
        Args:
            event_bus: Event bus for publishing vision events
            registry: Module registry to check enabled state
        """
        self.event_bus = event_bus
        self.registry = registry
        self.module_id = "eye"
        
        # Load OpenCV's pre-trained Haar Cascade for face detection
        # Using the frontal face default cascade
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        )
        
        # Subscribe to module state changes
        self.event_bus.subscribe(self.module_id, self._on_event)
        
        # State tracking for event filtering
        self.last_detection_state = False
        self.last_publish_time = 0
        self.min_publish_interval = 5.0  # Minimum 5 seconds between redundant events
    
    async def _on_event(self, event: Event) -> None:
        """
        Handle incoming events.
        
        Args:
            event: Event to process
        """
        # Currently, Eye module primarily processes frames via direct calls
        # but can respond to MODULE_STATE_CHANGED events if needed
        if event.type == EventType.MODULE_STATE_CHANGED:
            if event.payload.get("module_id") == self.module_id:
                enabled = event.payload.get("enabled", False)
                # Could perform initialization/cleanup based on state change
                pass
    
    async def process_frame(self, frame_base64: str) -> None:
        """
        Process a webcam frame for face detection.
        
        Args:
            frame_base64: Base64-encoded image data
        """
        # Check if module is enabled
        if not self.registry.is_enabled(self.module_id):
            return
        
        # Wrap processing in try-catch for error handling
        try:
            # Remove data URL prefix if present
            if ',' in frame_base64:
                frame_base64 = frame_base64.split(',')[1]
            
            # Decode base64 to bytes
            image_bytes = base64.b64decode(frame_base64)
            
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_bytes, np.uint8)
            
            # Decode image
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                # Failed to decode image - publish error event
                await self._publish_error_event(
                    error_type="processing",
                    message="Failed to decode image from base64 data",
                    details={"frame_length": len(frame_base64)},
                    recoverable=True
                )
                # Still publish vision event indicating no detection
                detection = FaceDetection(detected=False)
                await self._publish_vision_event(detection)
                return
            
            # Perform face detection
            detection = self.detect_face(image)
            
            # Publish vision event
            await self._publish_vision_event(detection)
            
        except base64.binascii.Error as e:
            # Base64 decoding error
            await self._publish_error_event(
                error_type="validation",
                message=f"Invalid base64 image data: {str(e)}",
                details={"error": str(e)},
                recoverable=True
            )
            # Publish vision event indicating no detection for graceful degradation
            detection = FaceDetection(detected=False)
            await self._publish_vision_event(detection)
            
        except cv2.error as e:
            # OpenCV processing error
            await self._publish_error_event(
                error_type="processing",
                message=f"OpenCV processing error: {str(e)}",
                details={"error": str(e)},
                recoverable=True
            )
            # Publish vision event indicating no detection for graceful degradation
            detection = FaceDetection(detected=False)
            await self._publish_vision_event(detection)
            
        except Exception as e:
            # Catch-all for unexpected errors
            await self._publish_error_event(
                error_type="processing",
                message=f"Unexpected error in Eye module: {str(e)}",
                details={"error": str(e), "error_type": type(e).__name__},
                recoverable=True
            )
            # Publish vision event indicating no detection for graceful degradation
            detection = FaceDetection(detected=False)
            await self._publish_vision_event(detection)
    
    def detect_face(self, image: np.ndarray) -> FaceDetection:
        """
        Detect faces in an image using OpenCV.
        
        Args:
            image: Image as numpy array (BGR format from OpenCV)
            
        Returns:
            FaceDetection result with bounding box if face found
        """
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        
        # Process detection results
        if len(faces) > 0:
            # Take the first detected face
            x, y, w, h = faces[0]
            
            # Calculate confidence based on face size relative to image
            # Larger faces are generally more confident detections
            image_area = image.shape[0] * image.shape[1]
            face_area = w * h
            confidence = min(1.0, (face_area / image_area) * 10)  # Scale factor
            
            return FaceDetection(
                detected=True,
                confidence=confidence,
                bounding_box=BoundingBox(x=int(x), y=int(y), width=int(w), height=int(h))
            )
        else:
            # No face detected
            return FaceDetection(detected=False, confidence=0.0)
    
    async def _publish_vision_event(self, detection: FaceDetection) -> None:
        """
        Publish a VISION_EVENT to the event bus.
        
        Args:
            detection: Face detection result to publish
        """
        # Build payload
        payload = {
            "detected": detection.detected,
            "object_type": "face" if detection.detected else None,
            "confidence": detection.confidence
        }
        
        # Add bounding box if face was detected
        if detection.bounding_box:
            payload["bounding_box"] = {
                "x": detection.bounding_box.x,
                "y": detection.bounding_box.y,
                "width": detection.bounding_box.width,
                "height": detection.bounding_box.height
            }
        
        # Filter redundant events to prevent spamming
        import time
        current_time = time.time()
        
        # Always publish if state changed (detected vs not detected)
        state_changed = detection.detected != self.last_detection_state
        
        # Always publish if enough time has passed since last event
        time_elapsed = (current_time - self.last_publish_time) > self.min_publish_interval
        
        if state_changed or time_elapsed:
            # Create and publish event
            event = Event.create(
                source_module=self.module_id,
                type=EventType.VISION_EVENT,
                payload=payload
            )
            
            await self.event_bus.publish(event)
            
            # Update state tracking
            self.last_detection_state = detection.detected
            self.last_publish_time = current_time
        else:
            # Skip publishing redundant event
            pass
    
    async def _publish_error_event(self, error_type: str, message: str, 
                                   details: dict, recoverable: bool = True) -> None:
        """
        Publish an ERROR event to the event bus.
        
        Args:
            error_type: Type of error (e.g., "validation", "processing", "external_service")
            message: Human-readable error message
            details: Additional error details
            recoverable: Whether the module can recover from this error
        """
        # Create error event
        event = Event.create(
            source_module=self.module_id,
            type=EventType.ACTION_ERROR,
            payload={
                "error_type": error_type,
                "message": message,
                "details": details,
                "recoverable": recoverable
            }
        )
        
        # Publish error event
        await self.event_bus.publish(event)
