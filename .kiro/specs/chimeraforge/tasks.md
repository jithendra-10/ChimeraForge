# Implementation Plan

- [x] 1. Set up project structure and dependencies





  - Create backend directory with FastAPI project structure
  - Create frontend directory with React + TypeScript + Vite
  - Install backend dependencies: fastapi, uvicorn, opencv-python, openai, pydantic, python-multipart
  - Install frontend dependencies: react, typescript, tailwind, framer-motion
  - Set up environment configuration for OpenAI API key
  - _Requirements: All_

- [-] 2. Implement Event Bus core


- [x] 2.1 Create Event and EventBus classes



  - Implement Event data model with id, source_module, type, timestamp, payload
  - Implement EventBus with publish, subscribe, unsubscribe methods
  - Implement in-memory event log with 1000 event limit
  - Implement async event delivery to subscribers
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2.2 Write property test for event UUID uniqueness






  - **Property 16: Event UUID uniqueness**
  - **Validates: Requirements 6.1**

- [x] 2.3 Write property test for event delivery






  - **Property 17: Event delivery to all subscribers**
  - **Validates: Requirements 6.2**

- [x] 2.4 Write property test for event storage structure






  - **Property 18: Event storage structure**
  - **Validates: Requirements 6.3, 6.4**

- [x] 2.5 Write property test for event log size limit






  - **Property 19: Event log size limit**
  - **Validates: Requirements 6.5**

- [x] 2.6 Write property test for event delivery timing






  - **Property 6: Event delivery timing**
  - **Validates: Requirements 2.5**

- [x] 3. Implement Module Registry




- [x] 3.1 Create ModuleInfo and ModuleRegistry classes


  - Implement ModuleInfo data model with id, name, description, enabled, capabilities
  - Implement ModuleRegistry with get_all_modules, get_module, toggle_module, is_enabled methods
  - Initialize registry with all four modules in disabled state
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 3.2 Write property test for module toggle state persistence






  - **Property 1: Module toggle state persistence**
  - **Validates: Requirements 1.1, 1.2, 1.5**

- [-] 4. Implement Eye Module


- [x] 4.1 Create EyeModule class with face detection



  - Implement EyeModule with OpenCV face detection
  - Implement process_frame method accepting base64 images
  - Implement detect_face method returning FaceDetection results
  - Implement event publishing for VISION_EVENT
  - Subscribe to module state changes from registry
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4.2 Write property test for Eye frame processing






  - **Property 4: Eye module processes all frames when enabled**
  - **Validates: Requirements 2.1**

- [ ]* 4.3 Write property test for vision event publishing
  - **Property 5: Vision events published on detection**
  - **Validates: Requirements 2.2, 2.4**

- [ ]* 4.4 Write property test for disabled Eye module
  - **Property 3: Disabled modules ignore events**
  - **Validates: Requirements 2.3**

- [-] 5. Implement Brain Module


- [x] 5.1 Create BrainModule class with LLM integration



  - Implement BrainModule with OpenAI API client
  - Implement on_event handler for VISION_EVENT
  - Implement generate_response method with LLM reasoning
  - Implement SYSTEM_ACTION event publishing with speak and open_url fields
  - Subscribe to VISION_EVENT from event bus
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5.2 Write property test for Brain response generation






  - **Property 7: Brain generates responses for vision events**
  - **Validates: Requirements 3.1**

- [ ]* 5.3 Write property test for Brain action publishing
  - **Property 8: Brain publishes system actions**
  - **Validates: Requirements 3.2**

- [ ]* 5.4 Write property test for Brain action payload structure
  - **Property 9: Brain action payload structure**
  - **Validates: Requirements 3.4, 3.5**

- [ ]* 5.5 Write property test for disabled Brain module
  - **Property 3: Disabled modules ignore events**
  - **Validates: Requirements 3.3**

- [x] 6. Implement FastAPI application and endpoints








