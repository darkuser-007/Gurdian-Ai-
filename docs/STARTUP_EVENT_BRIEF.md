# Guardian AI — Startup Event Brief

## One-line pitch
Guardian AI is a consent-based voice-security tool that helps people review suspicious audio for signs that may be consistent with AI-generated or manipulated speech.

## The problem
Voice cloning makes it easier to impersonate a trusted person, colleague, or authority figure. A familiar-sounding voice is no longer sufficient proof of identity, especially when a caller creates urgency around money, credentials, or private information.

## Our approach
- Capture or upload audio only after the user chooses to do so.
- Require Google sign-in before a sample is sent for review.
- Use a server-side Gemini audio review to return a cautious screening concern score, explanation, and audible signals.
- Keep a user-owned review history in Firestore.
- Provide independent-verification guidance rather than treating a model output as proof.

## Live demo flow
1. Sign in with Google.
2. Grant microphone permission or select an audio sample.
3. Submit the sample for server-side review.
4. Explain the returned screening result and its uncertainty.
5. Show saved history and privacy controls.

## Who may benefit
Potential users include individuals and families, customer-support teams, and organizations that receive sensitive voice requests. These are target segments to validate, not confirmed customers.

## Business model hypotheses
- Freemium personal audio-review allowance.
- Paid consumer plan for higher review limits and personal history tools.
- Business/API plans for organizations that need consent-based audio review workflows.

These are hypotheses for customer discovery, not existing revenue streams.

## Differentiation hypothesis
A clear, consent-first workflow that combines accessible audio review, transparent uncertainty, and user-owned history. Competitive differentiation must be validated through customer interviews and a structured competitor review.

## Current prototype boundaries
- Gemini output is a screening aid, not a validated anti-spoofing classifier or forensic proof.
- Risk scores are not calibrated probabilities or measured accuracy.
- The web app does not intercept or block cellular calls.
- The Android companion can reject exact caller-ID matches in a local blocklist, but cannot inspect live call audio or detect voice deepfakes.
- The project has no benchmark-validated AASIST/TFLite anti-spoofing model.

## Next milestones
1. Evaluate against consented real and synthetic speech datasets with documented false-positive and false-negative rates.
2. Benchmark multiple models and calibrate any user-facing risk score.
3. Complete privacy, retention, and security review.
4. Conduct pilot interviews with families and organizations handling sensitive calls.
5. Validate willingness to pay before committing to subscription or enterprise pricing.

## 30-second pitch
“AI can now imitate voices well enough to make a fake emergency or payment request sound familiar. Guardian AI gives people a safer way to pause and review suspicious audio. Users sign in, choose a recording, and receive a cautious AI screening summary with an explanation and signals to consider. We are building toward trustworthy voice security, with transparency about uncertainty at every step. Our next milestone is rigorous testing against real and synthetic speech before making accuracy claims.”
