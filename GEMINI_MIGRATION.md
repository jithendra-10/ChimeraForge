# Migration from OpenAI to Google Gemini

## Changes Made

The ChimeraForge Brain module has been successfully migrated from OpenAI's GPT to Google's Gemini API.

### Files Modified

1. **backend/modules/brain.py**
   - Replaced `openai` import with `google.generativeai`
   - Changed from `AsyncOpenAI` client to `genai.GenerativeModel`
   - Updated API calls to use Gemini's `generate_content_async` method
   - Modified prompt structure to work with Gemini's format
   - Updated error messages to reference Gemini instead of OpenAI

2. **backend/requirements.txt**
   - Removed: `openai==1.3.5`
   - Added: `google-generativeai==0.3.2`

3. **backend/.env.example**
   - Changed from `OPENAI_API_KEY` to `GEMINI_API_KEY`

4. **backend/.env**
   - Changed from `OPENAI_API_KEY` to `GEMINI_API_KEY`

5. **README.md**
   - Updated setup instructions to reference Gemini API
   - Added link to get Gemini API key
   - Updated module description

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Get Your Gemini API Key

Visit: https://makersuite.google.com/app/apikey

### 3. Configure Environment

Update your `backend/.env` file:

```
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Run the Application

Backend (run from project root):
```bash
uvicorn backend.app:app --reload
```

Frontend:
```bash
cd frontend
npm run dev
```

## API Differences

### OpenAI (Previous)
- Model: `gpt-3.5-turbo`
- Chat completions with system/user messages
- Async client: `AsyncOpenAI`

### Gemini (Current)
- Model: `gemini-pro`
- Single prompt format (system + user combined)
- Async generation: `generate_content_async`

## Benefits of Gemini

1. **Free Tier**: Gemini offers a generous free tier
2. **Fast Response**: Quick generation times
3. **Multimodal**: Can handle text and images (future enhancement)
4. **Google Integration**: Easy integration with other Google services

## Testing

All existing tests should continue to work. The Brain module interface remains the same:
- Input: VISION_EVENT from Event Bus
- Output: SYSTEM_ACTION with text, speak, and open_url fields

Run tests to verify:
```bash
cd backend
python -m pytest -v
```

## Notes

- The Brain module behavior remains functionally identical
- Response format (JSON with text, speak, open_url) is preserved
- Error handling and fallback mechanisms are maintained
- All other modules (Eye, Mouth, Tentacle) are unchanged
