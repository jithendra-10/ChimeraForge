# ChimeraForge Design Document

## Overview

ChimeraForge is a modular AI system that demonstrates the power of composable AI agents through a spooky, interactive creature metaphor. The system consists of a FastAPI backend that manages module state and event routing, and a React frontend that provides real-time visualization and control. The architecture follows a publish-subscribe pattern where independent modules communicate through a central event bus, enabling loose coupling and dynamic composition of AI capabilities.

The system is designed to be extensible, allowing new modules to be added without modifying existing code. Each module operates independently, subscribing to relevant events and publishing its own events when appropriate.

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Creature   │  │   Module     │  │   Event Log  │      │
│  │   Canvas     │  │   Controls   │  │   Panel      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐                                            │
│  │   Webcam     │                                            │
│  │   Panel      │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
                            │ HTTP/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                    Event Bus                          │   │
│  │              (Publish/Subscribe)                      │   │
│  └──────────────────────────────────────────────────────┘   │
│           │              │              │              │     │
│           ▼              ▼              ▼              ▼     │
│  ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │     Eye      │ │   Brain  │ │  Mouth   │ │ Tentacle │   │
│  │   Module     │ │  Module  │ │  Module  │ │  Module  │   │
│  └──────────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Module Registry                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Backend:**
- FastAPI (Python 3.10+)
- OpenCV for face detection
- OpenAI API for LLM reasoning
- Pydantic for data validation
- asyncio for concurrent event handling

**Frontend:**
- React 18 with TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- Web Speech API for text-to-speech
- MediaDevices API for webcam access

### Communication Patterns

1. **REST API**: Frontend communicates with backend via HTTP for module control and initial data fetching
2. **Server-Sent Events (SSE)**: Backend pushes real-time event updates to frontend
3. **Event Bus**: Internal backend communication between modules using in-memory pub-sub

## Components and Interfaces

### Backend Components

#### 1. Event Bus (`backend/core/event_bus.py`)

The central nervous system of ChimeraForge.

```python
class Event:
    id: str  # UUID
    source_module: str  # "eye", "brain", "mouth", "tentacle"
    type: str  # Event type constant
    timestamp: datetime
    payload: dict

class EventBus:
    def publish(event: Event) -> None
    def subscribe(module_id: str, callback: Callable) -> None
    def unsubscribe(module_id: str) -> None
    def get_recent_events(limit: int = 50) -> List[Event]
```

**Event Types:**
- `VISION_EVENT`: Published by Eye when face/object detected
- `SYSTEM_ACTION`: Published by Brain with response and actions
- `SPEECH_COMPLETE`: Published by Mouth when TTS finishes
- `ACTION_COMPLETE`: Published by Tentacle when web action completes
- `ACTION_ERROR`: Published by any module on error
- `MODULE_STATE_CHANGED`: Published when module enabled/disabled

#### 2. Module Registry (`backend/core/module_registry.py`)

Tracks module states and capabilities.

```python
class ModuleInfo:
    id: str  # "eye", "brain", "mouth", "tentacle"
    name: str
    description: str
    enabled: bool
    capabilities: List[str]

class ModuleRegistry:
    def get_all_modules() -> List[ModuleInfo]
    def get_module(module_id: str) -> ModuleInfo
    def toggle_module(module_id: str) -> ModuleInfo
    def is_enabled(module_id: str) -> bool
```

#### 3. Eye Module (`backend/modules/eye.py`)

Vision processing module using OpenCV.

```python
class EyeModule:
    def __init__(event_bus: EventBus, registry: ModuleRegistry)
    def process_frame(frame_base64: str) -> None
    def detect_face(image: np.ndarray) -> Optional[FaceDetection]
    def _publish_vision_event(detection: Optional[FaceDetection]) -> None

class FaceDetection:
    detected: bool
    confidence: float
    bounding_box: Optional[BoundingBox]
```

#### 4. Brain Module (`backend/modules/brain.py`)

LLM-powered reasoning module.

```python
class BrainModule:
    def __init__(event_bus: EventBus, registry: ModuleRegistry, llm_client)
    def on_event(event: Event) -> None
    def generate_response(context: str) -> BrainResponse
    def _publish_action(response: BrainResponse) -> None

class BrainResponse:
    text: str
    speak: Optional[str]
    open_url: Optional[str]
    reasoning: str
```

#### 5. API Layer (`backend/app.py`)

