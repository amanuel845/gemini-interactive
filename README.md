# Gemini Interactions Playground

A Vercel-ready Gemini proxy and browser playground built around Google's **Interactions API**.

## Features

- `POST /api/chat` — non-streaming Interactions API request
- `POST /api/stream` — streaming Interactions API request
- `POST /api/vision` — multimodal image + text request
- `GET /api/models` — fetches models from the Gemini API
- `gemini-3.6-flash` is the default model
- No Gemini API key is exposed to the browser
- CORS support
- Vercel Node 20 deployment
- Mobile-friendly playground

## Environment variable

Set this in Vercel:

```text
GEMINI_API_KEY=your_gemini_api_key
```

## Deploy

Push this directory to GitHub and import the repository into Vercel.

Or locally:

```bash
npm install
npm run dev
```

## Notes

The API handlers use the Interactions API directly over HTTPS so the server does not depend on a particular SDK method name. The streaming handler parses SSE events and forwards generated text to the browser.

If Google's account/model availability changes, the `/api/models` endpoint exposes the models available to the configured API key.
