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
- The browser app cannot intercept cellular calls, obtain caller IDs from the dialer, or reject calls.
- The repository includes a separate Android 10+ companion. After the user grants Android's call-screening role, it rejects only exact matches in the user's local blocklist; it does not inspect call audio or use AI to block calls.
- There is no deployed or benchmark-validated AASIST/TFLite anti-spoofing model. Do not present live-call deepfake detection as an active capability.
- Consequential decisions should be independently verified.

## Android companion

The `android/` project is a native caller-blocklist companion for Android 10 (API 29) and newer. Install it, tap **Enable Android call screening**, and approve the system role prompt. Add exact phone-number matches to the local blocklist. Unknown, private, malformed, and unlisted numbers are allowed.

Build locally with JDK 17, Android SDK Platform 35, and Gradle 8.9:

```bash
cd android
gradle testDebugUnitTest assembleDebug --no-daemon
```

The Android CI workflow runs unit tests and builds a debug APK artifact. The companion uses Android `CallScreeningService` only for caller metadata. It cannot access cellular call audio, so it cannot detect a synthetic voice during a live call. The existing web app remains responsible for user-submitted audio screening.

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

Redeploy after changing environment variables. Audio uploads are limited to 3 MB. Rate limiting is bounded in memory and per function instance; it is not a global quota. Use a shared rate-limit store before scaling to high traffic. The audio-review function is configured for a 60-second maximum execution window.

## Firebase rules and indexes

The repository includes `firebase.json`, `firestore.rules`, and `firestore.indexes.json`. Confirm in Firebase Console that `tutorsync-app` and the configured named database are the intended production resources before deploying.

~~~bash
npx firebase-tools login
npx firebase-tools deploy --project tutorsync-app --only firestore
~~~

This command deploys the rules and composite history index for the database configured in `firebase.json`. A successful Vercel build does not deploy Firestore resources. See [docs/ENGINEERING.md](docs/ENGINEERING.md) for the full data model and operating notes.

## Security and data

- The Gemini API key is server-only.
- Audio review requires a valid Firebase ID token; anonymous requests are rejected.
- Uploaded audio is sent to Guardian's server and Gemini for processing. Only submit recordings you have permission to share.
- Web-app trusted and blocklist labels are not biometric verification or phone-level call blocking. The Android companion's separate local list can reject exact caller-ID matches only after the user grants the system role.
- Do not use screening results as the sole basis for financial, legal, employment, or safety decisions.

## Dependency audit baseline

The latest reviewed lockfile has four remaining high-severity npm audit findings in the Firebase / Firestore / Node gRPC dependency chain, with zero critical, moderate, or low findings. CI fails if any critical, moderate, or low finding appears, or if the high-severity count exceeds this documented baseline. Do not force a Firebase downgrade just to silence the scanner.

## Quality checks

- `npm run lint`: TypeScript validation.
- `npm test`: audio-input and Firebase-auth validation tests.
- `npm run build`: frontend production build.
- Android CI: `gradle testDebugUnitTest assembleDebug --no-daemon` from `android/`; the debug APK is uploaded as a workflow artifact.

## Automated Firestore deployment

A guarded manual GitHub Actions workflow deploys only Firestore rules and indexes after checking the configured named database exists. Set up keyless Google Workload Identity Federation and the two required repository variables by following [docs/FIREBASE_DEPLOYMENT.md](docs/FIREBASE_DEPLOYMENT.md). The workflow does not create or modify database configuration.