FastAPI application exposing REST endpoints.

```python
# Endpoints
GET /api/modules -> List[ModuleInfo]
POST /api/modules/{module_id}/toggle -> ModuleInfo
POST /api/events -> Event
POST /api/vision/frame -> ProcessingResult
GET /api/logs?limit=50 -> List[Event]
GET /api/events/stream -> EventSource (SSE)
```

### Frontend Components

#### 1. Creature Canvas (`frontend/src/components/CreatureCanvas.tsx`)

Visual representation of the AI creature.

```typescript
interface CreatureCanvasProps {
  modules: ModuleState[];
  activeProcessing: Set<string>;
}

// Renders SVG creature with:
// - Eye (top-left, glows when active)
// - Brain (center, pulses when thinking)
// - Mouth (bottom-center, animates when speaking)
// - Tentacle (bottom-right, waves when acting)
```

#### 2. Module Control Panel (`frontend/src/components/ModuleControls.tsx`)

Toggle switches for each module.

```typescript
interface ModuleControlsProps {
  modules: ModuleInfo[];
  onToggle: (moduleId: string) => Promise<void>;
}

// Renders toggle switches with:
// - Module name and description
// - Enabled/disabled state
// - Loading state during toggle
```

#### 3. Webcam Panel (`frontend/src/components/WebcamPanel.tsx`)

Live webcam feed with face detection overlay.

```typescript
interface WebcamPanelProps {
  eyeEnabled: boolean;
  onFrame: (frameData: string) => void;
  detections: FaceDetection[];
}

// Features:
// - Live video stream
// - Face bounding boxes
// - "Eye active" indicator
// - Frame capture at 2 FPS when Eye enabled
```

#### 4. Event Log Panel (`frontend/src/components/EventLog.tsx`)

Real-time event stream display.

```typescript
interface EventLogProps {
  events: Event[];
  maxEvents?: number;
}

// Features:
// - Reverse chronological order
// - Color-coded by event type
// - Expandable payload view
// - Auto-scroll to latest
```

#### 5. Frontend Modules (`frontend/src/modules/`)

Client-side module implementations for Mouth and Tentacle.

```typescript
// MouthModule.ts
class MouthModule {
  speak(text: string): Promise<void>
  stop(): void
}

// TentacleModule.ts
class TentacleModule {
  openUrl(url: string): void
  search(query: string): void
}
```

## Data Models

### Event Schema

```typescript
interface Event {
  id: string;
  source_module: "eye" | "brain" | "mouth" | "tentacle" | "system";
  type: EventType;
  timestamp: string; // ISO-8601
  payload: EventPayload;
}

type EventType =
  | "VISION_EVENT"
  | "SYSTEM_ACTION"
  | "SPEECH_COMPLETE"
  | "ACTION_COMPLETE"
  | "ACTION_ERROR"
  | "MODULE_STATE_CHANGED";

interface VisionEventPayload {
  detected: boolean;
  object_type?: "face" | "unknown";
  confidence?: number;
  bounding_box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface SystemActionPayload {
  text: string;
  speak?: string;
  open_url?: string;
  reasoning?: string;
}

interface ErrorPayload {
  error_type: string;
  message: string;
  details?: any;
}
```

### Module State Schema

```typescript
interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  capabilities: string[];
  status: "idle" | "processing" | "error";
  last_active?: string;
}
```

### API Request/Response Models

