// Mouth Module - Text-to-speech using Web Speech API

import type { Event, SystemActionPayload } from "../types";
import { apiClient } from "../api/client";

export class MouthModule {
  private synthesis: SpeechSynthesis;
  private enabled: boolean = false;
  private unsubscribe: (() => void) | null = null;

  constructor() {
    this.synthesis = window.speechSynthesis;
  }

  // Initialize the module and subscribe to events
  initialize(): void {
    this.unsubscribe = () => {
      // Placeholder for unsubscribe logic
      // The actual event subscription is handled by the parent component
    };
    
    // Store the callback for event handling
    this.handleEvent = this.handleEvent.bind(this);
  }

  // Set the enabled state of the module
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  // Handle incoming events
  async handleEvent(event: Event): Promise<void> {
    // Only process events if module is enabled
    if (!this.enabled) {
      return;
    }

    // Only handle SYSTEM_ACTION events
    if (event.type !== "SYSTEM_ACTION") {
      return;
    }

    const payload = event.payload as SystemActionPayload;

    // Check if there's a speak field
    if (!payload.speak) {
      return;
    }

    try {
      await this.speak(payload.speak);
      await this.publishSpeechComplete();
    } catch (error) {
      console.error("Mouth module error:", error);
      await this.publishError(error instanceof Error ? error.message : "Unknown error");
    }
  }

  // Convert text to speech
  async speak(text: string): Promise<void> {
    // Handle empty/null speak text gracefully
    if (!text || text.trim().length === 0) {
      return;
    }

    // Cancel any ongoing speech
    this.stop();

    return new Promise((resolve, reject) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text);

        utterance.onend = () => {
          resolve();
        };

        utterance.onerror = (event) => {
          reject(new Error(`Speech synthesis error: ${event.error}`));
        };

        this.synthesis.speak(utterance);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Stop current speech
  stop(): void {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
  }

  // Check if currently speaking
  isSpeaking(): boolean {
    return this.synthesis.speaking;
  }

  // Publish SPEECH_COMPLETE event
  private async publishSpeechComplete(): Promise<void> {
    try {
      await apiClient.publishEvent({
        source_module: "mouth",
        type: "SPEECH_COMPLETE",
        payload: {
          completed_at: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Failed to publish SPEECH_COMPLETE event:", error);
    }
  }

  // Publish error event
  private async publishError(message: string): Promise<void> {
    try {
      await apiClient.publishEvent({
        source_module: "mouth",
        type: "ACTION_ERROR",
        payload: {
          error_type: "speech_synthesis",
          message,
        },
      });
    } catch (error) {
      console.error("Failed to publish error event:", error);
    }
  }

  // Cleanup
  destroy(): void {
    this.stop();
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
