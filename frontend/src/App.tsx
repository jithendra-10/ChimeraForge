import { useModules } from "./hooks/useModules";
import { useEventStream } from "./hooks/useEventStream";
import {
  CreatureCanvas,
  ModuleControls,
  EventLog,
  WebcamPanel,
} from "./components";
import { MouthModule } from "./modules/MouthModule";
import { EarModule } from "./modules/EarModule";
import { useEffect, useRef, useState } from "react";
import { apiClient } from "./api/client";
import type { VisionEventPayload } from "./types";

function App() {
  const { modules, loading, error, toggleModule } = useModules();
  const { events, connected } = useEventStream();
  const mouthModuleRef = useRef<MouthModule | null>(null);
  const earModuleRef = useRef<EarModule | null>(null);
  const [activeProcessing, setActiveProcessing] = useState<Set<string>>(new Set());
  const [detections, setDetections] = useState<VisionEventPayload[]>([]);

  const eyeModule = modules.find((m) => m.id === "eye");
  const eyeEnabled = eyeModule?.enabled || false;

  const mouthModule = modules.find((m) => m.id === "mouth");
  const mouthEnabled = mouthModule?.enabled || false;

  const earModule = modules.find((m) => m.id === "ear");
  const earEnabled = earModule?.enabled || false;

  // Track active processing based on recent events
  useEffect(() => {
    if (events.length === 0) return;

    const latestEvent = events[0];
    const processing = new Set<string>();

    // Check for vision events (Eye is processing)
    if (latestEvent.type === "VISION_EVENT") {
      processing.add("eye");
      // Update detections for WebcamPanel
      const payload = latestEvent.payload as VisionEventPayload;
      setDetections([payload]);
    }

    // Check for system action events (Brain is processing)
    if (latestEvent.type === "SYSTEM_ACTION") {
      processing.add("brain");
    }

    setActiveProcessing(processing);

    // Clear processing indicators after a delay
    const timeout = setTimeout(() => {
      setActiveProcessing(new Set());
    }, 2000);

    return () => clearTimeout(timeout);
  }, [events]);

  // Initialize MouthModule
  useEffect(() => {
    if (!mouthModuleRef.current) {
      mouthModuleRef.current = new MouthModule();
      mouthModuleRef.current.initialize();
    }

    return () => {
      if (mouthModuleRef.current) {
        mouthModuleRef.current.destroy();
        mouthModuleRef.current = null;
      }
    };
  }, []);

  // Initialize EarModule with event bus
  useEffect(() => {
    if (!earModuleRef.current) {
      // Create a simple event bus for the Ear module
      const eventBus = {
        publish: async (event: any) => {
          // Send audio event to backend
          try {
            await apiClient.publishEvent({
              source_module: event.source_module,
              type: event.type,
              payload: event.payload,
            });
          } catch (err) {
            console.error("Failed to publish audio event:", err);
          }
        },
      };
      
      earModuleRef.current = new EarModule(eventBus);
    }

    return () => {
      if (earModuleRef.current) {
        earModuleRef.current.disable();
        earModuleRef.current = null;
      }
    };
  }, []);

  // Update MouthModule enabled state
  useEffect(() => {
    if (mouthModuleRef.current) {
      mouthModuleRef.current.setEnabled(mouthEnabled);
    }
  }, [mouthEnabled]);

  // Update EarModule enabled state
  useEffect(() => {
    if (earModuleRef.current) {
      if (earEnabled) {
        earModuleRef.current.enable();
      } else {
        earModuleRef.current.disable();
      }
    }
  }, [earEnabled]);

  // Handle events for MouthModule
  useEffect(() => {
    if (mouthModuleRef.current && events.length > 0) {
      const latestEvent = events[0];
      mouthModuleRef.current.handleEvent(latestEvent);
    }
  }, [events]);



  // Handle webcam frame capture and send to backend
  const handleFrame = async (frameData: string) => {
    if (!eyeEnabled) return;

    try {
      await apiClient.processVisionFrame({ frame: frameData });
    } catch (err) {
      console.error("Failed to process vision frame:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl text-neon-green mb-4">⚡</div>
          <p className="text-gray-400">Loading ChimeraForge...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-dark-bg text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl text-red-400 mb-4">⚠</div>
          <p className="text-red-400">Error: {error.message}</p>
          <p className="text-gray-500 mt-2">
            Make sure the backend is running on port 8000
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg text-white p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-neon-green mb-2">
              ChimeraForge
            </h1>
            <p className="text-gray-400">Modular AI Creature System</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${connected ? "bg-green-400" : "bg-red-400"
                  }`}
              />
              <span className="text-sm text-gray-400">
                {connected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <CreatureCanvas modules={modules} activeProcessing={activeProcessing} />
          <ModuleControls modules={modules} onToggle={toggleModule} />
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <WebcamPanel
            eyeEnabled={eyeEnabled}
            onFrame={handleFrame}
            detections={detections}
          />
          <EventLog events={events} />
        </div >
      </div >
    </div >
  );
}

export default App;