```typescript
// POST /api/vision/frame
interface VisionFrameRequest {
  frame: string; // base64 encoded image
}

interface VisionFrameResponse {
  events_generated: Event[];
  processing_time_ms: number;
}

// POST /api/events
interface PublishEventRequest {
  source_module: string;
  type: string;
  payload: any;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated to eliminate redundancy:

- Module toggle on/off (1.1, 1.2) can be combined into a single toggle state property
- Module visual state (7.1, 7.2) can be combined into a single UI state property
- Webcam panel state (9.1, 9.2) can be combined into a single conditional rendering property
- Event storage structure (6.3, 6.4) can be combined into a single event structure property
- Disabled module behavior (2.3, 3.3, 4.2, 5.2) follows the same pattern and can be tested with a general property

### Core Properties

**Property 1: Module toggle state persistence**
*For any* module in the system, toggling its state should result in the module registry reflecting the new state and the module's abilities being available or unavailable accordingly.
**Validates: Requirements 1.1, 1.2, 1.5**

**Property 2: Module state change propagation timing**
*For any* module state change, the visual representation should update within 500 milliseconds.
**Validates: Requirements 1.3**

**Property 3: Disabled modules ignore events**
*For any* disabled module and any event published to the event bus, the disabled module should not process the event or produce any output.
**Validates: Requirements 2.3, 3.3, 4.2, 5.2**

**Property 4: Eye module processes all frames when enabled**
*For any* webcam frame received while the Eye module is enabled, the Eye module should process the frame for face detection.
**Validates: Requirements 2.1**

**Property 5: Vision events published on detection**
*For any* face detection result (positive or negative), the Eye module should publish a VISION_EVENT to the event bus containing the detection results.
**Validates: Requirements 2.2, 2.4**

**Property 6: Event delivery timing**
*For any* event published to the event bus, all subscribed modules should receive the event within 100 milliseconds.
**Validates: Requirements 2.5**

**Property 7: Brain generates responses for vision events**
*For any* VISION_EVENT received while the Brain module is enabled, the Brain module should generate a contextual response using LLM reasoning.
**Validates: Requirements 3.1**

**Property 8: Brain publishes system actions**
*For any* response generated by the Brain module, a SYSTEM_ACTION event should be published containing the response text.
**Validates: Requirements 3.2**

**Property 9: Brain action payload structure**
*For any* SYSTEM_ACTION event generated by the Brain module, if the response requires speech, the event payload should include a speak field; if it requires web action, the payload should include an open_url field.
**Validates: Requirements 3.4, 3.5**

**Property 10: Mouth converts text to speech**
*For any* SYSTEM_ACTION event with a non-empty speak field received while the Mouth module is enabled, the Mouth module should convert the text to speech.
**Validates: Requirements 4.1**

**Property 11: Mouth publishes completion events**
*For any* speech output completed by the Mouth module, a SPEECH_COMPLETE event should be published to the event bus.
**Validates: Requirements 4.4**

**Property 12: Tentacle opens URLs**
*For any* SYSTEM_ACTION event with an open_url field received while the Tentacle module is enabled, the Tentacle module should open the specified URL in a new browser tab.
**Validates: Requirements 5.1**

**Property 13: Tentacle publishes completion events**
*For any* web action executed by the Tentacle module, an ACTION_COMPLETE event should be published to the event bus.
**Validates: Requirements 5.3**

**Property 14: Tentacle handles invalid URLs**
*For any* invalid URL received by the Tentacle module, an ACTION_ERROR event should be published with error details.
**Validates: Requirements 5.4**

**Property 15: Tentacle constructs search URLs**
*For any* search query command received by the Tentacle module, a valid search URL should be constructed and opened.
**Validates: Requirements 5.5**

**Property 16: Event UUID uniqueness**
*For any* set of events published to the event bus, all event IDs should be unique UUIDs.
**Validates: Requirements 6.1**

**Property 17: Event delivery to all subscribers**
*For any* event published to the event bus and any set of subscribed modules, the event should be delivered to all subscribers.
**Validates: Requirements 6.2**

**Property 18: Event storage structure**
*For any* event published to the event bus, the stored event should include source_module, type, timestamp, and payload fields.
**Validates: Requirements 6.3, 6.4**

**Property 19: Event log size limit**
*For any* sequence of events published to the event bus, when the log exceeds 1000 events, the oldest events should be removed to maintain the limit.
**Validates: Requirements 6.5**

**Property 20: Creature canvas reflects module state**
*For any* module, the Creature Canvas should display the module with a glowing effect when enabled and a dimmed state when disabled.
**Validates: Requirements 7.1, 7.2**

**Property 21: Creature canvas shows processing indicators**
*For any* time the Eye module is actively processing, the Creature Canvas should display a visual indicator on the Eye component.
**Validates: Requirements 7.5**

**Property 22: Event log display timing**
*For any* event published to the event bus, the Event Log Panel should display the event within 200 milliseconds.
**Validates: Requirements 8.1**

**Property 23: Event log chronological ordering**
*For any* set of events displayed in the Event Log Panel, the events should be shown in reverse chronological order.
**Validates: Requirements 8.2**

**Property 24: Event log entry structure**
*For any* event displayed in the Event Log Panel, the display should include event type, source module, timestamp, and payload.
**Validates: Requirements 8.3**

**Property 25: Webcam panel reflects Eye module state**
*For any* state of the Eye module, the Webcam Panel should display the live webcam feed when enabled and a placeholder message when disabled.
**Validates: Requirements 9.1, 9.2**

**Property 26: Webcam panel shows detection overlays**
*For any* face detection result, the Webcam Panel should display a bounding box around the detected face.
**Validates: Requirements 9.3**

**Property 27: API module toggle behavior**
*For any* module ID, sending a POST request to /api/modules/{id}/toggle should toggle the module's enabled state.
**Validates: Requirements 10.2**

**Property 28: API event publishing**
*For any* event sent via POST to /api/events, the event should be published to the Event Bus.
**Validates: Requirements 10.3**

**Property 29: API vision frame processing**
*For any* base64 image sent to /api/vision/frame, the frame should be processed through the Eye and Brain modules.
**Validates: Requirements 10.4**

**Property 30: API log retrieval**
*For any* GET request to /api/logs with parameter N, the response should return the last N events from the Event Bus log.
**Validates: Requirements 10.5**

**Property 31: Module error event publishing**
*For any* error encountered during module processing, the module should publish an ERROR event to the Event Bus.
**Validates: Requirements 12.1**

**Property 32: System resilience to module failures**
*For any* module failure, the ChimeraForge System should continue operating with the remaining functional modules.
**Validates: Requirements 12.2**

**Property 33: API error handling**
*For any* invalid input received by an API endpoint, the response should include an appropriate HTTP error code with error details.
**Validates: Requirements 12.5**



## Error Handling

### Error Categories

1. **Module Errors**: Errors within individual modules (Eye, Brain, Mouth, Tentacle)
2. **Event Bus Errors**: Errors in event delivery or subscription management
3. **API Errors**: HTTP request validation and processing errors
4. **External Service Errors**: Failures from OpenAI API, webcam access, etc.

### Error Handling Strategy

**Module-Level Error Handling:**
- Each module wraps its processing logic in try-catch blocks
- Errors are logged with full context (module ID, event that triggered error, stack trace)
- ERROR events are published to the event bus with structured error information
- Modules enter an "error" state but remain subscribed to events
- Modules can recover from errors on subsequent successful operations

**Event Bus Error Handling:**
- Subscriber callback failures are caught and logged
- Failed delivery to one subscriber doesn't prevent delivery to others
- Event bus maintains a separate error log for delivery failures
- Malformed events are rejected with validation errors

**API Error Handling:**
- Pydantic validation catches malformed requests
- HTTP status codes follow REST conventions:
  - 400 for invalid input
  - 404 for unknown module IDs
  - 500 for internal server errors
- Error responses include structured JSON with error type, message, and details
- All API errors are logged with request context

**External Service Error Handling:**
- OpenAI API failures trigger Brain module errors but don't crash the system
- Webcam access failures disable the Eye module gracefully
- Network timeouts are caught and reported as ERROR events
- Retry logic with exponential backoff for transient failures

### Error Event Schema

```python
class ErrorEvent:
    id: str
    source_module: str
    type: "ACTION_ERROR"
    timestamp: datetime
    payload: {
        "error_type": str,  # "validation", "processing", "external_service", etc.
        "message": str,
        "details": dict,
        "recoverable": bool
    }
