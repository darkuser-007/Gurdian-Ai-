# Guardian AI — Engineering Specification

Last reviewed: 2026-11-15

## 1. Product requirements

### Product scope

Guardian AI currently provides authenticated, browser-based audio capture and Gemini-assisted audio screening. It is not a cellular-call interception app and does not contain a validated anti-spoofing classifier.

### User stories

1. As a user, I can sign in with Google so only an authenticated account can consume the audio-review service.
2. As a user, I can upload or record a sample, see file limits, and submit it for screening.
3. As a user, I can review the category, explanation, and observations without the UI presenting them as forensic proof.
4. As a signed-in user, I can review, filter, export, label, and delete my own history.
5. As the maintainer, I can deploy the app and API, inspect CI results, and monitor dependency advisories.

### Acceptance criteria

- Unauthenticated audio-review requests return HTTP 401.
- Firebase ID tokens must belong to the configured Firebase project and must not be expired, revoked, or associated with a disabled account.
- Unsupported audio types return HTTP 415; malformed audio returns HTTP 400; files over 3 MB return HTTP 413.
- Gemini credentials never enter the browser bundle.
- History queries and writes are scoped to the signed-in user's ownerId.
- No authenticity verdict appears before an actual review response exists.
- The microphone visualizer is a preview, not a detector.
- Type-checking, tests, and the production build pass before a change is considered ready.

## 2. Architecture

### Runtime architecture

~~~text
Browser (React + Vite)
  |
  +-- Firebase Authentication (Google sign-in)
  |      +-- Firebase ID token
  |
  +-- User-initiated audio capture / upload
         |
         +-- POST /api/analyze-audio
                Authorization: Bearer <Firebase ID token>
                JSON: { audioBase64, mimeType }
                       |
                       +-- Firebase Authentication accounts:lookup
                       |      - validate project, user, expiry, disabled,
                       |        and token revocation boundary
                       |
                       +-- Input validation (MIME, base64, 3 MB)
                       +-- Per-user in-memory request guard
                       +-- Gemini API (server-only API key)
                              |
                              +-- Screening result JSON

Browser (signed-in user)
  |
  +-- Firestore history/{historyId}
         ownerId = Firebase UID
         rules enforce owner-only access
~~~

### Modules

| Module | Responsibility |
|---|---|
| src/App.tsx | Dashboard, capture controls, result view, settings, history |
| src/lib/firebase.ts | Firebase client initialization |
| src/services/geminiService.ts | Gets ID token and calls the audio-review API |
| server/firebaseAuth.ts | Server-side Firebase ID-token validation |
| server/audioAnalysis.ts | Audio validation, Gemini request, result-schema validation |
| api/analyze-audio.ts | Vercel serverless API route |
| server.ts | Local Express API and Vite development middleware |
| firestore.rules | Authenticated owner-scoped history access |
| firestore.indexes.json | Composite history query index |

### Technical decisions

- Gemini credentials stay on the server.
- The Firebase Web API key is a public project identifier from app configuration; a Firebase ID token is still mandatory.
- Gemini is used as a general multimodal screening aid, not a trained anti-spoofing classifier.
- Local number lists are reference labels saved in browser settings. They do not block calls or verify speaker identity.
- Audio review is available only to signed-in users.

## 3. API specification

### POST /api/analyze-audio

Required headers:
- Authorization: Bearer <Firebase ID token>
- Content-Type: application/json

Request body:

~~~json
{
  "audioBase64": "<raw base64-encoded audio bytes>",
  "mimeType": "audio/webm"
}
~~~

Successful response:

~~~json
{
  "riskScore": 34,
  "verdict": "suspicious",
  "explanation": "Cautious screening explanation with limitations.",
  "signals": ["audible observation"]
}
~~~

The example is illustrative only; it is not an actual model result.

| Status | Meaning |
|---|---|
| 200 | Review response returned |
| 400 | Malformed or invalid request data |
| 401 | Missing, expired, revoked, or invalid Firebase sign-in |
| 403 | Firebase account disabled |
| 413 | Audio over 3 MB |
| 415 | Unsupported audio MIME type |
| 429 | Per-instance user request limit reached |
| 503 | Firebase Auth or server configuration unavailable |
| 502 | Gemini review failed or returned invalid output |

### Rate-limit caveat

The current guard allows up to 8 requests per minute per Firebase UID per function instance. Its in-memory key table is capped at 10,000 entries and evicts the oldest active key under capacity pressure; this is a bounded abuse guard, not a globally consistent quota. Serverless instances do not share memory, and high-cardinality traffic can weaken per-user protection. Before high-traffic launch, replace it with a shared store such as Redis/Upstash and add platform-level spend quotas.

## 4. Database design

### Firestore entity

The history collection contains flat records. Each record belongs to one Firebase user.

| Field | Type | Required | Description |
|---|---|---:|---|
| timestamp | Timestamp | Yes | Server-generated creation time |
| ownerId | String | Yes | Firebase Authentication UID |
| phoneNumber | String | Yes | Currently UPLOADED_SAMPLE; not a caller ID |
| riskScore | Number | Yes | Screening concern score from 0–100, not probability |
| verdict | String | Yes | authentic, suspicious, deepfake, or error |
| signals | List<String> | Yes | Model-provided observations |
| duration | String | No | Display duration; currently -- for uploaded samples |
| isBlocked | Boolean | No | Local history label; does not block telephony |
| isVerified | Boolean | No | Local trusted-reference label; not biometric verification |
| error | String | No | Bounded error detail for failed reviews |

### Relationship

