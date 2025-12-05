// Ear Module - Speech-to-text using Web Speech API

import { apiClient } from "../api/client";

// Define SpeechRecognition types since they might not be in standard lib
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    webkitSpeechRecognition: {
      new(): SpeechRecognition;
    };
    SpeechRecognition: {
      new(): SpeechRecognition;
    };
  }
}

export class EarModule {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private onStateChange: ((isListening: boolean) => void) | null = null;

  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.setupRecognition();
    } else {
      console.error("Web Speech API not supported in this browser");
      // Ideally we should notify the user via UI
    }
  }

  private setupRecognition() {
    if (!this.recognition) return;

    this.recognition.continuous = true; // Keep listening
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex][0];
      const transcript = result.transcript;
      const confidence = result.confidence;

      console.log(`Ear heard: "${transcript}" (${confidence})`);

      if (transcript.trim().length > 0) {
        await this.publishHearingEvent(transcript, confidence);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      this.stop();
    };

    this.recognition.onend = () => {
      // If we are supposed to be listening, restart
      if (this.isListening) {
        console.log("Speech recognition ended, restarting...");
        try {
          this.recognition?.start();
        } catch (e) {
          console.error("Failed to restart recognition:", e);
          this.isListening = false;
          if (this.onStateChange) this.onStateChange(false);
        }
      } else {
        if (this.onStateChange) this.onStateChange(false);
      }
    };
  }

  public start() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
        this.isListening = true;
        if (this.onStateChange) {
          this.onStateChange(true);
        }
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
      }
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      if (this.onStateChange) {
        this.onStateChange(false);
      }
    }
  }

  public toggle() {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }

  public setOnStateChange(callback: (isListening: boolean) => void) {
    this.onStateChange = callback;
  }

  private async publishHearingEvent(text: string, confidence: number) {
    try {
      await apiClient.publishEvent({
        source_module: "ear",
        type: "HEARING_EVENT",
        payload: {
          text,
          confidence,
          isFinal: true
        }
      });
    } catch (error) {
      console.error("Failed to publish HEARING_EVENT:", error);
    }
  }
}
