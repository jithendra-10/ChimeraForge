# ChimeraForge Frontend

React + TypeScript + Vite frontend for the ChimeraForge modular AI system.

## Setup Complete ✓

The following has been implemented:

### Project Structure
- ✓ Vite + React + TypeScript configured
- ✓ Tailwind CSS with spooky dark theme and neon green accents
- ✓ Component directory structure
- ✓ API client for backend communication
- ✓ SSE (Server-Sent Events) connection for real-time updates

### Directory Structure

```
src/
├── api/
│   ├── client.ts          # REST API client
│   └── eventStream.ts     # SSE connection manager
├── components/
│   ├── CreatureCanvas.tsx # Visual creature representation
│   ├── ModuleControls.tsx # Module toggle controls
│   ├── EventLog.tsx       # Real-time event log
│   ├── WebcamPanel.tsx    # Webcam feed display
│   └── index.ts           # Component exports
├── hooks/
│   ├── useModules.ts      # Module state management
│   └── useEventStream.ts  # Event stream hook
├── modules/
│   ├── MouthModule.ts     # Text-to-speech module
│   ├── TentacleModule.ts  # Web actions module
│   └── index.ts           # Module exports
├── types/
│   └── index.ts           # TypeScript type definitions
├── App.tsx                # Main application component
├── main.tsx               # Application entry point
└── index.css              # Global styles with spooky theme
```

### Features Implemented

**API Client (`src/api/client.ts`)**
- GET /api/modules - Fetch all modules
- POST /api/modules/{id}/toggle - Toggle module state
- POST /api/events - Publish events
- POST /api/vision/frame - Process vision frames
- GET /api/logs - Retrieve event logs

**Event Stream (`src/api/eventStream.ts`)**
- Real-time SSE connection to backend
- Automatic reconnection with exponential backoff
- Event subscription management
- Error handling

**React Hooks**
- `useModules` - Manages module state and toggle operations
- `useEventStream` - Manages SSE connection and event stream

**Components**
- `CreatureCanvas` - Placeholder for creature visualization
- `ModuleControls` - Toggle switches for each module
- `EventLog` - Real-time event display with expandable payloads
- `WebcamPanel` - Placeholder for webcam feed

**Frontend Modules**
- `MouthModule` - Web Speech API integration (ready for task 10)
- `TentacleModule` - URL opening and search (ready for task 11)

**Theme Configuration**
- Dark background (#0a0a0a)
- Neon green accents (#39FF14)
- Custom animations (pulse-glow, flicker, electric)
- Custom scrollbar styling
- Glow effects for spooky aesthetic

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Backend Connection

The frontend is configured to proxy API requests to `http://localhost:8000`.
Make sure the backend is running before starting the frontend.

## Next Steps

The following tasks are ready to be implemented:
- Task 10: Implement frontend Mouth Module integration
- Task 11: Implement frontend Tentacle Module integration
- Task 12: Implement Module Controls component (basic version done)
- Task 13: Implement Creature Canvas with SVG creature
- Task 14: Enhance Event Log Panel
- Task 15: Implement Webcam Panel with video feed
- Task 16: Final integration

## Requirements Validated

✓ Requirements 11.1 - Dark color scheme with neon green accents
✓ Requirements 11.3 - SSE connection for real-time events