~~~text
Firebase Auth User (1) ---- (many) history records
               UID                    ownerId
~~~

### Index

The live history listener filters by ownerId equal to the current user UID and orders by timestamp descending. The composite index is defined in firestore.indexes.json.

### Migration note

Existing documents with extra fields remain readable if owned by the user, but updates must satisfy the stricter allow-list in firestore.rules. Review legacy records before bulk rewrites.

## 5. UI flow

~~~text
Open app
  -> Sign in with Google
  -> Upload a sample OR record through browser microphone
  -> Validate type and size
  -> Submit audio review
  -> Firebase token check
  -> Gemini screening response
  -> Show explanation, category, observations
  -> Save to user-owned Firestore history
~~~

### Main screens

- Dashboard: microphone preview, sample upload, screening results, actual review metrics.
- Workflow: describes the existing browser-capture and server-review flow.
- Detection Log: current user's saved records, filter, CSV export, local labels, delete.
- Settings: microphone input selection, local preferences, trusted reference labels, local blocklist labels.

## 6. Security review

### Implemented controls

- Server-side Gemini key; no Vite define injection.
- Firebase ID token required on the audio-review endpoint.
- Token project, expiry, account state, and revocation boundary checked through Firebase Authentication.
- User-owned Firestore rules and query constraint.
- History schema allow-list and bounded text fields.
- 3 MB audio limit and MIME/base64 validation.
- Per-user in-memory abuse guard.
- .env files ignored by Git; .env.example contains placeholders only.

### Remaining security work

- Replace per-instance rate limiting with shared storage and add platform-level quotas.
- Restrict the Firebase Web API key in Google Cloud to required APIs and approved app origins.
- Review Vercel request logs and Firebase Authentication configuration.
- Add Firebase App Check once hosting and reCAPTCHA configuration are ready.
- Test Firestore rules using the Firebase Emulator Suite before deployment.
- Set retention controls and keep the browser upload consent notice visible.
- Re-run dependency audit after each lockfile update. The safe dependency updates reduced the initial 16 findings to 4 high-severity findings (zero critical, moderate, or low). The remaining report is in the Firebase / Firestore / Node gRPC dependency chain; assess it against the actual browser/WebChannel path before applying an override. Do not force a Firebase downgrade to clear a scanner finding. CI enforces this reviewed baseline and fails on any critical, moderate, or low finding, or if the high count rises above four.

## 7. QA and test strategy

The automated tests cover:

- Valid WebM MIME normalization.
- Invalid base64.
- Unsupported MIME types.
- Audio size over 3 MB.
- Missing Firebase bearer token.
- Malformed and wrong-project tokens.
- Successful lookup of an active Firebase user.
- Disabled Firebase account.
- Revoked ID token.
- Firebase Auth service failure.

CI runs:

1. npm ci
2. npm audit --json summary
3. npm run lint
4. npm test
5. npm run build

The build does not validate live Gemini credentials, Vercel function invocation, Google sign-in popup configuration, or deployed Firestore rules. Those require environment-level smoke tests.

## 8. Deployment and operations

### Required runtime

- Node.js 20+
- Vercel project connected to this GitHub repository
- Firebase Authentication with Google provider enabled
- The named Firestore database configured in firebase-applet-config.json
- Gemini API key

### Environment variables

| Variable | Required | Purpose |
|---|---:|---|
| GEMINI_API_KEY | Yes | Server-only Gemini credential |
| GEMINI_MODEL | No | Defaults to gemini-3.8-flash |
| FIREBASE_WEB_API_KEY | No | Optional override for the public Firebase Web API key |
| PORT | No | Local Express port; defaults to 3000 |

### Local development

~~~bash
npm ci
cp .env.example .env
# Set GEMINI_API_KEY in .env
npm run dev
~~~

### Validation commands

~~~bash
npm run lint
npm test
npm run build
~~~

### Firestore deployment

The repo firebase.json targets the named database configured for this app. After confirming that tutorsync-app is the intended Firebase project and reviewing the rules/index diff, sign in with Firebase CLI and deploy:

~~~bash
npx firebase-tools login
npx firebase-tools deploy --project tutorsync-app --only firestore
~~~

This command has not been run from this engineering session. A successful GitHub/Vercel build does not deploy Firestore rules or indexes.

### Monitoring

- GitHub Actions: test/type-check/build outcomes and dependency audit summary.
- Vercel: deployment result, function errors, latency, and request volume.
- Firebase Console: Auth sign-in activity, Firestore rule denials, index status and usage.
- Gemini API console: quota, rate, and billing.

## 9. Unsupported capabilities

- Intercepting cellular calls or reading the dialer's caller ID.
- Automatically rejecting phone calls or adding numbers to the OS/carrier blocklist.
- Android background/foreground telephony service.
- AASIST/TFLite anti-spoof model inference.
- Biometric speaker identity verification.
- A validated probability of deepfake authenticity.

These require a separate Android client, a validated anti-spoofing model and benchmark dataset, and appropriate permissions and consent. They must not be implied by the current web app.

## 10. Next recommended tasks

1. Complete dependency remediation, including major-version upgrades that cannot be applied automatically.
2. Deploy Firestore rules and composite index to the intended Firebase named database.
3. Smoke-test sign-in, token validation, live Vercel API, Gemini request, and Firestore history using real environment secrets.
4. Replace per-instance rate limiting with a shared limiter.
5. Select a validated anti-spoofing model and evaluation dataset; add ROC/DET, false-accept, and false-reject reporting before presenting a detector claim.
6. Add browser end-to-end tests for sign-in, upload, recording, error states, and history actions.
