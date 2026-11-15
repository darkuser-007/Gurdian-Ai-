# Guardian AI — Deepfake Voice Shield

Guardian AI is a browser-based audio review tool. It can capture microphone audio with the user's permission, record a sample, and submit that sample to a server-side Gemini audio review endpoint.

## What this application does today

- Captures microphone audio in the browser after permission is granted.
- Detects speech activity using Silero VAD.
- Lets the user upload or record an audio sample for Gemini-assisted review.
- Stores signed-in users' submitted analysis records in Firestore.
- Provides a microphone visualizer; the visualizer itself is not a deepfake detector.

## Important limitations

- The Gemini result is a screening aid, not a validated anti-spoofing classifier, forensic certification, or proof that a voice is authentic or fake.
- A browser microphone cannot intercept cellular calls, obtain phone numbers from the dialer, reject calls, or run as an Android foreground service.
- The repository does not currently contain the Android telephony client or a deployed AASIST classifier. Do not present those capabilities as active.
- Consequential decisions should be independently verified.

## Local development

**Prerequisites:** Node.js 20+ and a Gemini API key.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.
3. Start the app and local API server: `npm run dev`
4. Open the local URL printed by Vite.

The Gemini key is read only by the server. Do not add it to a `VITE_*` variable or commit a populated `.env` file.

## Vercel deployment

The `api/analyze-audio.ts` serverless function provides `POST /api/analyze-audio`. Configure these Environment Variables in the Vercel project:

- `GEMINI_API_KEY` (required)
- `GEMINI_MODEL` (optional; defaults to `gemini-2.5-flash`)

Redeploy after changing environment variables. Audio uploads are limited to 3 MB and requests are rate-limited per client IP.

## Security and data

- The API key stays on the server.
- Firestore access is governed by `firestore.rules`; deploy the rules to the Firebase project used by this app.
- The browser sends uploaded audio to the configured application backend for analysis. Do not upload sensitive recordings without appropriate consent.
