import { AudioAnalysisError } from "../server/audioAnalysis";
import { FirebaseAuthError, verifyFirebaseIdToken } from "../server/firebaseAuth";
import { analyzeAudioForDeepfake } from "../server/audioAnalysis";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export const config = {
  api: {
    bodyParser: { sizeLimit: "4.5mb" }
  }
};

// This in-memory limiter is a per-function-instance guard. Firebase auth is
// mandatory; use a shared rate-limit store before running at high scale.
function isRateLimited(uid: string): boolean {
  const now = Date.now();
  for (const [userId, entry] of requestCounts) {
    if (entry.resetAt <= now) requestCounts.delete(userId);
  }

  const current = requestCounts.get(uid);
  if (!current || current.resetAt <= now) {
    requestCounts.set(uid, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (current.count >= MAX_REQUESTS_PER_WINDOW) return true;
  current.count += 1;
  return false;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  try {
    const identity = await verifyFirebaseIdToken(req.headers?.authorization);
    if (isRateLimited(identity.uid)) {
      return res.status(429).json({ error: "You have reached the audio review limit. Wait one minute and try again." });
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
