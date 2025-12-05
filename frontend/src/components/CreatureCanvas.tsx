// Creature Canvas - Visual representation of the AI creature

import { motion } from "framer-motion";
import type { ModuleInfo } from "../types";

interface CreatureCanvasProps {
  modules: ModuleInfo[];
  activeProcessing?: Set<string>;
}

export function CreatureCanvas({ modules, activeProcessing = new Set() }: CreatureCanvasProps) {
  // Get module states
  const getModule = (id: string) => modules.find(m => m.id === id);
  const eye = getModule("eye");
  const brain = getModule("brain");
  const mouth = getModule("mouth");
  const ear = getModule("ear");

  // Check if modules are enabled
  const isEyeEnabled = eye?.enabled ?? false;
  const isBrainEnabled = brain?.enabled ?? false;
  const isMouthEnabled = mouth?.enabled ?? false;
  const isEarEnabled = ear?.enabled ?? false;

  // Check if modules are processing
  const isEyeProcessing = activeProcessing.has("eye");
  const isBrainProcessing = activeProcessing.has("brain");

  return (
    <div className="bg-dark-panel rounded-lg p-6 border border-gray-800">
      <h2 className="text-2xl font-bold text-neon-green mb-4">Creature</h2>
      <div className="flex items-center justify-center">
        <svg
          viewBox="0 0 400 400"
          className="w-full max-w-md"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Central body */}
          <motion.ellipse
            cx="200"
            cy="200"
            rx="80"
            ry="100"
            fill="#1a1a1a"
            stroke="#39FF14"
            strokeWidth="2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />

          {/* Eye Module - Top Left */}
          <g id="eye-module">
            {/* Glow effect */}
            <motion.circle
              cx="150"
              cy="150"
              r="30"
              fill={isEyeEnabled ? "#39FF14" : "#333"}
              opacity={isEyeEnabled ? 0.3 : 0.2}
              animate={
                isEyeEnabled
                  ? {
                      scale: [1, 1.1, 1],
                      opacity: [0.3, 0.5, 0.3],
                    }
                  : {}
              }
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Eye outer circle */}
            <motion.circle
              cx="150"
              cy="150"
              r="25"
              fill="none"
              stroke={isEyeEnabled ? "#39FF14" : "#555"}
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
            />
            {/* Eye pupil */}
            <motion.circle
              cx="150"
              cy="150"
              r="12"
              fill={isEyeEnabled ? "#39FF14" : "#333"}
              animate={
                isEyeEnabled
                  ? {
                      scale: [1, 0.8, 1],
                    }
                  : {}
              }
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Processing indicator */}
            {isEyeProcessing && (
              <motion.circle
                cx="150"
                cy="150"
                r="35"
                fill="none"
                stroke="#39FF14"
                strokeWidth="2"
                strokeDasharray="5,5"
                initial={{ rotate: 0 }}
                animate={{ rotate: 360 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}
            {/* Label */}
            <text
              x="150"
              y="190"
              textAnchor="middle"
              fill={isEyeEnabled ? "#39FF14" : "#666"}
              fontSize="12"
              fontWeight="bold"
            >
              EYE
            </text>
          </g>

          {/* Brain Module - Center */}
          <g id="brain-module">
            {/* Glow effect */}
            <motion.circle
              cx="200"
              cy="200"
              r="40"
              fill={isBrainEnabled ? "#39FF14" : "#333"}
              opacity={isBrainEnabled ? 0.3 : 0.2}
              animate={
                isBrainEnabled
                  ? {
                      scale: [1, 1.15, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }
                  : {}
              }
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Brain shape - simplified */}
            <motion.path
              d="M 200 170 Q 220 170 230 180 Q 235 190 230 200 Q 235 210 230 220 Q 220 230 200 230 Q 180 230 170 220 Q 165 210 170 200 Q 165 190 170 180 Q 180 170 200 170"
              fill="none"
              stroke={isBrainEnabled ? "#39FF14" : "#555"}
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeInOut" }}
            />
            {/* Brain details */}
            <motion.path
              d="M 190 180 Q 195 185 190 190"
              fill="none"
              stroke={isBrainEnabled ? "#39FF14" : "#555"}
              strokeWidth="1.5"
              opacity={isBrainEnabled ? 0.8 : 0.5}
            />
            <motion.path
              d="M 210 180 Q 205 185 210 190"
              fill="none"
              stroke={isBrainEnabled ? "#39FF14" : "#555"}
              strokeWidth="1.5"
              opacity={isBrainEnabled ? 0.8 : 0.5}
            />
            {/* Processing pulse */}
            {isBrainProcessing && (
              <motion.circle
                cx="200"
                cy="200"
                r="5"
                fill="#39FF14"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 8, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut",
                }}
              />
            )}
            {/* Label */}
            <text
              x="200"
              y="250"
              textAnchor="middle"
              fill={isBrainEnabled ? "#39FF14" : "#666"}
              fontSize="12"
              fontWeight="bold"
            >
              BRAIN
            </text>
          </g>

          {/* Mouth Module - Bottom Center */}
          <g id="mouth-module">
            {/* Glow effect */}
            <motion.ellipse
              cx="200"
              cy="300"
              rx="35"
              ry="20"
              fill={isMouthEnabled ? "#39FF14" : "#333"}
              opacity={isMouthEnabled ? 0.3 : 0.2}
              animate={
                isMouthEnabled
                  ? {
                      scale: [1, 1.1, 1],
                      opacity: [0.3, 0.5, 0.3],
                    }
                  : {}
              }
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Mouth shape */}
            <motion.path
              d="M 175 300 Q 200 310 225 300"
              fill="none"
              stroke={isMouthEnabled ? "#39FF14" : "#555"}
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
            {/* Sound waves when speaking */}
            {isMouthEnabled && (
              <>
                <motion.path
                  d="M 235 295 Q 245 300 235 305"
                  fill="none"
                  stroke="#39FF14"
                  strokeWidth="2"
                  opacity={0.6}
                  initial={{ x: 0, opacity: 0.6 }}
                  animate={{ x: 10, opacity: 0 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
                <motion.path
                  d="M 245 290 Q 255 300 245 310"
                  fill="none"
                  stroke="#39FF14"
                  strokeWidth="2"
                  opacity={0.4}
                  initial={{ x: 0, opacity: 0.4 }}
                  animate={{ x: 10, opacity: 0 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.2,
                  }}
                />
              </>
            )}
            {/* Label */}
            <text
              x="200"
              y="330"
              textAnchor="middle"
              fill={isMouthEnabled ? "#39FF14" : "#666"}
              fontSize="12"
              fontWeight="bold"
            >
              MOUTH
            </text>
          </g>

          {/* Ear Module - Bottom Right */}
          <g id="ear-module">
            {/* Glow effect */}
            <motion.ellipse
              cx="280"
              cy="280"
              rx="30"
              ry="35"
              fill={isEarEnabled ? "#39FF14" : "#333"}
              opacity={isEarEnabled ? 0.3 : 0.2}
              animate={
                isEarEnabled
                  ? {
                      scale: [1, 1.15, 1],
                      opacity: [0.3, 0.6, 0.3],
                    }
                  : {}
              }
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Ear outer shape */}
            <motion.path
              d="M 265 260 Q 255 280 265 300 Q 270 310 280 310 Q 290 310 295 300 Q 305 280 295 260 Q 290 250 280 250 Q 270 250 265 260 Z"
              fill="none"
              stroke={isEarEnabled ? "#39FF14" : "#555"}
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
            {/* Ear inner curves */}
            <motion.path
              d="M 275 270 Q 270 280 275 290"
              fill="none"
              stroke={isEarEnabled ? "#39FF14" : "#555"}
              strokeWidth="2"
              strokeLinecap="round"
              animate={
                isEarEnabled
                  ? {
                      opacity: [0.5, 1, 0.5],
                    }
                  : {}
              }
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            {/* Sound waves when listening */}
            {isEarEnabled && (
              <>
                <motion.path
                  d="M 305 270 Q 315 280 305 290"
                  fill="none"
                  stroke="#39FF14"
                  strokeWidth="2"
                  strokeLinecap="round"
                  initial={{ opacity: 0, x: 0 }}
                  animate={{
                    opacity: [0, 0.8, 0],
                    x: [0, 10, 20],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                  }}
                />
                <motion.path
                  d="M 315 265 Q 325 280 315 295"
                  fill="none"
                  stroke="#39FF14"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ opacity: 0, x: 0 }}
                  animate={{
                    opacity: [0, 0.6, 0],
                    x: [0, 15, 30],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeOut",
                    delay: 0.3,
                  }}
                />
              </>
            )}
            {/* Label */}
            <text
              x="280"
              y="335"
              textAnchor="middle"
              fill={isEarEnabled ? "#39FF14" : "#666"}
              fontSize="12"
              fontWeight="bold"
            >
              EAR
            </text>
          </g>

          {/* Connection lines between modules */}
          <motion.line
            x1="175"
            y1="165"
            x2="185"
            y2="185"
            stroke={isEyeEnabled && isBrainEnabled ? "#39FF14" : "#333"}
            strokeWidth="1"
            opacity={0.3}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          />
          <motion.line
            x1="200"
            y1="230"
            x2="200"
            y2="280"
            stroke={isBrainEnabled && isMouthEnabled ? "#39FF14" : "#333"}
            strokeWidth="1"
            opacity={0.3}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          />
          <motion.line
            x1="230"
            y1="220"
            x2="260"
            y2="260"
            stroke={isBrainEnabled && isEarEnabled ? "#39FF14" : "#333"}
            strokeWidth="1"
            opacity={0.3}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          />
        </svg>
      </div>
    </div>
  );
}
