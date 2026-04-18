import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Authorities Stats
  let stats = {
    callsMonitored: 1284,
    syntheticDetected: 47,
    accuracyRate: 99.9,
    meanLatency: 120
  };

  // Broadcast function
  const broadcast = (data: any) => {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  };

  // Simulate real-time monitoring data updates
  setInterval(() => {
    // New calls happen randomly
    if (Math.random() > 0.4) {
      stats.callsMonitored += 1;
      
      // Some are synthetic
      if (Math.random() > 0.95) {
        stats.syntheticDetected += 1;
      }
      
      // Update accuracy slightly to look dynamic but stable
      stats.accuracyRate = parseFloat((99.8 + Math.random() * 0.2).toFixed(1));
      
      // Latency jitters
      stats.meanLatency = Math.floor(115 + Math.random() * 10);

      broadcast({ type: 'STATS_UPDATE', data: stats });
    }
  }, 5000);

  wss.on("connection", (ws) => {
    console.log("Client connected to WebSocket");
    // Send initial state
    ws.send(JSON.stringify({ type: 'STATS_UPDATE', data: stats }));

    ws.on("close", () => console.log("Client disconnected"));
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
