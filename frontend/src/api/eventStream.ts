// Server-Sent Events (SSE) connection for real-time event updates

import type { Event } from "../types";

type EventCallback = (event: Event) => void;
type ErrorCallback = (error: Error) => void;

export class EventStream {
  private eventSource: EventSource | null = null;
  private url: string;
  private callbacks: EventCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second

  constructor(url: string = "/api/events/stream") {
    this.url = url;
  }

  // Connect to the event stream
  connect(): void {
    if (this.eventSource) {
      return; // Already connected
    }

    try {
      this.eventSource = new EventSource(this.url);

      this.eventSource.onmessage = (event) => {
        try {
          const data: Event = JSON.parse(event.data);
          this.callbacks.forEach((callback) => callback(data));
          this.reconnectAttempts = 0; // Reset on successful message
        } catch (error) {
          console.error("Failed to parse event data:", error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error("EventSource error:", error);
        this.handleError(new Error("EventSource connection error"));
        this.reconnect();
      };

      this.eventSource.onopen = () => {
        console.log("EventSource connected");
        this.reconnectAttempts = 0;
      };
    } catch (error) {
      this.handleError(
        error instanceof Error ? error : new Error("Failed to connect")
      );
    }
  }

  // Disconnect from the event stream
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  // Subscribe to events
  subscribe(callback: EventCallback): () => void {
    this.callbacks.push(callback);
    // Return unsubscribe function
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  // Subscribe to errors
  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.push(callback);
    // Return unsubscribe function
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter((cb) => cb !== callback);
    };
  }

  // Handle errors
  private handleError(error: Error): void {
    this.errorCallbacks.forEach((callback) => callback(error));
  }

  // Reconnect with exponential backoff
  private reconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      this.handleError(new Error("Failed to reconnect after multiple attempts"));
      return;
    }

    this.disconnect();
    this.reconnectAttempts++;

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Check if connected
  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }
}

// Singleton instance
export const eventStream = new EventStream();
