# ChimeraForge Backend - FastAPI Application
"""
FastAPI application for ChimeraForge backend.

Provides REST API endpoints for module management, event publishing,
vision processing, and real-time event streaming via SSE.
"""

import asyncio
import json
import os
from contextlib import asynccontextmanager
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from backend.core.event_bus import Event, EventBus, EventType
from backend.core.module_registry import ModuleInfo, ModuleRegistry
from backend.modules.eye import EyeModule
from backend.modules.brain import BrainModule

# Load environment variables from .env file
# Get the directory where this file is located (backend/)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, '.env')
load_dotenv(ENV_PATH)


# Pydantic models for API requests/responses

class PublishEventRequest(BaseModel):
    """Request model for publishing events."""
    source_module: str = Field(..., description="Module publishing the event")
    type: str = Field(..., description="Event type")
    payload: dict = Field(..., description="Event payload data")


class VisionFrameRequest(BaseModel):
    """Request model for vision frame processing."""
    frame: str = Field(..., description="Base64-encoded image data")


class VisionFrameResponse(BaseModel):
    """Response model for vision frame processing."""
    events_generated: List[dict] = Field(..., description="Events generated during processing")
    processing_time_ms: float = Field(..., description="Processing time in milliseconds")


class EventResponse(BaseModel):
    """Response model for events."""
    id: str
    source_module: str
    type: str
    timestamp: str
    payload: dict


class ErrorResponse(BaseModel):
    """Response model for errors."""
    error_type: str
    message: str
    details: Optional[dict] = None


