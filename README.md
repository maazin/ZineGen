# Solarpunk Zine Generator

Create a personalized, one-page solarpunk zine from a few prompts. The app uses Google AI when you provide an API key, and it automatically falls back to a local generator so the UI still works out of the box.

## Features

- Personalized zine copy from your answers
- AI-generated cover art via the Google Gen AI SDK
- Print-friendly one-page layout
- PNG download for the finished zine
- Local fallback if no API key is configured

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
cp .env.example .env.local
```

3. Add your Google AI Studio key to `.env.local`:

```bash
GEMINI_API_KEY=your_api_key_here
```

`GOOGLE_API_KEY` also works if you prefer that environment variable.

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

## Notes

- The image route uses `imagen-4.0-generate-001` through `@google/genai`.
- If the API key is missing or the model call fails, the app automatically generates a local solarpunk zine so the app remains functional.