```

## Testing Strategy

ChimeraForge will employ a comprehensive testing strategy combining unit tests, property-based tests, and integration tests to ensure correctness and reliability.

### Property-Based Testing

**Framework**: We will use **Hypothesis** for Python backend testing and **fast-check** for TypeScript frontend testing.

**Configuration**:
- Each property-based test will run a minimum of 100 iterations
- Tests will use custom generators for domain-specific types (Events, ModuleInfo, etc.)
- Each property test will include a comment tag referencing the design document property

**Tag Format**: `# Feature: chimeraforge, Property {number}: {property_text}`

**Property Test Coverage**:
- All 33 correctness properties will be implemented as property-based tests
- Tests will generate random valid inputs to verify properties hold universally
- Edge cases (empty inputs, boundary values, invalid data) will be covered by generators

**Example Property Test Structure**:

```python
from hypothesis import given, strategies as st

# Feature: chimeraforge, Property 1: Module toggle state persistence
@given(module_id=st.sampled_from(["eye", "brain", "mouth", "tentacle"]))
def test_module_toggle_persistence(module_id):
    registry = ModuleRegistry()
    initial_state = registry.get_module(module_id).enabled
    
    # Toggle the module
    registry.toggle_module(module_id)
    new_state = registry.get_module(module_id).enabled
    
    # Verify state changed
    assert new_state != initial_state
    
    # Verify persistence
    assert registry.get_module(module_id).enabled == new_state
```

