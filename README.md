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

## Important product limitations

- Gemini's result is a screening aid, not a validated anti-spoofing classifier, forensic certification, or proof that a voice is authentic or fake.
- A screening concern score is not a calibrated probability or measured accuracy percentage.
- The browser app cannot intercept cellular calls, obtain caller IDs from the dialer, or reject calls.
- The Android companion only screens caller metadata against the local blocklist. It does not inspect call audio or detect deepfake voices during live calls.
- There is no deployed or benchmark-validated AASIST/TFLite anti-spoofing model.
- Consequential decisions should be independently verified through a trusted second channel.

## Browser-based development

The project can be developed using GitHub Codespaces, StackBlitz, or another browser-based Node.js environment. No local software installation is required.

1. Import or open the public GitHub repository.
2. Use Node.js 20 or newer in the hosted workspace.
3. Install dependencies with `npm ci`.
4. Add `GEMINI_API_KEY` using the platform's encrypted secrets/environment-variable UI. Never commit a populated `.env` file or expose the key in a `VITE_*` variable.
5. Start the app with `npm run dev`; the Express/Vite server listens on port 3000 by default.

The Gemini key stays on the server. The Firebase web configuration is public client configuration; Firebase Security Rules and Authentication provide access control.

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

## Firebase project

The active web app configuration targets **`guardian-ai-db`**. Firestore is configured to use the **`(default)`** database.

Before deployment, complete these one-time Firebase Console steps in the `guardian-ai-db` project:

1. Enable **Authentication → Sign-in method → Google** and set a support email.
2. Add the production Vercel hostname and any hosted preview hostname to **Authentication → Settings → Authorized domains**.
3. Confirm Cloud Firestore exists as the `(default)` database.
4. Review and publish the repository's `firestore.rules` rules.

The repository includes `firebase.json`, `firestore.rules`, and `firestore.indexes.json`.

### GitHub Actions Firestore deployment

The manual workflow `.github/workflows/firebase-deploy.yml` deploys only Firestore rules and indexes to `guardian-ai-db/(default)`. It uses Google Workload Identity Federation, not a downloaded service-account private key.

Configure these GitHub Actions repository variables after creating the deployment identity in the **guardian-ai-db** Google Cloud project:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`: full provider resource name for the GitHub OIDC provider in project number `999545069600`.
- `GCP_SERVICE_ACCOUNT`: deployment service-account email ending in `@guardian-ai-db.iam.gserviceaccount.com`.

The provider must restrict access to repository ID `1214406587`, branch `refs/heads/main`, and workflow `piyushsiingh/Gurdian-Ai-/.github/workflows/firebase-deploy.yml@refs/heads/main`. Grant only the roles required to deploy Firestore rules and indexes. Do not reuse the old `tutorsync-app` service account or provider.

To deploy, manually run the GitHub Actions workflow on `main` and enter `DEPLOY_FIRESTORE` when prompted. The workflow validates that the Firebase web config, project number, database ID, rules, and indexes all agree before authenticating and deploying.

## Vercel deployment

Configure these Environment Variables in the Vercel project:
- `GEMINI_API_KEY` (required)
- `GEMINI_MODEL` (optional; defaults to `gemini-3.8-flash`)
- `FIREBASE_WEB_API_KEY` (optional override; otherwise read from the Firebase app config file)

A commit to the connected GitHub deployment branch should trigger a Vercel deployment. Confirm the deployment is Ready before presenting. Redeploy after changing environment variables. Audio uploads are limited to 3 MB. Rate limiting is bounded in memory and per function instance; it is not a global quota. Use a shared rate-limit store before scaling to high traffic.

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
