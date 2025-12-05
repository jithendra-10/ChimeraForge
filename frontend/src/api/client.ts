// API client for backend communication

import type {
  ModuleInfo,
  Event,
  VisionFrameRequest,
  VisionFrameResponse,
  PublishEventRequest,
} from "../types";

const API_BASE_URL = "/api";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Get all modules
  async getModules(): Promise<ModuleInfo[]> {
    return this.request<ModuleInfo[]>("/modules");
  }

  // Toggle a module's state
  async toggleModule(moduleId: string): Promise<ModuleInfo> {
    return this.request<ModuleInfo>(`/modules/${moduleId}/toggle`, {
      method: "POST",
    });
  }

  // Publish an event
  async publishEvent(event: PublishEventRequest): Promise<Event> {
    return this.request<Event>("/events", {
      method: "POST",
      body: JSON.stringify(event),
    });
  }

  // Process a vision frame
  async processVisionFrame(
    request: VisionFrameRequest
  ): Promise<VisionFrameResponse> {
    return this.request<VisionFrameResponse>("/vision/frame", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  // Get event logs
  async getLogs(limit: number = 50): Promise<Event[]> {
    return this.request<Event[]>(`/logs?limit=${limit}`);
  }
}

export const apiClient = new ApiClient();
