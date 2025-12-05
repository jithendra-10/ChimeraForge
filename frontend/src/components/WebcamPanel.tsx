// Webcam Panel - Live webcam feed with face detection overlay

import { useEffect, useRef, useState } from "react";
import type { VisionEventPayload } from "../types";

interface WebcamPanelProps {
  eyeEnabled: boolean;
  onFrame?: (frameData: string) => void;
  detections?: VisionEventPayload[];
}

export function WebcamPanel({
  eyeEnabled,
  onFrame,
  detections = [],
}: WebcamPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(false);

  // Initialize webcam when Eye module is enabled
  useEffect(() => {
    if (eyeEnabled && !streamRef.current) {
      initializeWebcam();
    } else if (!eyeEnabled && streamRef.current) {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [eyeEnabled]);

  // Start frame capture at 2 FPS when Eye is enabled
  useEffect(() => {
    if (eyeEnabled && hasPermission && onFrame) {
      // Capture frames at 2 FPS (every 500ms)
      intervalRef.current = window.setInterval(() => {
        captureFrame();
      }, 500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [eyeEnabled, hasPermission, onFrame]);

  const initializeWebcam = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to access webcam";
      setError(errorMessage);
      setHasPermission(false);
      console.error("Webcam access error:", err);
    }
  };

  const stopWebcam = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setHasPermission(false);
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current || !onFrame) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const frameData = canvas.toDataURL("image/jpeg", 0.8);
    onFrame(frameData);
  };

  // Draw bounding boxes for detected faces
  useEffect(() => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear previous drawings
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bounding boxes for each detection
    detections.forEach((detection) => {
      if (detection.detected && detection.bounding_box) {
        const { x, y, width, height } = detection.bounding_box;

        // Scale bounding box to canvas dimensions
        const scaleX = canvas.width / video.videoWidth || 1;
        const scaleY = canvas.height / video.videoHeight || 1;

        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        const scaledWidth = width * scaleX;
        const scaledHeight = height * scaleY;

        // Draw bounding box
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 3;
        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

        // Draw confidence label if available
        if (detection.confidence !== undefined) {
          ctx.fillStyle = "#00ff00";
          ctx.font = "16px monospace";
          ctx.fillText(
            `${Math.round(detection.confidence * 100)}%`,
            scaledX,
            scaledY - 5
          );
        }
      }
    });
  }, [detections]);

  return (
    <div className="bg-dark-panel rounded-lg p-6 border border-gray-800">
      <h2 className="text-2xl font-bold text-neon-green mb-4">
        Webcam Feed
        {eyeEnabled && hasPermission && (
          <span className="ml-3 text-sm text-green-400 animate-pulse">
            ● Eye Active
          </span>
        )}
      </h2>

      <div className="relative">
        {error ? (
          <div className="flex items-center justify-center h-64 bg-dark-bg rounded border border-red-500">
            <div className="text-center">
              <p className="text-red-400 mb-2">Webcam Access Denied</p>
              <p className="text-gray-500 text-sm">{error}</p>
            </div>
          </div>
        ) : eyeEnabled ? (
          <div className="relative bg-dark-bg rounded border border-gray-700 overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-auto"
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full pointer-events-none"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 bg-dark-bg rounded border border-gray-700">
            <p className="text-gray-500">Enable Eye module to activate webcam</p>
          </div>
        )}
      </div>
    </div>
  );
}
