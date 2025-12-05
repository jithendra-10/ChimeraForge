/**
 * Ear Module - Voice input using Web Speech Recognition API
 * 
 * Listens to microphone input, converts speech to text,
 * and publishes AUDIO_EVENT to the event bus.
 */

import { EventBus, Event } from '../types';

export class EarModule {
  private eventBus: EventBus;
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private enabled: boolean = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    // Check if browser supports Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error('Speech Recognition not supported in this browser');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true; // Keep listening
    this.recognition.interimResults = false; // Only final results
    this.recognition.lang = 'en-US';

    // Handle speech recognition results
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results.length - 1;
      const transcript = event.results[last][0].transcript;
      const confidence = event.results[last][0].confidence;

      console.log(`Ear: Heard "${transcript}" (confidence: ${confidence})`);

      // Publish AUDIO_EVENT
      this.publishAudioEvent(transcript, confidence);
    };

    // Handle errors
    this.recognition.onerror = (event: any) => {
      console.error('Ear: Speech recognition error:', event.error);
      
      // Publish error event
      this.eventBus.publish({
        id: crypto.randomUUID(),
        source_module: 'ear',
        type: 'ACTION_ERROR',
        timestamp: new Date().toISOString(),
        payload: {
          error_type: 'speech_recognition',
          message: `Speech recognition error: ${event.error}`,
        },
      });
    };

    // Handle end of recognition
    this.recognition.onend = () => {
      console.log('Ear: Recognition ended');
      // Restart if still enabled
      if (this.enabled && this.isListening) {
        console.log('Ear: Restarting recognition...');
        this.startListening();
      }
    };
  }

  /**
   * Start listening to microphone
   */
  public startListening(): void {
    if (!this.recognition) {
      console.error('Ear: Speech recognition not initialized');
      return;
    }

    if (this.isListening) {
      console.log('Ear: Already listening');
      return;
    }

    try {
      this.recognition.start();
      this.isListening = true;
      console.log('Ear: Started listening...');
    } catch (error) {
      console.error('Ear: Failed to start listening:', error);
    }
  }

  /**
   * Stop listening to microphone
   */
  public stopListening(): void {
    if (!this.recognition || !this.isListening) {
      return;
    }

    try {
      this.recognition.stop();
      this.isListening = false;
      console.log('Ear: Stopped listening');
    } catch (error) {
      console.error('Ear: Failed to stop listening:', error);
    }
  }

  /**
   * Enable the Ear module
   */
  public enable(): void {
    this.enabled = true;
    this.startListening();
  }

  /**
   * Disable the Ear module
   */
  public disable(): void {
    this.enabled = false;
    this.stopListening();
  }

  /**
   * Check if module is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Publish AUDIO_EVENT to event bus
   */
  private publishAudioEvent(transcript: string, confidence: number): void {
    const event: Event = {
      id: crypto.randomUUID(),
      source_module: 'ear',
      type: 'AUDIO_EVENT',
      timestamp: new Date().toISOString(),
      payload: {
        transcript,
        confidence,
        language: 'en-US',
      },
    };

    this.eventBus.publish(event);
  }
}