- [x] 6.1 Create FastAPI app with CORS and routes



  - Implement GET /api/modules endpoint
  - Implement POST /api/modules/{module_id}/toggle endpoint
  - Implement POST /api/events endpoint
  - Implement POST /api/vision/frame endpoint
  - Implement GET /api/logs endpoint
  - Implement GET /api/events/stream SSE endpoint
  - Wire up event bus and module registry
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 6.2 Write property test for API module toggle






  - **Property 27: API module toggle behavior**
  - **Validates: Requirements 10.2**

- [ ]* 6.3 Write property test for API event publishing
  - **Property 28: API event publishing**
  - **Validates: Requirements 10.3**

- [ ]* 6.4 Write property test for API vision frame processing
  - **Property 29: API vision frame processing**
  - **Validates: Requirements 10.4**

- [ ]* 6.5 Write property test for API log retrieval
  - **Property 30: API log retrieval**
  - **Validates: Requirements 10.5**

- [ ]* 6.6 Write property test for API error handling
  - **Property 33: API error handling**
  - **Validates: Requirements 12.5**

- [-] 7. Implement error handling across backend


- [x] 7.1 Add error handling to all modules



  - Wrap module processing in try-catch blocks
  - Implement ERROR event publishing on failures
  - Add error logging with context
  - Implement graceful degradation for module failures
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 7.2 Write property test for module error event publishing






  - **Property 31: Module error event publishing**
  - **Validates: Requirements 12.1**

- [x] 7.3 Write property test for system resilience






  - **Property 32: System resilience to module failures**
  - **Validates: Requirements 12.2**

- [x] 8. Checkpoint - Backend core complete





  - Ensure all backend tests pass
  - Verify event bus, modules, and API are working
  - Ask the user if questions arise



- [x] 9. Set up React frontend structure


- [x] 9.1 Create React app with TypeScript and Tailwind

  - Set up Vite project with React and TypeScript
  - Configure Tailwind CSS with dark theme and neon green accents
  - Create component directory structure
  - Set up API client for backend communication
  - Implement SSE connection for real-time events
  - _Requirements: 11.1, 11.3_

- [x] 10. Implement frontend Mouth Module




- [x] 10.1 Create MouthModule class with Web Speech API


  - Implement MouthModule with browser SpeechSynthesis API
  - Implement speak method for text-to-speech
  - Subscribe to SYSTEM_ACTION events with speak field
  - Publish SPEECH_COMPLETE events after TTS finishes
  - Handle empty/null speak text gracefully
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 10.2 Write property test for Mouth text-to-speech







  - **Property 10: Mouth converts text to speech**
  - **Validates: Requirements 4.1**

- [x] 10.3 Write property test for Mouth completion events






  - **Property 11: Mouth publishes completion events**
  - **Validates: Requirements 4.4**

- [x] 10.4 Write property test for disabled Mouth module






  - **Property 3: Disabled modules ignore events**
  - **Validates: Requirements 4.2**

- [-] 11. Implement frontend Tentacle Module


- [x] 11.1 Create TentacleModule class for web actions



  - Implement TentacleModule with window.open for URLs
  - Subscribe to SYSTEM_ACTION events with open_url field
  - Implement URL validation and error handling
  - Publish ACTION_COMPLETE events after actions
  - Publish ACTION_ERROR events for invalid URLs
  - Implement search query URL construction
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 11.2 Write property test for Tentacle URL opening






  - **Property 12: Tentacle opens URLs**
  - **Validates: Requirements 5.1**

- [x] 11.3 Write property test for Tentacle completion events






  - **Property 13: Tentacle publishes completion events**
  - **Validates: Requirements 5.3**

- [x] 11.4 Write property test for Tentacle invalid URL handling






  - **Property 14: Tentacle handles invalid URLs**
  - **Validates: Requirements 5.4**

- [x] 11.5 Write property test for Tentacle search URLs






  - **Property 15: Tentacle constructs search URLs**
  - **Validates: Requirements 5.5**

