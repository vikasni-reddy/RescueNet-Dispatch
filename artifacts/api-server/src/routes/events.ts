import { Router, type IRouter } from "express";
import { addClient, removeClient, clientCount } from "../lib/broadcaster";

const router: IRouter = Router();

router.get("/events", (req, res): void => {
  // SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx / proxy buffering
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Send an immediate "connected" event so the client knows it's live
  res.write(`event: connected\ndata: ${JSON.stringify({ clients: clientCount() + 1 })}\n\n`);

  // Keep-alive heartbeat — proxies drop idle SSE streams after ~60s
  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 25_000);

  addClient(res);

  req.on("close", () => {
    clearInterval(heartbeat);
    removeClient(res);
  });
});

export default router;
