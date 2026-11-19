# Guardian AI Android companion — 1.1.0

A native Android companion for Guardian AI. It screens incoming caller metadata against a blocklist that the user manages locally on their device.

## What's new in 1.1.0

- Refreshed navy, teal, emerald and mint visual system with cleaner hierarchy and rounded surfaces.
- Responsive system-bar insets for modern edge-to-edge Android devices.
- Clear Android call-screening role status and a direct system permission action.
- Add, search, remove and clear-all blocklist controls.
- Duplicate/invalid number feedback and confirmation before destructive actions.
- Blocklist count and helpful empty/search states.
- Custom Guardian shield app icon.
- Updated Android build toolchain using Android Gradle Plugin 8.13.2, Kotlin Gradle Plugin 2.3.21 and Gradle 8.13.

## Build

Requires JDK 17, Android SDK Platform 36, Build Tools 36.0.0, Android Gradle Plugin 8.13.2, Kotlin Gradle Plugin 2.3.21 and Gradle 8.13.

```bash
gradle testDebugUnitTest assembleDebug --no-daemon
```

The debug APK is written to `app/build/outputs/apk/debug/app-debug.apk`. GitHub Actions also builds and uploads the APK artifact for each Android-source update on `main`.

## Enable call screening

Install the app on Android 10 (API 29) or newer, open it, and choose **Enable Android call screening**. Android displays its system role prompt. The user must approve Guardian AI as the call-screening app.

Add numbers to the local blocklist. Only exact normalized matches are rejected. Unknown, private, malformed, and unlisted numbers are allowed. A storage or metadata error also fails open. You can search, remove individual numbers, or clear the list after confirmation.

## Platform and product limits

Android's `CallScreeningService` provides caller metadata, not the cellular call's audio stream. Guardian AI must respond to incoming screening requests quickly; this implementation performs only a local SharedPreferences lookup and responds immediately. The module does **not** record, transcribe, or detect synthetic speech during a live phone call.

The web app remains the place to upload or record an audio sample for Gemini-assisted screening. That screening is an aid, not a validated forensic classifier or proof that a voice is authentic or fake. This Android companion is not a default dialer and does not read call logs or contacts.

## Privacy

- The blocklist is stored in app-local SharedPreferences.
- No contacts or call-log permission is requested.
- The blocklist is not uploaded to Guardian servers.
- Calls that are not exact matches are allowed; screening errors fail open.