# Global instances
event_bus: EventBus
module_registry: ModuleRegistry
eye_module: EyeModule
brain_module: Optional[BrainModule] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI application.
    Initializes and cleans up global resources.
    """
    global event_bus, module_registry, eye_module, brain_module
    
    # Initialize core components
    event_bus = EventBus(max_log_size=1000)
    module_registry = ModuleRegistry()
    
    # Initialize Eye module
    eye_module = EyeModule(event_bus, module_registry)
    
    # Initialize Brain module (if API key available)
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if api_key:
            brain_module = BrainModule(event_bus, module_registry, api_key)
            print("Brain module initialized with Gemini API")
        else:
            print("Warning: GEMINI_API_KEY not set, Brain module not initialized")
    except Exception as e:
        print(f"Warning: Failed to initialize Brain module: {e}")
    
    yield
    
    # Cleanup (if needed)
    pass


# Create FastAPI app
app = FastAPI(
    title="ChimeraForge",
    version="1.0.0",
    description="Modular AI system backend API",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Helper functions

def event_to_dict(event: Event) -> dict:
    """Convert Event object to dictionary for JSON serialization."""
    return {
        "id": event.id,
        "source_module": event.source_module,
        "type": event.type,
        "timestamp": event.timestamp.isoformat(),
        "payload": event.payload
    }


def module_info_to_dict(module: ModuleInfo) -> dict:
    """Convert ModuleInfo object to dictionary for JSON serialization."""
    return {
        "id": module.id,
        "name": module.name,
        "description": module.description,
        "enabled": module.enabled,
        "capabilities": module.capabilities
    }


# API Endpoints

@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "ChimeraForge Backend API", "version": "1.0.0"}


@app.get("/api/modules", response_model=List[dict])
def get_modules():
    """
    Get list of all modules with their enabled states.
    
    Returns:
        List of module information objects
    """
    modules = module_registry.get_all_modules()
    return [module_info_to_dict(m) for m in modules]


@app.post("/api/modules/{module_id}/toggle", response_model=dict)
async def toggle_module(module_id: str):
    """
    Toggle the enabled state of a module.
    
    Args:
        module_id: ID of the module to toggle
        
    Returns:
        Updated module information
        
    Raises:
        HTTPException: If module_id is not found or operation fails
    """
    try:
        # Validate module_id
        if not module_id or not isinstance(module_id, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid module_id: must be a non-empty string"
            )
        
        module = module_registry.toggle_module(module_id)
        
        if module is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Module '{module_id}' not found"
            )
        
        # Publish MODULE_STATE_CHANGED event
        event = Event.create(
            source_module="system",
            type=EventType.MODULE_STATE_CHANGED,
            payload={
                "module_id": module_id,
                "enabled": module.enabled
            }
        )
        await event_bus.publish(event)
        
        return module_info_to_dict(module)
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log unexpected errors with context
        print(f"Error toggling module {module_id}: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle module: {str(e)}"
        )


@app.post("/api/events", response_model=dict)
async def publish_event(request: PublishEventRequest):
    """
    Publish an event to the event bus.
    
    Args:
        request: Event data to publish
        
    Returns:
        Published event information
        
    Raises:
        HTTPException: If validation fails or publishing fails
    """
    try:
        # Validate input
        if not request.source_module or not isinstance(request.source_module, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid source_module: must be a non-empty string"
            )
        
        if not request.type or not isinstance(request.type, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid type: must be a non-empty string"
            )
        
        if not isinstance(request.payload, dict):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payload: must be a dictionary"
            )
        
        # Create and publish event
        event = Event.create(
            source_module=request.source_module,
            type=request.type,
            payload=request.payload
        )
        
        await event_bus.publish(event)
        
        return event_to_dict(event)
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log unexpected errors with context
        print(f"Error publishing event from {request.source_module}: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to publish event: {str(e)}"
        )


@app.post("/api/vision/frame", response_model=VisionFrameResponse)
async def process_vision_frame(request: VisionFrameRequest):
    """
    Process a webcam frame through Eye and Brain modules.
    
    Args:
        request: Base64-encoded image frame
        
    Returns:
        Processing results including generated events
        
    Raises:
        HTTPException: If validation fails or processing fails
    """
    import time
    start_time = time.time()
    
    try:
        # Validate input
        if not request.frame or not isinstance(request.frame, str):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid frame: must be a non-empty base64-encoded string"
            )
        
        # Check if frame data looks like base64
        if len(request.frame) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid frame: data too short to be a valid image"
            )
        
        # Get initial event count
        initial_event_count = len(event_bus.get_all_events())
        
        # Process frame through Eye module
        await eye_module.process_frame(request.frame)
        
        # Wait a bit for Brain module to process (if enabled)
        await asyncio.sleep(0.1)
        
        # Get events generated during processing
        all_events = event_bus.get_all_events()
        new_events = all_events[initial_event_count:]
        
        # Calculate processing time
        processing_time_ms = (time.time() - start_time) * 1000
        
        return VisionFrameResponse(
            events_generated=[event_to_dict(e) for e in new_events],
            processing_time_ms=processing_time_ms
        )
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log unexpected errors with context
        print(f"Error processing vision frame: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process frame: {str(e)}"
        )


@app.get("/api/logs", response_model=List[dict])
def get_logs(limit: int = 50):
    """
    Get recent events from the event bus log.
    
    Args:
        limit: Maximum number of events to return (default: 50)
        
    Returns:
        List of recent events
        
    Raises:
        HTTPException: If validation fails or retrieval fails
    """
    try:
        # Validate limit parameter
        if limit < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid limit: must be a positive integer"
            )
        
        if limit > 10000:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid limit: maximum value is 10000"
            )
        
        events = event_bus.get_recent_events(limit=limit)
        return [event_to_dict(e) for e in events]
    
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log unexpected errors with context
        print(f"Error retrieving logs (limit={limit}): {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve logs: {str(e)}"
        )


@app.get("/api/events/stream")
async def stream_events():
    """
    Server-Sent Events (SSE) endpoint for real-time event streaming.
    
    Returns:
        StreamingResponse with event stream
    """
    async def event_generator():
        """Generate SSE events from the event bus."""
        # Track last seen event index
        last_index = len(event_bus.get_all_events())
        
        try:
            while True:
                try:
                    # Get all events
                    all_events = event_bus.get_all_events()
                    
                    # Send new events
                    if len(all_events) > last_index:
                        new_events = all_events[last_index:]
                        for event in new_events:
                            try:
                                event_data = json.dumps(event_to_dict(event))
                                yield f"data: {event_data}\n\n"
                            except Exception as e:
                                # Log error serializing individual event but continue
                                print(f"Error serializing event {event.id}: {type(e).__name__}: {e}")
                        
                        last_index = len(all_events)
                    
                    # Wait before checking for new events
                    await asyncio.sleep(0.1)
                
                except Exception as e:
                    # Log error but keep stream alive for graceful degradation
                    print(f"Error in SSE event generator: {type(e).__name__}: {e}")
                    await asyncio.sleep(1)  # Wait longer on error
        
        except asyncio.CancelledError:
            # Client disconnected - this is normal
            print("SSE client disconnected")
        except Exception as e:
            # Log unexpected errors
            print(f"Fatal error in SSE stream: {type(e).__name__}: {e}")
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )
