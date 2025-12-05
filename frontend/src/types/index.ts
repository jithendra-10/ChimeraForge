// Type definitions for ChimeraForge

export type ModuleId = "eye" | "brain" | "mouth" | "ear" | "tentacle";

export type EventType =
  | "VISION_EVENT"
  | "HEARING_EVENT"
  | "SYSTEM_ACTION"
  | "SPEECH_COMPLETE"
  | "ACTION_COMPLETE"
  | "ACTION_ERROR"
  | "MODULE_STATE_CHANGED"
  | "ERROR";

export interface HearingPayload {
  text: string;
  confidence: number;
  isFinal: boolean;
}

export interface ModuleInfo {
  id: ModuleId;
  name: string;
  description: string;
  enabled: boolean;
  capabilities: string[];
  status?: "idle" | "processing" | "error";
  last_active?: string;
}

export interface Event {
  id: string;
  source_module: string;
  type: EventType;
  timestamp: string;
  payload: any;
}

export interface VisionEventPayload {
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

export interface SystemActionPayload {
  text: string;
  speak?: string;
  open_url?: string;
  reasoning?: string;
}

export interface ErrorPayload {
  error_type: string;
  message: string;
  details?: any;
}

export interface VisionFrameRequest {
  frame: string; // base64 encoded image
}

export interface VisionFrameResponse {
  events_generated: Event[];
  processing_time_ms: number;
}

export interface PublishEventRequest {
  source_module: string;
  type: string;
  payload: any;
}