### Unit Testing

**Framework**: pytest for Python, Jest for TypeScript

**Unit Test Coverage**:
- Individual module methods (face detection, LLM response generation, etc.)
- Event bus subscription and publishing mechanisms
- API endpoint request/response handling
- Frontend component rendering and state management
- Error handling paths

**Unit tests complement property tests by**:
- Testing specific examples that demonstrate correct behavior
- Verifying integration points between components
- Checking error conditions with known inputs
- Validating UI component behavior with specific props

### Integration Testing

**Scope**: End-to-end workflows across multiple modules

**Test Scenarios**:
- Full vision pipeline: webcam frame → Eye detection → Brain reasoning → Mouth speech
- Module enable/disable affecting event processing
- Event bus delivering events to multiple subscribers
- API endpoints triggering module actions
- Error recovery and system resilience

### Test Organization

```
backend/
  tests/
    unit/
      test_event_bus.py
      test_module_registry.py
      test_eye_module.py
      test_brain_module.py
    property/
      test_properties_modules.py
      test_properties_event_bus.py
      test_properties_api.py
    integration/
      test_vision_pipeline.py
      test_module_lifecycle.py

frontend/
  src/
    components/
      __tests__/
        CreatureCanvas.test.tsx
        ModuleControls.test.tsx
        EventLog.test.tsx
    modules/
      __tests__/
        MouthModule.test.ts
        TentacleModule.test.ts
    properties/
      properties.test.ts
```

### Testing Best Practices

1. **Test Independence**: Each test should be isolated and not depend on other tests
2. **Deterministic Tests**: Use fixed seeds for random generators in property tests
3. **Fast Execution**: Unit and property tests should complete in seconds
4. **Clear Assertions**: Test failures should clearly indicate what went wrong
5. **Minimal Mocking**: Prefer real implementations over mocks when possible
6. **Edge Case Coverage**: Property test generators should include boundary values

## Implementation Notes

### Development Phases

**Phase 1: Core Infrastructure**
- Event bus implementation
- Module registry
- Basic API endpoints
- Frontend scaffolding

**Phase 2: Module Implementation**
- Eye module with OpenCV integration
- Brain module with OpenAI integration
- Mouth module with Web Speech API
- Tentacle module with browser actions

**Phase 3: UI Development**
- Creature Canvas with animations
- Module control panel
- Event log panel
- Webcam panel with overlays

**Phase 4: Integration & Polish**
- End-to-end testing
- Error handling refinement
- Performance optimization
- Visual polish and animations

### Technology Decisions

**Why FastAPI?**
- Native async support for event handling
- Automatic API documentation with OpenAPI
- Pydantic integration for data validation
- SSE support for real-time updates

**Why React?**
- Component-based architecture matches module structure
- Rich ecosystem for animations (Framer Motion)
- TypeScript support for type safety
- Easy integration with Web APIs

**Why In-Memory Event Bus?**
- Simplicity for MVP
- Low latency for real-time interactions
- No external dependencies
- Can be replaced with Redis/RabbitMQ later if needed

**Why OpenCV for Face Detection?**
- Mature, well-tested library
- Fast processing for real-time video
- No external API calls required
- Can run entirely locally

### Performance Considerations

- Event bus uses asyncio for non-blocking event delivery
- Webcam frames are processed at 2 FPS to balance responsiveness and CPU usage
- Event log is capped at 1000 events to prevent memory growth
- Frontend uses React.memo and useMemo to prevent unnecessary re-renders
- LLM calls are debounced to avoid overwhelming the API

### Security Considerations

- API endpoints validate all input with Pydantic models
- CORS configured to allow only trusted origins
- No sensitive data stored in event logs
- OpenAI API key stored in environment variables
- URL validation in Tentacle module to prevent malicious redirects

### Future Extensibility

- New modules can be added by implementing the Module interface
- Event types can be extended without modifying existing modules
- Frontend components are designed to be reusable
- Module capabilities can be dynamically queried from the registry
- Event bus can be swapped for external message broker without changing module code
