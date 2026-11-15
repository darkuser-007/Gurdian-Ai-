# Guardian AI — Deepfake Voice Shield

Guardian AI is a browser-based audio review tool. It can capture microphone audio with the user's permission, record a sample, and submit that sample to an authenticated server-side Gemini audio review endpoint.

## Current capabilities

- Google sign-in through Firebase Authentication.
- Microphone preview and browser audio recording after user permission.
- Audio upload validation (3 MB limit and supported MIME types).
- Authenticated server-side Gemini audio screening.
- User-owned detection history in Firestore.
- Microphone visualizer; the visualizer itself is not a deepfake detector.

## Important product limitations

- Gemini's result is a screening aid, not a validated anti-spoofing classifier, forensic certification, or proof that a voice is authentic or fake.
- A browser microphone cannot intercept cellular calls, obtain phone numbers from the dialer, reject calls, or run as an Android foreground service.
- The repository does not currently contain the Android telephony client or a deployed AASIST classifier. Do not present those capabilities as active.
- Consequential decisions should be independently verified.

## Local development

**Prerequisites:** Node.js 20+ and a Gemini API key.

1. Install dependencies: `npm ci`
2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`.
3. The server reads the Firebase Web API key from `firebase-applet-config.json`. Set `FIREBASE_WEB_API_KEY` only when you need to override it.
4. Start the app and local API server: `npm run dev`
5. Open the local URL printed by Vite.

The Gemini key stays on the server. Do not add it to a `VITE_*` variable or commit a populated `.env` file.

## Audio analysis API

`POST /api/analyze-audio`

Required headers:

- `Content-Type: application/json`
- `Authorization: Bearer <Firebase ID token>`

Request body:

```json
{
  "audioBase64": "<raw base64 audio bytes>",
  "mimeType": "audio/webm"
}
```

The endpoint validates the Firebase ID token against the Firebase project configured in `firebase-applet-config.json`, rejects disabled or revoked accounts, validates audio input, and applies a per-user in-memory request limit (8 requests per minute per function instance).

Responses:

- `200`: screening result with `riskScore`, `verdict`, `explanation`, and `signals`.
- `400`: malformed request.
- `401`: missing, expired, revoked, or invalid sign-in.
- `403`: disabled Firebase account.
- `413`: audio is larger than 3 MB.
- `415`: unsupported audio MIME type.
- `429`: per-instance per-user rate limit reached.
- `503`: Firebase Authentication or Gemini server configuration is unavailable.

## Vercel deployment

Configure these Environment Variables in the Vercel project:

- `GEMINI_API_KEY` (required)
- `GEMINI_MODEL` (optional; defaults to `gemini-3.8-flash`)
- `FIREBASE_WEB_API_KEY` (optional override; otherwise read from the Firebase app config file)

Redeploy after changing environment variables. Audio uploads are limited to 3 MB. Rate limiting is in-memory and per function instance; use a shared rate-limit store before scaling to high traffic.

## Security and data

- The Gemini API key is server-only.
- Audio review requires a valid Firebase ID token; anonymous requests are rejected.
- Firestore access is governed by `firestore.rules`; deploy the rules to the Firebase project used by this app.
- Uploaded audio is sent to the configured application backend and Gemini for processing. Obtain appropriate consent before uploading sensitive recordings.
- Do not use screening results as the sole basis for financial, legal, employment, or safety decisions.

## Quality checks

- `npm run lint`: TypeScript validation.
- `npm test`: audio-input and Firebase-auth validation tests.
- `npm run build`: frontend production build.
