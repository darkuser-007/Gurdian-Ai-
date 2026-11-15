# Guardian AI Android companion

This Android module adds number-based incoming-call screening alongside the browser audio-review app.

## Build

Requires JDK 17, Android SDK Platform 35, and Gradle 8.9:

```bash
gradle testDebugUnitTest assembleDebug --no-daemon
```

The debug APK is written to `app/build/outputs/apk/debug/app-debug.apk`.

## Enable call screening

Install the app on an Android 10 (API 29) or newer device, open it, and choose **Enable Android call screening**. Android displays the system role prompt. The user must approve Guardian AI as the call-screening app.

Add numbers to the local blocklist. Only exact normalized matches are rejected. Unknown, private, malformed, and unlisted numbers are allowed. A storage or metadata error also fails open.

## Platform limits

Android's `CallScreeningService` provides call metadata, not the cellular call's audio stream. Guardian AI must respond to incoming screening requests quickly; this implementation performs only a local SharedPreferences lookup and responds immediately. The module does **not** record, transcribe, or detect synthetic speech during a live phone call.

The web app remains the place to upload or record an audio sample for Gemini-assisted screening. This Android companion is not a default dialer and does not read call logs or contacts.
