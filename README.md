# Guardian AI — Deepfake Voice Shield

Guardian AI is a browser-based voice-security prototype for reviewing user-submitted audio. It combines consent-based microphone capture, authenticated Gemini audio screening, and a user-owned review history.

## Startup-event demo walkthrough

1. Open the deployed web app and sign in with Google.
2. Open the dashboard and show the microphone permission flow.
3. Record a short sample or upload a permitted audio clip (maximum 3 MB).
4. Run the audio review and explain the screening concern score, verdict, explanation, and audible signals.
5. Open History to show the signed-in user's saved reviews.
6. Open Settings to explain the privacy, sample-playback controls, and limitations.

**Presentation note:** use a voice sample you own or have explicit permission to share. Do not use a real person's voice without consent.

## Current capabilities

- Google sign-in through Firebase Authentication.
- Microphone preview and browser audio recording after user permission.
- Audio upload validation (3 MB limit and supported MIME types).
- Authenticated server-side Gemini audio screening.
- User-owned detection history in Firestore.
- Microphone visualizer; the visualizer itself is not a deepfake detector.
- Android 10+ companion that can reject exact caller-ID matches from a user-managed local blocklist after the user grants Android's call-screening role.

## Important product limitations — explain these honestly

- Gemini's result is a screening aid, not a validated anti-spoofing classifier, forensic certification, or proof that a voice is authentic or fake.
- A screening concern score is not a calibrated probability or measured accuracy percentage.
- The browser app cannot intercept cellular calls, obtain caller IDs from the dialer, or reject calls.
- The Android companion only screens caller metadata against the local blocklist. It does not inspect call audio or detect deepfake voices during live calls.
- There is no deployed or benchmark-validated AASIST/TFLite anti-spoofing model.
- Consequential decisions should be independently verified through a trusted second channel.

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

The endpoint validates the Firebase ID token, rejects disabled or revoked accounts, validates audio input, and applies a per-user in-memory request limit (8 requests per minute per function instance).

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

A commit to the connected GitHub deployment branch should trigger a Vercel deployment. Confirm the deployment is Ready before presenting. Redeploy after changing environment variables. Audio uploads are limited to 3 MB. Rate limiting is bounded in memory and per function instance; it is not a global quota. Use a shared rate-limit store before scaling to high traffic.

## Firebase rules and indexes

The repository includes `firebase.json`, `firestore.rules`, and `firestore.indexes.json`. Confirm in Firebase Console that `tutorsync-app` and the configured named database are the intended production resources before deploying.

```bash
npx firebase-tools login
npx firebase-tools deploy --project tutorsync-app --only firestore
```

This command deploys the rules and composite history index for the database configured in `firebase.json`. A successful Vercel build does not deploy Firestore resources. See [docs/ENGINEERING.md](docs/ENGINEERING.md) for the full data model and operating notes.

## Security and data

- The Gemini API key is server-only.
- Audio review requires a valid Firebase ID token; anonymous requests are rejected.
- Uploaded audio is sent to Guardian's server and Gemini for processing. Only submit recordings you have permission to share.
- Web-app trusted and blocklist labels are not biometric verification or phone-level call blocking. The Android companion's separate local list can reject exact caller-ID matches only after the user grants the system role.
- Do not use screening results as the sole basis for financial, legal, employment, or safety decisions.

## Quality checks

- `npm run lint`: TypeScript validation.
- `npm test`: audio-input and Firebase-auth validation tests.
- `npm run build`: frontend production build.
- Android CI: `gradle testDebugUnitTest assembleDebug --no-daemon` from `android/`; the debug APK is uploaded as a workflow artifact.
