import type { AudioAnalysisError } from "../server/audioAnalysis";
import { analyzeAudioForDeepfake } from "../server/audioAnalysis";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export const config = {
  api: {
    bodyParser: { sizeLimit: "4.5mb" }
  }
};

function isRateLimited(key: string): boolean {
  const now = Date.now();
  for (const [client, entry] of requestCounts) {
    if (entry.resetAt <= now) requestCounts.delete(client);
  }

  const current = requestCounts.get(key);
  if (!current || current.resetAt <= now) {
    requestCounts.set(key, { count: 1, resetAt: now + WINDOW_MS });
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

  const forwardedFor = req.headers["x-forwarded-for"];
  const clientIp = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || req.socket?.remoteAddress || "unknown").split(",")[0].trim();

  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: "Too many audio analyses. Wait one minute and try again." });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const result = await analyzeAudioForDeepfake(body?.audioBase64, body?.mimeType);
    return res.status(200).json(result);
  } catch (error: unknown) {
    const analysisError = error as Partial<AudioAnalysisError>;
    const statusCode = typeof analysisError.statusCode === "number" ? analysisError.statusCode : 400;
    const message = error instanceof Error ? error.message : "Invalid request.";
    return res.status(statusCode).json({ error: message });
  }
}
