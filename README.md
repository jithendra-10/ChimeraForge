# ChimeraForge

A modular AI system that allows users to build an interactive AI "creature" by attaching and detaching independent modules (Eye, Brain, Mouth, Tentacle).

## Project Structure

```
chimeraforge/
├── backend/          # FastAPI backend
│   ├── core/         # Event bus and module registry
│   ├── modules/      # AI modules (Eye, Brain, Mouth, Tentacle)
│   ├── app.py        # FastAPI application
│   └── requirements.txt
└── frontend/         # React + TypeScript frontend
    ├── src/
    │   ├── components/  # UI components
    │   ├── modules/     # Frontend modules
    │   └── App.tsx
    └── package.json
```

## Setup

### Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - Windows: `venv\Scripts\activate`
   - Unix/MacOS: `source venv/bin/activate`

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create a `.env` file from `.env.example` and add your Google Gemini API key:
   ```bash
   cp .env.example .env
   ```

6. Run the backend (from project root):
   ```bash
   cd ..
   uvicorn backend.app:app --reload
   ```
   
   Or alternatively:
   ```bash
   cd ..
   python -m uvicorn backend.app:app --reload
   ```

### Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

Create a `.env` file in the backend directory with:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your Gemini API key from: https://makersuite.google.com/app/apikey

## Development

- Backend runs on `http://localhost:8000`
- Frontend runs on `http://localhost:3000`
- API documentation available at `http://localhost:8000/docs`

## Modules

- **Eye**: Vision module that detects faces from webcam input
- **Brain**: Reasoning module that interprets events using Google Gemini LLM
- **Mouth**: Voice output module that converts text to speech
- **Tentacle**: Web action module that performs browser actions