- [x] 11.6 Write property test for disabled Tentacle module






  - **Property 3: Disabled modules ignore events**
  - **Validates: Requirements 5.2**
-

- [x] 12. Implement Module Controls component



- [x] 12.1 Create ModuleControls component

  - Implement toggle switches for each module
  - Display module name, description, and enabled state
  - Call API to toggle module state on user interaction
  - Show loading state during toggle operations
  - Apply spooky styling with hover effects
  - _Requirements: 1.1, 1.2, 11.4_

- [x] 12.2 Write unit tests for ModuleControls component





  - Test toggle interaction
  - Test loading states
  - Test API error handling

- [-] 13. Implement Creature Canvas component


- [x] 13.1 Create CreatureCanvas component with SVG creature




  - Design SVG creature with Eye, Brain, Mouth, Tentacle components
  - Implement glowing effects for enabled modules
  - Implement dimmed state for disabled modules
  - Add processing indicator for active Eye module
  - Implement state transition animations with Framer Motion
  - Apply spooky visual effects and electric animations
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 11.2_

- [x] 13.2 Write property test for creature canvas module state






  - **Property 20: Creature canvas reflects module state**
  - **Validates: Requirements 7.1, 7.2**

- [x] 13.3 Write property test for creature canvas processing indicators






  - **Property 21: Creature canvas shows processing indicators**
  - **Validates: Requirements 7.5**

- [x] 13.4 Write property test for module state change timing






  - **Property 2: Module state change propagation timing**
  - **Validates: Requirements 1.3**

- [x] 14. Implement Event Log Panel component




- [x] 14.1 Create EventLog component

  - Display events in reverse chronological order
  - Show event type, source module, timestamp, and payload
  - Implement color coding by event type
  - Add expandable payload view
  - Implement auto-scroll to latest events
  - Add scrolling for more than 50 events
  - Update within 200ms of new events
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 14.2 Write property test for event log display timing













  - **Property 22: Event log display timing**
  - **Validates: Requirements 8.1**

- [x] 14.3 Write property test for event log ordering






  - **Property 23: Event log chronological ordering**
  - **Validates: Requirements 8.2**

- [x] 14.4 Write property test for event log entry structure






  - **Property 24: Event log entry structure**
  - **Validates: Requirements 8.3**

- [x] 15. Implement Webcam Panel component





- [x] 15.1 Create WebcamPanel component


  - Implement webcam access using MediaDevices API
  - Display live video feed when Eye module enabled
  - Show placeholder message when Eye module disabled
  - Capture frames at 2 FPS and send to backend
  - Display bounding boxes for detected faces
  - Show "Eye active" indicator
  - Handle webcam access denied errors
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 15.2 Write property test for webcam panel Eye state
  - **Property 25: Webcam panel reflects Eye module state**
  - **Validates: Requirements 9.1, 9.2**

- [x] 15.3 Write property test for webcam panel detection overlays



  - **Property 26: Webcam panel shows detection overlays**
  - **Validates: Requirements 9.3**

- [x] 16. Integrate all components in main App




- [x] 16.1 Create main App component layout

  - Arrange CreatureCanvas, ModuleControls, EventLog, and WebcamPanel
  - Implement SSE connection to receive real-time events
  - Set up state management for modules and events
  - Initialize frontend Mouth and Tentacle modules
  - Apply consistent spooky theme across all components
  - _Requirements: 11.1, 11.3_

- [x] 16.2 Write integration tests for full workflows






  - Test vision pipeline: frame → detection → reasoning → speech
  - Test module enable/disable affecting event processing
  - Test error recovery scenarios

- [x] 17. Final checkpoint - All tests passing





  - Ensure all backend property tests pass
  - Ensure all frontend property tests pass
  - Ensure all unit tests pass
  - Ensure all integration tests pass
  - Ask the user if questions arise
