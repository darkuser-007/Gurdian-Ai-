import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { AudioAnalysisError, analyzeAudioForDeepfake } from "./server/audioAnalysis";
import { FirebaseAuthError, verifyFirebaseIdToken } from "./server/firebaseAuth";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;
const requestCounts = new Map<string, { count: number; resetAt: number }>();

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

async function startServer() {
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  app.use(express.json({ limit: "4.5mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      analysisConfigured: Boolean(process.env.GEMINI_API_KEY),
      authenticationConfigured: true
    });
  });

  app.post("/api/analyze-audio", async (req, res) => {
    try {
      const identity = await verifyFirebaseIdToken(req.headers.authorization);
      if (isRateLimited(identity.uid)) {
        return res.status(429).json({ error: "You have reached the audio review limit. Wait one minute and try again." });
      }

      const result = await analyzeAudioForDeepfake(req.body?.audioBase64, req.body?.mimeType);
      return res.json(result);
    } catch (error: unknown) {
      if (error instanceof FirebaseAuthError || error instanceof AudioAnalysisError) {
        return res.status(error.statusCode).json({ error: error.message, code: error.code });
      }
      console.error("Audio analysis route failed:", error);
      return res.status(500).json({ error: "Unexpected server error during audio analysis." });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error?.type === "entity.too.large") {
      return res.status(413).json({ error: "Request is too large. Audio files must be 3 MB or smaller." });
    }
    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: "Request body must contain valid JSON." });
    }
    console.error("HTTP server error:", error);
    return res.status(500).json({ error: "Unexpected server error." });
  });

  const port = Number.parseInt(process.env.PORT || "3000", 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid TCP port.");
  }

  server.listen(port, "0.0.0.0", () => {
    console.log("Guardian AI server listening on port " + port);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("Failed to start Guardian AI:", error);
  process.exitCode = 1;
});
