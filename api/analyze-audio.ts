import { AudioAnalysisError, analyzeAudioForDeepfake } from "../server/audioAnalysis";
import { FirebaseAuthError, verifyFirebaseIdToken } from "../server/firebaseAuth";
import { createInMemoryRateLimiter } from "../server/rateLimit";

// Bounded per-function-instance abuse guard; this is not a global quota.
const audioReviewLimiter = createInMemoryRateLimiter({
  windowMs: 60_000,
  maxRequests: 8,
  maxEntries: 10_000
});

export const config = {
  api: {
    bodyParser: { sizeLimit: "4.5mb" }
  }
};



export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const identity = await verifyFirebaseIdToken(req.headers?.authorization);
    const rateLimit = audioReviewLimiter.consume(identity.uid);
    if (!rateLimit.allowed) {
      res.setHeader("Retry-After", String(rateLimit.retryAfterSeconds));
      return res.status(429).json({
        error: "You have reached the audio review limit. Wait before trying again.",
        retryAfterSeconds: rateLimit.retryAfterSeconds
      });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const result = await analyzeAudioForDeepfake(body?.audioBase64, body?.mimeType);
    return res.status(200).json(result);
  } catch (error: unknown) {
    if (error instanceof FirebaseAuthError || error instanceof AudioAnalysisError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: "Request body must contain valid JSON." });
    }
    console.error("Audio analysis endpoint failed:", error);
    return res.status(500).json({ error: "Unexpected server error during audio analysis." });
  }
}
